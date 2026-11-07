import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {HISTORY_RANKS,filterHistory,historyRank,historyRankInfo,matchesHistoryRanks,parallelGroups} from '../src/history-domain.mjs';
import {mount} from '../src/views/history.mjs';
const rows=Array.from({length:1200},(_,i)=>({id:2001+i,sort:100+i,date:(100+i)+'年',event:'出来事 '+i,detail:'比較するための説明 '+i,period:i<600?'前半':'後半',area:i%2?'日本':'世界',level:HISTORY_RANKS[i%3],tags:['文化']}));
function harness(data=rows){
 const nodes=new Map(),rankInputs=HISTORY_RANKS.map(rank=>({dataset:{rank},checked:true}));
 const main={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',classList:{toggle(){}},remove(){},focus(){}});return nodes.get(selector);},querySelectorAll(selector){return selector==='[data-rank]'?rankInputs:[];}};
 const store={state:{history:{favorites:[],progress:{}},notes:[],cards:[]},async change(fn){fn(this.state);}};
 const ctx={main,store,active:()=>true,data:async()=>data};
 const click=async(action,value={})=>main.onclick({target:{closest:()=>({dataset:{action,...value}})}});
 const choose=(rank,checked)=>main.onchange({target:{dataset:{rank},checked}});
 const input=(filter,value)=>main.oninput({target:{dataset:{filter},value}});
 const option=(option,checked)=>main.onchange({target:{dataset:{option},checked}});
 const html=()=>main.querySelector('#history-results').innerHTML;
 const count=()=>(html().match(/<article /g)||[]).length;
 return {ctx,main,store,click,choose,input,option,html,count,rankInputs};
}
test('rank selection is an OR across explicit ranks and respects personal overrides',()=>{
 assert.equal(filterHistory(rows,{ranks:['S','B']}).length,800);
 assert.equal(filterHistory(rows,{ranks:['S','S']}).length,400);
 assert.equal(filterHistory(rows,{ranks:[]}).length,0);
 assert.equal(filterHistory(rows,{ranks:['unknown']}).length,0);
 const progress={[rows[0].id]:{rank:'A',memo:'keep'}};
 assert.equal(filterHistory(rows,{ranks:['S'],progress}).length,399);
 assert.equal(filterHistory(rows,{ranks:['A'],progress}).length,401);
 assert.equal(historyRank(rows[0],progress[rows[0].id]),'A');
 assert.equal(historyRankInfo(rows[0],progress[rows[0].id]).personal,true);
 assert.equal(historyRankInfo(rows[0],{rank:'invalid'}).personal,false);
 assert.equal(matchesHistoryRanks(rows[0],HISTORY_RANKS),true);
 assert.equal(progress[rows[0].id].memo,'keep');assert.equal(rows[0].level,'S');
});
test('rank filters combine with region, date, search and favorites without changing source rows',()=>{
 const before=JSON.stringify(rows),favorites=rows.slice(0,30).map(x=>x.id);
 const actual=filterHistory(rows,{ranks:['A','B'],region:'日本',from:110,to:125,query:'出来事',favorites});
 assert.deepEqual(actual.map(x=>x.id),rows.filter(x=>favorites.includes(x.id)&&x.area==='日本'&&x.sort>=110&&x.sort<=125&&x.level!=='S').map(x=>x.id));
 assert.equal(JSON.stringify(rows),before);
});
test('all 1200 events render immediately in list and parallel modes, without a load-more action',async()=>{
 const h=harness();await mount(h.ctx);assert.equal(h.count(),1200);assert.match(h.html(),/data-event="3200"/);assert.match(h.main.innerHTML,/表示ランク（複数選択）/);assert.match(h.html(),/history-dense/);assert.doesNotMatch(h.html(),/data-action="more"/);
 await h.click('view',{value:'parallel'});assert.equal(h.count(),1200);assert.match(h.html(),/history-lane-head/);assert.doesNotMatch(h.html(),/data-action="more"/);
 assert.equal(parallelGroups(rows).reduce((n,g)=>n+g.japan.length+g.world.length,0),1200);
 await h.click('view',{value:'list'});assert.equal(h.count(),1200);
});
test('rank toggles, zero-selection, all-ranks and reset work repeatedly',async()=>{
 const h=harness();await mount(h.ctx);h.choose('A',false);assert.equal(h.count(),800);h.choose('S',false);assert.equal(h.count(),400);h.choose('B',false);assert.equal(h.count(),0);assert.match(h.html(),/表示するランクを1つ以上/);
 await h.click('all-ranks');assert.equal(h.count(),1200);assert.ok(h.rankInputs.every(x=>x.checked));
 h.choose('A',false);h.choose('A',false);assert.equal(h.count(),800);h.choose('A',true);assert.equal(h.count(),1200);
 h.input('query','存在しない');assert.equal(h.count(),0);await h.click('reset');assert.equal(h.count(),1200);
});
test('filters, density, masks and saved records survive compatible view changes',async()=>{
 const h=harness();h.store.state.history.progress[rows[0].id]={rank:'B',memo:'existing',legacyProgress:true};h.store.state.history.favorites=rows.slice(0,50).map(x=>x.id);await mount(h.ctx);
 h.choose('S',false);h.choose('A',false);h.option('saved',true);assert.equal(h.count(),17);
 await h.click('density');assert.equal(h.count(),17);assert.doesNotMatch(h.html(),/history-dense/);
 h.option('hidden-events',true);assert.match(h.html(),/出来事を表示/);assert.doesNotMatch(h.html(),/比較するための説明/);
 await h.click('view',{value:'parallel'});assert.equal(h.count(),17);assert.match(h.html(),/出来事を表示/);
 await h.click('reset');assert.equal(h.count(),1200);assert.deepEqual(h.store.state.history.progress[rows[0].id],{rank:'B',memo:'existing',legacyProgress:true});assert.equal(h.store.state.history.favorites.length,50);
});
test('rank count badges count the current non-rank filters and follow saved overrides',async()=>{
 const h=harness();await mount(h.ctx);h.input('period','前半');h.choose('B',false);assert.equal(h.count(),400);for(const r of HISTORY_RANKS)assert.equal(h.main.querySelector(`[data-rank-count="${r}"]`).textContent,'200');
 h.store.state.history.progress[rows[0].id]={rank:'B'};h.ctx.main.onchange({target:{dataset:{rank:'S'},checked:true}});assert.equal(h.count(),399);assert.equal(h.main.querySelector('[data-rank-count="B"]').textContent,'201');
});
test('empty results do not leave the comparison panel stale',async()=>{
 const h=harness();await mount(h.ctx);await h.click('compare',{id:rows[0].id});assert.match(h.main.querySelector('#history-compare').innerHTML,/出来事 0/);h.input('query','存在しない');await h.click('clear');assert.equal(h.main.querySelector('#history-compare').innerHTML,'');
});
test('history assets retain full-result rendering and explicit readable controls',async()=>{
 const source=await fs.readFile(new URL('../src/views/history.mjs',import.meta.url),'utf8'),css=await fs.readFile(new URL('../src/history.css',import.meta.url),'utf8'),index=await fs.readFile(new URL('../src/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(source,/items\.slice|groups\.slice|action==='more'|limit[=+]/);assert.match(source,/fieldset class="history-ranks"/);assert.match(source,/data-rank=/);assert.match(source,/aria-live="polite"/);assert.match(css,/content-visibility:auto/);assert.match(index,/src\/history\.css/);
});

const actualRows=JSON.parse(await fs.readFile(new URL('../data/history.json',import.meta.url),'utf8'));
test('detailed era and culture topic filters use the new taxonomy independently of broad periods',()=>{
 const jomon=filterHistory(actualRows,{era:'縄文時代'});assert.ok(jomon.some(x=>x.id===2002));assert.ok(jomon.every(x=>x.eras.includes('縄文時代')));
 const renaissance=filterHistory(actualRows,{era:'ルネサンス期',topic:'美術',ranks:['S','A','B']});assert.ok(renaissance.some(x=>x.id===2005));assert.ok(renaissance.some(x=>x.id===435));assert.ok(renaissance.every(x=>x.eras.includes('ルネサンス期')&&x.topics.includes('美術')));
 assert.equal(filterHistory(actualRows,{era:'ルネサンス期',region:'日本'}).length,0);
 assert.equal(filterHistory(actualRows,{era:'未定義の時代'}).length,0);
});
test('all combined content renders and detailed era selection resets correctly',async()=>{
 const h=harness(actualRows);await mount(h.ctx);assert.equal(h.count(),1006);assert.match(h.main.innerHTML,/時代・文化期/);assert.match(h.main.innerHTML,/ルネサンス期/);
 h.input('era','ルネサンス期');h.input('topic','美術');assert.equal(h.count(),filterHistory(actualRows,{era:'ルネサンス期',topic:'美術'}).length);
 await h.click('view',{value:'parallel'});assert.equal(h.count(),filterHistory(actualRows,{era:'ルネサンス期',topic:'美術'}).length);
 await h.click('reset');assert.equal(h.count(),1006);
});

test('world regional eras stay in their own group, not in culture periods',async()=>{const h=harness(actualRows);await mount(h.ctx);const world=h.main.innerHTML.match(/<optgroup label="世界の地域・時代">([\s\S]*?)<\/optgroup>/)[1],culture=h.main.innerHTML.match(/<optgroup label="文化・思想の時代">([\s\S]*?)<\/optgroup>/)[1];assert.match(world,/欧米：古代/);assert.doesNotMatch(culture,/欧米：古代/);assert.match(culture,/ルネサンス期/);});

test('hidden events and dates do not leak through new era labels',async()=>{const h=harness(actualRows);await mount(h.ctx);h.option('hidden-events',true);assert.doesNotMatch(h.html(),/history-context|建武の新政|ルネサンス期/);h.option('hidden-events',false);h.option('hidden',true);assert.doesNotMatch(h.html(),/history-context/);h.option('hidden',false);assert.match(h.html(),/history-context/);});
