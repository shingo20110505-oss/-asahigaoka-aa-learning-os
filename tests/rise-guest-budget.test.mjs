import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {GuestBudget,weeklySample,BUDGET_NOTICE} from '../bridge/guest-budget.mjs';
import {beginGuestMeter,budgetInfo} from '../bridge/guest-budget-meter.mjs';
import {guestBrowserId} from '../bridge/guest-browser.mjs';
import {guestBudgetText} from '../src/guest-budget-display.mjs';

const epoch=1800000000000,week=7*86400000,account={account:{type:'chatgpt'},workspaceRouting:{chatgptAccountId:'fixture-account'}};
function response(used=10,reset=epoch+week){return{accountId:'fixture-account',rateLimitsByLimitId:{codex:{limitId:'codex',primary:{usedPercent:used,windowDurationMins:10080,resetsAt:reset/1000},secondary:null}}};}
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-budget-test-'));let time=epoch;
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));const budget=new GuestBudget(dir,{now:()=>time});
 return{dir,budget,advance:ms=>time+=ms,now:()=>time,sample:(used=10,reset=epoch+week)=>weeklySample(account,response(used,reset),{now:time}),read:async()=>JSON.parse(await fs.readFile(budget.file,'utf8'))};
}
async function consume(f,browserId,from,to,requestId=randomUUID()){
 const lease=await f.budget.begin({browserId,requestId,sample:f.sample(from)});
 return{lease,summary:await lease.finish({sample:f.sample(to)}),requestId};
}

test('same-account evidence is mandatory; weekly may be primary or secondary, multiple buckets are not added',()=>{
 const r=response();r.rateLimitsByLimitId.other={primary:{usedPercent:99,windowDurationMins:10080,resetsAt:(epoch+week)/1000}};
 assert.equal(weeklySample(account,r,{now:epoch}).used,10);
 const b=r.rateLimitsByLimitId.codex;b.secondary=b.primary;b.primary={usedPercent:2,windowDurationMins:300,resetsAt:(epoch+3600000)/1000};
 assert.equal(weeklySample(account,r,{now:epoch}).slot,'secondary');
 assert.throws(()=>weeklySample(account,{...r,accountId:null},{now:epoch}),{code:'BUDGET_ACCOUNT'});
 assert.throws(()=>weeklySample(account,{...r,accountId:'other'},{now:epoch}),{code:'BUDGET_ACCOUNT'});
 b.primary=b.secondary;assert.throws(()=>weeklySample(account,r,{now:epoch}),{code:'BUDGET_WINDOW'});
 b.primary=null;b.secondary.resetsAt=epoch/1000;assert.throws(()=>weeklySample(account,r,{now:epoch}),{code:'BUDGET_STALE'});
});

test('browser gets five percentage points of the whole account; global gets 25; both survive reload',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,15);
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(15)}),{code:'BUDGET_BROWSER_LIMIT'});
 for(let i=0;i<4;i++)await consume(f,randomUUID(),15+i*5,20+i*5);
 const other=new GuestBudget(f.dir,{now:f.now});
 await assert.rejects(other.begin({browserId:randomUUID(),requestId:randomUUID(),sample:f.sample(35)}),{code:'BUDGET_TOTAL'});
 const state=await f.read();assert.equal(state.windows[state.current].total,25);
});

test('zero integer delta is a legitimate estimate, not a permanent hold or a one-point minimum',async t=>{
 const f=await fixture(t),b=randomUUID();
 for(let i=0;i<12;i++){const {summary}=await consume(f,b,10,10);assert.equal(summary.pending,false);assert.equal(summary.browserUsed,0);}
 const {summary}=await consume(f,b,10,11);assert.equal(summary.browserUsed,1);assert.equal(summary.totalUsed,1);
});

test('delayed reflection is assigned once to the preceding browser inside the bounded window',async t=>{
 const f=await fixture(t),a=randomUUID(),b=randomUUID();await consume(f,a,10,10);f.advance(2000);
 const next=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(11)});const result=await next.finish({sample:f.sample(12)});
 assert.equal(result.totalUsed,2);assert.equal(result.browserUsed,1);
 const state=await f.read(),w=state.windows[state.current];assert.equal(w.browsers[a],1);assert.equal(w.browsers[b],1);
});

