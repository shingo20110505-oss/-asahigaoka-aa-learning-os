let registration,starting,preparationTimer;
const loadedVersion=document.querySelector('meta[name="rise-build"]')?.content||'';
let lastCheck=0,dismissedVersion='';
let state={phase:'preparing',online:navigator.onLine,version:'',count:0};
export const offlineState=()=>({...state});
const publish=patch=>{state={...state,...patch,online:navigator.onLine};if(['ready','error','unsupported'].includes(state.phase))clearTimeout(preparationTimer);window.dispatchEvent(new Event('rise:offline'));};
const bounded=promise=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('保存準備が時間切れになりました')),12000);promise.then(resolve,reject).finally(()=>clearTimeout(timer));});
async function inspect(worker){
 if(!worker)return;
 const channel=new MessageChannel();
 const status=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{channel.port1.close();reject(Error('保存状態を確認できませんでした'));},8000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage({type:'RISE_OFFLINE_STATUS'},[channel.port2]);});
 if(status.ready){publish({phase:'ready',version:status.version,count:status.count});showUpdate(status.version);}
}
function showUpdate(version){
 if(!/^[a-f0-9]{12}$/.test(loadedVersion)||version===loadedVersion||version===dismissedVersion||document.getElementById('rise-update-notice'))return;
 // Never reload a form or chat draft automatically. Saved IndexedDB data stays intact.
 const notice=document.createElement('aside');notice.id='rise-update-notice';notice.className='app-update-notice';notice.setAttribute('aria-label','RISEの更新');
 notice.innerHTML='<p role="status">新しいRISEを使えます。<small>入力中の内容を保存してから更新してください。</small></p><a class="button primary">最新版を開く</a><button type="button" class="button secondary" aria-label="更新のお知らせを閉じる">後で</button>';
 const link=notice.querySelector('a');const destination=()=>{link.href='./update.html'+(location.hash||'#/home');};destination();link.onclick=destination;
 notice.querySelector('button').onclick=()=>{dismissedVersion=version;notice.remove();};document.body.append(notice);
}
function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed')worker.postMessage({type:'RISE_ACTIVATE'});if(worker.state==='activated')inspect(worker).catch(()=>{});if(worker.state==='redundant'&&state.phase!=='ready')publish({phase:'error'});});}
export async function prepareOffline(){
 if(starting)return starting;
 lastCheck=Date.now();
 if(!('serviceWorker'in navigator)){publish({phase:'unsupported'});return;}
 starting=(async()=>{try{if(state.phase!=='ready'){publish({phase:'preparing'});clearTimeout(preparationTimer);preparationTimer=setTimeout(()=>publish({phase:'error'}),60000);}registration=await bounded(navigator.serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'}));watch(registration.installing);registration.onupdatefound=()=>watch(registration.installing);registration.waiting?.postMessage({type:'RISE_ACTIVATE'});if(registration.active)await inspect(registration.active);await bounded(registration.update());}catch{if(state.phase!=='ready')publish({phase:'error'});}finally{starting=null;}})();return starting;
}
window.addEventListener('online',()=>{publish({});prepareOffline();});
window.addEventListener('offline',()=>publish({}));
const checkOnReturn=()=>{if(!document.hidden&&navigator.onLine&&Date.now()-lastCheck>60000)prepareOffline();};
window.addEventListener('pageshow',checkOnReturn);
document.addEventListener('visibilitychange',checkOnReturn);
navigator.serviceWorker?.addEventListener('controllerchange',()=>inspect(navigator.serviceWorker.controller).catch(()=>{}));
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='RISE_OFFLINE_READY')inspect(navigator.serviceWorker.controller||registration?.active).catch(()=>{});});
export function offlineDescription(){const s=offlineState();return s.phase==='ready'?`オフライン準備済み · 教材と画面 ${s.count}ファイルを保存${s.online?'':' · 現在オフライン'}`:s.phase==='preparing'?'オフライン用の教材を保存しています。この画面を開いたままお待ちください。':s.phase==='unsupported'?'このブラウザはオフライン保存に対応していません。':'オフライン保存を確認できません。通信とブラウザの保存設定を確認し、再試行してください。';}
