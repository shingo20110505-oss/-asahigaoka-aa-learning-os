function ready(worker){return new Promise(resolve=>{if(!worker)return resolve(false);const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.chatTransport===1);};worker.postMessage({type:'RISE_CHAT_READY'},[channel.port2]);});}
export async function ensureChatConnection(){
  const sw=navigator.serviceWorker;if(!sw)throw Error('このブラウザではチャット接続を準備できません。Safariなどの通常のブラウザで開いてください。');
  if(await ready(sw.controller))return;
  const registration=await sw.register('./sw.js',{type:'module',updateViaCache:'none'});
  if(!registration.installing)await registration.update();
  const end=Date.now()+15000;
  while(Date.now()<end){
    if(registration.waiting)registration.waiting.postMessage({type:'RISE_ACTIVATE'});
    if(await ready(sw.controller))return;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw Error('接続の更新がまだ完了していません。RISEのタブを一度閉じ、開き直してください。');
}