test('ordinary idle account use is not continuously charged to guests',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,11);f.advance(121000);
 const {summary}=await consume(f,b,60,61);assert.equal(summary.totalUsed,2);
});

test('duplicate finish and request IDs never double count',async t=>{
 const f=await fixture(t),b=randomUUID(),{lease,requestId}=await consume(f,b,10,12);
 await lease.finish({sample:f.sample(12)});
 await assert.rejects(f.budget.begin({browserId:b,requestId,sample:f.sample(12)}),{code:'BUDGET_DUPLICATE'});
 const state=await f.read();assert.equal(state.windows[state.current].total,2);
});

test('simultaneous guests across instances cannot race past the budget',async t=>{
 const f=await fixture(t),b=randomUUID(),lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()});
 const other=new GuestBudget(f.dir,{now:f.now});
 await assert.rejects(other.begin({browserId:randomUUID(),requestId:randomUUID(),sample:f.sample()}),{code:'BUDGET_BUSY'});
 await lease.finish({sample:f.sample(11)});await consume(f,b,11,12);
});

test('missing telemetry holds guests; a fresh matching read recovers even if the integer is unchanged',async t=>{
 const f=await fixture(t),b=randomUUID(),lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()});
 assert.equal((await lease.finish()).pending,true);
 const stale=f.sample();f.advance(31000);
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:stale}),{code:'BUDGET_STALE'});
 const next=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()});assert.equal(next.summary.pending,true);
 const result=await next.finish({sample:f.sample(11)});assert.equal(result.pending,false);assert.equal(result.totalUsed,1);
});

test('a process restart does not silently erase an unmeasured dispatched request',async t=>{
 const f=await fixture(t),b=randomUUID(),lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()});await lease.finish();
 await assert.rejects(new GuestBudget(f.dir,{now:f.now}).begin({browserId:b,requestId:randomUUID(),sample:f.sample(12)}),{code:'BUDGET_PENDING'});
});

test('expired missing-telemetry holds are not zeroed; an actual new week recovers',async t=>{
 const f=await fixture(t),b=randomUUID(),lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()});await lease.finish();
 f.advance(121000);await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(10)}),{code:'BUDGET_PENDING'});
 f.advance(week);const next=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(0,epoch+2*week)});
 assert.equal((await next.finish({sample:f.sample(1,epoch+2*week)})).totalUsed,1);
});

test('one in-flight answer may overshoot, but the next guest is blocked and the full delta is saved',async t=>{
 const f=await fixture(t),b=randomUUID();const result=await consume(f,b,10,40);assert.equal(result.summary.totalUsed,30);
 await assert.rejects(f.budget.begin({browserId:randomUUID(),requestId:randomUUID(),sample:f.sample(40)}),{code:'BUDGET_TOTAL'});
});

test('failed or interrupted dispatched turns consume their observed delta; pre-dispatch failure is zero',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,12);
 const lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(12)});
 const s=await lease.finish({dispatched:false});assert.equal(s.totalUsed,2);assert.equal(s.pending,false);
});

test('owner calls are unrestricted and excluded; known overlap is held rather than charged as guest usage',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,11);
 const end=f.budget.ownerStarted();
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(20)}),{code:'BUDGET_OWNER_ACTIVE'});
 end();const {summary}=await consume(f,b,20,21);assert.equal(summary.totalUsed,2);
 const lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(21)}),end2=f.budget.ownerStarted();
 const result=await lease.finish({sample:f.sample(30)});assert.equal(result.totalUsed,2);assert.equal(result.pending,true);end2();
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(30)}),{code:'BUDGET_PENDING'});
 assert.equal(typeof f.budget.ownerStarted(),'function');
});

test('reset is the account timestamp; old-window holds clear only after verified rollover',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,15);
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(0,epoch+week+1000)}),{code:'BUDGET_WINDOW_CHANGED'});
 f.advance(week+1000);
 const lease=await f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(0,epoch+2*week)});
 const result=await lease.finish({sample:f.sample(1,epoch+2*week)});assert.equal(result.totalUsed,1);assert.equal(result.browserUsed,1);
 assert.equal(Object.keys((await f.read()).windows).length,2);
});

