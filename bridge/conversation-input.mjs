import fs from 'node:fs/promises';
import path from 'node:path';
import {chatLimits,validateChatInput} from '../src/chat-policy.mjs';
export async function inputs({messages,privateDir,role='owner',contextBudget}){
 const limits=chatLimits(role),latest=messages.at(-1),cache=new Map();
 const meta=async id=>{if(!/^[a-zA-Z0-9_-]+$/.test(id))throw Error('添付の識別子が不正です');if(!cache.has(id))cache.set(id,fs.readFile(path.join(privateDir,'files',id+'.json'),'utf8').then(JSON.parse));return cache.get(id);};
 const files=[];for(const f of latest?.files||[])files.push({...await meta(f.id),frames:await Promise.all((f.frames||[]).map(fr=>meta(fr.id)))});
 if(latest)validateChatInput({text:latest.text,files},limits);
 const selected=new Set(),seen=new Set();let omitted=false,imageCount=0;
 // The newest images get priority, but earlier images in this conversation are
 // inputs too. Nothing is read from other threads or another user's directory.
 const history=latest?.study?.mode==='clean'?[latest]:messages;
 for(const m of [...history].reverse())for(const f of [...(m.files||[])].reverse()){
  try{const x=await meta(f.id),candidates=x.kind==='image'?[{id:f.id,meta:x}]:(f.frames||[]).map(fr=>({id:fr.id}));
   for(const c of candidates){if(seen.has(c.id))continue;seen.add(c.id);const info=c.meta||await meta(c.id);if(imageCount<limits.maxImages&&info.size<=limits.maxImageBytes){selected.add(c.id);imageCount++;}else omitted=true;}
  }catch{omitted=true;}
 }
 let remaining=Math.max(0,Math.min(limits.maxContext,contextBudget??limits.maxContext));
 const groups=[],sent=new Set(),recentStart=Math.max(0,messages.length-30);omitted||=recentStart>0;
 const visitedFiles=new Set();
 for(let at=messages.length-1;at>=0;at--){const m=messages[at],images=[],old=at<recentStart;let text=old?'過去の添付資料':(m.role==='user'?'利用者':'AIの以前の回答')+': '+m.text;
  for(const f of m.files||[]){if(visitedFiles.has(f.id))continue;visitedFiles.add(f.id);
   try{const x=await meta(f.id),file=path.join(privateDir,'blobs',f.id);text+='\n添付: '+x.name;
    if(x.kind==='image'){if(selected.has(f.id)&&!sent.has(f.id)){images.push({type:'text',text:'同じ会話の添付画像: '+x.name},{type:'localImage',path:file});sent.add(f.id);}else text+='（今回の画像入力には含まれません。必要なら会話の資料から再添付してください。）';}
    else if(x.kind==='video'){text+='（音声・連続映像は未入力）';for(const frame of f.frames||[])if(selected.has(frame.id)&&!sent.has(frame.id)){images.push({type:'text',text:'動画「'+x.name+'」の '+Number(frame.time).toFixed(2)+' 秒の静止画'},{type:'localImage',path:path.join(privateDir,'blobs',frame.id)});sent.add(frame.id);}}
    else if(/\.(txt|md|csv|json)$/i.test(x.name)){if(x.size>500000){text+='\n大きなテキストは内容を省略しています。必要な部分を分けてください。';omitted=true;}else text+='\nファイル内容:\n'+await fs.readFile(file,'utf8');}
    else text+='\nこの形式の中身は入力されていません。必要な部分を画像かテキストで送ってください。';
   }catch{text+='\nこの添付は読み込めませんでした。内容を推測せず再添付を依頼してください。';omitted=true;}
  }
  if(old&&text==='過去の添付資料')continue;
  if(text.length>remaining){text=text.slice(0,remaining);omitted=true;}remaining-=text.length;
  if(text||images.length)groups.unshift([...(text?[{type:'text',text}]:[]),...images]);
 }
 const result=[...(omitted?[{type:'text',text:'入力上限により一部の過去の本文・画像を省略しています。見えていない内容を読めたように答えず、必要な資料の再指定を求めてください。'}]:[]),...groups.flat()];result.omitted=omitted;return result;
}
