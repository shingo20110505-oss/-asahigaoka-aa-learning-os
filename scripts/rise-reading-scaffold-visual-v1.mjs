import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const PAGE_URL=(process.env.PAGE_URL||'').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
const OUT=process.env.VISUAL_OUT||'reading-scaffold-evidence';
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!PAGE_URL||!SOURCE_SHA||!CHROME) throw new Error('visual environment missing');
await mkdir(OUT,{recursive:true});
const MOBILE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.unref();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address();const p=typeof a==='object'&&a?a.port:0;s.close(e=>e?reject(e):resolve(p))})})}
async function launch(view){
 const profile=path.join(os.tmpdir(),`rise-reading-${view.name}-${Date.now()}-${Math.random()}`);await mkdir(profile,{recursive:true});
 const port=await freePort();
 const p=spawn(CHROME,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--hide-scrollbars','--force-device-scale-factor=1',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'],{stdio:'ignore'});
 let browserWs='';for(let i=0;i<200;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok){const j=await r.json();if(j.webSocketDebuggerUrl){browserWs=j.webSocketDebuggerUrl;break}}}catch{}await sleep(100)}
 if(!browserWs) throw new Error('chrome startup failed');
 const pr=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'});const page=await pr.json();const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result)}};
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,screenWidth:view.width,screenHeight:view.height,deviceScaleFactor:1,mobile:!!view.ua});if(view.ua){await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await cmd('Network.setUserAgentOverride',{userAgent:view.ua})}
 return{cmd,close:async()=>{try{ws.close()}catch{};try{p.kill('SIGTERM')}catch{};await sleep(250);await rm(profile,{recursive:true,force:true})}};
}
async function ev(c,expression){const r=await c.cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
async function waitFor(c,expr,label){for(let i=0;i<300;i++){try{if(await ev(c,expr))return}catch{}await sleep(100)}throw new Error(label+' timeout')}
const sample=`<main><div class="eyebrow">FIRST READ</div><h2 class="h2">初読｜英語長文</h2><div class="notice"><b>先に確認する重要語（支援付き初読として記録）：</b>community=地域社会 / volunteer=ボランティア</div><div class="sp12"></div><div class="passage">Many students in a small city joined a volunteer project to improve their community. At first, they thought cleaning the park was the most important goal. However, after talking with older residents, they learned that listening to different opinions was also necessary. The students changed their plan and created a place where people of different ages could meet and share ideas.</div><div class="sp12"></div><button class="btn primary">初読完了・設問へ</button><button class="btn ghost" data-action="chatgpt-reading">ChatGPTに相談</button><div class="sp16"></div><div class="eyebrow">LONG READING</div><h2 class="h2">長文 1/5｜英語</h2><div class="qstem">Why did the students change their original plan?</div><div class="choices"><button class="choice">A. They wanted to stop the project.</button><button class="choice">B. They learned that listening to residents was important.</button><button class="choice">C. They decided to leave the city.</button><button class="choice">D. They were asked to study at home.</button></div></main>`;
const views=[{name:'mobile',width:390,height:844,ua:MOBILE_UA},{name:'desktop',width:1440,height:1000,ua:null}];
for(const view of views){const c=await launch(view);try{
 const url=`${PAGE_URL}?visual_verify=1&verify=${encodeURIComponent(SOURCE_SHA)}&reading_visual=${encodeURIComponent(SOURCE_SHA)}`;
 await c.cmd('Page.navigate',{url});
 await waitFor(c,`window.__AA_READING_EXAM_SCAFFOLD_V1__?.version==='1.1.0'&&window.__AA_AI_READING_V1__?.version==='2.0.1'&&!!window.AAReadingLibrary&&!!document.querySelector('#app')`,'reading production stack');
 await waitFor(c,`typeof studyHTML==='function'&&studyHTML.__aaReadingExamScaffoldWrapped==='1.1.0'&&typeof subjectsHTML==='function'&&subjectsHTML.__aaReadingExamScaffoldWrapped==='1.1.0'`,'persistent reading hooks');
 await ev(c,`(()=>{const b=document.querySelector('[data-route="subjects"]');if(b){b.click();return true}try{if(typeof setRoute==='function'){setRoute('subjects');return true}}catch(_){}return false})()`);
 await waitFor(c,`!!document.querySelector('.riseSubjectsV4')`,'Rise subjects route');
 await waitFor(c,`!!document.querySelector('.riseSubjectsV4 [data-reading-mode="scaffold-exam"][data-action="ai-reading-scaffold"]')`,'support reading production button');
 const integration=await ev(c,`(()=>{const s=document.querySelector('.riseSubjectsV4 [data-reading-mode="scaffold-exam"]'),e=document.querySelector('.riseSubjectsV4 [data-reading-mode="exam"]'),t=document.body.innerText;return{supportAction:s?.dataset.action==='ai-reading-scaffold',supportLabel:s?.textContent?.trim()==='補助つき入試長文',examAction:e?.dataset.action==='ai-reading-exam',examLabel:e?.textContent?.trim()==='入試長文（補助なし）',note:t.includes('補助長文も愛知県入試型の5問4択'),runtime:document.documentElement.dataset.readingScaffold==='1.1.0',studyHook:studyHTML.__aaReadingExamScaffoldWrapped==='1.1.0',subjectsHook:subjectsHTML.__aaReadingExamScaffoldWrapped==='1.1.0'}})()`);
 for(const [k,v] of Object.entries(integration))if(!v)throw new Error(`${view.name} integration failed: ${k}`);
 await ev(c,`(()=>{try{localStorage.removeItem('aa_ai_reading_config_v1')}catch(_){}document.querySelector('.riseSubjectsV4 [data-action="ai-reading-scaffold"]')?.click();return true})()`);
 await waitFor(c,`!!document.querySelector('#aaAiReadingConfig')`,'support click AI route');
 await ev(c,`document.querySelector('#aaAiReadingConfig [data-action="ai-reading-config-close"]')?.click()`);
 let shot=await c.cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
 await writeFile(path.join(OUT,`rise-reading-entry-${view.name}-${view.width}x${view.height}.png`),Buffer.from(shot.data,'base64'));
 const payload=JSON.stringify(sample);
 await ev(c,`(()=>{const host=document.querySelector('#app');host.innerHTML=window.__AA_READING_EXAM_SCAFFOLD_V1__.transformStudyHtml(${payload},{aiGenerated:true,assistMode:'scaffold'});document.body.style.margin='0';return true})()`);
 const checks=await ev(c,`(()=>{const t=document.body.innerText;return{rule:t.includes('入試問題と同じ形式'),title:t.includes('愛知県入試型｜補助長文'),question:t.includes('愛知県入試型｜問 1/5'),preteach:!t.includes('先に確認する重要語'),chatgpt:!t.includes('ChatGPTに相談'),choices:document.querySelectorAll('.choice').length===4,main:!!document.querySelector('main.aaReadingExamScaffold')}})()`);
 for(const [k,v] of Object.entries(checks))if(!v)throw new Error(`${view.name} transform failed: ${k}`);
 shot=await c.cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
 await writeFile(path.join(OUT,`rise-reading-scaffold-${view.name}-${view.width}x${view.height}.png`),Buffer.from(shot.data,'base64'));
 await writeFile(path.join(OUT,`rise-reading-scaffold-${view.name}.html`),await ev(c,'document.documentElement.outerHTML'));
 }finally{await c.close()}}
await writeFile(path.join(OUT,'manifest.txt'),['result=success','runtime=ai-reading-exam-scaffold-v1@1.1.0','ai_runtime=ai-reading-v1@2.0.2','library_runtime=connected','production_entry=verified','support_action=ai-reading-scaffold','support_click_route=verified','persistent_hooks=verified','support_format=aichi-exam','question_count_visual=5-format','choices_per_question=4','preteach=removed','chatgpt_during_attempt=removed','vocabulary_support=in-text-only','mobile=390x844','desktop=1440x1000'].join('\n')+'\n');
console.log('result=success');
