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

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();server.close(error=>error?reject(error):resolve(typeof address==='object'&&address?address.port:0));});});}
function waitExit(process,timeout=2500){return new Promise(resolve=>{if(process.exitCode!==null||process.signalCode!==null)return resolve(true);let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);process.off('exit',onExit);resolve(value);};const onExit=()=>finish(true);const timer=setTimeout(()=>finish(false),timeout);process.once('exit',onExit);});}
async function cleanup(process,profile){try{if(process.exitCode===null)process.kill('SIGTERM');}catch(_){}if(!(await waitExit(process))){try{if(process.exitCode===null)process.kill('SIGKILL');}catch(_){}await waitExit(process);}await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:200}).catch(()=>{});}

const profile=path.join(os.tmpdir(),`rise-unified-v2-${process.pid}-${Date.now()}`);
const artifacts=path.resolve('qa-artifacts');await mkdir(profile,{recursive:true});await mkdir(artifacts,{recursive:true});
const port=await freePort();
const browser=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--metrics-recording-only',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';browser.stderr.on('data',chunk=>{stderr+=String(chunk);});
let browserWs='';const startup=Date.now();
while(Date.now()-startup<30000){
 if(browser.exitCode!==null)break;
 try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1200)});if(response.ok){browserWs=(await response.json()).webSocketDebuggerUrl||'';if(browserWs)break;}}catch(_){}
 await sleep(180);
}
if(!browserWs){await cleanup(browser,profile);throw new Error(`DevTools startup timeout: ${stderr.slice(-1200)}`);}
const pageResponse=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT',signal:AbortSignal.timeout(5000)});
const pageInfo=await pageResponse.json();const ws=new WebSocket(pageInfo.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=reject;});
let sequence=0;const pending=new Map(),events=[];
ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(JSON.stringify(message.error))):entry.resolve(message.result);return;}if(message.method==='Runtime.exceptionThrown')events.push({type:'exception',text:message.params?.exceptionDetails?.text||'',description:message.params?.exceptionDetails?.exception?.description||''});if(message.method==='Log.entryAdded'&&message.params?.entry?.level==='error')events.push({type:'log',text:message.params.entry.text||''});};
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(`Runtime evaluate failed: ${JSON.stringify(result.exceptionDetails).slice(0,1600)}`);return result.result?.value;}
async function waitFor(expression,timeout=60000,label='condition'){const started=Date.now();let last=null;while(Date.now()-started<timeout){last=await evaluate(expression).catch(()=>null);if(last)return last;await sleep(150);}throw new Error(`${label} timeout; last=${JSON.stringify(last)}`);}
async function viewport(width,height,mobile){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});await command('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1});}
async function navigate(suffix=''){await command('Page.navigate',{url:`${PAGE_URL}quiz/?verify=${encodeURIComponent(SOURCE_SHA)}${suffix}`});await waitFor(`document.readyState==='complete'`,30000,'document ready');}
async function screenshot(name){const result=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(path.join(artifacts,name),Buffer.from(result.data,'base64'));}
async function click(selector){const ok=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return false;element.click();return true;})()`);if(!ok)throw new Error(`Missing clickable element: ${selector}`);}
async function setValue(selector,value){const actual=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element||![...element.options].some(option=>option.value===${JSON.stringify(value)}))return null;element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('change',{bubbles:true}));return element.value;})()`);if(actual!==value)throw new Error(`Could not set ${selector}=${value}; actual=${actual}`);}
async function waitReady(){return waitFor(`(()=>{const api=window.RISE_UNIFIED_QUIZ_V2,button=document.getElementById('startSession'),counts=api?.counts?.();return document.documentElement.dataset.unifiedVocabularyQuiz==='2.0.0'&&counts?.english>=100&&counts?.japanese>=15000&&counts?.classical===700&&counts?.kanbun===300&&counts?.social>=1000&&!button?.disabled?counts:null;})()`,70000,'three-subject v2 readiness');}
async function setWrongOnly(wanted){const current=await evaluate(`document.getElementById('focusToggle')?.classList.contains('on')`);if(Boolean(current)!==Boolean(wanted))await click('#focusToggle');}
async function start(config){
 await click(`[data-subject="${config.subject}"]`);await sleep(40);
 if(config.filterA)await setValue('#filterA',config.filterA);
 if(config.filterB)await setValue('#filterB',config.filterB);
 if(config.mode)await setValue('#quizMode',config.mode);
 await setValue('#sessionCount',config.count||'10');await setWrongOnly(Boolean(config.wrongOnly));await click('#startSession');
 return waitFor(`(()=>{const q=window.RISE_UNIFIED_QUIZ_V2?.current?.();return q&&!document.getElementById('studyCard')?.classList.contains('hidden')?q:null;})()`,30000,`${config.subject} ${config.mode||''} start`);
}
async function current(){return evaluate(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||null`);}
async function answer(correct=false){
 const result=await evaluate(`(()=>{const q=window.RISE_UNIFIED_QUIZ_V2?.current?.();if(!q)return null;const choices=[...document.querySelectorAll('#choices .choice:not(:disabled)')];if(choices.length){const button=choices.find(item=>${correct?'item.textContent.trim()===String(q.answer).trim()':'item.textContent.trim()!==String(q.answer).trim()'});if(!button)return null;button.click();return{key:q.key,source:q.source,mode:q.mode,type:'choice'};}const input=document.getElementById('answerInput'),submit=document.getElementById('submitAnswer');if(!input||!submit)return null;input.value=${correct?'String(q.answer).replace(/年$/,\'\')':"'__qa_wrong__'"};input.dispatchEvent(new Event('input',{bubbles:true}));submit.click();return{key:q.key,source:q.source,mode:q.mode,type:'input'};})()`);
 if(!result)throw new Error('No answer control for current question');
 await waitFor(`(()=>{const feedback=document.getElementById('feedback');return feedback&&!feedback.classList.contains('hidden')&&feedback.textContent.trim();})()`,20000,'answer feedback');
 return result;
}
async function next(){await click('#nextQuestion');return waitFor(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||!document.getElementById('summary')?.classList.contains('hidden')`,20000,'next question or summary');}

