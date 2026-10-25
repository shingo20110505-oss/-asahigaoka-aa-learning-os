import fs from 'node:fs/promises';
import path from 'node:path';
import {atomicJSON} from './atomic-json.mjs';

export class ConfigStore {
  constructor(privateDir){this.dir=path.resolve(privateDir);this.file=path.join(this.dir,'config.json');this.queue=Promise.resolve();}
  async read(){try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}
  async update(mutator){const task=this.queue.catch(()=>{}).then(async()=>{const next=await this.read();await mutator(next);await atomicJSON(this.file,next,{space:2});return next;});this.queue=task;return task;}
}
export const REASONING_EFFORTS=['low','medium','high','xhigh','max','ultra'];
export function codexSelection(config,role){
  const model=String((role==='guest'?config.guestCodexModel:config.ownerModel)||'').trim();
  const effort=String((role==='guest'?config.guestReasoningEffort:config.ownerReasoningEffort)||'').trim();
  if(model&&!/^[\w./-]{1,100}$/.test(model))throw Error('モデル名を確認してください');
  if(effort&&!REASONING_EFFORTS.includes(effort))throw Error('推論の強さを確認してください');
  return {model,effort};
}
export function guestProvider(config){const kind=config.guestProvider??'ollama';if(!['codex','ollama'].includes(kind))throw Error('ゲストの接続方法を確認してください');return kind;}
export function validOllama(value){
  if(!value||!value.model)return null;
  const u=new URL(value.url||'http://127.0.0.1:11434');
  if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('ゲストAIはPC内のOllama接続先を指定してください');
  if(typeof value.model!=='string'||!/^[\w.\/:@-]{1,150}$/.test(value.model))throw Error('モデル名を確認してください');
  return {url:u.origin,model:value.model};
}
export function validPublicOrigin(value){if(!value)return null;const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('接続先は https:// で始まるサイトのURLにしてください');return u.origin;}
