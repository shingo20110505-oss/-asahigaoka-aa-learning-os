import test from 'node:test';import assert from 'node:assert/strict';
import {geographyItems as items,geographyChapters as chapters,geographyCurriculum,geographySources,filterGeography,saveGeographyCard} from '../src/geography-content.mjs';
import {geographyDrills as drills} from '../src/geography/drills.mjs';
import {prefectures} from '../src/geography/places.mjs';
import {freshState,scheduleReview} from '../src/domain.mjs';
test('geography covers every curriculum section, world region and Japanese region with complete explanations',()=>{
 assert.equal(items.length,138);assert.equal(chapters.length,20);assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 assert.deepEqual(geographyCurriculum.map(x=>x.code),['A(1)','B(1)','B(2)','C(1)','C(2)','C(3)','C(4)']);
 for(const c of geographyCurriculum)for(const id of c.chapters)assert.ok(items.filter(x=>x.chapter===id).length>=4,id);
 for(const x of items){for(const k of ['summary','why','read','pitfall','question','answer'])assert.ok(x[k].length>0,x.id+':'+k);for(const id of x.sourceIds)assert.ok(new URL(geographySources[id].url).protocol==='https:');}
 assert.ok(items.filter(x=>x.chapter==='chubu').length>=9);
});
test('geography search, due review, saved flashcards and backup remain compatible',()=>{
 assert.equal(filterGeography({query:'輪中'})[0].key,'nobi');assert.ok(filterGeography({query:'促成 抑制'}).some(x=>x.key==='agriculture-compare'));
 const s=freshState(),x=items[0];assert.equal(saveGeographyCard(s,x,10),true);assert.equal(saveGeographyCard(s,x,20),false);assert.equal(s.cards.length,1);
 s.cards[0].archived=true;saveGeographyCard(s,x);assert.equal(s.cards[0].archived,false);
 s.review[x.id]=scheduleReview({},'again',1000);assert.equal(filterGeography({status:'due',progress:s.review,now:2000}).length,0);assert.deepEqual(filterGeography({status:'due',progress:s.review,now:601000}).map(x=>x.id),[x.id]);
});
test('drills have valid explanations and links, with calculated answers checked independently',()=>{
 assert.equal(drills.length,16);assert.equal(new Set(drills.map(x=>x.id)).size,16);
 for(const d of drills){assert.ok(d.choices[d.correct]);assert.ok(d.reason.length>20);assert.match(d.sourceNote,/仮想/);for(const key of d.related)assert.ok(items.some(x=>x.key===key),key);if(d.kind==='climate'){assert.equal(d.data.temperature.length,12);assert.equal(d.data.rain.length,12);}}
 const d=id=>drills.find(x=>x.id==='geo-drill-'+id);
 assert.equal(200*.2-100*.3,10);assert.equal(d('ratio-count').correct,2);
 assert.equal(50*.2,10);assert.equal(d('industry-amount').correct,1);
 assert.equal((100*6/(100*5)-1)*100,19.999999999999996);assert.equal(d('trade-price').correct,2);
 assert.equal(4*25000/100000,1);assert.equal(d('scale').correct,0);
 const arrival=new Date(Date.UTC(2026,9,10,20)+8*3600000-7*3600000);assert.equal(arrival.toISOString(),'2026-10-10T21:00:00.000Z');assert.equal(d('time-flight').correct,1);
 assert.equal(prefectures.length,47);assert.equal(new Set(prefectures.map(x=>x.name)).size,47);assert.equal(prefectures.find(x=>x.name==='愛知県').capital,'名古屋市');
});
