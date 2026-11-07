import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {classifyHistory,eraDefinitions,historyTopics,historyDateRange,historyAdditions,enrichHistory} from '../src/history-content.mjs';
import {filterHistory} from '../src/history-domain.mjs';
import {enrichHistory as referenceHistory,historyAdditions as referenceAdditions} from '../bridge/history-reference-content.mjs';
const rows=JSON.parse(await fs.readFile(new URL('../data/history.json',import.meta.url),'utf8'));
const get=id=>rows.find(x=>x.id===id);

test('content keeps all canonical identities and appends six unique sourced events',()=>{
 assert.equal(rows.length,1000+historyAdditions);
 assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);
 const legacy=rows.filter(x=>x.id<=1000).sort((a,b)=>a.id-b.id);
 assert.deepEqual(legacy.map(x=>x.id),Array.from({length:1000},(_,i)=>i+1));
 const identity=legacy.map(x=>[x.id,x.event,x.date,x.sort,x.level]);
 assert.equal(createHash('sha256').update(JSON.stringify(identity)).digest('hex'),'788ce9e565c172f3db72d1e32b44cad7294685386ac915858d2384f991c5d8e9');
 const titles=rows.map(x=>x.event.normalize('NFKC').replace(/[\s『』「」]/g,''));
 assert.equal(new Set(titles).size,rows.length,'Duplicate normalized event title');
 for(const x of rows.filter(x=>x.id>1000)){
  assert.ok(x.sources.length);assert.match(x.level,/^[SAB]$/);assert.equal(x.contentReview.method,'source-checked-addition');
  for(const url of x.sources)assert.equal(new URL(url).protocol,'https:');
  for(const s of x.sourceRecords){assert.equal(new URL(s.url).protocol,'https:');assert.ok(s.title&&s.scope);}
 }
 const references=referenceHistory(rows);
 assert.equal(references.length,rows.length+referenceAdditions);
 assert.equal(new Set(references.map(x=>x.id)).size,references.length);
 assert.equal(references.find(x=>x.id===2001).event,get(2001).event);
 assert.match(references.find(x=>x.id===1001).event,/選挙権/);
});

test('every entry has reproducible regional eras and valid topics, searchable through tags',()=>{
 const labels=new Set(eraDefinitions.map(x=>x.id));assert.equal(labels.size,eraDefinitions.length);
 for(const x of rows){
  assert.ok(x.eras.length,String(x.id));assert.ok(x.eras.every(e=>labels.has(e)),String(x.id));
  assert.ok(x.topics.every(t=>historyTopics.includes(t)),String(x.id));
  assert.deepEqual(classifyHistory(x),{eras:x.eras,topics:x.topics},String(x.id));
  assert.ok([...x.eras,...x.topics].every(t=>x.tags.includes(t)),String(x.id));
  if(!x.area.includes('日本'))assert.ok(!x.eras.some(e=>eraDefinitions.find(d=>d.id===e).region==='日本'),String(x.id));
 }
 assert.ok(filterHistory(rows,{query:'縄文時代'}).some(x=>x.id===2002));
 assert.ok(filterHistory(rows,{query:'ルネサンス期 美術'}).some(x=>x.id===435));
 assert.ok(!get(153).eras.includes('啓蒙思想の時代'));
 assert.ok(!get(108).eras.includes('ルネサンス期'),'Religious reform is a distinct theme');
 assert.ok(!get(313).topics.includes('文化'));
 assert.equal(get(431).area,'東南アジア');
});

test('broad and uncertain dates do not become falsely precise political boundaries',()=>{
 assert.deepEqual(get(380).eras,['縄文時代']);assert.deepEqual(get(381).eras,['弥生時代']);
 assert.deepEqual(get(2001).eras,['旧石器時代']);
 assert.deepEqual(historyDateRange({sort:1400,date:'15〜16世紀ごろ'}),{start:1401,end:1600,precision:'century'});
 assert.deepEqual(historyDateRange({sort:-300,date:'紀元前4世紀ごろ'}),{start:-400,end:-301,precision:'century'});
 const late=classifyHistory({id:2000,sort:1575,date:'16世紀後半',area:'日本',period:'近世',event:'地域の変化',tags:[]});
 assert.ok(late.eras.includes('室町時代')&&late.eras.includes('安土桃山時代'));
 for(const x of rows.filter(x=>x.dateRange)){
  assert.ok(x.dateRange.start<=x.dateRange.end,String(x.id));
  assert.ok(x.sort>=x.dateRange.start&&Math.trunc(x.sort)<=x.dateRange.end,String(x.id));
  assert.ok(x.dateRange.note&&x.dateRange.precision);
 }
 assert.match(get(381).detail,/地域差/);assert.match(get(2006).detail,/初演年/);
});

test('mixed-up descriptions and tags are repaired without reassigning IDs',()=>{
 for(const [id,yes,no]of [[432,/人文主義/,/SNS|スマートフォン/],[433,/金属活字/,/配信|サブスクリプション/],[434,/レオナルド/,/グプタ/],[435,/1508年/,/フランク/],[447,/二毛作/,/大仏/],[418,/富嶽三十六景/,/ペリー/],[499,/SDGs/,/男女共同参画社会基本法/],[500,/COP21/,/情報公開法/]]){
  assert.match(get(id).detail,yes);assert.doesNotMatch(get(id).detail,no);
 }
 for(const x of rows.filter(x=>x.contentReview?.method==='restored-matching-existing-note'))assert.ok(x.detail.startsWith(x.note.summary),String(x.id));
 assert.deepEqual(get(150).relatedIds,[439]);assert.deepEqual(get(439).relatedIds,[150]);
 for(const x of rows)for(const id of x.relatedIds||[]){assert.ok(get(id));assert.notEqual(id,x.id);}
 const before=JSON.stringify(rows);assert.deepEqual(enrichHistory(enrichHistory(rows)),enrichHistory(rows));assert.equal(JSON.stringify(rows),before);
});
