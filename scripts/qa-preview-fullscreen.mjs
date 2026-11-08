// Local browser regression check. No deployment or user study data is accessed.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'test-results','preview-fullscreen');await fs.mkdir(out,{recursive:true});
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/workspace-ui.css"><link rel="stylesheet" href="/src/workspace-complete.css"><body><button id="open">教材をプレビュー</button><script type="module">
import {mediaViewer} from '/src/media-viewer.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280"><rect width="960" height="1280" fill="#fffef4"/><rect x="30" y="30" width="900" height="1220" fill="none" stroke="#183b32" stroke-width="8"/><text x="80" y="130" font-size="54">RISE Preview</text><text x="80" y="230" font-size="36">Full page / complete margins</text><path d="M80 350H880M80 600H880M80 850H880M80 1100H880" stroke="#9baca6" stroke-width="3"/><circle cx="480" cy="650" r="200" fill="#dceadf"/><text x="390" y="660" font-size="70">A → B</text><text x="80" y="1190" font-size="36">Bottom of page</text></svg>';
const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1280;canvas.getContext('2d').drawImage(image,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
window.openPreview=()=>window.preview=mediaViewer({startFullscreen:new URLSearchParams(location.search).has('full'),items:[{id:'fixture-1',name:'社会の資料 1.png',type:'image/png'},{id:'fixture-2',name:'社会の資料 2.png',type:'image/png'}],load:async()=>blob,onAsk:async()=>{document.body.classList.add('side-chat-open');window.dispatchEvent(new Event('rise:side-chat-layout'));}});
document.querySelector('#open').onclick=window.openPreview;
window.ready=true;
</script></body></html>`;
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return;}const file=path.resolve(root,'.'+decodeURIComponent(p));if(!p.startsWith('/src/')||!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'rise-preview-qa-'));
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket;const evidence=[];
try{
 const browser=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timed out')),15000);child.stderr.on('data',b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Chrome exit '+code));});});
 const target=await(await fetch(`http://127.0.0.1:${new URL(browser).port}/json/new?about:blank`,{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let seq=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const run=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const wait=async expr=>{for(let n=0;n<100;n++){if(await run(expr))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timeout: '+expr);};
 let touch=false;
 const clickSelector=async selector=>{const p=await run(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})()`);assert.ok(p.hit,'control must be reachable: '+selector);if(touch){await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});}};
 const click=action=>clickSelector('[data-action="'+action+'"]');
 const state=()=>run(`(()=>{const h=document.querySelector('.media-viewer'),r=h?.getBoundingClientRect(),s=h?.querySelector('.viewer-stage')?.getBoundingClientRect();return {open:!!h?.open,full:h?.classList.contains('viewer-fullscreen'),native:!!document.fullscreenElement,withChat:h?.classList.contains('viewer-with-chat'),width:r?.width,height:r?.height,stageWidth:s?.width,stageHeight:s?.height,viewport:[innerWidth,innerHeight],file:h?.dataset.fileId,exitVisible:!!h?.querySelector('.viewer-exit-fullscreen')?.getClientRects().length};})()`);
 const shot=async name=>{await fs.writeFile(path.join(out,name+'.png'),Buffer.from((await cmd('Page.captureScreenshot',{format:'png'})).data,'base64'));};
 await cmd('Page.enable');await cmd('Runtime.enable');

 // Regressions: a legacy Safari API must be called, and one fullscreen action
 // must enter immediately. Mocked WebKit is not physical Safari verification.
 await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('window.ready');
 await run(`window.legacyCalls=0;window.legacyElement=null;document.documentElement.requestFullscreen=undefined;Object.defineProperty(document,'webkitFullscreenElement',{configurable:true,get:()=>window.legacyElement});document.documentElement.webkitRequestFullscreen=()=>{window.legacyCalls++;setTimeout(()=>{window.legacyElement=document.documentElement;document.dispatchEvent(new Event('webkitfullscreenchange'));},20)};document.webkitExitFullscreen=()=>{window.legacyElement=null;document.dispatchEvent(new Event('webkitfullscreenchange'))};`);
 await clickSelector('#open');await click('fullscreen');await wait('window.legacyCalls===1&&!!window.legacyElement');await wait('document.querySelector(".media-viewer").dataset.fullscreenMode==="native"');
 await click('exit-fullscreen');await wait('!window.legacyElement&&!document.querySelector(".viewer-fullscreen")');
 await click('fullscreen');await wait('!!window.legacyElement');await run('document.webkitExitFullscreen()');await wait('!document.querySelector(".viewer-fullscreen")');await click('close');
 await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/?full`});await wait('window.ready');
 await clickSelector('#open');await wait('!!document.fullscreenElement&&!!document.querySelector(".viewer-fullscreen")');await clickSelector('.viewer-stage');await click('close');await wait('!document.fullscreenElement');
 // Dynamic browser bars/orientation must resize fallback to the visible viewport.
 await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('window.ready');
 await run(`document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;window.mockViewport=Object.assign(new EventTarget(),{width:390,height:620,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:window.mockViewport});void 0;`);
 await clickSelector('#open');await click('fullscreen');assert.equal((await state()).height,620);assert.equal((await state()).width,390);assert.equal(await run('document.querySelector(".viewer-fullscreen-status").hidden'),false);
 await run('window.mockViewport.height=500;window.mockViewport.dispatchEvent(new Event("resize"))');assert.equal((await state()).height,500);await click('exit-fullscreen');await click('close');
 for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844],['tablet',768,1024]]){
  touch=name!=='desktop';await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});await cmd('Emulation.setTouchEmulationEnabled',{enabled:touch});
  await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});await wait('window.ready');
  await run(`document.body.classList.add('side-chat-open');document.body.style.setProperty('--side-chat-width','420px');document.querySelector('#open').focus();document.querySelector('#open').click()`);
  await wait('document.querySelector(".viewer-stage img")?.complete');
  const before=await state();if(width>=900)assert.equal(before.width,width-420);
  // Exercise the fallback even when the browser denies fullscreen permission.
  await run(`window.nativeRequest=document.documentElement.requestFullscreen.bind(document.documentElement);document.documentElement.requestFullscreen=()=>Promise.reject(new Error('fixture denial'))`);
  await click('fullscreen');await wait('document.querySelector(".viewer-fullscreen")');
  const full=await state();assert.equal(full.width,width);assert.equal(full.height,height);assert.equal(full.stageHeight,height);assert.equal(full.stageWidth,width);assert.ok(full.exitVisible);assert.equal(full.withChat,false);assert.equal(full.native,false);assert.equal(await run('document.querySelector(".media-viewer").dataset.fullscreenMode'),'viewport');
  await shot(name+'-fullscreen');
  await run(`document.querySelector('.media-viewer').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);await wait('document.querySelector(".media-viewer").dataset.fileId==="fixture-2"');
  await click('exit-fullscreen');await wait('!document.querySelector(".viewer-fullscreen")');assert.equal((await state()).file,'fixture-2');
  await click('fullscreen');await run(`document.querySelector('.media-viewer').dispatchEvent(new Event('cancel',{cancelable:true}))`);assert.equal((await state()).full,false);assert.equal((await state()).open,true);
  if(name==='desktop'){
   await run('document.documentElement.requestFullscreen=window.nativeRequest');await click('fullscreen');await wait('!!document.fullscreenElement');assert.ok((await state()).full);await shot('desktop-native-fullscreen');
   await run('document.exitFullscreen()');await wait('!document.querySelector(".viewer-fullscreen")');assert.equal((await state()).open,true);
   await click('fullscreen');await wait('!!document.fullscreenElement');await run(`document.querySelector('.media-viewer').classList.remove('viewer-controls-hidden')`);await click('ask-ai');await wait('!document.fullscreenElement&&!document.querySelector(".viewer-fullscreen")');assert.equal((await state()).withChat,true);
  }
  await click('close');await wait('!document.querySelector(".media-viewer")');assert.equal(await run('document.body.classList.contains("media-viewer-open")'),false);assert.equal(await run('document.activeElement.id'),'open');
  evidence.push({name,before,full,checks:'full viewport, permission fallback, paging, exit, Escape, focus restoration'+(name==='desktop'?', native fullscreen and browser exit':'')});
 }
 // Closing during a pending browser permission request must not strand fullscreen.
 await run(`document.body.classList.remove('side-chat-open');openPreview();window.fakeNative=null;Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>window.fakeNative});document.exitFullscreen=async()=>{window.fakeNative=null};document.documentElement.requestFullscreen=()=>new Promise(resolve=>window.finishFullscreen=resolve)`);
 await click('fullscreen');await clickSelector('.viewer-stage');await click('close');await run('window.fakeNative=document.documentElement;window.finishFullscreen()');await wait('!window.fakeNative&&!document.querySelector(".media-viewer")');
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.length,additional:['legacy WebKit request/exit/browser exit','single-action initial fullscreen','dynamic viewport fallback'],output:out}));
}finally{socket?.close();child.kill();await new Promise(resolve=>server.close(resolve));}