test('account switches, corrupt storage, stale snapshots, and resets too close fail closed',async t=>{
 const f=await fixture(t),b=randomUUID();await consume(f,b,10,11);
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:{...f.sample(),accountHash:'different'}}),{code:'BUDGET_ACCOUNT_CHANGED'});
 f.advance(week-60000);
 await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample(11)}),{code:'BUDGET_RESET_NEAR'});
 await fs.writeFile(f.budget.file,'broken');await assert.rejects(f.budget.begin({browserId:b,requestId:randomUUID(),sample:f.sample()}),{code:'BUDGET_STORAGE'});
});

test('clearing browser data resets only that browser; recovery IDs do not select the budget identity',async t=>{
 const f=await fixture(t),first=guestBrowserId({}),device={browserId:first,expires:epoch+week,user:'recovered-history'};
 assert.equal(guestBrowserId({device,now:epoch}),first);
 const recoveredElsewhere=guestBrowserId({session:{role:'guest',user:'recovered-history',expires:epoch+week},now:epoch});assert.notEqual(recoveredElsewhere,first);
 await consume(f,first,10,15);const {summary}=await consume(f,recoveredElsewhere,15,16);assert.equal(summary.browserUsed,1);assert.equal(summary.totalUsed,6);
});

class FakeClient {
 constructor(readings){this.readings=readings;this.observers=new Set();this.calls=[];}
 async request(method){this.calls.push(method);if(method==='account/read')return account;const value=this.readings.shift();if(value instanceof Error)throw value;if(!value)throw Error('no sample');return value;}
 observe(fn){this.observers.add(fn);return()=>this.observers.delete(fn);}
 emit(used){for(const fn of this.observers)fn({method:'account/rateLimits/updated',params:{rateLimits:response(used).rateLimitsByLimitId.codex}});}
}
test('meter uses the inference client, polls delayed snapshots, and ignores duplicate notifications',async t=>{
 const f=await fixture(t),client=new FakeClient([response(10),response(10),response(11)]);
 const meter=await beginGuestMeter({client,budget:f.budget,browserId:randomUUID(),requestId:randomUUID(),now:f.now,pause:async()=>{}});meter.dispatched();client.emit(11);client.emit(11);
 const result=await meter.finish();assert.equal(result.totalUsed,1);assert.equal(client.observers.size,0);await meter.finish();
 assert.equal(client.calls.filter(x=>x==='account/rateLimits/read').length,3);
});
test('meter accepts normal small unchanged usage but never substitutes zero for failed reads',async t=>{
 const f=await fixture(t),b=randomUUID(),client=new FakeClient([response(10),response(10),response(10),response(10)]);
 const m=await beginGuestMeter({client,budget:f.budget,browserId:b,requestId:randomUUID(),now:f.now,pause:async()=>{}});m.dispatched();assert.equal((await m.finish()).pending,false);
 const bad=new FakeClient([response(10),Error('offline'),Error('offline'),Error('offline')]);
 const n=await beginGuestMeter({client:bad,budget:f.budget,browserId:b,requestId:randomUUID(),now:f.now,pause:async()=>{}});n.dispatched();assert.equal((await n.finish()).pending,true);
});
test('guest display explicitly labels estimates; owners never get budget controls',()=>{
 const config={guestWeeklyBudget:{enabled:true}};assert.equal(budgetInfo(config,'owner'),null);assert.equal(budgetInfo({},'guest'),null);
 const session={role:'guest',budgetBrowserKey:'fixture',provider:{guestBudget:budgetInfo(config,'guest')}};
 assert.equal(guestBudgetText(session),BUDGET_NOTICE);assert.equal(guestBudgetText({...session,role:'owner'}),'');
 const message={budget:{browserKey:'fixture',mode:'estimated',totalUsed:2,browserUsed:1,resetsAt:epoch+week,pending:false}};
 const text=guestBudgetText(session,[message]);assert.match(text,/全ゲスト 2 \/ 25%/);assert.match(text,/このブラウザー 1 \/ 5%/);assert.match(text,/推定/);
 assert.equal(guestBudgetText({...session,budgetBrowserKey:'recovered-other-browser'},[message]),BUDGET_NOTICE);
});
