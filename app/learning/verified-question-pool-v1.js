(()=>{
'use strict';
if(window.RiseVerifiedQuestionPool)return;

const VERSION='1.1.0';
const STORE_KEY='rise_verified_question_pool_v1';
const CONFIG_KEY='aa_ai_reading_config_v1';
const DEFAULT_ENDPOINT='https://asahigaoka-aa-ai-reading.shingo-20110505.workers.dev';
const EXAM_PATH='/v1/exam';
const MAX_ITEMS=180;
const MAX_ITEMS_PER_SUBJECT=60;
const MAX_AI_PER_SESSION=4;
const TIMEOUT_MS=180000;
const SUBJECTS=new Set(['english','japanese','math','science','social']);
const ID_RE=/^rise-(english|japanese|math|science|social)-[0-9a-f]{16}$/;
const FINGERPRINT_RE=/^[0-9a-f]{16}$/;
const CONFIDENCE_FLOOR=Object.freeze({english:.86,japanese:.86,math:.90,science:.90,social:.90});
const LOCAL_ONLY_UNITS=new Set(['english:vocab','japanese:kanji','japanese:idiom']);
const UNIT_LABELS=Object.freeze({
  english:{reading:'長文読解',dialogue:'会話文',data:'図表・案内',grammar:'文法・語順',vocab:'語彙・語句'},
  japanese:{modern:'説明的文章',literary:'文学的文章',discussion:'対話・資料統合',kanji:'漢字・語彙',idiom:'慣用句・四字熟語',classical:'古文',kanbun:'漢文'},
  math:{number:'数と式',algebra:'式の活用',equation:'方程式',function:'関数・動点',geometry:'平面・空間図形',probability:'確率・場合分け',statistics:'データの活用'},
  science:{biology:'生命',chemistry:'化学',physics:'物理',earth:'地学',experiment:'実験・資料統合'},
  social:{history:'歴史',geography:'地理',civics:'公民',economy:'経済',international:'国際',data:'地図・統計・資料統合'}
});
const SKILL_PREFIX=Object.freeze({english:'en.aichi',japanese:'ja.aichi',math:'math.aichi',science:'sci.aichi',social:'soc.aichi'});
let busy=false;

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0));}
function safeArray(v){return Array.isArray(v)?v:[];}
function now(){return Date.now();}
function stateApi(){return window.AA_APP?.get?.('state')||null;}
function currentState(){return stateApi()?.get?.()||null;}
function uiApi(){return window.AA_APP?.get?.('ui')||null;}
function deepClone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}}
function normalizeEndpoint(value){
  const text=String(value||'').trim().replace(/\/+$/,'');
  if(!text)return'';
  try{
    const u=new URL(text);
    const local=u.hostname==='localhost'||u.hostname==='127.0.0.1';
    if(u.protocol!=='https:'&&!(local&&u.protocol==='http:'))return'';
    if(u.username||u.password||u.search||u.hash)return'';
    return u.origin+u.pathname.replace(/\/+$/,'');
  }catch(_){return'';}
}
function readConnection(){
  try{
    const raw=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
    return{endpoint:normalizeEndpoint(raw.endpoint)||DEFAULT_ENDPOINT,accessToken:typeof raw.accessToken==='string'?raw.accessToken:''};
  }catch(_){return{endpoint:DEFAULT_ENDPOINT,accessToken:''};}
}
function configured(){const c=readConnection();return!!(c.endpoint&&c.accessToken.length>=24&&!/\s/.test(c.accessToken));}
function blankStore(){return{schemaVersion:1,version:VERSION,updatedAt:0,items:[]};}
function confidenceFloor(subject){return Number(CONFIDENCE_FLOOR[subject]||.90);}
function fingerprintOf(item){const fp=String(item?.fingerprint||'').toLowerCase();return FINGERPRINT_RE.test(fp)?fp:'';}
function validateItem(item,expectedSubject){
  if(!item||typeof item!=='object'||!SUBJECTS.has(item.subject)||item.subject!==expectedSubject)return false;
  if(!ID_RE.test(String(item.id||'')))return false;
  if(item.fingerprint!=null&&!fingerprintOf(item))return false;
  if(!String(item.skill||'').trim()||!Number.isInteger(Number(item.difficulty))||Number(item.difficulty)<1||Number(item.difficulty)>10)return false;
  if(!String(item.question||'').trim()||!Array.isArray(item.choices)||item.choices.length!==4)return false;
  const choices=item.choices.map(x=>String(x||'').trim());
  if(choices.some(x=>!x)||new Set(choices.map(x=>x.toLowerCase())).size!==4)return false;
  const ai=Number(item.answerIndex);
  if(!Number.isInteger(ai)||ai<0||ai>3||String(item.answer||'')!==choices[ai])return false;
  if(String(item.explanation||'').trim().length<12||!String(item.evidence||'').trim()||!String(item.misconception||'').trim())return false;
  if(![1,2].includes(Number(item.marks)))return false;
  if(item.quality?.verified!==true||Number(item.quality?.verifierConfidence||0)<confidenceFloor(item.subject))return false;
  return true;
}
function validateIncomingItem(item,expectedSubject){
  if(!validateItem(item,expectedSubject)||!fingerprintOf(item))return false;
  const q=item.quality||{};
  return q.generationProvider==='gemini'&&q.verificationProvider==='groq'&&q.verifierMode==='json_schema'&&q.strictStructuredOutput===true;
}
function validateStoredRecord(record){
  if(!record||typeof record!=='object'||!validateItem(record.item,record.subject))return false;
  if(record.subject!==record.item.subject||!String(record.examUnit||'').trim())return false;
  return Number.isFinite(Number(record.addedAt))&&Number(record.addedAt)>0;
}
function pruneItems(rows){
  const ids=new Set(),fps=new Set(),valid=[];
  for(const row of safeArray(rows).filter(validateStoredRecord).sort((a,b)=>Number(b.addedAt)-Number(a.addedAt))){
    const id=String(row.item.id),fp=fingerprintOf(row.item);
    if(ids.has(id)||(fp&&fps.has(fp)))continue;
    ids.add(id);if(fp)fps.add(fp);valid.push(row);
  }
  const kept=[];
  for(const subject of SUBJECTS){
    kept.push(...valid.filter(row=>row.subject===subject).slice(0,MAX_ITEMS_PER_SUBJECT));
  }
  return kept.sort((a,b)=>Number(a.addedAt)-Number(b.addedAt)).slice(-MAX_ITEMS);
}
function loadStore(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(!raw||raw.schemaVersion!==1||!Array.isArray(raw.items))return blankStore();
    return{schemaVersion:1,version:VERSION,updatedAt:Number(raw.updatedAt)||0,items:pruneItems(raw.items)};
  }catch(_){return blankStore();}
}
function writeStore(store){
  const next={schemaVersion:1,version:VERSION,updatedAt:now(),items:pruneItems(store.items)};
  const text=JSON.stringify(next);
  try{
    localStorage.setItem(STORE_KEY,text);
    const check=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(!check||check.schemaVersion!==1||!Array.isArray(check.items))throw new Error('verification');
    return true;
  }catch(_){return false;}
}
function normalizeUnits(subject,units){
  const valid=UNIT_LABELS[subject]||{};
  return [...new Set(safeArray(units).map(x=>String(x||'')).filter(x=>Object.prototype.hasOwnProperty.call(valid,x)))];
}
function difficultyForLevel(level){return Number(level)<=1?4:Number(level)>=3?9:7;}
function recentIds(state){
  return [...new Set(safeArray(state?.attempts).slice(-120).reverse().map(x=>String(x?.reviewKey||x?.itemId||'')).filter(x=>ID_RE.test(x)))].slice(0,40);
}
function recentFingerprints(store){
  return [...new Set(safeArray(store?.items).slice(-80).reverse().map(row=>fingerprintOf(row.item)).filter(Boolean))].slice(0,40);
}
function masteryNeed(state,skill){
  const row=state?.mastery?.[skill];
  if(!row)return .55;
  return 1-clamp(Number(row.mastery??row.pMastery??.5),0,1);
}
function latestAttempt(state,id){
  const attempts=safeArray(state?.attempts);
  for(let i=attempts.length-1,seen=0;i>=0&&seen<240;i--,seen++){
    const a=attempts[i];
    if(String(a?.reviewKey||'')===id||String(a?.itemId||'')===id)return a;
  }
  return null;
}
function itemReviewNeed(state,id){
  const item=state?.items?.[id];
  if(!item||!Number(item.seen))return .18;
  const due=Number(item.dueAt)>0&&Number(item.dueAt)<=now()?1:0;
  const lapse=clamp(Number(item.lapses||0)/3,0,1);
  const errorRate=1-clamp(Number(item.correct||0)/Math.max(1,Number(item.seen||0)),0,1);
  return clamp(.52*due+.28*lapse+.20*errorRate,0,1);
}
function scoreRecord(row,{subject,units,difficulty,recent,state}){
  if(row.subject!==subject||!units.includes(row.examUnit))return-Infinity;
  const item=row.item;
  let score=30-Math.abs(Number(item.difficulty)-difficulty)*4;
  score+=masteryNeed(state,item.skill)*22;
  score+=itemReviewNeed(state,item.id)*24;
  score+=Math.min(10,(now()-Number(row.lastUsedAt||row.addedAt))/(86400000*2));
  score-=Number(row.useCount||0)*1.4;
  if(recent.has(item.id)){
    const last=latestAttempt(state,item.id);
    score+=last&&last.correct===false?18:-80;
  }
  return score;
}
function selectRecords(store,request,count){
  const state=request.state||currentState();
  const recent=new Set(request.recentQuestionIds||recentIds(state));
  return store.items.map(row=>({row,score:scoreRecord(row,{...request,recent,state})})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score).slice(0,count).map(x=>x.row);
}
function requestSkill(subject,unit){return`${SKILL_PREFIX[subject]||subject+'.aichi'}.${String(unit||'application').replace(/[^a-z0-9_-]/gi,'')}`;}
function eligibleUnits(subject,units){return units.filter(unit=>!LOCAL_ONLY_UNITS.has(subject+':'+unit));}
async function postExam(body){
  const c=readConnection();
  if(!configured())throw Object.assign(new Error('AI接続が未設定です。'),{code:'not_configured'});
  if(navigator.onLine===false)throw Object.assign(new Error('オフラインです。'),{code:'offline'});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(c.endpoint+EXAM_PATH,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+c.accessToken},body:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    let payload=null;try{payload=await response.json();}catch(_){}
    if(!response.ok){const error=new Error(String(payload?.error?.message||`AI問題サーバーがHTTP ${response.status}を返しました。`));error.code=String(payload?.error?.code||'request_failed');error.httpStatus=response.status;throw error;}
    if(!payload||typeof payload!=='object')throw Object.assign(new Error('AI問題サーバーの応答形式が不正です。'),{code:'invalid_response'});
    return payload;
  }catch(error){
    if(error?.name==='AbortError')throw Object.assign(new Error('AI問題生成が時間切れになりました。'),{code:'timeout'});
    throw error;
  }finally{clearTimeout(timer);}
}
function ingestPayload(store,payload,subject,unit){
  if(payload?.subject!==subject||payload?.quality?.verified!==true)return[];
  const accepted=[];
  const byId=new Map(store.items.map(row=>[row.item.id,row]));
  const fpToId=new Map(store.items.map(row=>[fingerprintOf(row.item),row.item.id]).filter(([fp])=>fp));
  for(const raw of safeArray(payload.items)){
    if(!validateIncomingItem(raw,subject))continue;
    const item=deepClone(raw);if(!item)continue;
    const fp=fingerprintOf(item),owner=fpToId.get(fp);
    if(owner&&owner!==item.id)continue;
    const existing=byId.get(item.id);
    const row=existing?{...existing,item,examUnit:existing.examUnit||unit}:{subject,examUnit:unit,item,addedAt:now(),lastUsedAt:0,useCount:0};
    byId.set(item.id,row);fpToId.set(fp,item.id);accepted.push(row);
  }
  store.items=pruneItems([...byId.values()]);
  writeStore(store);
  return accepted;
}
async function replenish(store,request,missing){
  if(missing<=0||!configured()||navigator.onLine===false)return[];
  const units=eligibleUnits(request.subject,request.units);
  if(!units.length)return[];
  const out=[];
  const order=[...units].sort((a,b)=>{
    const ca=store.items.filter(x=>x.subject===request.subject&&x.examUnit===a).length;
    const cb=store.items.filter(x=>x.subject===request.subject&&x.examUnit===b).length;
    return ca-cb;
  });
  const calls=Math.min(order.length,missing,MAX_AI_PER_SESSION);
  for(let i=0;i<calls&&out.length<missing;i++){
    const unit=order[i];
    const count=Math.min(2,missing-out.length);
    try{
      const payload=await postExam({
        schemaVersion:1,subject:request.subject,count,difficulty:request.difficulty,
        skill:requestSkill(request.subject,unit),
        focus:[UNIT_LABELS[request.subject]?.[unit]||unit,'愛知県公立高校入試','応用・根拠判断'],
        recentQuestionIds:[...new Set([...request.recentQuestionIds,...store.items.slice(-40).map(x=>x.item.id)])].slice(-40),
        recentFingerprints:recentFingerprints(store)
      });
      out.push(...ingestPayload(store,payload,request.subject,unit));
    }catch(error){
      console.warn('[Rise Verified Pool] replenish skipped:',error?.code||error?.message||error);
      if(['quota_exceeded','groq_quota_exceeded','unauthorized','forbidden_origin','not_configured','server_not_configured'].includes(error?.code))break;
    }
  }
  return out;
}
async function acquire({subject,units,level=2,count=2,recentQuestionIds=[]}={}){
  subject=String(subject||'');
  if(!SUBJECTS.has(subject))return{items:[],records:[],generatedCount:0,source:'invalid-subject'};
  units=normalizeUnits(subject,units);
  if(!units.length)return{items:[],records:[],generatedCount:0,source:'no-units'};
  const target=clamp(Math.round(count),0,MAX_AI_PER_SESSION);
  if(!target)return{items:[],records:[],generatedCount:0,source:'disabled'};
  const state=currentState(),difficulty=difficultyForLevel(level),store=loadStore();
  const recent=[...new Set([...recentIds(state),...safeArray(recentQuestionIds)])].slice(0,40);
  const request={subject,units,difficulty,recentQuestionIds:recent,state};
  let picked=selectRecords(store,request,target);
  const before=new Set(store.items.map(x=>x.item.id));
  if(picked.length<target){await replenish(store,request,target-picked.length);picked=selectRecords(loadStore(),request,target);}
  const generatedCount=picked.filter(row=>!before.has(row.item.id)).length;
  return{items:picked.map(row=>deepClone(row.item)).filter(Boolean),records:picked.map(row=>deepClone(row)).filter(Boolean),generatedCount,source:picked.length?(generatedCount?'pool+generated':'pool'):'local-fallback'};
}
function markUsed(ids){
  const set=new Set(safeArray(ids).map(String));if(!set.size)return false;
  const store=loadStore();let changed=false;
  store.items=store.items.map(row=>{if(!set.has(row.item.id))return row;changed=true;return{...row,lastUsedAt:now(),useCount:Number(row.useCount||0)+1};});
  return changed?writeStore(store):false;
}
function toPracticeQuestion(record,level){
  const item=record?.item;if(!validateItem(item,record?.subject))return null;
  const unit=record.examUnit;
  return{
    id:item.id,reviewKey:item.id,srsId:item.id,code:item.id,type:item.subject,subject:item.subject,
    stem:item.context?`${item.context}\n\n${item.question}`:item.question,
    choices:item.choices.map((text,index)=>({text,ok:index===item.answerIndex,reason:index===item.answerIndex?item.explanation:`この選択肢は正答条件を満たしません。${item.misconception}`,error:index===item.answerIndex?null:'ai_verified_distractor',distractorType:index===item.answerIndex?null:'ai_verified_distractor'})),
    answerIndex:item.answerIndex,selectCount:1,points:1,partialPoints:0,explanation:item.explanation,
    skills:[{id:item.skill,role:'primary'}],expectedMs:50000+Number(item.difficulty)*4500,
    context:'rise-ai-verified-'+item.subject,format:'aichi-mark',testMode:false,courseLevel:Number(level)||2,
    evidence:item.evidence,reasoningTag:'cross-provider-verified',examUnit:unit,aichiPassage:item.context||'',
    source:{area:unit,difficulty:item.difficulty,origin:'rise-ai-verified',curriculum:'junior-high',verified:true,quality:item.quality,fingerprint:fingerprintOf(item),poolVersion:VERSION}
  };
}
function mergeQueues(localQueue,records,level){
  const local=safeArray(localQueue).map(x=>x);
  const ai=records.map(row=>toPracticeQuestion(row,level)).filter(Boolean);
  if(!ai.length)return local;
  const replaceCount=Math.min(ai.length,local.length,MAX_AI_PER_SESSION);
  const positions=[];
  for(let i=0;i<replaceCount;i++)positions.push(Math.min(local.length-1,Math.floor((i+.5)*local.length/replaceCount)));
  const out=[...local];
  positions.forEach((pos,i)=>{out[pos]=ai[i];});
  return out;
}
function showBusy(){
  let host=document.getElementById('riseVerifiedPoolBusy');
  if(!host){host=document.createElement('div');host.id='riseVerifiedPoolBusy';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.style.cssText='position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:rgba(12,24,50,.62);padding:24px';host.innerHTML='<div style="max-width:360px;border-radius:20px;background:var(--surface,#fff);color:var(--text,#152039);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.24);font:700 14px/1.7 -apple-system,BlinkMacSystemFont,\"Hiragino Sans\",\"Yu Gothic UI\",sans-serif">検証済み問題を準備中…<div style="font-weight:500;opacity:.72;margin-top:4px">保存済み問題を優先し、不足時だけAI品質検査を行います。</div></div>';document.body.appendChild(host);}host.hidden=false;
}
function hideBusy(){const host=document.getElementById('riseVerifiedPoolBusy');if(host)host.hidden=true;}
function levelForState(state,subject,units){let d=clamp(Math.round(Number(state?.ui?.subjectDifficulty)||7),1,11);let level=d<=4?1:d<=8?2:3;if(subject==='math'&&units.includes('advanced'))level=3;return level;}
async function startVerifiedUnitPractice(action){
  if(busy)return false;
  const state=currentState(),v22=window.AA_V22_TEST_API,v2=window.AA_V2_TEST_API;
  if(!state||!v22?.practiceQueue||!v2?.startPractice)return false;
  let config=deepClone(state.ui?.practiceConfig||{});
  if(action==='another-set'&&state.session?.practiceConfig){
    const prev=state.session.practiceConfig;
    config={...config,subject:prev.subject,length:prev.length,unitsBySubject:{...(config.unitsBySubject||{}),[prev.subject]:safeArray(prev.units)}};
  }
  const subject=String(config.subject||'');
  const units=normalizeUnits(subject,config.unitsBySubject?.[subject]);
  if(!units.length)return false;
  const level=levelForState(state,subject,units);
  const localQueue=v22.practiceQueue(config);
  if(!localQueue.length)return false;
  busy=true;showBusy();
  try{
    const desired=Math.min(MAX_AI_PER_SESSION,Math.max(1,Math.round(localQueue.length*.4)));
    const result=await acquire({subject,units,level,count:desired});
    const merged=mergeQueues(localQueue,result.records,level);
    v2.startPractice(subject,config.length,level,merged);
    const live=currentState();
    if(live?.session){
      live.session.kind='unitPractice';
      live.session.practiceConfig={subject,length:config.length,units:[...units],level,difficulty:Number(live.ui?.subjectDifficulty)||7};
      live.session.practiceUnits=[...units];
      live.session.verifiedPool={version:VERSION,used:result.records.map(x=>x.item.id),generatedCount:result.generatedCount,source:result.source};
      stateApi()?.save?.();uiApi()?.render?.();
    }
    markUsed(result.records.map(x=>x.item.id));
    return true;
  }catch(error){
    console.warn('[Rise Verified Pool] local fallback:',error?.code||error?.message||error);
    v2.startPractice(subject,config.length,level,localQueue);
    const live=currentState();
    if(live?.session){live.session.kind='unitPractice';live.session.practiceConfig={subject,length:config.length,units:[...units],level,difficulty:Number(live.ui?.subjectDifficulty)||7};live.session.practiceUnits=[...units];live.session.verifiedPool={version:VERSION,used:[],generatedCount:0,source:'local-fallback'};stateApi()?.save?.();uiApi()?.render?.();}
    return true;
  }finally{busy=false;hideBusy();}
}

