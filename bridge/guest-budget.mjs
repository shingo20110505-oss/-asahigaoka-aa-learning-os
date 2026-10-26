import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSON} from './atomic-json.mjs';

export const GUEST_WEEKLY_POLICY=Object.freeze({total:25,browser:5,minutes:10080});
export const BUDGET_NOTICE='ゲストの週間目安は全体25%・このブラウザー5%です（Codex週間枠を100とした推定）。他の作業・丸め・反映遅延で誤差や超過が生じます。管理者の枠を予約する機能ではありません。初週は導入後から集計します。';
const hash=value=>createHash('sha256').update(value).digest('hex');
const issue=(code,message,status=503)=>Object.assign(Error(message),{code,status});
const pendingMessage='ゲスト使用量の反映を確認できないため、追加の回答を保留しています。しばらく待って再送信してください。解決しない場合は管理者に確認してください。';
const managers=new Map();
export function guestBudget(privateDir){const key=path.resolve(privateDir);if(!managers.has(key))managers.set(key,new GuestBudget(key));return managers.get(key);}

// Only a complete account/rateLimits/read response, obtained through the same
// RISE Codex client as the inference, can create this sample. Never use the
// desktop application's account snapshot or a cached notification as a baseline.
export function weeklySample(account,response,{now=Date.now(),limitId='codex'}={}){
 const identity=account?.workspaceRouting?.chatgptAccountId;
 if(account?.account?.type!=='chatgpt'||typeof identity!=='string'||!identity||response?.accountId!==identity)
  throw issue('BUDGET_ACCOUNT','RISE専用ログインと使用量のアカウント一致を確認できません。ゲストの回答を保留します。');
 const bucket=response.rateLimitsByLimitId!=null?response.rateLimitsByLimitId[limitId]:response.rateLimits;
 if(!bucket||(bucket.limitId&&bucket.limitId!==limitId))throw issue('BUDGET_BUCKET','対象のCodex使用枠を取得できません。');
 const windows=['primary','secondary'].map(slot=>({slot,...bucket[slot]})).filter(w=>w.windowDurationMins===GUEST_WEEKLY_POLICY.minutes);
 if(windows.length!==1)throw issue('BUDGET_WINDOW','週間使用枠を一意に確認できません。');
 const w=windows[0];
 if(!Number.isInteger(w.usedPercent)||w.usedPercent<0||!Number.isSafeInteger(w.resetsAt)||w.resetsAt*1000<=now)
  throw issue('BUDGET_STALE','週間使用量または次回更新時刻を確認できません。');
 return {accountHash:hash(identity),limitId,slot:w.slot,resetAt:w.resetsAt*1000,used:w.usedPercent,observedAt:now,allowed:response.ordinaryUsageAllowed!==false&&!bucket.rateLimitReachedType&&w.usedPercent<100};
}

