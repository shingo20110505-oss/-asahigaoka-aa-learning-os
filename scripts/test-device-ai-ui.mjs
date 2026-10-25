// Disposable UI fixture. Inference is stubbed here; real model measurements are separate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createBridge} from '../bridge/server.mjs';
import {passwordHash} from '../bridge/security.mjs';
const {chromium}=await import(process.env.RISE_PLAYWRIGHT_MODULE?pathToFileURL(process.env.RISE_PLAYWRIGHT_MODULE).href:'playwright');
const results=path.resolve('test-results/device-ai');await fs.mkdir(results,{recursive:true});
const privateDir=await fs.mkdtemp(path.join(results,'fixture-'));
const password='Disposable device test';
const hash=await passwordHash(password);
const app=await createBridge({privateDir,port:4319,config:{ownerPassword:hash,guestPassword:hash},provider:{ready:()=>true,info:()=>({label:'UI fixture'}),run:async({onDelta})=>onDelta('PC側の試験回答です。')}});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
const context=await browser.newContext({viewport:{width:1180,height:850}});
const page=await context.newPage();const errors=[];page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))console.log('HTTP',r.status(),r.url());});page.on('pageerror',e=>errors.push(e.message));
async function localFixture(){
 await page.evaluate(async()=>{
  const {localAI}=await import('./src/local-ai/client.mjs');
  localAI.status=async()=>({ready:true,supported:true,selectedModel:'fixture',installed:['fixture']});
  localAI.generate=async(messages,{onDelta,signal})=>{window.__localCalls=(window.__localCalls||0)+1;onDelta('保存できる途中の文章。');await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,2500);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('stopped','AbortError'));},{once:true});});onDelta('回答が完了しました。');return {text:'保存できる途中の文章。回答が完了しました。',model:'fixture'};};
  window.dispatchEvent(new Event('rise:local-ai'));
 });
}
async function snapshot(){return page.evaluate(async()=>{const {ChatArchive}=await import('./src/chat-archive.mjs');const a=new ChatArchive({channel:null});await a.open();const s=await a.summary();const t=await Promise.all(s.savedIds.map(id=>a.thread(id)));a.close();return {summary:s,threads:t};});}
try{
 await page.goto(app.url+'/#/handwriting-clean');
 await page.getByRole('heading',{name:'手書き消去',exact:true}).waitFor();
 const png=await page.evaluate(async()=>{const {syntheticPage}=await import('./src/handwriting-clean/fixtures.mjs');const f=syntheticPage(600,800);const c=document.createElement('canvas');c.width=f.width;c.height=f.height;c.getContext('2d').putImageData(new ImageData(f.data,f.width,f.height),0,0);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('[data-clean-files]').setInputFiles([1,2,3].map(i=>({name:`worksheet-${i}.png`,mimeType:'image/png',buffer:Buffer.from(png,'base64')})));
 await page.getByRole('button',{name:'まとめて消去結果を作る'}).click();
 await page.getByRole('button',{name:'完成したページをまとめて保存'}).waitFor();
 await page.getByRole('button',{name:'完成したページをまとめて保存'}).click();
 await page.getByText('完成したページを資料室に保存しました',{exact:true}).waitFor();
 await page.getByRole('button',{name:'全画面',exact:true}).click();
 await page.screenshot({path:path.join(results,'handwriting-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(results,'handwriting-phone.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone has no horizontal page overflow');
 await page.getByRole('button',{name:'元の大きさ'}).click();
 await page.setViewportSize({width:1180,height:850});
 await page.goto(app.url+'/#/chat');
 await page.locator('#chat-login').waitFor();
 await page.locator('#chat-login [name=password]').fill(password);
 await page.getByRole('button',{name:'ログインする',exact:true}).click();
 await page.locator('#chat-text').waitFor();
 await page.locator('#chat-text').fill('PCの会話');await page.locator('#chat-compose').evaluate(f=>f.requestSubmit());
 await page.getByText('PC側の試験回答です。',{exact:true}).waitFor();await page.getByRole('button',{name:'送信する ↑',exact:true}).waitFor();
 await page.waitForFunction(async()=>{const {offlineState}=await import('./src/offline.mjs');return offlineState().phase==='ready';});
 console.log('initial SW',await page.evaluate(async()=>({controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope),caches:await Promise.all((await caches.keys()).map(async key=>({key,count:(await(await caches.open(key)).keys()).length})))})));
 await page.locator('#chat-files').setInputFiles({name:'queued.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.locator('#chat-text').fill('端末の質問');await localFixture();
 await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('.chat-state')?.textContent.includes('端末内AI'));
 assert.equal(await page.locator('#chat-text').inputValue(),'端末の質問');
 await page.getByRole('button',{name:'外す',exact:true}).click();
 await page.locator('#chat-compose').evaluate(f=>{f.requestSubmit();f.requestSubmit();});
 await page.getByText('保存できる途中の文章。回答が完了しました。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__localCalls),1,'double submit starts one local generation');
 const first=await snapshot(),local=first.threads.find(t=>t.localOnly);assert.ok(local);assert.equal(local.messages.filter(m=>m.text==='端末の質問').length,1);
 await page.locator('#chat-text').fill('戻っても残す下書き');await context.setOffline(false);
 await page.waitForTimeout(2000);
 assert.equal(await page.locator('#chat-text').inputValue(),'戻っても残す下書き');
 assert.ok((await snapshot()).threads.some(t=>t.id===local.id&&t.localOnly),'reconnect retains local thread');
 await page.screenshot({path:path.join(results,'local-chat-desktop.png')});
 await page.locator('#chat-compose').evaluate(f=>f.requestSubmit());
 await page.waitForTimeout(700);const during=await snapshot();assert.ok(during.threads.find(t=>t.localOnly).messages.at(-1).text.includes('途中'));
 const workerState=await page.evaluate(async()=>({url:location.href,controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.state})),caches:await caches.keys()}));console.log('before reload',JSON.stringify(workerState));await context.setOffline(true);await page.reload();
 await page.getByText('端末内AI · 中断',{exact:true}).waitFor();
 await localFixture();await page.locator('#chat-text').waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(results,'local-chat-phone.png')});
 await context.setOffline(false);await page.waitForTimeout(1200);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await page.locator('#chat-login').waitFor();
 await page.locator('#chat-login [name=role]').selectOption({label:'管理者'});await page.locator('#chat-login [name=password]').fill(password);await page.getByRole('button',{name:'ログインする',exact:true}).click();await page.locator('#chat-text').waitFor();
 assert.equal((await snapshot()).threads.length,0,'guest local chat is absent for owner');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({ok:true,checks:['multi-page cleanup and save','fullscreen desktop/phone','offline attachment removal','single generation on double submit','reconnect draft and local history','stream checkpoint/reload interruption','owner/guest isolation'],screenshots:results,inference:'UI stub only; not a model benchmark'}));
}catch(error){await page.screenshot({path:path.join(results,'failure.png')}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));throw error;}
finally{await browser.close();await app.close();if(path.dirname(privateDir)===results&&path.basename(privateDir).startsWith('fixture-'))await fs.rm(privateDir,{recursive:true,force:true});}