try{
 await command('Page.enable');await command('Runtime.enable');await command('Log.enable');
 await viewport(390,844,true);await navigate('&viewport=mobile');const mobileReady=await waitReady();
 const mobile=await evaluate(`(()=>({version:document.documentElement.dataset.unifiedVocabularyQuiz,tabs:[...document.querySelectorAll('[data-subject]')].map(item=>item.textContent.trim()),counts:window.RISE_UNIFIED_QUIZ_V2.counts(),status:document.getElementById('connectionStatus')?.textContent||'',wrongSummary:document.getElementById('wrongReviewSummary')?.textContent||'',overflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1,legacyScripts:[...document.scripts].map(script=>script.src).filter(src=>/review-algorithm|infinite-course/.test(src)),legacyStore:localStorage.getItem('rise-unified-vocab-quiz-v1')!==null,quality:window.__AA_RISE_UNIFIED_JAPANESE_QUALITY__||null}))()`);
 if(mobile.overflow||mobile.tabs.join('/')!=='3教科ミックス/英語/国語/社会'||mobile.legacyScripts.length||mobile.legacyStore)throw new Error(`Mobile shell regression: ${JSON.stringify(mobile)}`);
 if(!mobile.wrongSummary.includes('英語')||!mobile.wrongSummary.includes('古文')||!mobile.wrongSummary.includes('社会'))throw new Error(`Wrong summary incomplete: ${mobile.wrongSummary}`);
 if(mobile.quality?.runtimeVersion!=='2.0.0'||!(mobile.quality?.verified>0)||!(mobile.quality?.pendingEditorial>0))throw new Error(`Japanese quality diagnostics invalid: ${JSON.stringify(mobile.quality)}`);
 await screenshot('unified-quiz-v2-mobile-390x844.png');

 const englishStateBefore=await evaluate(`localStorage.getItem('asahi_learning_os_v1')`);
 const englishModes={
  'en-ja':{label:'英→日',input:false},
  'ja-en':{label:'日→英',input:false},
  spell:{label:'スペル',input:true}
 };
 for(const [mode,expected] of Object.entries(englishModes)){
  const question=await start({subject:'english',mode,filterA:'word',filterB:'all'});
  if(question.kind!=='word'||!question.mode.startsWith(expected.label)||question.input!==expected.input)throw new Error(`English mode/filter mismatch ${mode}: ${JSON.stringify(question)}`);
 }
 await answer(false);
 const englishStateAfter=await evaluate(`localStorage.getItem('asahi_learning_os_v1')`);
 if(!englishStateAfter||englishStateAfter===englishStateBefore)throw new Error('English native SRS state did not change');

 const jaCycleBefore=await evaluate(`localStorage.getItem('aa_kokugo_vocab_full15000_cycle_v1')`);
 const jaExpected={meaning:'語句→意味',reading:'語句→読み',word:'意味→語句'};
 for(const [mode,label] of Object.entries(jaExpected)){
  const question=await start({subject:'japanese',mode,filterA:'vocab',filterB:'all'});
  if(question.source!=='japanese-vocab'||!question.mode.startsWith(label))throw new Error(`Japanese vocabulary mode mismatch ${mode}: ${JSON.stringify(question)}`);
 }
 const jaCycleAfter=await evaluate(`localStorage.getItem('aa_kokugo_vocab_full15000_cycle_v1')`);
 if(!jaCycleAfter||jaCycleAfter===jaCycleBefore)throw new Error('Japanese no-repeat cycle did not change');

 const classicKeys=[];
 for(const mode of ['meaning','reading','word']){
  const question=await start({subject:'japanese',mode,filterA:'classical',filterB:'S'});
  if(question.source!=='classical'||!question.mode.includes(jaExpected[mode]))throw new Error(`Classical mode mismatch ${mode}: ${JSON.stringify(question)}`);
  classicKeys.push(question.key);
 }
 if(new Set(classicKeys).size!==classicKeys.length)throw new Error(`Classical persistent cycle repeated: ${classicKeys.join(',')}`);
 const kanbun=await start({subject:'japanese',mode:'meaning',filterA:'kanbun',filterB:'A'});
 if(kanbun.source!=='kanbun'||!kanbun.mode.includes('語句→意味'))throw new Error(`Kanbun filter mismatch: ${JSON.stringify(kanbun)}`);

 const socialBefore=await evaluate(`localStorage.getItem('chronologia-aichi-v3')`);
 const socialInput=await start({subject:'social',mode:'eventToYear',filterA:'all',filterB:'all'});
 if(!socialInput.input||!socialInput.mode.startsWith('出来事→年号'))throw new Error(`Social event-to-year mismatch: ${JSON.stringify(socialInput)}`);
 await answer(false);
 const socialAfter=await evaluate(`localStorage.getItem('chronologia-aichi-v3')`);
 if(!socialAfter||socialAfter===socialBefore)throw new Error('Social native progress did not change');
 const socialChoice=await start({subject:'social',mode:'yearToEvent',filterA:'all',filterB:'all'});
 if(socialChoice.input||!socialChoice.mode.startsWith('年号→出来事'))throw new Error(`Social year-to-event mismatch: ${JSON.stringify(socialChoice)}`);

 await start({subject:'mixed',filterA:'balanced',filterB:'all',count:'10'});
 const mixedKeys=[],mixedSubjects=new Set();
 for(let index=0;index<10;index++){
  const q=await current();mixedKeys.push(q.key);mixedSubjects.add(q.subject);await answer(false);await next();
 }
 const mixedSummary=await evaluate(`({title:document.getElementById('summaryTitle')?.textContent||'',score:document.getElementById('summaryScore')?.textContent||''})`);
 if(new Set(mixedKeys).size!==10||[...mixedSubjects].sort().join('/')!=='english/japanese/social'||mixedSummary.score!=='0 / 10')throw new Error(`Mixed finite session invalid: ${JSON.stringify({mixedKeys,mixedSubjects:[...mixedSubjects],mixedSummary})}`);
 await click('#restartSession');await waitFor(`window.RISE_UNIFIED_QUIZ_V2?.current?.()`,20000,'restart');
 const restored=await evaluate(`window.RISE_UNIFIED_QUIZ_V2.snapshot()`);
 if(restored.subject!=='mixed'||restored.count!=='10'||restored.filterA!=='balanced'||restored.wrongOnly)throw new Error(`Restart did not restore config: ${JSON.stringify(restored)}`);

 await viewport(1440,1000,false);await navigate('&viewport=desktop');const desktopReady=await waitReady();
 const desktop=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1,version:document.documentElement.dataset.unifiedVocabularyQuiz,wrong:document.documentElement.dataset.riseWrongReview,infinite:document.documentElement.dataset.riseInfiniteCourse})`);
 if(desktop.overflow||desktop.version!=='2.0.0'||desktop.wrong!=='2.0.0'||desktop.infinite!=='2.0.0')throw new Error(`Desktop shell invalid: ${JSON.stringify(desktop)}`);
 await screenshot('unified-quiz-v2-desktop-1440x1000.png');
 if(events.length)throw new Error(`Browser errors: ${JSON.stringify(events.slice(-20))}`);

 const result={version:'2.0.0',sourceSha:SOURCE_SHA,page:`${PAGE_URL}quiz/`,ready:{mobile:mobileReady,desktop:desktopReady},modes:{english:Object.keys(englishModes),japanese:Object.keys(jaExpected),classical:Object.keys(jaExpected),kanbun:['meaning'],social:['eventToYear','yearToEvent'],mixed:true},regressions:{singleController:true,noRepeat:true,typedReset:true,nativeWrites:true,restart:true,noOverflow:true},screenshots:['unified-quiz-v2-mobile-390x844.png','unified-quiz-v2-desktop-1440x1000.png']};
 console.log('UNIFIED_VOCAB_PUBLIC_QA='+JSON.stringify(result));await writeFile(path.join(artifacts,'unified-quiz-public-qa.json'),JSON.stringify(result,null,2));console.log('UNIFIED_VOCAB_PUBLIC_QA=PASS');
}catch(error){
 const diagnostics=await evaluate(`(()=>({status:document.getElementById('connectionStatus')?.textContent||'',counts:window.RISE_UNIFIED_QUIZ_V2?.counts?.()||null,current:window.RISE_UNIFIED_QUIZ_V2?.current?.()||null,snapshot:window.RISE_UNIFIED_QUIZ_V2?.snapshot?.()||null,htmlVersion:document.documentElement.dataset.unifiedVocabularyQuiz||''}))()`).catch(caught=>({diagnosticError:String(caught)}));
 await screenshot('unified-quiz-v2-failure.png').catch(()=>{});await writeFile(path.join(artifacts,'unified-quiz-failure.json'),JSON.stringify({error:String(error),diagnostics,events:events.slice(-50)},null,2)).catch(()=>{});throw error;
}finally{try{ws.close();}catch(_){}await cleanup(browser,profile);}
