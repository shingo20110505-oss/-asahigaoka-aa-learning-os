import {cleanPixels,maskPreview,MAX_PIXELS} from './engine.mjs';
const abortError=()=>new DOMException('処理を中止しました','AbortError');
export function createCleaner(){
  let worker=null,seq=0,disposed=false,epoch=0,queue=Promise.resolve();const waiting=new Map();
  const stop=()=>{epoch++;worker?.terminate();worker=null;for(const p of waiting.values())p.reject(abortError());waiting.clear();};
  const start=()=>{if(worker)return worker;if(typeof Worker!=='function'||typeof OffscreenCanvas!=='function'||typeof createImageBitmap!=='function')return null;worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=waiting.get(data.id);if(!p)return;waiting.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data);};worker.onerror=()=>{for(const p of waiting.values())p.reject(Error('画像処理を開始できませんでした。再読み込みしてください。'));waiting.clear();worker?.terminate();worker=null;};return worker;};
  async function run(file,options={},preview=false,signal){
    if(disposed||signal?.aborted)throw abortError();const started=performance.now(),w=start();
    let result;
    if(w){const id=++seq;result=await new Promise((resolve,reject)=>{const abort=()=>{stop();reject(abortError());},timer=setTimeout(()=>{waiting.delete(id);worker?.terminate();worker=null;reject(Error('画像処理に時間がかかっています。画像を縮小してもう一度お試しください。'));},45000);signal?.addEventListener('abort',abort,{once:true});const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};waiting.set(id,{resolve:r=>{finish();resolve(r);},reject:e=>{finish();reject(e);}});w.postMessage({id,file,options,preview});});}
    else{
      const url=URL.createObjectURL(file),img=new Image();
      try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('この画像形式を開けません。PNGまたはJPEGに変換してください。'));img.src=url;});if(signal?.aborted)throw abortError();const width=img.naturalWidth,height=img.naturalHeight;if(width*height>MAX_PIXELS)throw Error('1600万画素を超えています。画像を縮小してから選んでください。');const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);await new Promise(resolve=>setTimeout(resolve,0));if(signal?.aborted)throw abortError();const original=ctx.getImageData(0,0,width,height),clean=cleanPixels(original,options),shown=preview?maskPreview(original,clean.mask):clean;ctx.putImageData(new ImageData(shown.data,width,height),0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=1;if(!blob)throw Error('画像を保存できませんでした。');result={blob,width,height,selected:clean.selected,changed:clean.changed,elapsedMs:clean.elapsedMs};}finally{URL.revokeObjectURL(url);}
    }
    if(disposed||signal?.aborted)throw abortError();return {...result,totalMs:performance.now()-started};
  }
  function process(file,options={},preview=false,signal){const ticket=epoch;const job=queue.catch(()=>{}).then(async()=>{if(ticket!==epoch||disposed||signal?.aborted)throw abortError();const result=await run(file,options,preview,signal);if(ticket!==epoch||disposed)throw abortError();return result;});queue=job;return job;}
  return {process,cancel:stop,dispose(){disposed=true;stop();}};
}
