let registration,starting,preparationTimer;
let state={phase:'preparing',online:navigator.onLine,version:'',count:0};
export const offlineState=()=>({...state});
const publish=patch=>{state={...state,...patch,online:navigator.onLine};if(['ready','error','unsupported'].includes(state.phase))clearTimeout(preparationTimer);window.dispatchEvent(new Event('rise:offline'));};
const bounded=promise=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('保存準備が時間切れになりました')),12000);promise.then(resolve,reject).finally(()=>clearTimeout(timer));});
async function inspect(worker){
 if(!worker)return;
 const channel=new MessageChannel();
 const status=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{channel.port1.close();reject(Error('保存状態を確認できませんでした'));},8000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage({type:'RISE_OFFLINE_STATUS'},[channel.port2]);});
 if(status.ready)publish({phase:'ready',version:status.version,count:status.count});
}
function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed')worker.postMessage({type:'RISE_ACTIVATE'});if(worker.state==='activated')inspect(worker).catch(()=>{});if(worker.state==='redundant'&&state.phase!=='ready')publish({phase:'error'});});}
export async function prepareOffline(){
 if(starting)return starting;
 if(!('serviceWorker'in navigator)){publish({phase:'unsupported'});return;}
 starting=(async()=>{try{if(state.phase!=='ready'){publish({phase:'preparing'});clearTimeout(preparationTimer);preparationTimer=setTimeout(()=>publish({phase:'error'}),60000);}registration=await bounded(navigator.serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'}));watch(registration.installing);registration.onupdatefound=()=>watch(registration.installing);registration.waiting?.postMessage({type:'RISE_ACTIVATE'});if(registration.active)await inspect(registration.active);await bounded(registration.update());}catch{if(state.phase!=='ready')publish({phase:'error'});}finally{starting=null;}})();return starting;
}
window.addEventListener('online',()=>{publish({});prepareOffline();});
window.addEventListener('offline',()=>publish({}));
navigator.serviceWorker?.addEventListener('controllerchange',()=>inspect(navigator.serviceWorker.controller).catch(()=>{}));
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='RISE_OFFLINE_READY')inspect(navigator.serviceWorker.controller||registration?.active).catch(()=>{});});
export function offlineDescription(){const s=offlineState();return s.phase==='ready'?`オフライン準備済み · 教材と画面 ${s.count}ファイルを保存${s.online?'':' · 現在オフライン'}`:s.phase==='preparing'?'オフライン用の教材を保存しています。この画面を開いたままお待ちください。':s.phase==='unsupported'?'このブラウザはオフライン保存に対応していません。':'オフライン保存を確認できません。通信とブラウザの保存設定を確認し、再試行してください。';}
