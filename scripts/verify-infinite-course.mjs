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

const profile=path.join(os.tmpdir(),`rise-infinite-v3-${process.pid}-${Date.now()}`),artifacts=path.resolve('qa-artifacts');
await mkdir(profile,{recursive:true});await mkdir(artifacts,{recursive:true});
const port=await freePort();
const browser=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--no-first-run','--metrics-recording-only',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';browser.stderr.on('data',chunk=>{stderr+=String(chunk);});let browserWs='';const boot=Date.now();
while(Date.now()-boot<30000){if(browser.exitCode!==null)break;try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1200)});if(response.ok){browserWs=(await response.json()).webSocketDebuggerUrl||'';if(browserWs)break;}}catch(_){}await sleep(180);}
if(!browserWs){await cleanup(browser,profile);throw new Error(`Chrome startup timeout: ${stderr.slice(-1200)}`);}
const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=reject;});
let sequence=0;const pending=new Map(),errors=[];
ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(new Error(JSON.stringify(message.error))):item.resolve(message.result);return;}if(message.method==='Runtime.exceptionThrown')errors.push({text:message.params?.exceptionDetails?.text||'',description:message.params?.exceptionDetails?.exception?.description||''});};
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(`Evaluate failed: ${JSON.stringify(result.exceptionDetails).slice(0,1600)}`);return result.result?.value;}
async function waitFor(expression,timeout=60000,label='condition'){const started=Date.now();let last=null;while(Date.now()-started<timeout){last=await evaluate(expression).catch(()=>null);if(last)return last;await sleep(150);}throw new Error(`${label} timeout; last=${JSON.stringify(last)}`);}
async function viewport(width,height,mobile){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});await command('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:mobile?5:1});}
async function navigate(suffix=''){await command('Page.navigate',{url:`${PAGE_URL}quiz/?infinite=${encodeURIComponent(SOURCE_SHA)}${suffix}`});await waitFor(`document.readyState==='complete'`,30000,'document ready');}
async function ready(){return waitFor(`(()=>{const c=window.RISE_UNIFIED_QUIZ_V2?.counts?.(),b=document.getElementById('startSession');return document.documentElement.dataset.unifiedVocabularyQuiz==='2.0.0'&&c?.english>=100&&c?.japanese>=15000&&c?.classical===700&&c?.kanbun===300&&c?.social>=1000&&!b?.disabled?c:null;})()`,70000,'v2 ready');}
async function click(selector){const ok=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return false;element.click();return true;})()`);if(!ok)throw new Error(`Missing element: ${selector}`);}
async function setValue(selector,value){const actual=await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element||![...element.options].some(option=>option.value===${JSON.stringify(value)}))return null;element.value=${JSON.stringify(value)};element.dispatchEvent(new Event('change',{bubbles:true}));return element.value;})()`);if(actual!==value)throw new Error(`Unable to set ${selector}=${value}; actual=${actual}`);}
async function wrongOnly(wanted){const on=await evaluate(`document.getElementById('focusToggle')?.classList.contains('on')`);if(Boolean(on)!==Boolean(wanted))await click('#focusToggle');}
async function start(config){await click(`[data-subject="${config.subject}"]`);await sleep(30);if(config.filterA)await setValue('#filterA',config.filterA);if(config.filterB)await setValue('#filterB',config.filterB);if(config.mode)await setValue('#quizMode',config.mode);await setValue('#sessionCount',config.count||'10');await wrongOnly(Boolean(config.wrongOnly));await click('#startSession');return waitFor(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||null`,30000,`${config.subject} session`);}
async function current(){return evaluate(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||null`);}
async function answer(correct){const action=await evaluate(`(()=>{const q=window.RISE_UNIFIED_QUIZ_V2?.current?.();if(!q)return null;const choices=[...document.querySelectorAll('#choices .choice:not(:disabled)')];if(choices.length){const button=choices.find(item=>${correct?'item.textContent.trim()===String(q.answer).trim()':'item.textContent.trim()!==String(q.answer).trim()'});if(!button)return null;button.click();return{key:q.key,source:q.source,mode:q.mode};}const input=document.getElementById('answerInput'),submit=document.getElementById('submitAnswer');if(!input||!submit)return null;input.value=${correct?"String(q.answer).replace(/年$/,'')":"'__qa_wrong__'"};input.dispatchEvent(new Event('input',{bubbles:true}));submit.click();return{key:q.key,source:q.source,mode:q.mode};})()`);if(!action)throw new Error('Answer control missing');await waitFor(`(()=>{const f=document.getElementById('feedback');return f&&!f.classList.contains('hidden')&&f.textContent.trim();})()`,20000,'feedback');return action;}
async function next(){await click('#nextQuestion');return waitFor(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||!document.getElementById('summary')?.classList.contains('hidden')`,20000,'next or summary');}
async function screenshot(name){const result=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(path.join(artifacts,name),Buffer.from(result.data,'base64'));}

try{
 await command('Page.enable');await command('Runtime.enable');await viewport(390,844,true);await navigate('&seed=1');await ready();
 const seeded=await evaluate(`(()=>{const en=document.getElementById('englishBridge')?.contentWindow?.AA_RISE_UNIFIED_ENGLISH_API,so=document.getElementById('socialBridge')?.contentWindow?.AA_RISE_UNIFIED_SOCIAL_API,classic=RISE_JAPANESE_CLASSICS_BANK_V1;if(!en?.list||!so?.list)return null;const enItem=en.list().find(item=>item.id&&item.word&&item.meaning),soItem=so.list().find(item=>/^(紀元前)?\\d+年$/.test(item.date)),classical=classic.classical.find(item=>item.level==='S'),kanbun=classic.kanbun.find(item=>item.level==='A'),now=Date.now();en.markWrong(enItem.id);so.record(soItem.id,false);localStorage.setItem('aa_kokugo_vocab_wrong_queue_v1',JSON.stringify([{id:'quiz-full-2538870',word:'嗚呼嗚呼',reading:'ああああ',meaning:'驚きや嘆きを表す声',type:'four',rank:'C',createdAt:now,lastWrongAt:now},{id:classical.id,word:classical.word,reading:classical.reading,meaning:classical.meaning,type:'koten',rank:classical.displayBand,createdAt:now,lastWrongAt:now},{id:kanbun.id,word:kanbun.word,reading:kanbun.reading,meaning:kanbun.meaning,type:'kanbun',rank:kanbun.displayBand,createdAt:now,lastWrongAt:now}]));localStorage.setItem('rise_kokugo_classics_progress_v1',JSON.stringify({[classical.id]:{seen:1,wrong:1,correct:0,currentWrong:true,last:now,lastWrongAt:now},[kanbun.id]:{seen:1,wrong:1,correct:0,currentWrong:true,last:now,lastWrongAt:now}}));return{english:enItem.id,social:soItem.id,classical:classical.id,kanbun:kanbun.id};})()`);
 if(!seeded)throw new Error('Could not seed five wrong-review sources');
 await navigate('&seeded=2');await ready();
 const counts=await evaluate(`RISE_WRONG_REVIEW_V1.counts()`);
 if(counts.english!==1||counts.japanese!==1||counts.classical!==1||counts.kanbun!==1||counts.social!==1||counts.total!==5)throw new Error(`Wrong counts or classics double-counting: ${JSON.stringify(counts)}`);

 await start({subject:'mixed',filterA:'balanced',filterB:'all',count:'infinite',wrongOnly:true});
 const mixedKeys=[],mixedSources=[];
 for(let index=0;index<5;index++){
  const q=await current();mixedKeys.push(q.key);mixedSources.push(q.source);await answer(false);if(index<4)await next();
 }
 if(new Set(mixedKeys).size!==5||[...new Set(mixedSources)].sort().join('/')!=='classical/english/japanese-vocab/kanbun/social')throw new Error(`Mixed wrong-only did not cover each source once: ${JSON.stringify({mixedKeys,mixedSources})}`);
 const endVisible=await evaluate(`!document.getElementById('endSession')?.classList.contains('hidden')&&document.getElementById('endSession')?.textContent.includes('間違い復習')`);
 if(!endVisible)throw new Error('Wrong-only infinite end control is not visible');
 await screenshot('wrong-review-v2-mobile-390x844.png');await click('#endSession');
 await waitFor(`document.getElementById('summaryTitle')?.textContent==='間違い復習を終了'`,10000,'wrong infinite summary');

 const english=await start({subject:'english',mode:'spell',filterA:'all',count:'10',wrongOnly:true});
 if(english.source!=='english'||!english.mode.startsWith('スペル・間違い')||!english.input)throw new Error(`English fixed wrong mode lost: ${JSON.stringify(english)}`);
 await answer(true);await next();await waitFor(`document.getElementById('summaryTitle')?.textContent==='間違い復習完了'`,10000,'English recovery finish');
 if((await evaluate(`RISE_WRONG_REVIEW_V1.counts().english`))!==0)throw new Error('English recovered item stayed in wrong queue');

 const classical=await start({subject:'japanese',mode:'meaning',filterA:'classical',filterB:'S',count:'10',wrongOnly:true});
 if(classical.source!=='classical'||!classical.mode.includes('語句→意味・間違い'))throw new Error(`Classical fixed wrong mode lost: ${JSON.stringify(classical)}`);
 await answer(true);await next();if((await evaluate(`RISE_WRONG_REVIEW_V1.counts().classical`))!==0)throw new Error('Classical recovery did not clear currentWrong');

 const kanbun=await start({subject:'japanese',mode:'reading',filterA:'kanbun',filterB:'A',count:'10',wrongOnly:true});
 if(kanbun.source!=='kanbun'||!kanbun.mode.includes('語句→読み・間違い'))throw new Error(`Kanbun fixed wrong mode lost: ${JSON.stringify(kanbun)}`);
 await answer(true);await next();if((await evaluate(`RISE_WRONG_REVIEW_V1.counts().kanbun`))!==0)throw new Error('Kanbun recovery did not clear currentWrong');

 const japanese=await start({subject:'japanese',mode:'word',filterA:'vocab',filterB:'C',count:'10',wrongOnly:true});
 if(japanese.source!=='japanese-vocab'||!japanese.mode.startsWith('意味→語句・間違い'))throw new Error(`Japanese fixed wrong mode lost: ${JSON.stringify(japanese)}`);
 await answer(true);await next();if((await evaluate(`RISE_WRONG_REVIEW_V1.counts().japanese`))!==0)throw new Error('Japanese recovered item stayed in wrong queue');

 const social=await start({subject:'social',mode:'yearToEvent',filterA:'all',filterB:'all',count:'10',wrongOnly:true});
 if(social.source!=='social'||!social.mode.startsWith('年号→出来事・間違い')||social.input)throw new Error(`Social fixed wrong mode lost: ${JSON.stringify(social)}`);
 await answer(true);await next();if((await evaluate(`RISE_WRONG_REVIEW_V1.counts().social`))!==0)throw new Error('Social recovered item stayed unresolved');

 await evaluate(`document.getElementById('englishBridge').contentWindow.AA_RISE_UNIFIED_ENGLISH_API.markWrong(${JSON.stringify(seeded.english)})`);
 const onePass=await start({subject:'english',mode:'en-ja',filterA:'all',count:'10',wrongOnly:true});
 if(!onePass.mode.startsWith('英→日・間違い'))throw new Error(`English wrong-only direction not restored: ${JSON.stringify(onePass)}`);
 await answer(false);await next();
 const onePassSummary=await evaluate(`({title:document.getElementById('summaryTitle')?.textContent||'',score:document.getElementById('summaryScore')?.textContent||'',snapshot:RISE_UNIFIED_QUIZ_V2.snapshot()})`);
 if(onePassSummary.title!=='間違い復習完了'||!onePassSummary.score.endsWith('/ 1'))throw new Error(`Finite wrong review repeated its sole item: ${JSON.stringify(onePassSummary)}`);
 await click('#restartSession');const restarted=await waitFor(`window.RISE_UNIFIED_QUIZ_V2?.current?.()||null`,20000,'wrong restart');
 if(!restarted.mode.startsWith('英→日・間違い'))throw new Error(`Restart lost wrong-review mode: ${JSON.stringify(restarted)}`);
 await evaluate(`document.getElementById('englishBridge').contentWindow.AA_RISE_UNIFIED_ENGLISH_API.removeWrong(${JSON.stringify(seeded.english)})`);

 await start({subject:'japanese',mode:'meaning',filterA:'classical',filterB:'all',count:'infinite',wrongOnly:false});
 const noRepeat=[];
 for(let index=0;index<12;index++){
  const q=await current();noRepeat.push(q.key);await answer(false);if(index<11)await next();
 }
 if(new Set(noRepeat).size!==noRepeat.length)throw new Error(`Infinite classics repeated before cycle completion: ${noRepeat.join(',')}`);
 const normalEnd=await evaluate(`!document.getElementById('endSession')?.classList.contains('hidden')&&document.getElementById('endSession')?.textContent.includes('無限コース')`);
 if(!normalEnd)throw new Error('Normal infinite end control is not visible');
 await click('#endSession');await waitFor(`document.getElementById('summaryTitle')?.textContent==='無限コース終了'`,10000,'normal infinite summary');

 await viewport(1440,1000,false);await navigate('&desktop=1');await ready();
 const desktop=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1||document.body.scrollWidth>innerWidth+1,version:document.documentElement.dataset.unifiedVocabularyQuiz,review:document.documentElement.dataset.riseWrongReview,infinite:document.documentElement.dataset.riseInfiniteCourse,legacy:[...document.scripts].some(script=>/review-algorithm|infinite-course/.test(script.src))})`);
 if(desktop.overflow||desktop.version!=='2.0.0'||desktop.review!=='2.0.0'||desktop.infinite!=='2.0.0'||desktop.legacy)throw new Error(`Desktop infinite/review shell invalid: ${JSON.stringify(desktop)}`);
 await screenshot('wrong-review-v2-desktop-1440x1000.png');
 if(errors.length)throw new Error(`Runtime exceptions: ${JSON.stringify(errors.slice(-20))}`);

 const result={version:'3.0.0',sourceSha:SOURCE_SHA,seeded,wrongCounts:counts,mixed:{keys:mixedKeys,sources:mixedSources,onePass:true},fixedModes:{english:true,japanese:true,classical:true,kanbun:true,social:true},infinite:{manualEnd:true,classicsNoRepeat:noRepeat.length},desktop,screenshots:['wrong-review-v2-mobile-390x844.png','wrong-review-v2-desktop-1440x1000.png']};
 console.log('INFINITE_COURSE_QA='+JSON.stringify(result));await writeFile(path.join(artifacts,'infinite-course-qa.json'),JSON.stringify(result,null,2));console.log('INFINITE_COURSE_QA=PASS');
}catch(error){
 const diagnostics=await evaluate(`(()=>({status:document.getElementById('connectionStatus')?.textContent||'',counts:window.RISE_UNIFIED_QUIZ_V2?.counts?.()||null,wrong:window.RISE_WRONG_REVIEW_V1?.counts?.()||null,current:window.RISE_UNIFIED_QUIZ_V2?.current?.()||null,snapshot:window.RISE_UNIFIED_QUIZ_V2?.snapshot?.()||null}))()`).catch(caught=>({diagnosticError:String(caught)}));
 await screenshot('infinite-course-v3-failure.png').catch(()=>{});await writeFile(path.join(artifacts,'infinite-course-failure.json'),JSON.stringify({error:String(error),diagnostics,errors},null,2)).catch(()=>{});throw error;
}finally{try{ws.close();}catch(_){}await cleanup(browser,profile);}
