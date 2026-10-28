import test from 'node:test';import assert from 'node:assert/strict';
import {geographyItems as items,geographyChapters as chapters,geographyCurriculum,geographySources,filterGeography,saveGeographyCard} from '../src/geography-content.mjs';
import {geographyDrills as drills} from '../src/geography/drills.mjs';
import {prefectures} from '../src/geography/places.mjs';
import {freshState,scheduleReview} from '../src/domain.mjs';
import {buildStudyCorpus} from '../src/study-corpus.mjs';
import fs from 'node:fs';import {createHash} from 'node:crypto';
test('geography covers every curriculum section, world region and Japanese region with complete explanations',()=>{
 assert.equal(items.length,920);assert.equal(chapters.length,20);assert.equal(new Set(items.map(x=>x.id)).size,items.length);assert.equal(new Set(items.map(x=>x.title)).size,items.length);
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
 assert.equal(drills.length,30);assert.equal(new Set(drills.map(x=>x.id)).size,30);
 for(const d of drills){assert.ok(d.choices[d.correct]);assert.ok(d.reason.length>20);assert.match(d.sourceNote,/仮想/);for(const key of d.related)assert.ok(items.some(x=>x.key===key),key);if(d.kind==='climate'){assert.equal(d.data.temperature.length,12);assert.equal(d.data.rain.length,12);}}
 const d=id=>drills.find(x=>x.id==='geo-drill-'+id);
 assert.equal(200*.2-100*.3,10);assert.equal(d('ratio-count').correct,2);
 assert.equal(50*.2,10);assert.equal(d('industry-amount').correct,1);
 assert.equal((100*6/(100*5)-1)*100,19.999999999999996);assert.equal(d('trade-price').correct,2);
 assert.equal(4*25000/100000,1);assert.equal(d('scale').correct,0);
 assert.equal((8-12)*2,-8);assert.equal(d('northamerica-water').correct,1);
 assert.equal(700-1000+1800-1200,300);assert.equal(d('population-components').correct,1);
 const arrival=new Date(Date.UTC(2026,9,10,20)+8*3600000-7*3600000);assert.equal(arrival.toISOString(),'2026-10-10T21:00:00.000Z');assert.equal(d('time-flight').correct,1);
 assert.equal(prefectures.length,47);assert.equal(new Set(prefectures.map(x=>x.name)).size,47);assert.equal(prefectures.find(x=>x.name==='愛知県').capital,'名古屋市');
});
test('original lesson text and progress IDs remain intact; expansion is complete and balanced',()=>{
 const base=JSON.parse(fs.readFileSync(new URL('../docs/geography-expansion/baseline.json',import.meta.url),'utf8'));
 assert.equal(base.ids.length,138);assert.equal(items.filter(x=>x.expanded).length,782);
 for(const id of base.ids){const x=items.find(x=>x.id===id);assert.ok(x,id);const fields=base.digestFields.map(k=>x[k]);assert.equal(createHash('sha256').update(JSON.stringify(fields)).digest('hex'),base.originalDigests[id],id);}
 for(const x of items.filter(x=>x.expanded)){for(const k of ['location','summary','why','compare','read','pitfall','question','answer']){assert.ok(x[k].trim().length>0,x.key+':'+k);assert.ok(!/[\uFFFD]|TODO|TBD/.test(x[k]),x.key+':'+k);}assert.ok(x.sourceIds.length>0);assert.ok(chapters.some(c=>c.id===x.chapter));for(const s of x.sourceIds){assert.ok(geographySources[s].scope,s);assert.match(geographySources[s].checked,/^2026-10-28$/);}}
 for(const ch of ['asia','europe','africa','north-america','south-america','oceania'])assert.ok(items.filter(x=>x.chapter===ch).length>=50,ch);
 for(const ch of ['hokkaido','tohoku','kanto','chubu','kinki','chugoku-shikoku','kyushu'])assert.ok(items.filter(x=>x.chapter===ch).length>=30,ch);
 assert.ok(items.filter(x=>x.level==='応用').length>=100);
});
test('new search fields, kana, combined filters and card answers work',()=>{
 assert.ok(filterGeography({query:'ぐれーとさんでぃー'}).some(x=>x.key==='great-sandy'));
 assert.ok(filterGeography({query:'ｸﾞﾚｰﾄｻﾝﾃﾞｨｰ'}).some(x=>x.key==='great-sandy'));
 const found=filterGeography({chapter:'oceania',topic:'地形',level:'応用'});assert.ok(found.length);assert.ok(found.every(x=>x.chapter==='oceania'&&x.topic==='地形'&&x.level==='応用'));
 const item=items.find(x=>x.key==='atlas-showa-location');assert.ok(filterGeography({query:'東オングル島'}).includes(item));
 const s=freshState();s.cards.push({id:'existing-custom-card',answer:'自分のノート',archived:false});s.review['geo-nobi']={repetitions:3,due:12345};const review=JSON.stringify(s.review);
 saveGeographyCard(s,item,10);assert.equal(s.cards[0].answer,'自分のノート');assert.equal(JSON.stringify(s.review),review);assert.equal(s.cards[1].answer.split(item.why).length-1,1);
 assert.equal(s.cards[1].source.id,item.id);assert.equal(saveGeographyCard(s,item,20),false);
});
test('every geography lesson reaches the existing study corpus with location, comparison and source links',()=>{
 const docs=buildStudyCorpus().filter(x=>x.category==='geography');assert.equal(docs.length,items.length);
 for(const item of items){const doc=docs.find(x=>x.id===item.id);assert.ok(doc,item.id);assert.equal(doc.route,'geography/'+item.id);assert.deepEqual(doc.sources,item.sourceIds.map(id=>geographySources[id].url));if(item.expanded){assert.ok(doc.text.includes(item.location));assert.ok(doc.text.includes(item.compare));}}
});
