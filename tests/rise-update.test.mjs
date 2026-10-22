import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const script=await fs.readFile(new URL('../src/app-updater.mjs',import.meta.url),'utf8');
const version='123456abcdef';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({hash='#/materials',fetchError=false,registerError=false}={}){
 const nodes=Object.fromEntries(['status','retry','back'].map(id=>[id,{hidden:true}]));
 let navigate,updates=0,reads=0;
 const old={postMessage(_,ports){ports[0].reply({ready:true,version:'000000000000'});}};
 const current={postMessage(_,ports){ports[0].reply({ready:true,version});}};
 const serviceWorker={controller:old,register:async()=>{if(registerError)throw Error('Registration failed');return{active:current,async update(){updates++;}};}};
 const waits=[];
 const context={document:{getElementById:id=>nodes[id]},location:{hash,replace:url=>{navigate=url;}},navigator:{serviceWorker},Date,
  // Access to any persistence API would fail: the updater must never clear user data.
  fetch:async(_,options)=>{reads++;assert.equal(options.cache,'no-store');if(fetchError)throw Error('Offline');return{ok:true,json:async()=>({version})};},
  MessageChannel:class{constructor(){this.port1={close(){}};this.port2={reply:data=>queueMicrotask(()=>this.port1.onmessage({data}))};}},
  setTimeout:(fn,ms)=>{const token={};if(ms===500)waits.push(fn);return token;},clearTimeout(){}};
 vm.runInNewContext(script,context);
 return {nodes,serviceWorker,current,waits,get navigate(){return navigate;},get updates(){return updates;},get reads(){return reads;}};
}
test('update waits for the controller, preserves the route and does not clear stored data',async()=>{
 const app=fixture({hash:'#/chat?mode=image'});await flush();
 assert.equal(app.updates,1);assert.equal(app.navigate,undefined,'an active worker alone does not mean it controls this page');assert.equal(app.waits.length,1);
 app.serviceWorker.controller=app.current;app.waits.shift()();await flush();
 assert.equal(app.navigate,'./#/chat?mode=image');
});
test('offline or failed installation leaves a retry and usable back link without navigating',async()=>{
 for(const failure of [{fetchError:true},{registerError:true}]){const app=fixture(failure);await flush();assert.equal(app.navigate,undefined);assert.equal(app.nodes.retry.hidden,false);assert.equal(app.nodes.back.hidden,false);assert.equal(app.nodes.back.href,'./#/materials');assert.match(app.nodes.status.textContent,/Offline|Registration failed/);}
});
test('update never navigates to a URL supplied as an external fragment',async()=>{
 const app=fixture({hash:'#https://evil.invalid/'});await flush();app.serviceWorker.controller=app.current;app.waits.shift()();await flush();assert.equal(app.navigate,'./#/materials');
});
