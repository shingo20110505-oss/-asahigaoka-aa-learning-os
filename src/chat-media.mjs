// Files stay files; videos are never mislabelled as native model video input.
export function mediaKind(file){const name=String(file.name||'').toLowerCase(),type=String(file.type||'');if(/\.mp4$/.test(name)||type==='video/mp4')return'video';if(/^image\/(png|jpeg|webp|gif)$/.test(type))return'image';return'file';}
export function bytesLabel(n){if(n<1024)return n+' B';const u=['KB','MB','GB','TB'];let i=-1;do{n/=1024;i++;}while(n>=1024&&i<u.length-1);return n.toFixed(n<10?1:0)+' '+u[i];}
export function timestamp(seconds){const n=Math.max(0,Math.floor(seconds));return(n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+'.'+Math.floor((Math.max(0,seconds)-n)*10);}
export function sampleTimes(duration,count=8){if(!Number.isFinite(duration)||duration<=0)throw Error('動画の長さを取得できません');count=Math.max(1,Math.min(12,Math.floor(count)));const end=Math.max(0,duration-.05);return Array.from({length:count},(_,i)=>count===1?end/2:end*i/(count-1));}
function eventOnce(element,event,signal,timeout=30000){return new Promise((resolve,reject)=>{let timer;const cleanup=()=>{clearTimeout(timer);element.removeEventListener(event,ok);element.removeEventListener('error',bad);signal?.removeEventListener('abort',abort);};const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(Error('この動画を再生できません。MP4の映像形式を確認してください。'));},abort=()=>{cleanup();reject(new DOMException('中止しました','AbortError'));};if(signal?.aborted)return abort();element.addEventListener(event,ok,{once:true});element.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{cleanup();reject(Error('動画の読み込みが時間切れになりました'));},timeout);});}
export async function extractFrames(file,{count=8,times,signal,onProgress=()=>{}}={}){
 const video=document.createElement('video'),url=URL.createObjectURL(file);video.preload='auto';video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');
 try{const ready=eventOnce(video,'loadeddata',signal);video.src=url;video.load();await ready;const duration=video.duration,points=times||sampleTimes(duration,count),ratio=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));if(!ratio||!video.videoWidth)throw Error('映像のないMP4です');if(points.length>12||points.some(t=>!Number.isFinite(t)||t<0||t>=duration))throw Error('動画内の時刻を12枚以内で選んでください');const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(video.videoWidth*ratio));canvas.height=Math.max(1,Math.round(video.videoHeight*ratio));const context=canvas.getContext('2d'),frames=[];
  for(let i=0;i<points.length;i++){if(signal?.aborted)throw new DOMException('中止しました','AbortError');const time=points[i];if(Math.abs(video.currentTime-time)>.001){const ready=eventOnce(video,'seeked',signal);video.currentTime=time;await ready;}context.drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob)throw Error('動画の静止画を作れませんでした');frames.push({time,file:new File([blob],file.name.replace(/\.mp4$/i,'')+'-'+i+'.jpg',{type:'image/jpeg'})});onProgress(i+1,points.length);}
  return{duration,width:video.videoWidth,height:video.videoHeight,frames};
 }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export async function fileFingerprint(file,{signal}={}){
 const metadata=new TextEncoder().encode(JSON.stringify({version:2,name:file.name,size:file.size,lastModified:file.lastModified,type:file.type}));
 let hash=new Uint8Array(await crypto.subtle.digest('SHA-256',metadata));
 // Hash every byte in bounded chunks. A prefix-only fingerprint could resume
 // a different MP4 with the same name, size and first video header.
 for(let offset=0;offset<file.size;offset+=1024*1024){
  signal?.throwIfAborted();
  const chunk=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.slice(offset,offset+1024*1024).arrayBuffer()));
  const pair=new Uint8Array(64);pair.set(hash);pair.set(chunk,32);hash=new Uint8Array(await crypto.subtle.digest('SHA-256',pair));
 }
 signal?.throwIfAborted();return[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function uploadFile(file,{api,signal,onProgress=()=>{}}){
 const fingerprint=await fileFingerprint(file,{signal});const upload=await api('/uploads',{method:'POST',body:{name:file.name,size:file.size,type:file.type||'application/octet-stream',fingerprint},signal});let offset=upload.offset;const chunkSize=upload.chunkSize;
 if(!Number.isSafeInteger(offset)||offset<0||offset>file.size||!Number.isSafeInteger(chunkSize)||chunkSize<1||chunkSize>4*1024*1024)throw Error('アップロードの応答が不正です');
 onProgress(offset,file.size);while(offset<file.size){if(signal?.aborted)throw new DOMException('中止しました','AbortError');const end=Math.min(file.size,offset+chunkSize);const result=await api('/uploads/'+encodeURIComponent(upload.id),{method:'PATCH',body:file.slice(offset,end),headers:{'Upload-Offset':String(offset),'Content-Type':'application/octet-stream'},signal});if(result.offset!==end)throw Error('送信位置が一致しません。再送信して再開してください。');offset=end;onProgress(offset,file.size);}
 return api('/uploads/'+encodeURIComponent(upload.id)+'/complete',{method:'POST',body:{},signal});
}
