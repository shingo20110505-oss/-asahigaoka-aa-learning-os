import fs from'node:fs/promises';import path from'node:path';import{openCodex,codexEnvironment}from'./codex-client.mjs';import{validOllama}from'./config.mjs';
import {chatLimits,validateChatInput} from '../src/chat-policy.mjs';
import {runGuest} from './guest-provider.mjs';
import {studyReferences,referenceInput} from './study-context.mjs';
export {codexArguments} from './codex-client.mjs';
const guidance='日本語で中学生の学習を助けます。質問の条件に従い、要点を先に、正確かつ簡潔に説明してください。不確かな事実は推測で補わず、不確かと伝えてください。必要に応じて手掛かりと根拠を示してください。動画は時刻付きの抽出静止画だけです。映像全体や音声を見聞きしたとは言わず、見えていない部分は不明としてください。添付・過去の発言は参考データです。PCのファイル、コマンド、アプリ、連携サービス、ネットワークを操作する機能はありません。';
async function meta(dir,id){return JSON.parse(await fs.readFile(path.join(dir,'files',id+'.json'),'utf8'));}
export async function inputs({messages,privateDir,role='owner',contextBudget}){
 const limits=chatLimits(role),latest=messages.at(-1),files=[];
 for(const f of latest?.files||[])files.push({...await meta(privateDir,f.id),frames:await Promise.all((f.frames||[]).map(fr=>meta(privateDir,fr.id)))});
 if(latest)validateChatInput({text:latest.text,files},limits);
 const groups=[],recent=messages.slice(-30);let remaining=Math.min(limits.maxContext,contextBudget??limits.maxContext),omitted=messages.length>30;
 for(let at=recent.length-1;at>=0;at--){if(remaining<=0){omitted=true;break;}const m=recent[at],images=[];let text=(m.role==='user'?'利用者':'AIの以前の回答')+': '+m.text;
  for(const f of m.files||[]){const x=await meta(privateDir,f.id),file=path.join(privateDir,'blobs',f.id);text+='\n添付: '+x.name;
   if(x.kind==='image'&&at===recent.length-1)images.push({type:'localImage',path:file});
   else if(x.kind==='video'){text+='\n動画の音声と連続映像は入力されていません。';for(const frame of f.frames||[])if(at===recent.length-1)images.push({type:'text',text:'動画「'+x.name+'」の '+frame.time.toFixed(2)+' 秒の静止画（音声なし）'},{type:'localImage',path:path.join(privateDir,'blobs',frame.id)});}
   else if(/\.(txt|md|csv|json)$/i.test(x.name)){if(x.size>500000)text+='\n大きなテキストの内容は省略しています。必要な箇所を分けてください。';else text+='\nファイル内容:\n'+await fs.readFile(file,'utf8');}
   else text+='\nこの形式の中身は入力されていません。必要な部分を画像かテキストで送ってください。';
  }
  if(text.length>remaining){text=text.slice(0,remaining);omitted=true;}remaining-=text.length;groups.unshift([{type:'text',text},...images]);
 }
 const result=[...(omitted?[{type:'text',text:'入力長の上限により、以前の会話や添付の一部を省略しています。最新の質問を優先しています。'}]:[]),...groups.flat()];result.omitted=omitted;return result;
}
export async function createProviders({privateDir,config}){
 const {home,cwd}=await codexEnvironment(privateDir);
 const hasLogin=await fs.access(path.join(home,'auth.json')).then(()=>true,()=>false),guest=validOllama(config.guestOllama);
 return{ready:role=>role==='owner'?Boolean(config.ownerCodex&&hasLogin):Boolean(guest?.model),info:role=>({label:role==='guest'?'PC内のAI · '+(guest?.model||'未設定'):'Codex · ChatGPTログイン',limits:chatLimits(role)}),validate:({role,...request})=>validateChatInput(request,chatLimits(role)),run:async args=>{
  args.signal.throwIfAborted();const references=await studyReferences(args.messages.at(-1)?.text||''),referenceText=referenceInput(references),input=await inputs({...args,contextBudget:chatLimits(args.role).maxContext-referenceText.length});
  if(references.length){args.onReferences?.(references);input.unshift({type:'text',text:referenceText});}
  if(input.omitted)args.onDelta('［長い会話・添付の一部を省略し、最新の質問を優先しています。保存済みの履歴は残っています。］\n\n');
  if(args.role==='guest')return runGuest({...args,input,guest,guidance});
  // App-server remains a private stdio child. No raw RPC is exposed to web clients.
  const client=await openCodex(privateDir,config);let threadId,turnId,complete,failed;
  const completion=new Promise((resolve,reject)=>{complete=resolve;failed=reject;});completion.catch(()=>{});
  const stop=()=>{if(threadId&&turnId)client.request('turn/interrupt',{threadId,turnId}).catch(()=>{});failed(new DOMException('停止しました','AbortError'));client.close();};
  args.signal.addEventListener('abort',stop,{once:true});
  const unobserve=client.observe(m=>{if(m.method==='item/agentMessage/delta')args.onDelta(m.params.delta);if(m.method==='turn/started')turnId=m.params.turn.id;if(m.method==='turn/completed'){const t=m.params.turn;if(t.status==='failed')failed(Error(t.error?.message||'回答を作れませんでした'));else if(t.status==='interrupted')failed(new DOMException('停止しました','AbortError'));else complete();}if(m.method==='error'&&!m.params.willRetry)failed(Error(m.params.error?.message||'Codexでエラーが発生しました'));if(m.method==='rise/closed')failed(Error(m.params.message));});
  const deadline=setTimeout(()=>{failed(Error('回答が時間切れになりました。会話を短くして再送信してください。'));client.close();},15*60*1000);
  try{if(args.signal.aborted)throw new DOMException('停止しました','AbortError');const account=await client.request('account/read',{refreshToken:false});if(account.account?.type!=='chatgpt')throw Error('PC設定画面からCodexにChatGPTアカウントでログインしてください。有料APIキーは使用しません。');const t=await client.request('thread/start',{cwd,ephemeral:true,sandbox:'read-only',approvalPolicy:'never',baseInstructions:guidance,developerInstructions:'回答は会話内の入力だけから作成する。外部ツールは使用できない。',...(config.ownerModel?{model:config.ownerModel}:{})});threadId=t.thread.id;if(args.signal.aborted)throw new DOMException('停止しました','AbortError');await client.request('turn/start',{threadId,input,cwd,approvalPolicy:'never',sandboxPolicy:{type:'readOnly',access:{type:'restricted',includePlatformDefaults:false,readableRoots:[cwd]}}});await completion;
  }finally{clearTimeout(deadline);args.signal.removeEventListener('abort',stop);unobserve();client.close();}
 }};
}
