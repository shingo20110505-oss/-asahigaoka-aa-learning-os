import {fileFingerprint,mediaKind,uploadFile} from './chat-media.mjs';

// Scoped to one authenticated chat session. Preparing reads local bytes only;
// network uploads still start when the user presses Send.
export class ChatUploads {
  constructor({api,transfer=uploadFile}={}) { this.api=api;this.transfer=transfer;this.generation=0;this.reset(); }
  reset() {
    this.controller?.abort();this.controller=new AbortController();this.generation++;
    this.fingerprints=new WeakMap();this.saved=new WeakMap();
  }
  fingerprint(file) {
    let value=this.fingerprints.get(file);
    if(!value){const cache=this.fingerprints;value=fileFingerprint(file,{signal:this.controller.signal});cache.set(file,value);value.catch(()=>{if(cache.get(file)===value)cache.delete(file);});}
    return value;
  }
  prepare(files) {
    const generation=this.generation,images=files.map(f=>f.file).filter(f=>mediaKind(f)==='image'&&f.size<=12*1024*1024);let next=0;
    const run=async()=>{while(generation===this.generation&&next<images.length){const file=images[next++];await this.fingerprint(file).catch(()=>{});}};
    return Promise.all([run(),run()]);
  }
  remember(file,saved) { if(saved?.id)this.saved.set(file,saved); }
  async send(files,{signal,onProgress=()=>{}}={}) {
    signal?.throwIfAborted();
    const generation=this.generation,controller=new AbortController(),stop=()=>controller.abort();
    const sessionSignal=this.controller.signal;
    signal?.addEventListener('abort',stop,{once:true});sessionSignal.addEventListener('abort',stop,{once:true});
    if(signal?.aborted||sessionSignal.aborted)stop();
    const groups=files.map(f=>[f.file,...(f.frames||[]).map(fr=>fr.file)]),unique=[...new Set(groups.flat())],sent=new Map(),progress=new Map();let next=0,failure;
    const paint=()=>groups.forEach((group,index)=>onProgress(index,group.reduce((n,f)=>n+(progress.get(f)||0),0),group.reduce((n,f)=>n+f.size,0)));
    const run=async()=>{
      while(!controller.signal.aborted&&next<unique.length){
        const file=unique[next++];
        try{
          let saved=this.saved.get(file);
          if(!saved){const fingerprint=await this.fingerprint(file);controller.signal.throwIfAborted();saved=await this.transfer(file,{api:this.api,signal:controller.signal,fingerprint,onProgress:n=>{if(!controller.signal.aborted){progress.set(file,n);paint();}}});}
          controller.signal.throwIfAborted();if(generation!==this.generation)throw new DOMException('利用者が変わりました','AbortError');
          this.saved.set(file,saved);sent.set(file,saved);progress.set(file,file.size);paint();
        }catch(error){failure??=error;controller.abort();}
      }
    };
    try{
      await Promise.all([run(),run()]);
      if(failure)throw failure;controller.signal.throwIfAborted();
      return files.map(f=>({id:sent.get(f.file).id,frames:(f.frames||[]).map(fr=>({id:sent.get(fr.file).id,time:fr.time})),duration:f.duration}));
    }finally{signal?.removeEventListener('abort',stop);sessionSignal.removeEventListener('abort',stop);}
  }
}
