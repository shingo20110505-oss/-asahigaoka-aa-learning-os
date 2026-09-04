import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const PAGE_URL=(process.env.PAGE_URL||'').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!PAGE_URL||!SOURCE_SHA)throw new Error('PAGE_URL and SOURCE_SHA are required');
if(!CHROME)throw new Error('Chromium/Chrome not found');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return await new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();const port=typeof address==='object'&&address?address.port:0;server.close(err=>err?reject(err):resolve(port))})})}
function waitChildExit(proc,timeout=2500){return new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null)return resolve(true);let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);proc.off('exit',onExit);resolve(v)};const onExit=()=>finish(true);const timer=setTimeout(()=>finish(false),timeout);proc.once('exit',onExit)})}
async function cleanup(proc,profile){try{if(proc.exitCode===null)proc.kill('SIGTERM')}catch{};if(!(await waitChildExit(proc))){try{if(proc.exitCode===null)proc.kill('SIGKILL')}catch{};await waitChildExit(proc)}await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:200}).catch(()=>{})}

const profile=path.join(os.tmpdir(),`rise-quality-cdp-${process.pid}-${Date.now()}`);
await mkdir(profile,{recursive:true});
const port=await freePort();
const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--metrics-recording-only',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'];
const proc=spawn(CHROME,args,{stdio:['ignore','ignore','pipe']});
let stderr='';proc.stderr.on('data',d=>{stderr+=String(d)});
let browserWs='';const startup=Date.now();
while(Date.now()-startup<30000){
 if(proc.exitCode!==null)break;
 try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1200)});if(response.ok){const info=await response.json();if(info.webSocketDebuggerUrl){browserWs=info.webSocketDebuggerUrl;break}}}catch{}
 await sleep(180);
}
if(!browserWs){await cleanup(proc,profile);throw new Error(`DevTools startup timeout: ${stderr.slice(-1200)}`)}
const pageResponse=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT',signal:AbortSignal.timeout(5000)});
if(!pageResponse.ok){await cleanup(proc,profile);throw new Error(`Chrome page create failed: ${pageResponse.status}`)}
const pageInfo=await pageResponse.json();
const ws=new WebSocket(pageInfo.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=e=>{clearTimeout(timer);reject(e)}});
let seq=0;
const pending=new Map();
const documents=[];
ws.onmessage=e=>{
 const m=JSON.parse(e.data);
 if(m.id&&pending.has(m.id)){
  const p=pending.get(m.id);pending.delete(m.id);
  m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);
  return;
 }
 if(m.method==='Network.requestWillBeSent'&&m.params?.type==='Document')documents.push({url:m.params.request?.url||'',initiator:m.params.initiator||null,loaderId:m.params.loaderId||''});
};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(`Runtime evaluate failed: ${JSON.stringify(r.exceptionDetails).slice(0,1200)}`);return r.result?.value}
async function diagnostics(){return evaluate(`(()=>{const text=document.body?.innerText||'';return {href:location.href,ready:document.readyState,quality:document.documentElement.dataset.aaQualityCi||'',route:document.documentElement.dataset.riseRoute||'',booting:document.documentElement.classList.contains('aa-app-booting'),brand:document.querySelector('#app .brand h1')?.textContent?.trim()||'',navOwner:window.__RISE_NAVIGATION_V1__?.version||'',iaVersion:window.__RISE_INFORMATION_ARCHITECTURE_V1__?.version||'',shellGuard:window.__RISE_LEGACY_SHELL_GUARD_V1__?.version||'',shellBlocked:window.__RISE_LEGACY_SHELL_GUARD_V1__?.blocked||0,settingsCore:window.__AA_SETTINGS_IMPROVEMENTS_CORE_V1__?.version||'',runtimeError:document.documentElement.dataset.riseRuntimeError||'',navigationError:document.documentElement.dataset.riseNavigationError||'',legacyTitle:text.includes('旭丘AA Learning OS'),legacySubtitle:text.includes('愛知県入試・当日再現性を最優先'),navLabels:[...document.querySelectorAll('.navin span')].map(x=>x.textContent?.trim()).filter(Boolean),qualityResult:window.__AA_QUALITY_CI_RESULT__||null,text:text.slice(0,1600)}})()`)}
async function close(){try{ws.close()}catch{};await cleanup(proc,profile)}

try{
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
 const url=`${PAGE_URL}?aa_quality_ci=1&visual_verify=1&verify=${encodeURIComponent(SOURCE_SHA)}`;
 await cmd('Page.navigate',{url});
 const started=Date.now();
 let state=null;
 while(Date.now()-started<90000){
  state=await diagnostics().catch(()=>null);
  if(state?.quality==='PASS'||state?.quality==='FAIL')break;
  await sleep(150);
 }
 if(!state||!['PASS','FAIL'].includes(state.quality)){
  state=await diagnostics().catch(()=>state);
  console.error('RISE_QUALITY_TIMEOUT='+JSON.stringify(state));
  console.error('RISE_DOCUMENTS='+JSON.stringify(documents.slice(-6)));
  throw new Error('Rise production quality audit did not finish');
 }
 console.log('AA_QUALITY_CI='+JSON.stringify(state.qualityResult));
 console.log('RISE_QUALITY_DIAGNOSTICS='+JSON.stringify({...state,qualityResult:undefined}));
 const html=await evaluate('document.documentElement.outerHTML');
 await writeFile('/tmp/quality-runtime.html',html);
 if(state.quality!=='PASS')throw new Error(`Quality audit failed: ${JSON.stringify(state.qualityResult)}`);
 const required=['英単語穴埋め・答え露出防止','段階学習プラン','Gemini教材一覧・文法ゲート','Gemini長文・根拠・実戦モード','愛知県型数学・応用検算','長文と単語の学習記録連携','非API長文の出題廃止'];
 const text=state.text+(state.qualityResult?JSON.stringify(state.qualityResult):'');
 for(const token of required)if(!text.includes(token))throw new Error(`Quality evidence missing: ${token}`);
 if(state.brand!=='Rise')throw new Error(`Wrong production brand: ${state.brand||'-'}`);
 if(state.navOwner!=='1.0.5')throw new Error(`Wrong navigation owner: ${state.navOwner||'-'}`);
 if(state.iaVersion!=='1.0.1')throw new Error(`Wrong information architecture: ${state.iaVersion||'-'}`);
 if(state.shellGuard!=='1.0.0')throw new Error(`Legacy shell guard missing: ${state.shellGuard||'-'}`);
 if(state.booting)throw new Error('Rise boot guard did not reveal the production UI');
 if(state.runtimeError||state.navigationError)throw new Error(`Rise runtime error: ${state.runtimeError||state.navigationError}`);
 if(state.legacyTitle||state.legacySubtitle)throw new Error('Legacy AA shell became visible during quality audit');
 if(state.navLabels.join('/')!=='ホーム/入試/学習/復習')throw new Error(`Wrong navigation labels: ${state.navLabels.join('/')}`);
 if(documents.filter(d=>d.url.startsWith(PAGE_URL)).length!==1)throw new Error(`Unexpected document navigation during quality audit: ${JSON.stringify(documents)}`);
 console.log('RISE_QUALITY_CDP=PASS');
} finally {
 await close();
}
