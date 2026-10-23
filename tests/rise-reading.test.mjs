import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadingClock, readingItems, paragraphs, isReadingDue, planReadingReview, readingNoteBody} from '../src/reading-domain.mjs';
import {dayKey} from '../src/domain.mjs';
import fs from 'node:fs/promises';

test('Reading clock excludes hidden/paused time, can drain for additive saves, and restores failed writes',()=>{
  let now=0;const clock=new ReadingClock(()=>now);
  clock.start();now=2000;clock.start();assert.equal(clock.take(),2000);
  now=3000;clock.pause();now=100000;assert.equal(clock.value(),1000);
  clock.start();now=101000;const pending=clock.take();assert.equal(pending,2000);
  clock.restore(pending);now=102000;assert.equal(clock.take(),3000);assert.equal(clock.take(),0);
});
test('Reading filters distinguish unread/in-progress/completed and preserve original ordering',()=>{
  const index=[{id:'a',title:'One School',level:1,words:100},{id:'b',title:'Two Rivers',level:2,words:90},{id:'c',title:'Three Maps',level:1,words:150}];
  const records={b:{lastOpened:12,memo:'理由の確認',paragraphNotes:{0:'指示語 they'},favorite:true},c:{completedAt:'2026-10-22',lastOpened:9}};
  assert.deepEqual(readingItems(index,records,{filter:'未読'}).map(x=>x.id),['a']);
  assert.deepEqual(readingItems(index,records,{filter:'読みかけ'}).map(x=>x.id),['b']);
  assert.deepEqual(readingItems(index,records,{filter:'読了'}).map(x=>x.id),['c']);
  assert.deepEqual(readingItems(index,records,{query:'ＴＷＯ 指示語',filter:'お気に入り'}).map(x=>x.id),['b']);
  assert.deepEqual(readingItems(index,records,{sort:'短い順'}).map(x=>x.id),['b','a','c']);
  assert.deepEqual(index.map(x=>x.id),['a','b','c']);
});
test('Reading review is due throughout its Japanese calendar date and rescheduling preserves metadata',()=>{
  const now=Date.parse('2026-10-22T22:00:00+09:00'),review=planReadingReview({custom:'keep'},1,now);
  assert.equal(dayKey(review.due),'2026-10-23');assert.equal(review.custom,'keep');
  assert.equal(isReadingDue({review},Date.parse('2026-10-23T00:00:00+09:00')),true);
  assert.equal(isReadingDue({review},now),false);assert.equal(isReadingDue({review:{due:null}},now),false);
  assert.throws(()=>planReadingReview({},0,now));
});
test('Learning note includes summaries, paragraph roles, quoted evidence and reflection',()=>{
  const body=readingNoteBody({title:'Example'},{memo:'要点',paragraphNotes:{0:'theyは生徒'},paragraphRoles:{0:'具体例'},annotations:[{quote:'They arrived.',note:'根拠'}],reflection:'読み違い'});
  for(const text of ['要点','段落 1（具体例）','theyは生徒','They arrived.','根拠','読み違い'])assert.ok(body.includes(text));
});
test('All preserved 130 reading files have stable IDs and usable passage and translation paragraphs',async()=>{
  const root=new URL('../data/reading/',import.meta.url),index=JSON.parse(await fs.readFile(new URL('index.json',root),'utf8'));
  assert.equal(index.length,150);assert.equal(new Set(index.map(x=>x.id)).size,150);
  for(let n=1;n<=130;n++)assert.ok(index.some(x=>x.id==='rv3-'+String(n).padStart(6,'0')));
  for(const item of index){const book=JSON.parse(await fs.readFile(new URL(item.id+'.json',root),'utf8'));assert.equal(book.id,item.id);assert.ok(paragraphs(book.passage).length>0);assert.ok(paragraphs(book.translation).length>0);}
});

test('Twenty original additions have aligned translations, grounded answer keys and balanced levels',async()=>{
  const root=new URL('../data/reading/',import.meta.url),index=JSON.parse(await fs.readFile(new URL('index.json',root),'utf8'));
  const added=index.filter(x=>x.addedAt);assert.equal(added.length,20);
  for(const level of [1,2,3,4,5])assert.equal(added.filter(x=>x.level===level).length,4);
  const passages=new Set();
  for(const x of added){const b=JSON.parse(await fs.readFile(new URL(x.id+'.json',root),'utf8'));assert.ok(x.words>=180);assert.equal(paragraphs(b.passage).length,paragraphs(b.translation).length);assert.equal(b.questions.length,2);assert.ok(!passages.has(b.passage));passages.add(b.passage);for(const q of b.questions){assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert.ok(b.passage.includes(q.evidence));assert.ok(q.explanation.length>15);assert.equal(new Set(q.options).size,q.options.length);}}
  assert.equal(readingItems(index,{}, {filter:'追加教材'}).length,20);
  assert.ok(readingItems(index,{}, {query:'防災'}).every(x=>x.topic.includes('防災')));
});
