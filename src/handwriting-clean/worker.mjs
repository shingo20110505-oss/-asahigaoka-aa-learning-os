import {cleanPixels,maskPreview,MAX_PIXELS} from './engine.mjs';
self.onmessage=async({data:{id,file,options,preview=false}})=>{
  let bitmap;
  try{
    bitmap=await createImageBitmap(file);const {width,height}=bitmap;
    if(width*height>MAX_PIXELS)throw Error('1600万画素を超えています。画像を縮小してから選んでください。');
    const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();bitmap=null;
    const original=ctx.getImageData(0,0,width,height),result=cleanPixels(original,options);
    const shown=preview?maskPreview(original,result.mask):result;ctx.putImageData(new ImageData(shown.data,width,height),0,0);
    const blob=await canvas.convertToBlob({type:'image/png'});
    self.postMessage({id,blob,width,height,selected:result.selected,changed:result.changed,elapsedMs:result.elapsedMs});canvas.width=canvas.height=1;
  }catch(error){self.postMessage({id,error:String(error.message||error)});}finally{bitmap?.close();}
};
