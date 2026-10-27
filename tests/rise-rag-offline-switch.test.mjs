import test from'node:test';import assert from'node:assert/strict';import{OfflineSwitch}from'../experiments/rag/offline-switch.mjs';
const identity=(role='guest')=>({id:role+'-one',role,expires:Date.now()+60000});
test('Approved, cached tutor follows loss and recovery without replaying messages',async()=>{
 const calls=[],router=new OfflineSwitch({remote:async p=>{calls.push(['remote',p]);return{text:'online'};},local:async p=>{calls.push(['local',p]);return{text:'offline'};}});
 router.bind(identity());router.configure({approved:true,cached:true});
 assert.equal((await router.send('A')).mode,'remote');router.network({online:false});assert.equal((await router.send('B')).mode,'local');
 router.network({online:true,reachable:false});assert.equal(router.mode(),'local');router.network({online:true,reachable:true});assert.equal(calls.length,2);assert.equal((await router.send('C')).mode,'remote');assert.deepEqual(calls.map(x=>x[0]),['remote','local','remote']);
});
test('Unapproved model, missing cache, expired identity and server denials fail closed',async()=>{
 let local=0;const router=new OfflineSwitch({remote:async()=>{throw Object.assign(Error('denied'),{status:429});},local:async()=>{local++;}});router.bind(identity());router.network({online:false});
 for(const config of [{approved:false,cached:true},{approved:true,cached:false}]){router.configure(config);await assert.rejects(router.send('x'));}assert.equal(local,0);
 router.configure({approved:true,cached:true});router.network({online:true});await assert.rejects(router.send('x'));router.network({online:false});assert.equal(router.mode(),'locked');assert.equal(local,0);
 router.bind({...identity(),expires:0});assert.equal(router.mode(),'locked');
});
test('Unknown remote delivery is not silently duplicated by local inference',async()=>{
 let local=0;const router=new OfflineSwitch({remote:async()=>{throw Object.assign(Error('connection lost'),{network:true});},local:async()=>{local++;}});router.bind(identity());router.configure({approved:true,cached:true});
 await assert.rejects(router.send('possibly accepted'));assert.equal(local,0);assert.equal(router.mode(),'local');await router.send('next explicit question');assert.equal(local,1);
});
test('Changing roles aborts generation and rejects a late answer from the old role',async()=>{
 let finish,signal;const router=new OfflineSwitch({remote:async()=>({}),local:async(p,options)=>{signal=options.signal;return new Promise(r=>{finish=r;});}});router.bind(identity());router.configure({approved:true,cached:true});router.network({online:false});
 const task=router.send('guest question');router.bind(identity('owner'));assert.equal(signal.aborted,true);finish({text:'guest content'});await assert.rejects(task,{name:'AbortError'});assert.equal(router.identity.role,'owner');
});
test('Local result is rejected if the offline identity expires during inference',async()=>{
 let finish;const router=new OfflineSwitch({remote:async()=>({}),local:async()=>new Promise(r=>{finish=r;})});router.bind(identity());router.configure({approved:true,cached:true});router.network({online:false});const task=router.send('x');router.identity.expires=0;finish({text:'late'});await assert.rejects(task,{name:'AbortError'});
});
