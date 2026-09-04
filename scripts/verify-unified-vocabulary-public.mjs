import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const PAGE_URL=(process.env.PAGE_URL||'https://shingo20110505-oss.github.io/-asahigaoka-aa-learning-os/').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'public';
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!CHROME)throw new Error('Chromium/Chrome not found');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return await new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();const port=typeof address==='object'&&address?address.port:0;server.close(err=>err?reject(err):resolve(port))})})}
function waitChildExit(proc,timeout=2500){return new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode!==null)return resolve(true);let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(timer);proc.off('exit',onExit);resolve(v)};const onExit=()=>finish(true);const timer=setTimeout(()=>finish(false),timeout);proc.once('exit',onExit)})}
async function cleanup(proc,profile){try{if(proc.exitCode===null)proc.kill('SIGTERM')}catch{};if(!(await waitChildExit(proc))){try{if(proc.exitCode===null)proc.kill('SIGKILL')}catch{};await waitChildExit(proc)}await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:200}).catch(()=>{})}

const profile=path.join(os.tmpdir(),`rise-unified-vocab-${process.pid}-${Date.now()}`);
const artifacts=path.resolve('qa-artifacts');
await mkdir(profile,{recursive:true});
await mkdir(artifacts,{recursive:true});
const port=await freePort();
const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--metrics-recording-only',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'];
const proc=spawn(CHROME,args,{stdio:['ignore','ignore','pipe']});
let stderr='';proc.stderr.on('data',d=>{stderr+=String(d)});
let browserWs='';const startup=Date.now();
while(Date.now()-startup<30000){if(proc.exitCode!==null)break;try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1200)});if(response.ok){const info=await response.json();if(info.webSocketDebuggerUrl){browserWs=info.webSocketDebuggerUrl;break}}}catch{}await sleep(180)}
if(!browserWs){await cleanup(proc,profile);throw new Error(`DevTools startup timeout: ${stderr.slice(-1200)}`)}
const pageResponse=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT',signal:AbortSignal.timeout(5000)});
if(!pageResponse.ok){await cleanup(proc,profile);throw new Error(`Chrome page create failed: ${pageResponse.status}`)}
const pageInfo=await pageResponse.json();
const ws=new WebSocket(pageInfo.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=e=>{clearTimeout(timer);reject(e)}});
let seq=0;const pending=new Map(),events=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return}if(m.method==='Runtime.exceptionThrown')events.push({type:'exception',text:m.params?.exceptionDetails?.text||'',description:m.params?.exceptionDetails?.exception?.description||''});if(m.method==='Log.entryAdded')events.push({type:'log',level:m.params?.entry?.level||'',text:m.params?.entry?.text||''});if(m.method==='Network.loadingFailed')events.push({type:'network-failed',error:m.params?.errorText||'',url:m.params?.requestId||''})};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evaluate(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(`Runtime evaluate failed: ${JSON.stringify(r.exceptionDetails).slice(0,1200)}`);return r.result?.value}
async function waitFor(expression,timeout=90000,label='condition'){const started=Date.now();let last=null;while(Date.now()-started<timeout){last=await evaluate(expression).catch(()=>null);if(last)return last;await sleep(180)}throw new Error(`${label} timeout; last=${JSON.stringify(last)}`)}
async function setViewport(width,height,mobile){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});await cmd('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1})}
async function navigate(suffix=''){await cmd('Page.navigate',{url:`${PAGE_URL}quiz/?verify=${encodeURIComponent(SOURCE_SHA)}${suffix}`});await waitFor(`document.readyState==='complete'`,30000,'document ready')}
async function sourceDiagnostics(){return evaluate(`(()=>{const ef=document.getElementById('englishBridge'),sf=document.getElementById('socialBridge');const safe=f=>{try{return{src:f?.src||'',href:f?.contentWindow?.location?.href||'',ready:f?.contentDocument?.readyState||'',body:(f?.contentDocument?.body?.innerText||'').slice(0,240),englishFlag:!!f?.contentWindow?.AA_API_READING_ONLY,englishApi:!!f?.contentWindow?.AA_RISE_UNIFIED_ENGLISH_API,socialApi:!!f?.contentWindow?.AA_RISE_UNIFIED_SOCIAL_API,chronoItems:f?.contentDocument?.documentElement?.dataset?.chronologiaItems||'',chronoReady:f?.contentDocument?.documentElement?.dataset?.chronologiaReady||''}}catch(e){return{error:String(e)}}};return{version:document.documentElement.dataset.unifiedVocabularyQuiz||'',status:document.getElementById('connectionStatus')?.textContent||'',counts:['enCount','jaCount','soCount'].map(id=>document.getElementById(id)?.textContent||''),subs:['enSub','jaSub','soSub'].map(id=>document.getElementById(id)?.textContent||''),startDisabled:!!document.getElementById('startSession')?.disabled,english:safe(ef),social:safe(sf)}})()`)}
async function screenshot(name){const result=await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(path.join(artifacts,name),Buffer.from(result.data,'base64'))}
async function waitReady(){try{return await waitFor(`(()=>{const b=document.getElementById('startSession');const nums=['enCount','jaCount','soCount'].map(id=>Number((document.getElementById(id)?.textContent||'').replace(/[^0-9]/g,'')));return document.documentElement.dataset.unifiedVocabularyQuiz==='1.0.0'&&!b?.disabled&&nums[0]>=100&&nums[1]>=15000&&nums[2]>=1000?{nums,status:document.getElementById('connectionStatus')?.textContent||''}:null})()`,45000,'three-subject connection')}catch(error){const d=await sourceDiagnostics().catch(e=>({diagnosticError:String(e)}));console.error('UNIFIED_SOURCE_DIAGNOSTICS='+JSON.stringify(d));console.error('UNIFIED_BROWSER_EVENTS='+JSON.stringify(events.slice(-30)));await screenshot('unified-quiz-failure.png').catch(()=>{});await writeFile(path.join(artifacts,'unified-quiz-failure.json'),JSON.stringify({error:String(error),diagnostics:d,events:events.slice(-50)},null,2)).catch(()=>{});throw error}}
async function diagnostics(){return evaluate(`(()=>({title:document.title,version:document.documentElement.dataset.unifiedVocabularyQuiz||'',tabs:[...document.querySelectorAll('[data-subject]')].map(x=>x.textContent.trim()),status:document.getElementById('connectionStatus')?.textContent||'',counts:['enCount','jaCount','soCount'].map(id=>document.getElementById(id)?.textContent||''),startDisabled:!!document.getElementById('startSession')?.disabled,innerWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1,scienceVisible:(document.body.innerText||'').includes('理科'),legacyStore:localStorage.getItem('rise-unified-vocab-quiz-v1')!==null}))()`)}
async function click(selector){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true})()`)}
const firstQuestionReadyExpression=`(()=>{const x=document.getElementById('questionIndex')?.textContent||'';const first=(x.split('/')[0]||'').trim();return !document.getElementById('studyCard')?.classList.contains('hidden')&&first==='1'?x:null})()`;
async function startSubject(name){await click(`[data-subject="${name}"]`);await sleep(100);await click('#startSession');await waitFor(firstQuestionReadyExpression,30000,`${name} session start`)}
async function answerFirst(){return evaluate(`(()=>{const c=document.querySelector('#choices .choice:not(:disabled)');if(c){c.click();return 'choice'}const input=document.getElementById('answerInput');const submit=document.getElementById('submitAnswer');if(input&&submit&&!input.closest('.hidden')){input.value='__qa_wrong__';input.dispatchEvent(new Event('input',{bubbles:true}));submit.click();return 'input'}return ''})()`)}
async function waitFeedback(){return waitFor(`(()=>{const f=document.getElementById('feedback');return f&&!f.classList.contains('hidden')&&f.textContent.trim()?f.textContent.trim():null})()`,30000,'answer feedback')}

try{
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Log.enable');

 await setViewport(390,844,true);await navigate('&viewport=mobile');const mobileReady=await waitReady();const mobile=await diagnostics();
 if(mobile.hasHorizontalOverflow)throw new Error(`Mobile horizontal overflow: ${JSON.stringify(mobile)}`);
 if(mobile.tabs.join('/')!=='3教科ミックス/英語/国語/社会')throw new Error(`Wrong mobile tabs: ${mobile.tabs.join('/')}`);
 if(mobile.scienceVisible)throw new Error('Science leaked into unified quiz mobile UI');
 if(mobile.legacyStore)throw new Error('Legacy independent unified score store exists');
 await screenshot('unified-quiz-mobile-390x844.png');

 await setViewport(1440,1000,false);await navigate('&viewport=desktop');const desktopReady=await waitReady();const desktop=await diagnostics();
 if(desktop.hasHorizontalOverflow)throw new Error(`Desktop horizontal overflow: ${JSON.stringify(desktop)}`);
 if(desktop.tabs.join('/')!=='3教科ミックス/英語/国語/社会')throw new Error(`Wrong desktop tabs: ${desktop.tabs.join('/')}`);
 if(desktop.scienceVisible)throw new Error('Science leaked into unified quiz desktop UI');
 await screenshot('unified-quiz-desktop-1440x1000.png');

 const englishBefore=await evaluate(`localStorage.getItem('asahi_learning_os_v1')`);
 await startSubject('english');const enAction=await answerFirst();if(!enAction)throw new Error('English answer control unavailable');await waitFeedback();
 const englishAfter=await evaluate(`localStorage.getItem('asahi_learning_os_v1')`);
 if(!englishAfter||englishAfter===englishBefore)throw new Error('English native learning state did not change after answer');

 await click('[data-subject="japanese"]');await sleep(100);const jaCycleBefore=await evaluate(`localStorage.getItem('aa_kokugo_vocab_full15000_cycle_v1')`);await click('#startSession');await waitFor(firstQuestionReadyExpression,30000,'Japanese session start');const jaCycleAfter=await evaluate(`localStorage.getItem('aa_kokugo_vocab_full15000_cycle_v1')`);if(!jaCycleAfter||jaCycleAfter===jaCycleBefore)throw new Error('Japanese native no-repeat cycle did not update');

 const socialBefore=await evaluate(`localStorage.getItem('chronologia-aichi-v3')`);await startSubject('social');const soAction=await answerFirst();if(!soAction)throw new Error('Social answer control unavailable');await waitFeedback();const socialAfter=await evaluate(`localStorage.getItem('chronologia-aichi-v3')`);if(!socialAfter||socialAfter===socialBefore)throw new Error('Chronologia native progress did not change after answer');

 const result={version:'1.0.1',page:`${PAGE_URL}quiz/`,sourceSha:SOURCE_SHA,mobileReady,desktopReady,mobile,desktop,nativeWrites:{english:true,japaneseCycle:true,social:true},screenshots:['unified-quiz-mobile-390x844.png','unified-quiz-desktop-1440x1000.png']};
 console.log('UNIFIED_VOCAB_PUBLIC_QA='+JSON.stringify(result));
 await writeFile(path.join(artifacts,'unified-quiz-public-qa.json'),JSON.stringify(result,null,2));
 console.log('UNIFIED_VOCAB_PUBLIC_QA=PASS');
} finally {
 try{ws.close()}catch{};await cleanup(proc,profile);
}