document.addEventListener('click',event=>{
  const el=event.target?.closest?.('[data-action]');if(!el)return;
  const action=el.dataset.action;
  const isRepeat=action==='another-set'&&currentState()?.session?.practiceConfig;
  if(action!=='start-unit-practice'&&!isRepeat)return;
  event.preventDefault();event.stopImmediatePropagation();
  void startVerifiedUnitPractice(action);
},true);

window.RiseVerifiedQuestionPool=Object.freeze({
  version:VERSION,storeKey:STORE_KEY,configured,load:()=>deepClone(loadStore()),acquire,markUsed,toPracticeQuestion,
  snapshot(){
    const store=loadStore(),state=currentState(),counts={},dueCounts={};
    for(const row of store.items){
      counts[row.subject]=(counts[row.subject]||0)+1;
      if(itemReviewNeed(state,row.item.id)>=.5)dueCounts[row.subject]=(dueCounts[row.subject]||0)+1;
    }
    return{version:VERSION,total:store.items.length,counts,dueCounts,updatedAt:store.updatedAt,configured:configured()};
  },
  __test:Object.freeze({validateItem,validateIncomingItem,validateStoredRecord,normalizeUnits,difficultyForLevel,selectRecords,ingestPayload,mergeQueues,eligibleUnits,requestSkill,loadStore,writeStore,pruneItems,recentFingerprints,itemReviewNeed,confidenceFloor})
});
})();
