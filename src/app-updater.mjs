// The worker fetches this updater from the network, with an offline fallback.
const status=document.getElementById('status'),retry=document.getElementById('retry'),back=document.getElementById('back');
const route=/^#\/[\w/?=&%+.-]*$/.test(location.hash)?location.hash:'#/materials';back.href='./'+route;
function bounded(promise,ms=12000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('通信が時間切れになりました。オンラインで再試行してください。')),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});}
async function versionOf(worker){if(!worker)return '';const channel=new MessageChannel();return new Promise(resolve=>{const timer=setTimeout(()=>{channel.port1.close();resolve('');},1500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.ready?e.data.version:'');};worker.postMessage({type:'RISE_OFFLINE_STATUS'},[channel.port2]);});}
async function update(){
 retry.hidden=true;back.hidden=true;status.textContent='画面と教材を更新しています。少しお待ちください。';
 try{
  if(!('serviceWorker'in navigator))throw Error('このブラウザはアプリの更新に対応していません。対応ブラウザで開いてください。');
  const response=await bounded(fetch('./version.json?check='+Date.now(),{cache:'no-store'}));if(!response.ok)throw Error('更新情報を取得できません。通信を確認して再試行してください。');
  const {version}=await response.json();if(!/^[a-f0-9]{12}$/.test(version))throw Error('更新情報を確認できませんでした。');
  const registration=await bounded(navigator.serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'}));
  await bounded(registration.update());const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   registration.waiting?.postMessage({type:'RISE_ACTIVATE'});
   if(await versionOf(navigator.serviceWorker.controller)===version){location.replace('./'+route);return;}
   await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw Error('まだ新しい画面の保存が完了していません。オンラインのまま、もう一度確認してください。');
 }catch(error){status.textContent=error.message;retry.hidden=false;back.hidden=false;}
}
retry.onclick=update;update();