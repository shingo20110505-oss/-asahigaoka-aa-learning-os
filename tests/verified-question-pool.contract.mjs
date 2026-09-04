import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=await fs.readFile(new URL('../app/learning/verified-question-pool-v1.js',import.meta.url),'utf8');

function storage(){
  const map=new Map();
  return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear()};
}
function item(id='rise-math-0123456789abcdef',subject='math',skill='math.aichi.geometry'){
  return{id,subject,skill,difficulty:9,question:'図の条件から正しい結論を選びなさい。',context:'AB=ACで、点Dは辺BC上にある。',choices:['AD=BD','AD=CD','BD=CD','AB=BD'],answerIndex:2,answer:'BD=CD',explanation:'与えられた条件を順に用いると、BDとCDが等しいことが導けます。',evidence:'AB=AC',misconception:'見た目だけで長さを判断すると誤ります。',marks:2,quality:{verified:true,verifierConfidence:.93,method:'test'}};
}
function boot(){
  const localStorage=storage();
  const fakeState={ui:{subjectDifficulty:10,practiceConfig:{}},attempts:[],mastery:{},session:null};
  let fetchCount=0,fetchHandler=async()=>{throw new Error('unexpected fetch')};
  const document={addEventListener(){},getElementById(){return null;},createElement(){return{setAttribute(){},style:{},appendChild(){},hidden:false,innerHTML:''}},body:{appendChild(){}}};
  const context={console,URL,AbortController,setTimeout,clearTimeout,structuredClone,localStorage,document,navigator:{onLine:true},fetch:(...args)=>{fetchCount++;return fetchHandler(...args)},AA_APP:{get(name){if(name==='state')return{get:()=>fakeState,save:()=>true};if(name==='ui')return{render:()=>true};return null}}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'verified-question-pool-v1.js'});
  return{api:context.RiseVerifiedQuestionPool,localStorage,fakeState,getFetchCount:()=>fetchCount,setFetchHandler:fn=>{fetchHandler=fn}};
}

{
  const t=boot();
  const row={subject:'math',examUnit:'geometry',item:item(),addedAt:Date.now(),lastUsedAt:0,useCount:0};
  assert.equal(t.api.__test.writeStore({items:[row]}),true);
  const result=await t.api.acquire({subject:'math',units:['geometry'],level:3,count:1});
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].id,row.item.id);
  assert.equal(t.getFetchCount(),0,'pool hit must not call API');
}

{
  const t=boot();
  t.localStorage.setItem('aa_ai_reading_config_v1',JSON.stringify({endpoint:'https://example.test',accessToken:'123456789012345678901234567890'}));
  const generated=item('rise-math-fedcba9876543210');
  t.setFetchHandler(async()=>({ok:true,status:200,json:async()=>({subject:'math',quality:{verified:true},items:[generated]})}));
  const result=await t.api.acquire({subject:'math',units:['geometry'],level:3,count:1});
  assert.equal(t.getFetchCount(),1,'pool miss should call API once');
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].id,generated.id,'stable worker ID must survive pool conversion');
  assert.equal(t.api.load().items.length,1,'verified item must persist');
}

{
  const t=boot();
  t.localStorage.setItem('aa_ai_reading_config_v1',JSON.stringify({endpoint:'https://example.test',accessToken:'123456789012345678901234567890'}));
  const bad={...item('rise-science-1111111111111111','science','sci.aichi.physics'),quality:{verified:false,verifierConfidence:.99}};
  t.setFetchHandler(async()=>({ok:true,status:200,json:async()=>({subject:'science',quality:{verified:true},items:[bad]})}));
  const result=await t.api.acquire({subject:'science',units:['physics'],level:3,count:1});
  assert.equal(result.items.length,0);
  assert.equal(t.api.load().items.length,0,'unverified item must never persist');
}

{
  const t=boot();
  t.localStorage.setItem('aa_ai_reading_config_v1',JSON.stringify({endpoint:'https://example.test',accessToken:'123456789012345678901234567890'}));
  const result=await t.api.acquire({subject:'japanese',units:['kanji'],level:2,count:1});
  assert.equal(result.items.length,0);
  assert.equal(t.getFetchCount(),0,'vocabulary/kanji practice must remain local-first and API-free');
}

{
  const t=boot();
  const a={subject:'math',examUnit:'geometry',item:item(),addedAt:Date.now(),lastUsedAt:0,useCount:0};
  const q=t.api.toPracticeQuestion(a,3);
  assert.equal(q.id,a.item.id);
  assert.equal(q.reviewKey,a.item.id);
  assert.equal(q.source.verified,true);
  assert.equal(q.testMode,false);
}

console.log('verified-question-pool contract: PASS');
