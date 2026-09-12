import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const PAGE_URL=(process.env.PAGE_URL||'').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
const OUT=process.env.RESUME_OUT||'resume-evidence';
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!PAGE_URL||!SOURCE_SHA||!CHROME)throw new Error('resume verification environment missing');
await mkdir(OUT,{recursive:true});
const MOBILE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function freePort(){return await new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const a=server.address();const port=typeof a==='object'&&a?a.port:0;server.close(err=>err?reject(err):resolve(port))})})}
function childExit(p,timeout=2500){return new Promise(resolve=>{if(p.exitCode!==null||p.signalCode!==null)return resolve(true);let done=false;const finish=x=>{if(done)return;done=true;clearTimeout(timer);p.off('exit',onExit);resolve(x)};const onExit=()=>finish(true);const timer=setTimeout(()=>finish(false),timeout);p.once('exit',onExit)})}
async function cleanup(p,profile){try{if(p.exitCode===null)p.kill('SIGTERM')}catch{};if(!await childExit(p)){try{if(p.exitCode===null)p.kill('SIGKILL')}catch{};await childExit(p)}await sleep(100);await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:200}).catch(()=>{})}

async function launch(view){
  const profile=path.join(os.tmpdir(),`rise-resume-${view.name}-${Date.now()}-${Math.random()}`);
  await mkdir(profile,{recursive:true});
  const port=await freePort();
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--disable-component-update','--disable-default-apps','--disable-sync','--mute-audio','--no-first-run','--hide-scrollbars','--force-device-scale-factor=1',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'];
  const process=spawn(CHROME,args,{stdio:['ignore','ignore','pipe']});
  let browserWs='';
  for(let n=0;n<220&&!browserWs;n++){
    try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(900)});if(r.ok)browserWs=(await r.json()).webSocketDebuggerUrl||''}catch{}
    if(!browserWs)await sleep(150);
  }
  if(!browserWs){await cleanup(process,profile);throw new Error('chrome startup failed')}
  const pageResponse=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT',signal:AbortSignal.timeout(5000)});
  const page=await pageResponse.json();
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('cdp websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=e=>{clearTimeout(timer);reject(e)}});
  let id=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result)}};
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,screenWidth:view.width,screenHeight:view.height,deviceScaleFactor:1,mobile:!!view.ua});
  if(view.ua){await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await cmd('Network.setUserAgentOverride',{userAgent:view.ua})}
  return{...view,cmd,close:async()=>{try{ws.close()}catch{};await cleanup(process,profile)}};
}

async function ev(c,expression){const r=await c.cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
async function wait(c,expression,label,timeout=22000){const start=Date.now();while(Date.now()-start<timeout){try{if(await ev(c,expression))return}catch{}await sleep(100)}const state=await ev(c,`({route:document.documentElement.dataset.riseRoute,text:(document.body?.innerText||'').slice(0,1200)})`).catch(()=>null);throw new Error(`${label} timeout ${JSON.stringify(state)}`)}
async function shot(c,file){const s=await c.cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const png=Buffer.from(s.data,'base64');if(png.length<10000)throw new Error('resume screenshot too small');await writeFile(path.join(OUT,file),png)}

async function verify(view){
  const c=await launch(view);
  try{
    await c.cmd('Page.navigate',{url:`${PAGE_URL}?resume_verify=1&verify=${encodeURIComponent(SOURCE_SHA)}`});
    await wait(c,`!document.documentElement.classList.contains('aa-app-booting')&&document.querySelector('.riseHomeV4')&&window.__RISE_RESUME_V2__?.version==='2.1.0'`,`${view.name} home`);
    const absent=await ev(c,`!document.querySelector('[data-rise-resume="1"]')`);
    if(!absent)throw new Error(`${view.name}: resume button visible without saved session`);

    await ev(c,`document.querySelector('.navin [data-route="subjects"]')?.click()`);
    await wait(c,`document.querySelector('.riseSubjectsV4 button[data-action="start-custom"][data-kind="subject"][data-subject="math"]')`,`${view.name} subjects`);
    await ev(c,`document.querySelector('.riseSubjectsV4 button[data-action="start-custom"][data-kind="subject"][data-subject="math"]')?.click()`);
    await wait(c,`document.documentElement.dataset.riseRoute==='study'&&document.querySelector('[data-action="pause-home"]')&&window.AA_APP?.get?.('state')?.get?.()?.session?.active`,`${view.name} study start`);

    await ev(c,`window.scrollTo(0,Math.min(320,Math.max(0,document.documentElement.scrollHeight-innerHeight)))`);
    await sleep(250);
    const before=await ev(c,`(()=>{const s=window.AA_APP.get('state').get().session;return {index:s.index,subIndex:s.subIndex||0,queue:s.queue.length}})()`);
    await ev(c,`document.querySelector('[data-action="pause-home"]')?.click()`);
    await wait(c,`document.documentElement.dataset.riseRoute==='home'&&document.querySelector('.riseHomeV4 [data-rise-resume="1"] button[data-route="study"]')`,`${view.name} saved home`);

    const cardText=await ev(c,`document.querySelector('.riseHomeV4 [data-rise-resume="1"]')?.innerText||''`);
    if(!cardText.includes('保存済み')||!cardText.includes('続きからやる'))throw new Error(`${view.name}: resume copy missing`);
    await shot(c,`rise-${view.name}-resume-${view.width}x${view.height}.png`);

    const saved=await ev(c,`(()=>{const s=window.AA_APP.get('state').get().session;return {index:s.index,subIndex:s.subIndex||0,queue:s.queue.length,scrollY:s.scrollY||0}})()`);
    await ev(c,`document.querySelector('.riseHomeV4 [data-rise-resume="1"] button[data-route="study"]')?.click()`);
    await wait(c,`document.documentElement.dataset.riseRoute==='study'&&window.AA_APP?.get?.('state')?.get?.()?.session?.active`,`${view.name} resume`);
    await sleep(350);
    const after=await ev(c,`(()=>{const s=window.AA_APP.get('state').get().session;return {index:s.index,subIndex:s.subIndex||0,queue:s.queue.length,scrollY:s.scrollY||0}})()`);
    if(before.index!==saved.index||before.subIndex!==saved.subIndex||before.queue!==saved.queue)throw new Error(`${view.name}: save changed session position`);
    if(saved.index!==after.index||saved.subIndex!==after.subIndex||saved.queue!==after.queue||saved.scrollY!==after.scrollY)throw new Error(`${view.name}: resume did not preserve saved position`);
    return {view:view.name,index:after.index,subIndex:after.subIndex,queue:after.queue,scrollY:after.scrollY};
  }finally{await c.close()}
}

const results=[];
for(const view of [{name:'mobile',width:390,height:844,ua:MOBILE_UA},{name:'desktop',width:1440,height:1000,ua:null}])results.push(await verify(view));
const manifest=['result=success','resume_hidden_without_session=success','save_to_home=success','resume_card=success','resume_exact_session=success','mobile_390x844=success','desktop_1440x1000=success',...results.map(x=>`${x.view}_session=${x.index}/${x.queue};sub=${x.subIndex};scroll=${x.scrollY}`)].join('\n')+'\n';
await writeFile(path.join(OUT,'manifest.txt'),manifest);
console.log(manifest);