export class GuestBudget {
 constructor(privateDir,{now=Date.now,write=atomicJSON,reconcileMs=120000,minRemainingMs=18*60000}={}){
  this.file=path.join(privateDir,'guest-weekly-budget.json');this.lock=this.file+'.lock';
  this.now=now;this.write=write;this.reconcileMs=reconcileMs;this.minRemainingMs=minRemainingMs;
  this.processId=randomUUID();this.ownerCount=0;this.ownerEpoch=0;
 }
 ownerStarted(){this.ownerCount++;this.ownerEpoch++;let ended=false;return()=>{if(!ended){ended=true;this.ownerCount--;}};}
 fresh(sample){if(!sample||!Number.isFinite(sample.observedAt)||this.now()-sample.observedAt>30000||sample.observedAt>this.now()+1000||sample.resetAt<=this.now())throw issue('BUDGET_STALE','新しい週間使用量を取得できません。');}
 async load(){
  let state;try{state=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code==='ENOENT')return{version:1,accountHash:null,current:null,windows:{}};throw issue('BUDGET_STORAGE','ゲスト使用量の保存情報を読み込めません。');}
  if(state.version!==1||!state.windows||typeof state.windows!=='object'||!('current'in state))throw issue('BUDGET_STORAGE','ゲスト使用量の保存形式を確認してください。');
  for(const w of Object.values(state.windows))if(!Number.isFinite(w.total)||w.total<0||!w.browsers||!w.records||!Number.isFinite(w.resetAt)||Object.values(w.browsers).some(n=>!Number.isFinite(n)||n<0))throw issue('BUDGET_STORAGE','ゲスト使用量の集計が不正です。');
  return state;
 }
 async acquire(){
  await fs.mkdir(path.dirname(this.file),{recursive:true});
  try{const handle=await fs.open(this.lock,'wx',0o600);await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:this.now()}));return async()=>{await handle.close();await fs.unlink(this.lock);};}
  catch(e){if(e.code==='EEXIST')throw issue('BUDGET_BUSY','別のゲスト回答の使用量を確認中です。完了後に再送信してください。',409);throw e;}
 }
 window(state,sample){
  this.fresh(sample);
  if(state.accountHash&&state.accountHash!==sample.accountHash)throw issue('BUDGET_ACCOUNT_CHANGED','計測アカウントが変わりました。管理者による確認が必要です。');
  const key=sample.limitId+':'+sample.resetAt,previous=state.current&&state.windows[state.current];
  if(previous&&state.current!==key&&this.now()<previous.resetAt)throw issue('BUDGET_WINDOW_CHANGED','週間枠の更新時刻が変わったため、ゲスト集計を保留します。');
  if(previous&&state.current!==key&&sample.resetAt<=previous.resetAt)throw issue('BUDGET_STALE','更新前の使用量を受信しました。');
  state.accountHash??=sample.accountHash;state.current=key;
  return state.windows[key]??=( {resetAt:sample.resetAt,total:0,browsers:{},records:{},pending:null,trackingStartedAt:this.now()} );
 }
 summary(w,browserId){return{mode:'estimated',totalLimit:25,browserLimit:5,totalUsed:w.total,browserUsed:w.browsers[browserId]||0,resetsAt:w.resetAt,trackingStartedAt:w.trackingStartedAt,pending:Boolean(w.pending),notice:BUDGET_NOTICE};}
 charge(w,record,used){
  if(record.status==='settled')return;
  const points=used-record.before;
  if(!Number.isFinite(points)||points<0)throw issue('BUDGET_COUNTER','同じ週の使用率が減少したため、ゲスト集計を保留します。');
  record.points=points;record.after=used;record.status='settled';record.finishedAt=this.now();record.zeroDeltaEstimate=points===0;w.total+=points;w.browsers[record.browserId]=(w.browsers[record.browserId]||0)+points;w.pending=null;w.deferred=record.requestId;
 }
 async begin({browserId,requestId,sample}){
  if(!/^[a-f0-9-]{36}$/i.test(browserId||'')||!requestId)throw issue('BUDGET_BROWSER','ブラウザーの予算を確認するため、ゲストでログインし直してください。',401);
  const release=await this.acquire();let handedOff=false;
  try{
   const state=await this.load(),w=this.window(state,sample);
   // Capture bounded delayed reflection of the most recent guest response.
   // Idle account use outside this short interval is NOT charged to guests.
   const deferred=w.deferred&&w.records[w.deferred];
   if(deferred&&deferred.processId===this.processId&&deferred.ownerEpoch===this.ownerEpoch&&!this.ownerCount&&this.now()<=deferred.reconcileUntil){
    if(sample.used<deferred.after)throw issue('BUDGET_COUNTER','同じ週の使用率が減少したため、ゲスト集計を保留します。');
    const delta=sample.used-deferred.after;
    if(delta){deferred.points+=delta;deferred.after=sample.used;deferred.zeroDeltaEstimate=false;w.total+=delta;w.browsers[deferred.browserId]=(w.browsers[deferred.browserId]||0)+delta;await this.write(this.file,state);}
   }
   w.deferred=null;
   if(w.pending){
    const previous=w.records[w.pending];
    // An interrupted process or a known owner overlap cannot be reassigned to
    // the next guest. Keep the hold; a verified weekly rollover clears it.
    if(!previous||previous.processId!==this.processId||previous.ownerEpoch!==this.ownerEpoch||this.ownerCount||['owner-overlap','counter-decreased','window-changed','account-changed'].includes(previous.reason)||this.now()>previous.reconcileUntil||sample.used<previous.before)
     throw issue('BUDGET_PENDING',pendingMessage);
    this.charge(w,previous,sample.used);await this.write(this.file,state);
   }
   if(this.ownerCount)throw issue('BUDGET_OWNER_ACTIVE','管理者の回答中はゲスト使用量を分離できません。完了後に再送信してください。',409);
   if(sample.allowed===false)throw issue('BUDGET_UPSTREAM','Codex週間枠の利用可否を確認してください。ゲストの回答を保留します。');
   if(w.records[requestId])throw issue('BUDGET_DUPLICATE','この送信は既に使用量を記録済みです。',409);
   if(w.total>=25)throw issue('BUDGET_TOTAL','ゲスト全体の週間目安25%に達しました。週間枠の更新後に利用できます。',429);
   if((w.browsers[browserId]||0)>=5)throw issue('BUDGET_BROWSER_LIMIT','このブラウザーの週間目安5%に達しました。週間枠の更新後に利用できます。',429);
   if(sample.resetAt-this.now()<this.minRemainingMs)throw issue('BUDGET_RESET_NEAR','週間枠の更新が近いため、更新後に再送信してください。');
   const record={browserId,requestId,before:sample.used,startedAt:this.now(),status:'pending',processId:this.processId,ownerEpoch:this.ownerEpoch,reconcileUntil:this.now()+this.reconcileMs,reason:'in-progress'};
   w.records[requestId]=record;w.pending=requestId;await this.write(this.file,state);
   let ended=false;
   const finish=async({sample:after,quotaEvidence=false,dispatched=true}={})=>{
    if(ended)return this.summary(w,browserId);ended=true;
    try{
     record.reconcileUntil=this.now()+this.reconcileMs;
     if(!dispatched){record.status='not-dispatched';record.points=0;w.pending=null;}
     else if(this.ownerEpoch!==record.ownerEpoch||this.ownerCount){record.reason='owner-overlap';}
     else if(!after){record.reason='unavailable';}
     else {
      this.fresh(after);
      if(after.accountHash!==sample.accountHash)record.reason='account-changed';
      else if(after.resetAt!==sample.resetAt||after.limitId!==sample.limitId)record.reason='window-changed';
      else if(after.used<sample.used)record.reason='counter-decreased';
      // A successful fresh read with an unchanged integer is a valid
      // sub-percentage estimate, not missing telemetry. Do not freeze tiny
      // successful requests or invent a one-point per-message charge.
      else this.charge(w,record,after.used);
     }
     await this.write(this.file,state);return this.summary(w,browserId);
    }finally{await release();}
   };
   handedOff=true;return{finish,summary:this.summary(w,browserId),sample};
  }finally{if(!handedOff)await release();}
 }
}
