// Integration prototype. Not imported by the production chat until the A16 gate passes.
// Network availability affects the NEXT submission; it never replays an accepted/unknown POST.
export class OfflineSwitch{
 constructor({remote,local,onMode=()=>{}}){Object.assign(this,{remote,local,onMode,online:true,reachable:true,approved:false,cached:false,identity:null,revision:0,busy:false,blocked:false});}
 bind(identity){this.cancel();this.identity=identity?{...identity}:null;this.blocked=false;this.publish();}
 configure({approved,cached}){this.approved=approved===true;this.cached=cached===true;this.publish();}
 network({online,reachable=online}){this.online=online;this.reachable=reachable;this.publish();}
 mode(){if(!this.identity||this.blocked||this.identity.expires<=Date.now())return'locked';if(this.online&&this.reachable)return'remote';return this.approved&&this.cached?'local':'read-only';}
 publish(){this.onMode(this.mode());}
 cancel(){this.revision++;this.abort?.abort();this.abort=null;this.busy=false;}
 async send(prompt){
  if(this.busy)throw Error('回答中です');const mode=this.mode();if(mode==='locked'||mode==='read-only')throw Error(mode==='locked'?'ログインを確認してください':'オフライン用AIの準備が完了していません');
  const controller=new AbortController(),ticket=this.revision,identity={...this.identity};this.abort=controller;this.busy=true;
  try{
   const result=await (mode==='remote'?this.remote:this.local)(prompt,{signal:controller.signal,identity});
   if(ticket!==this.revision||controller.signal.aborted||this.identity?.id!==identity.id||this.identity?.role!==identity.role||this.identity.expires<=Date.now()||this.blocked||(mode==='local'&&(!this.approved||!this.cached)))throw new DOMException('利用条件が変わりました','AbortError');
   return{...result,mode,identity};
  }catch(error){
   if(ticket===this.revision){
    // Authentication and quota failures are not transport failures.
    if([401,403,429].includes(error.status))this.blocked=true;
    else if(mode==='remote'&&(error.network===true||error.name==='TypeError'))this.reachable=false;
    this.publish();
   }
   // Deliberately do not send this same question to the other backend.
   throw error;
  }finally{if(ticket===this.revision){this.busy=false;this.abort=null;}}
 }
}
