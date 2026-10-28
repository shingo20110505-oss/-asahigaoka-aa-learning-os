import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {freshState,scheduleReview,DAY,validState} from '../src/domain.mjs';
import {viewGroup} from '../src/view-cache.mjs';
import {scienceItems as items,scienceUnits as units,scienceSources as sources,scienceFields,filterScience,normalizeScience,scienceCardId,scienceProgress,saveScienceCard,rateScience} from '../src/science-content.mjs';

test('science content has unique stable IDs, complete original answers, explanations and valid source references',()=>{
 assert.equal(items.length,700);assert.equal(units.length,51);
 assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 assert.equal(new Set(items.map(x=>normalizeScience(x.question).replace(/[\s？?]/g,''))).size,items.length);
 for(const x of items){
  assert.match(x.id,/^sci-memory-[a-z0-9-]+$/);
  for(const k of ['question','answer','reason','connection']){assert.ok(x[k].trim().length>0,x.id+' '+k);assert.ok(!/undefined|TODO|�/.test(x[k]),x.id);}
  assert.ok(['basic','advanced'].includes(x.level));assert.ok([1,2,3].includes(x.grade));assert.ok(scienceFields[x.field]);
  const u=units.find(u=>u.id===x.unit);assert.equal(u.grade,x.grade);assert.equal(u.field,x.field);assert.match(u.pages,/\d/);assert.match(u.curriculum,/第[12]分野\([1-7]\)/);
  for(const id of x.factIds)assert.ok(sources[id],x.id+' missing '+id);
  assert.ok(!/\d+\s*(?:kg|cm|mA|Ω|V)の.*(?:求め|計算)/.test(x.question),x.id+' calculation');
 }
 for(const s of Object.values(sources)){assert.equal(new URL(s.url).protocol,'https:');assert.ok(s.scope.trim());assert.equal(s.checked,'2026-10-28');}
});
test('coverage includes all twelve grade/field combinations and fourteen curriculum groups',()=>{
 assert.deepEqual(Object.fromEntries(Object.keys(scienceFields).map(f=>[f,items.filter(x=>x.field===f).length])),{physics:147,chemistry:183,biology:206,earth:164});
 for(const g of [1,2,3])for(const f of Object.keys(scienceFields)){const xs=filterScience({grade:String(g),field:f});assert.ok(xs.length>=15,`${g} ${f}`);assert.ok(xs.some(x=>x.level==='basic'));assert.ok(xs.some(x=>x.level==='advanced'));}
 assert.equal(new Set(units.flatMap(u=>u.curriculum.match(/第[12]分野\([1-7]\)/g))).size,14);
});
test('search composes filters and normalizes kana, width, formula digits and multiple terms',()=>{
 assert.ok(filterScience({query:'アンモニア'}).length>0);
 assert.deepEqual(filterScience({query:'ｱﾝﾓﾆｱ'}),filterScience({query:'あんもにあ'}));
 assert.ok(filterScience({query:'Ｈ２Ｏ'}).some(x=>x.id==='sci-memory-atoms-water'));
 const rows=filterScience({grade:2,field:'biology',unit:'plant-transport',level:'basic',query:'道管 水'});
 assert.ok(rows.length>0);assert.ok(rows.every(x=>x.unit==='plant-transport'&&x.level==='basic'));
 assert.equal(filterScience({query:'存在しない検索項目xyz'}).length,0);
});
test('science review uses canonical card progress and preserves all unrelated learning data',()=>{
 const s=freshState(),x=items[0],now=1000000;
 s.notes.push({id:'note-existing',body:'keep'});s.review['card-geo-nobi']={repetitions:7};s.reading['rv3-000001']={done:true};s.cards.push({id:'english-existing',answer:'keep'});s.history.progress[12]={done:true};
 const before=structuredClone(s);
 assert.equal(saveScienceCard(s,x,now),true);assert.equal(saveScienceCard(s,x,now),false);
 assert.equal(filterScience({status:'due',state:s,now}).length,1);
 rateScience(s,x,'good',now);
 assert.equal(scienceProgress(s,x).due,now+DAY);assert.equal(scienceProgress(s,x).repetitions,1);
 assert.equal(s.review[x.id],undefined);assert.equal(s.cards.filter(c=>c.id===scienceCardId(x)).length,1);
 assert.equal(filterScience({status:'new',state:s}).length,items.length-1);assert.equal(filterScience({status:'due',state:s,now}).length,0);
 // A review in the existing Memory Studio is read by the science screen too.
 s.review[scienceCardId(x)]=scheduleReview(s.review[scienceCardId(x)],'again',now+1);
 assert.equal(filterScience({status:'weak',state:s}).length,1);assert.equal(scienceProgress(s,x).repetitions,2);
 for(const key of ['notes','reading','history'])assert.deepEqual(s[key],before[key]);
 assert.deepEqual(s.review['card-geo-nobi'],before.review['card-geo-nobi']);assert.deepEqual(s.cards[0],before.cards[0]);
 assert.equal(s.events[0].source,'science-memory');assert.equal(s.events[0].item,scienceCardId(x));validState(s);
});
test('adding an edited archived card restores it without replacing user text; invalid ratings do not mutate state',()=>{
 const s=freshState(),x=items[0];saveScienceCard(s,x,100);
 const c=s.cards[0];c.answer='自分で書いた説明';c.archived=true;
 assert.equal(saveScienceCard(s,x,200),false);assert.equal(c.archived,false);assert.equal(c.answer,'自分で書いた説明');assert.equal(c.updatedAt,200);
 const before=structuredClone(s);assert.throws(()=>rateScience(s,x,'invalid'));assert.deepEqual(s,before);
});
test('important misconception checks remain explicit',()=>{
 const answer=id=>items.find(x=>x.id==='sci-memory-'+id).answer;
 assert.match(answer('circulation-artery'),/心臓から出ていく/);
 assert.match(answer('photosynthesis-respire'),/昼も夜も/);
 assert.match(answer('ions-cation'),/失う/);assert.match(answer('ions-anion'),/受け取る/);
 assert.match(answer('earthquake-intensity'),/各地点.*規模/);
 assert.match(answer('moon-planets-phases'),/照らされる面/);
 assert.match(answer('acid-not-neutral'),/必ずではない/);
});
test('library, route, global search, stylesheet and learn navigation are connected',async()=>{
 const read=file=>fs.readFile(new URL('../src/'+file,import.meta.url),'utf8');
 assert.match(await read('catalog.mjs'),/id:'science-memory'/);
 assert.match(await read('app.mjs'),/'science-memory':'science-memory'/);
 assert.match(await read('app.mjs'),/route:'science-memory\/'\+x.id/);
 assert.match(await read('index.html'),/science-memory.css/);
 assert.equal(viewGroup('science-memory/sci-memory-light-source'),'learn');
});
test('supplement preserves all 516 original items and their existing review keys',async()=>{
 const baseline=JSON.parse(await fs.readFile(new URL('../docs/science-memory/baseline-516.json',import.meta.url),'utf8'));
 assert.equal(baseline.items.length,516);
 for(const before of baseline.items)assert.deepEqual(items.find(x=>x.id===before.id),before,before.id);
 const s=freshState(),old=baseline.items.find(x=>x.id==='sci-memory-light-source');
 saveScienceCard(s,old,100);s.cards[0].answer='利用者の追記を残す';s.cards[0].source.version='2026-10-28.1';
 s.review[scienceCardId(old)]=scheduleReview(undefined,'good',100);
 const before=structuredClone(s);assert.equal(saveScienceCard(s,items.find(x=>x.id===old.id),200),false);assert.deepEqual(s,before);
 assert.equal(filterScience({status:'new',state:s}).length,699);
});
test('enzyme cards distinguish source, action site, substrate and bile; basic/advanced search agrees',()=>{
 const get=id=>items.find(x=>x.id==='sci-memory-digestion-'+id);
 assert.equal(get('pepsin').level,'basic');assert.match(get('pepsin').answer,/胃の壁.*胃液.*タンパク質/);assert.match(get('pepsin').reason,/酸性/);
 assert.equal(get('trypsin').level,'advanced');assert.match(get('trypsin').answer,/すい臓.*小腸.*タンパク質/);assert.match(get('trypsin').reason,/弱アルカリ性/);
 assert.equal(get('lipase').level,'advanced');assert.match(get('lipase').answer,/すい臓.*小腸.*脂肪酸.*モノグリセリド/);assert.match(get('lipase').connection,/胆汁.*酵素ではない/);
 assert.match(get('amylase-sites').answer,/すい液.*口.*小腸.*デンプン/);
 assert.match(get('bile').answer,/肝臓/);assert.match(get('bile').connection,/胆のう.*消化酵素は含まれない/);
 const hit=filterScience({grade:2,field:'biology',unit:'digestion',level:'advanced',query:'とりぷしん すい臓'});
 assert.ok(hit.some(x=>x.id===get('trypsin').id));assert.ok(hit.every(x=>x.level==='advanced'));
 assert.ok(!filterScience({query:'とりぷしん',level:'basic'}).some(x=>x.id===get('trypsin').id));
});
test('depth audit covers 51 units with verified counts and existing example/source IDs',async()=>{
 const audit=JSON.parse(await fs.readFile(new URL('../docs/science-memory/depth-audit.json',import.meta.url),'utf8'));
 assert.equal(audit.before,516);assert.equal(audit.after,700);assert.equal(audit.added,184);
 assert.deepEqual(new Set(audit.units.map(u=>u.id)),new Set(units.map(u=>u.id)));
 for(const u of audit.units){assert.equal(u.after,units.find(x=>x.id===u.id).items.length);assert.equal(u.added,u.after-u.before);assert.ok(u.decision);assert.ok(items.some(x=>x.id===u.example.id));for(const id of u.sources)assert.ok(sources[id],id);}
});
