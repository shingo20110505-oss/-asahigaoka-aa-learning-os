import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildMaterialCatalog} from '../scripts/build-material-search.mjs';
import {prepareDocuments,searchDocuments,privateDocuments,excerpt} from '../src/material-search.mjs';
import {scienceItems} from '../src/science-content.mjs';
import {geographyItems} from '../src/geography-content.mjs';
const catalog=await buildMaterialCatalog(),prepared=prepareDocuments(catalog.documents),ids=new Set(catalog.documents.map(d=>d.id));
const search=(query,options={})=>searchDocuments(prepared,{query,...options});

test('catalog inventories every shipped lesson, dictionary, exercise and interactive model',async()=>{
 assert.equal(catalog.counts.science,scienceItems.length);
 assert.equal(catalog.counts.geography,geographyItems.length+47);
 for(const [name,category]of [['history','history'],['review','review'],['vocabulary','vocabulary'],['english/words','english'],['reading/index','reading']]){
  const rows=JSON.parse(await fs.readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8'));
  assert.equal(catalog.documents.filter(d=>d.category===category&&!d.id.startsWith('history:trail-')).length,rows.length);
  for(const row of rows)assert.ok(ids.has(category+':'+row.id),name+': '+row.id);
 }
 assert.equal(catalog.counts.quiz,309);assert.equal(catalog.counts.classical,150);assert.equal(catalog.counts.interactive,47);
 assert.equal(new Set(catalog.documents.map(d=>d.id)).size,catalog.documents.length);
 for(const d of catalog.documents)assert.match(d.route,/^[a-z-]+(?:[/?]|$)/);
});

test('science reasons, geography comparisons and historical background are not title-only searches',()=>{
 for(const [items,category,fields]of [[scienceItems,'science',['answer','reason','connection']],[geographyItems,'geography',['summary','why','compare','read','pitfall','question','answer']]]){
  const docs=new Map(catalog.documents.filter(d=>d.category===category).map(d=>[d.id,d]));
  for(const x of items)for(const field of fields)if(x[field])assert.ok(docs.get(category+':'+x.id).body.includes(x[field]),x.id+' '+field);
 }
 assert.ok(search('全反射',{subject:'理科'}).items.some(x=>x.category==='science'));
 assert.ok(search('初期微動継続時間',{category:'interactive'}).items.some(x=>x.route==='explore/quake'));
 assert.ok(search('中和 イオン',{subject:'理科'}).total>0);
 const h=catalog.documents.find(d=>d.category==='history'&&d.body.length>150);const query=h.body.split('\n').find(t=>t.length>40).slice(-20);
 assert.ok(search(query,{category:'history'}).items.some(d=>d.id===h.id));
});

test('reader matches passage, translation and question explanation and produces exact section links',()=>{
 const book=catalog.documents.find(d=>d.id==='reading:rv3-000001');
 for(const part of [book.parts[1],book.parts.find(p=>p.target==='t-1')]){
  const hit=search(part.text.slice(10,45),{category:'reading'}).items.find(x=>x.id===book.id);
  assert.ok(hit);assert.ok(hit.route.endsWith('part='+part.target));assert.ok(hit.snippet.includes(part.text.slice(10,30)));
 }
 const quiz=catalog.documents.find(d=>d.category==='reading'&&d.parts.some(p=>p.target.startsWith('q-')));const part=quiz.parts.find(p=>p.target==='q-0');
 assert.ok(search(part.text.split('\n').at(-1).slice(0,30),{category:'reading'}).items.some(d=>d.id===quiz.id&&d.route.includes('part=q-0')));
});

test('Japanese meanings, NFKC, multiple terms and pagination do not hide dictionary or later results',()=>{
 assert.ok(search('能力',{category:'english'}).total>0);
 assert.ok(search('ＡＢＩＬＩＴＹ',{category:'english'}).items.some(d=>d.title==='ability'));
 const first=search('the',{category:'english'}),second=search('the',{category:'english',offset:30});
 assert.ok(first.total>30);assert.equal(first.total,second.total);assert.equal(second.items.length,30);
 assert.equal(first.items.filter(x=>second.items.some(y=>y.id===x.id)).length,0);
 assert.equal(search('該当のない教材の固有文字列xyz987').total,0);
 assert.equal(search('中和',{subject:'国語',category:'science'}).total,0);
 assert.ok(search('１',{}).total>0);
 assert.ok(excerpt('最初。'+ '本文。'.repeat(80)+'秘密の語句です。','秘密').includes('秘密'));
});

test('personal documents include contents and filenames and discard archived/deleted data on refresh',()=>{
 const state={notes:[{id:'n',title:'ノート',body:'比較する分母',tags:['復習'],attachments:[{id:'f',name:'紙の教材写真.png'}]},{id:'gone',title:'削除済みの秘密',deletedAt:1}],materials:[{id:'m',title:'問題集',memo:'中和の疑問',attachment:{name:'image.jpg'}}],cards:[{id:'c',question:'式は？',answer:'V=IR'},{id:'old',question:'古い',archived:true}]};
 let docs=prepareDocuments(privateDocuments(state));
 assert.equal(docs.length,3);assert.equal(searchDocuments(docs,{query:'紙の教材写真'}).items[0].route,'notes/n');
 assert.equal(searchDocuments(docs,{query:'中和'}).items[0].route,'materials/m');
 assert.equal(searchDocuments(docs,{query:'V=IR'}).items[0].route,'memory/c');
 state.notes[0].deletedAt=2;docs=prepareDocuments(privateDocuments(state));assert.equal(searchDocuments(docs,{query:'分母'}).total,0);
 assert.ok(!JSON.stringify(catalog).includes('削除済みの秘密'));
});

test('relevance search handles kana, aliases, natural questions, spelling errors, quotes and exclusions',()=>{
 const kana=search('こうごうせい',{subject:'理科'});assert.ok(kana.items[0].title.includes('光合成'));assert.ok(kana.items[0].expanded);
 assert.ok(search('光合成とは',{subject:'理科'}).items[0].title.includes('光合成'));
 assert.ok(search('明治憲法',{category:'history'}).items[0].title.includes('大日本帝国憲法'));
 for(const typo of ['photsynthesis','photosyntesis']){const r=search(typo,{category:'english'});assert.equal(r.items[0].title,'photosynthesis');assert.ok(r.suggestions.includes('photosynthesis'));}
 assert.equal(search('abiltiy',{category:'english'}).items[0].title,'ability');
 assert.ok(search('関税自主県',{category:'history'}).suggestions.includes('関税自主権'));
 const multiple=search('中和 イオン',{subject:'理科'});assert.ok(!multiple.items[0].partial);assert.ok(search('中和 イオン',{subject:'理科',offset:30}).items.some(x=>x.partial));
 const excluded=search('"中和" -イオン',{subject:'理科'});assert.ok(excluded.total>0);for(const row of excluded.items){const d=catalog.documents.find(x=>x.id===row.id);assert.ok(![d.title,d.body].join(' ').includes('イオン'));}
 assert.equal(search('"photsynthesis"',{category:'english'}).total,0,'quoted terms must not be autocorrected');
 assert.equal(search('"radio program"',{category:'reading'}).items[0].id,'reading:rv3-000001');
});
