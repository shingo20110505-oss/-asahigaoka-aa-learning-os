import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const BASE=(process.env.PAGE_URL||'https://shingo20110505-oss.github.io/-asahigaoka-aa-learning-os/').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
if(!SOURCE_SHA)throw new Error('SOURCE_SHA is required');
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!CHROME)throw new Error('Chromium/Chrome not found');
const PAGE=`${BASE}kokugo-chronologia/`;
const artifacts=path.resolve('qa-artifacts');await mkdir(artifacts,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fetchBytes(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer())}
async function waitPublic(){for(let i=1;i<=24;i++){try{const r=await fetch(`${BASE}release.json?kk=${encodeURIComponent(SOURCE_SHA)}-${i}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(r.ok){const j=await r.json();if(j.sourceSha===SOURCE_SHA)return j}}catch{}await sleep(5000)}throw new Error(`Published release did not reach ${SOURCE_SHA}`)}
const release=await waitPublic();
for(const file of ['kokugo-chronologia/koten-kanbun-normalization-v1.js','kokugo-chronologia/exam-quality-v1.js']){const local=readFileSync(file),remote=await fetchBytes(`${BASE}${file}?verify=${SOURCE_SHA}`);if(sha(local)!==sha(remote))throw new Error(`Public hash mismatch: ${file}`)}

async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.unref();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address();s.close(e=>e?reject(e):resolve(a.port))})})}
async function waitExit(p,t=2500){return await new Promise(resolve=>{if(p.exitCode!==null)return resolve();const timer=setTimeout(()=>{p.off('exit',done);resolve()},t);const done=()=>{clearTimeout(timer);resolve()};p.once('exit',done)})}
async function cleanup(p,profile){try{if(p.exitCode===null)p.kill('SIGTERM')}catch{}await waitExit(p);try{if(p.exitCode===null)p.kill('SIGKILL')}catch{}await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150}).catch(()=>{})}
const profile=path.join(os.tmpdir(),`rise-kk-${process.pid}-${Date.now()}`);await mkdir(profile,{recursive:true});
const port=await freePort();
const proc=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';proc.stderr.on('data',d=>stderr+=String(d));
let browserWs='';for(let i=0;i<150;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)});if(r.ok){const j=await r.json();if(j.webSocketDebuggerUrl){browserWs=j.webSocketDebuggerUrl;break}}}catch{}await sleep(180)}
if(!browserWs){await cleanup(proc,profile);throw new Error('Chrome DevTools startup failed '+stderr.slice(-1000))}
const pr=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});const pi=await pr.json();const ws=new WebSocket(pi.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
let seq=0;const pending=new Map(),events=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return}if(m.method==='Runtime.exceptionThrown')events.push({type:'exception',text:m.params?.exceptionDetails?.exception?.description||m.params?.exceptionDetails?.text||''});if(m.method==='Log.entryAdded')events.push({type:'log',level:m.params?.entry?.level||'',text:m.params?.entry?.text||''})};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function evalv(expression){const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,1000));return r.result?.value}
async function waitFor(expr,timeout=45000,label='condition'){const started=Date.now();while(Date.now()-started<timeout){const v=await evalv(expr).catch(()=>null);if(v)return v;await sleep(180)}throw new Error(`${label} timeout`)}
async function viewport(width,height,mobile){await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});await cmd('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1})}
async function navigate(tag){await cmd('Page.navigate',{url:`${PAGE}?verify=${encodeURIComponent(SOURCE_SHA)}&viewport=${tag}`});await waitFor(`document.readyState==='complete'`,30000,'document ready');await waitFor(`window.RISE_KOTEN_KANBUN_NORMALIZED_V1?.total===1700&&document.querySelector('#kkSection')`,45000,'normalized model')}
async function openSection(){await evalv(`(()=>{document.querySelector('[data-tab="kotenkanbun"]')?.click();return true})()`);await waitFor(`(()=>{const s=document.querySelector('#kkSection');return s&&getComputedStyle(s).display!=='none'&&s.querySelector('.kk-head h2')?.textContent==='古文・漢文 学習カード1700'})()`,15000,'classical section');await waitFor(`document.querySelectorAll('#kkRows .kk-row').length>0`,15000,'classical rows')}
async function screenshot(name){await evalv(`document.querySelector('#kkSection')?.scrollIntoView({block:'start'})`);await sleep(250);const r=await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(path.join(artifacts,name),Buffer.from(r.data,'base64'))}
async function diagnostics(){return await evalv(`(()=>{const m=window.RISE_KOTEN_KANBUN_NORMALIZED_V1,by=n=>m?.byRank?.get(n),summary=document.querySelector('#kkNormalizationSummary')?.textContent||'';return{title:document.title,heading:document.querySelector('.kk-head h2')?.textContent||'',summary,total:m?.total,uniqueConcepts:m?.uniqueConcepts,repeatCards:m?.repeatCards,counts:m?.counts,samples:[100,300,500,1000,1001,1201,1451].map(n=>({rank:n,band:by(n)?.displayBand,domain:by(n)?.domain,baseWord:by(n)?.baseWord,variantOf:by(n)?.variantOf,isRepeat:by(n)?.isRepeat})),firstTier:document.querySelector('#kkRows .kk-tier')?.textContent||'',firstCategory:document.querySelector('#kkRows .kk-cat')?.textContent||'',innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1}})()`)}
function validate(d,label){if(d.heading!=='古文・漢文 学習カード1700')throw new Error(`${label}: wrong heading ${d.heading}`);if(d.total!==1700||d.uniqueConcepts!==1000||d.repeatCards!==700)throw new Error(`${label}: model totals ${JSON.stringify(d)}`);for(const k of ['古語','敬語','文法','和歌','表現技法','古典常識','漢文'])if(!d.summary.includes(k)||!(d.counts?.[k]>0))throw new Error(`${label}: missing domain ${k}`);const expected=new Map([[100,'S 最優先'],[300,'A 頻出'],[500,'B 重要'],[1000,'C 発展'],[1001,'増補A'],[1201,'増補B'],[1451,'増補C']]);for(const x of d.samples)if(x.band!==expected.get(x.rank))throw new Error(`${label}: band ${x.rank}=${x.band}`);const v=d.samples.find(x=>x.rank===1001);if(v.baseWord!=='あはれ'||v.variantOf!==1||v.isRepeat!==true)throw new Error(`${label}: #1001 normalization ${JSON.stringify(v)}`);if(d.firstTier!=='S 最優先'||!d.firstCategory)throw new Error(`${label}: rendered metadata ${d.firstTier}/${d.firstCategory}`);if(d.overflow)throw new Error(`${label}: horizontal overflow ${d.scrollWidth}/${d.innerWidth}`)}
const STATE='{"__qa_preserve__":"review","kk0001":"learned"}',WRONG='[{"id":"__qa_wrong__","word":"保持","reading":"ほじ","type":"qa"}]';
try{
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Log.enable');
 await viewport(390,844,true);await navigate('mobile');await evalv(`localStorage.setItem('kokugoChronologiaStateV2',${JSON.stringify(STATE)});localStorage.setItem('aa_kokugo_vocab_wrong_queue_v1',${JSON.stringify(WRONG)});true`);await openSection();
 await evalv(`(()=>{window.__kkMut=0;const root=document.querySelector('#kkSection');window.__kkObs=new MutationObserver(m=>window.__kkMut+=m.length);window.__kkObs.observe(root,{childList:true,subtree:true});return true})()`);await sleep(900);const stableMut=await evalv(`window.__kkMut`);if(stableMut>2)throw new Error(`DOM normalization is not stable: ${stableMut} mutations while idle`);
 const mobile=await diagnostics();validate(mobile,'mobile');await screenshot('koten-kanbun-mobile-390x844.png');
 await viewport(1440,1000,false);await navigate('desktop');await openSection();const desktop=await diagnostics();validate(desktop,'desktop');await screenshot('koten-kanbun-desktop-1440x1000.png');
 const storage=await evalv(`({state:localStorage.getItem('kokugoChronologiaStateV2'),wrong:localStorage.getItem('aa_kokugo_vocab_wrong_queue_v1')})`);if(storage.state!==STATE||storage.wrong!==WRONG)throw new Error('Native Japanese learning history changed during read-only normalization QA');
 const blocking=events.filter(x=>x.type==='exception'||(x.type==='log'&&x.level==='error'));if(blocking.length)throw new Error('Browser errors: '+JSON.stringify(blocking.slice(-10)));
 const result={result:'success',sourceSha:SOURCE_SHA,page:PAGE,releaseSourceSha:release.sourceSha,normalizerVersion:'1.0.1',stableIdleMutations:stableMut,mobile,desktop,historyPreserved:true,screenshots:['koten-kanbun-mobile-390x844.png','koten-kanbun-desktop-1440x1000.png']};await writeFile(path.join(artifacts,'koten-kanbun-public-qa.json'),JSON.stringify(result,null,2));console.log('KOTEN_KANBUN_PUBLIC_QA='+JSON.stringify(result));console.log('KOTEN_KANBUN_PUBLIC_QA=PASS');
}catch(error){await screenshot('koten-kanbun-failure.png').catch(()=>{});await writeFile(path.join(artifacts,'koten-kanbun-failure.json'),JSON.stringify({error:String(error),events:events.slice(-50)},null,2)).catch(()=>{});throw error}finally{try{ws.close()}catch{}await cleanup(proc,profile)}
