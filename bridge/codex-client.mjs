import {spawn} from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';

export const disabledFeatures=['apps','plugins','remote_plugin','memories','multi_agent','multi_agent_v2','shell_tool','unified_exec','shell_snapshot','browser_use','browser_use_external','computer_use','in_app_browser','image_generation','hooks','view_image','workspace_dependencies','code_mode_host','skill_search','skill_mcp_dependency_install','sleep_tool','goals'];
export function codexArguments({images=false}={}){return ['app-server','--stdio',...(images?['--enable','image_generation','--enable','code_mode_host']:[]),...disabledFeatures.filter(x=>!images||!['image_generation','code_mode_host'].includes(x)).flatMap(x=>['--disable',x]),'-c','web_search="disabled"','-c','mcp_servers={}','-c','project_doc_max_bytes=0','-c','approval_policy="never"','-c','default_permissions="rise-chat"','-c','permissions.rise-chat.filesystem={":workspace_roots"={"."="read"}}','-c','permissions.rise-chat.network.enabled=false','-c','cli_auth_credentials_store="file"'];}
export async function codexEnvironment(privateDir){
  const home=path.join(privateDir,'codex-owner'),cwd=path.join(privateDir,'codex-empty');
  await fs.mkdir(home,{recursive:true});await fs.mkdir(cwd,{recursive:true});
  const env={};for(const key of ['PATH','Path','SYSTEMROOT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','HOME','LOCALAPPDATA','APPDATA'])if(process.env[key])env[key]=process.env[key];
  env.CODEX_HOME=home;return {home,cwd,env};
}
export async function discoverCodex(){
  const base=process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'OpenAI','Codex','bin');
  if(base){try{const dirs=await fs.readdir(base,{withFileTypes:true}),candidates=[];for(const d of dirs.filter(x=>x.isDirectory())){const file=path.join(base,d.name,'codex.exe');try{candidates.push({file,mtime:(await fs.stat(file)).mtimeMs});}catch{}}candidates.sort((a,b)=>b.mtime-a.mtime);if(candidates.length)return candidates[0].file;}catch{}}
  return 'codex';
}
export class CodexClient {
  constructor({executable,cwd,env,args=codexArguments(),requestTimeout=30000}){
    this.pending=new Map();this.observers=new Set();this.next=1;this.closed=false;this.requestTimeout=requestTimeout;
    this.child=spawn(executable,args,{cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.child.stderr.on('data',()=>{});this.child.stdin.on('error',()=>{});
    this.lines=readline.createInterface({input:this.child.stdout});this.lines.on('line',line=>this.receive(line));
    this.child.on('error',()=>this.finish(Error('Codexを起動できません。実行ファイルの場所を確認してください。')));
    this.child.on('exit',(code)=>this.finish(Error('Codexとの接続が終了しました'+(code===null?'':'（終了コード '+code+'）'))));
  }
  receive(line){
    let message;try{message=JSON.parse(line);}catch{return;}
    if(message.id!==undefined&&!message.method){const pending=this.pending.get(message.id);this.pending.delete(message.id);if(pending){clearTimeout(pending.timer);message.error?pending.reject(Error(message.error.message||'Codexで処理できませんでした')):pending.resolve(message.result);}return;}
    if(message.id!==undefined&&message.method){this.send({id:message.id,error:{code:-32601,message:'RISE does not expose local tools, approvals or remote actions.'}});return;}
    for(const observe of this.observers)observe(message);
  }
  send(value){if(!this.closed&&!this.child.stdin.destroyed)this.child.stdin.write(JSON.stringify(value)+'\n');}
  request(method,params={}){
    if(this.closed)return Promise.reject(this.error||Error('Codex接続は閉じています'));
    return new Promise((resolve,reject)=>{const id=this.next++,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Codexの応答が時間切れになりました'));},this.requestTimeout);this.pending.set(id,{resolve,reject,timer});this.send({id,method,params});});
  }
  async initialize(){await this.request('initialize',{clientInfo:{name:'rise_learning',version:'6.0.0'},capabilities:{experimentalApi:true}});this.send({method:'initialized',params:{}});}
  observe(fn){this.observers.add(fn);return()=>this.observers.delete(fn);}
  finish(error){if(this.closed)return;this.closed=true;this.error=error;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();for(const observe of this.observers)observe({method:'rise/closed',params:{message:error.message}});}
  close(){this.finish(Error('Codex接続を閉じました'));this.lines.close();this.child.kill();}
}
export async function openCodex(privateDir,config={}){
  const environment=await codexEnvironment(privateDir),client=new CodexClient({executable:config.codexExecutable||await discoverCodex(),...environment,args:codexArguments({images:Boolean(config.imageMode)})});
  try{await client.initialize();return client;}catch(error){client.close();throw error;}
}
