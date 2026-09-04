import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const PAGE_URL=(process.env.PAGE_URL||'').replace(/\/?$/,'/');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
const OUT=process.env.VISUAL_OUT||'visual-evidence';
const CHROME=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(existsSync);
if(!PAGE_URL||!SOURCE_SHA||!CHROME)throw new Error('visual environment missing');
await mkdir(OUT,{recursive:true});
const MOBILE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const specs={
 home:{cls:'riseHomeV4',tokens:['Rise','今日やることを、迷わない。','次の一手','教科別の達成度','ホーム','入試','学習','復習']},
 subjects:{cls:'riseSubjectsV4',tokens:['Rise','入試対策','愛知県公立高校入試','英語','数学','国語','理科','社会','一般演習は表示しません']},
 analytics:{cls:'riseAnalyticsV4',tokens:['Rise','学習','英単語・語句','漢字・国語語彙','Chronologia','国語15,000語']},
 settings:{cls:'riseSettingsV4',tokens:['Rise','設定','バックアップ']}
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=b=>createHash('sha256').update(b).digest('hex');
function pngSize(b){if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('bad png');return[b.readUInt32BE(16),b.readUInt32BE(20)]}
async function freePort(){return await new Promise((resolve,reject)=>{const server=net.createServer();server.unref();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();const port=typeof address==='object'&&address?address.port:0;server.close(err=>err?reject(err):resolve(port))})})}
function waitChildExit(p,timeout=3000){return new Promise(resolve=>{if(p.exitCode!==null||p.signalCode!==null)return resolve(true);let settled=false;const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);p.off('exit',onExit);p.off('error',onExit);resolve(value)};const onExit=()=>finish(true);const timer=setTimeout(()=>finish(false),timeout);p.once('exit',onExit);p.once('error',onExit)})}
async function cleanupChrome(p,profile){try{if(p.exitCode===null)p.kill('SIGTERM')}catch{};let exited=await waitChildExit(p,2500);if(!exited){try{if(p.exitCode===null)p.kill('SIGKILL')}catch{};await waitChildExit(p,2500)}await sleep(250);try{await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250})}catch(error){console.warn(`profile cleanup skipped: ${error?.code||error}`)}}
async function launch(view){
 const profile=path.join(os.tmpdir(),`rise-ia-${view.name}-${Date.now()}-${Math.random()}`);await mkdir(profile,{recursive:true});
 const port=await freePort();
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--disable-component-update','--disable-default-apps','--disable-sync','--metrics-recording-only','--mute-audio','--no-first-run','--hide-scrollbars','--force-device-scale-factor=1',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,'about:blank'];
 const p=spawn(CHROME,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>{err+=String(d)});
 let browserWs='';const start=Date.now();
 while(Date.now()-start<45000){
  if(p.exitCode!==null)break;
  try{const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1200)});if(response.ok){const info=await response.json();if(info.webSocketDebuggerUrl){browserWs=info.webSocketDebuggerUrl;break}}}catch{}
  await sleep(180);
 }
 if(!browserWs){await cleanupChrome(p,profile);throw new Error(`chrome startup failed exit=${p.exitCode} port=${port} ${err.slice(-1400)}`)}
 const pageResponse=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT',signal:AbortSignal.timeout(5000)});if(!pageResponse.ok)throw new Error(`chrome page create failed ${pageResponse.status}`);const page=await pageResponse.json();
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('cdp websocket timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=e=>{clearTimeout(timer);reject(e)}});
 let id=0;const pending=new Map(),docs=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result)}else if(m.method==='Network.requestWillBeSent'&&m.params?.type==='Document')docs.push(m.params.request?.url||'')};
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,screenWidth:view.width,screenHeight:view.height,deviceScaleFactor:1,mobile:!!view.ua});if(view.ua){await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await cmd('Network.setUserAgentOverride',{userAgent:view.ua})}
 return{...view,cmd,docs,close:async()=>{try{ws.close()}catch{};await sleep(80);await cleanupChrome(p,profile)}}
}
async function ev(c,expression){const r=await c.cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
async function wait(c,expression,label,timeout=18000){const start=Date.now();while(Date.now()-start<timeout){try{if(await ev(c,expression))return}catch{}await sleep(100)}throw new Error(label+' timeout '+JSON.stringify(await ev(c,`({route:document.documentElement.dataset.riseRoute,text:(document.body?.innerText||'').slice(0,900),boot:document.documentElement.classList.contains('aa-app-booting'),error:document.documentElement.dataset.riseRuntimeError||''})`).catch(()=>null)))}
const ready=r=>`!document.documentElement.classList.contains('aa-app-booting')&&document.documentElement.dataset.riseRoute==='${r}'&&!!document.querySelector('#app main .${specs[r].cls}[data-ui-ver="4.2.0"]')&&window.__RISE_NAVIGATION_V1__?.version==='1.0.4'&&window.__RISE_INFORMATION_ARCHITECTURE_V1__?.version==='1.0.1'`;
async function tokens(c,r){const text=await ev(c,'document.body.innerText||""');for(const t of specs[r].tokens)if(!text.includes(t))throw new Error(`${r}: missing ${t}`);const nav=await ev(c,`[...document.querySelectorAll('.navin span')].map(x=>x.textContent.trim()).join('/')`);if(r!=='settings'&&nav!=='ホーム/入試/学習/復習')throw new Error(`bad public nav ${nav}`);if(text.includes('旭丘AA Learning OS'))throw new Error('legacy shell visible');if(r==='subjects'&&(text.includes('5教科ミックス')||text.includes('実戦25問・非公式')))throw new Error('generic practice is visible')}
async function shot(c,name,r){await wait(c,ready(r),name+' ready');await sleep(500);await tokens(c,r);const html=await ev(c,'document.documentElement.outerHTML');const s=await c.cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const png=Buffer.from(s.data,'base64'),size=pngSize(png);if(size[0]!==c.width||size[1]!==c.height||png.length<10000)throw new Error(name+' invalid screenshot');await writeFile(path.join(OUT,name+'.html'),html);await writeFile(path.join(OUT,name+'.png'),png);return hash(png)}
async function openHome(c){await c.cmd('Page.navigate',{url:`${PAGE_URL}?visual_verify=1&verify=${encodeURIComponent(SOURCE_SHA)}`});await wait(c,ready('home'),'cold home');await tokens(c,'home')}
async function internal(c,r){const before=c.docs.length;await ev(c,`document.querySelector('.navin [data-route="${r}"]')?.click()`);await wait(c,ready(r),'route '+r);await sleep(700);if(c.docs.length!==before)throw new Error(`unexpected Document navigation on ${r}: ${JSON.stringify(c.docs.slice(before))}`);await tokens(c,r)}
async function settings(c){const before=c.docs.length;const ok=await ev(c,`(()=>{const direct=document.querySelector('[data-route="settings"]');if(direct){direct.click();return true}const menu=document.getElementById('aaHeaderMenuToggle');if(menu){menu.click();setTimeout(()=>document.querySelector('[data-aa-menu-key="settings"]')?.click(),60);return true}return false})()`);if(!ok)throw new Error('settings control missing');await wait(c,ready('settings'),'settings');await sleep(600);if(c.docs.length!==before)throw new Error('settings caused Document navigation');await tokens(c,'settings')}
async function review(c,name){await openHome(c);const before=c.docs.length;const clicked=await ev(c,`(()=>{const a=[...document.querySelectorAll('a[href]')].find(x=>{try{return new URL(x.href,location.href).pathname.endsWith('/review/')}catch{return false}});if(!a)return false;a.click();return true})()`);if(!clicked)throw new Error('review link missing');await wait(c,`location.pathname.endsWith('/review/')&&document.body.innerText.includes('Review v2')`,'review page');if(c.docs.length<=before)throw new Error('review must be canonical Document navigation');const html=await ev(c,'document.documentElement.outerHTML');const s=await c.cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const png=Buffer.from(s.data,'base64'),size=pngSize(png);if(size[0]!==c.width||size[1]!==c.height)throw new Error('review png size');await writeFile(path.join(OUT,name+'.html'),html);await writeFile(path.join(OUT,name+'.png'),png);return hash(png)}
const views=[{name:'mobile',width:390,height:844,ua:MOBILE_UA},{name:'desktop',width:1440,height:1000,ua:null}];
const hashes=[];
for(const view of views){for(const r of ['home','subjects','analytics','settings']){const c=await launch(view);try{await openHome(c);if(r==='subjects'||r==='analytics')await internal(c,r);else if(r==='settings')await settings(c);if(r==='home'){await internal(c,'subjects');await internal(c,'analytics');await internal(c,'home')}hashes.push(await shot(c,`rise-${view.name}-${r}-${view.width}x${view.height}`,r))}finally{await c.close()}}const c=await launch(view);try{hashes.push(await review(c,`rise-${view.name}-review-${view.width}x${view.height}`))}finally{await c.close()}}
if(new Set(hashes).size!==hashes.length)throw new Error('duplicate screenshot pixels');
const manifest=['result=success','cold_start_home=success','single_navigation_owner=success','single_live_dom=success','no_unexpected_document_navigation=success','route_switch_stress=success','settings_menu_navigation=success','settings_mutation_stress=success','legacy_shell_never_visible=success','review_canonical_click_navigation=success','unique_screen_pixels=success','public_navigation=ホーム/入試/学習/復習','general_practice_public_ui=removed'].join('\n')+'\n';await writeFile(path.join(OUT,'manifest.txt'),manifest);console.log(manifest);