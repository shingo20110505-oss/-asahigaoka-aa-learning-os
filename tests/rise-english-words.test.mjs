import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {enrichEnglishWords} from '../scripts/enrich-english-words.mjs';
import {freshState,validState} from '../src/domain.mjs';
import {selectEnglishWords,rateEnglishWord,toggleEnglishFavorite,posLabel} from '../src/english-words.mjs';
const manifest=JSON.parse(await fs.readFile(new URL('../data/english/words-parts.json',import.meta.url)));
const words=(await Promise.all(manifest.parts.map(async part=>{const data=JSON.parse(await fs.readFile(new URL('../data/english/'+part.file,import.meta.url)));assert.equal(data.length,part.entries);return data;}))).flat(),meta=JSON.parse(await fs.readFile(new URL('../data/english/metadata.json',import.meta.url)));
test('large vocabulary is unique, traceable, valid Japanese and reproducible in its totals',()=>{
 assert.ok(words.length>35000);assert.equal(new Set(words.map(w=>w.id)).size,words.length);assert.equal(new Set(words.map(w=>w.word)).size,words.length);
 assert.equal(manifest.totalEntries,words.length);assert.equal(meta.counts.headwords,words.length);assert.equal(meta.counts.ngslCovered,2809);assert.deepEqual(meta.missingNGSL,[]);
 for(const w of words){assert.match(w.id,/^en-[a-f0-9]{16}$/);assert.ok(w.meaning);assert.ok(!w.meaning.includes('\uFFFD'));assert.ok(['basic','entrance','extension'].includes(w.stage));assert.ok(w.pos);assert.ok(w.sources.every(id=>meta.sources.some(s=>s.id===id)));assert.ok(!w.forms.includes(w.word));}
 for(const kind of ['word','phrase'])assert.equal(meta.counts.kind[kind],words.filter(w=>w.kind===kind).length);
 for(const form of ['went','studies','walked','children'])assert.ok(!words.some(w=>w.word===form),'inflated headword: '+form);
 for(const head of ['left','found','rose'])assert.ok(words.some(w=>w.word===head),'lost homograph: '+head);
 assert.ok(!words.some(w=>w.word==='aluminium'));
 assert.ok(words.find(w=>w.word==='aluminum').forms.includes('aluminium'));
 assert.ok(!words.find(w=>w.word==='be').forms.includes('isn'));
 assert.ok(!words.find(w=>w.word==='have').forms.includes('ve'));
});
test('search supports Japanese and inflections, and progress never replaces unrelated data',()=>{
 const state=freshState();state.vocabulary['jp-v6-001']={repetitions:5};const before=structuredClone(state.vocabulary['jp-v6-001']);
 const go=selectEnglishWords(words,state,{stage:'all',query:'went'}).find(w=>w.word==='go');assert.ok(go);
 assert.ok(selectEnglishWords(words,state,{stage:'all',query:'図書館'}).some(w=>w.word==='library'));
 assert.ok(selectEnglishWords(words,state,{stage:'all',pos:'v'}).some(w=>w.word==='go'));
 assert.ok(selectEnglishWords(words,state,{stage:'all',pos:'aux'}).some(w=>w.word==='be'));
 rateEnglishWord(state,go.id,'good',1000);assert.deepEqual(state.vocabulary['jp-v6-001'],before);assert.equal(state.vocabulary[go.id].repetitions,1);
 assert.ok(!selectEnglishWords(words,state,{stage:'all',filter:'new'}).includes(go));assert.ok(selectEnglishWords(words,state,{stage:'all',filter:'learned'}).includes(go));validState(state);
});

const entry=(n,word,extra={})=>({id:'en-'+n.toString(16).padStart(16,'0'),word,meaning:'意味',stage:'basic',kind:'word',pos:'v',forms:[],related:[],eikenBand:'basic',...extra});
test('expanded dictionary POS aliases display in Japanese and match the existing filters without changing records',()=>{
 const one=words.find(w=>w.word==='one'),important=words.find(w=>w.word==='important'),mixed=entry(1,'mixed example',{pos:'n/verb/adjective/adverb/pronoun/preposition/conjunction'}),proper=entry(2,'Osaka',{pos:'proper noun'}),source=[one,important,mixed,proper],state=freshState(),original=structuredClone(source);
 assert.equal(posLabel(one.pos),'名詞');assert.equal(posLabel(important.pos),'形容詞');assert.equal(posLabel(proper.pos),'固有名詞');
 assert.equal(posLabel(mixed.pos),'名詞・動詞・形容詞・副詞・代名詞・前置詞・接続詞');
 for(const [pos,expected] of [['n',[one,mixed,proper]],['noun',[one,mixed,proper]],['adj',[important,mixed]],...['v','adv','pron','prep','conj'].map(pos=>[pos,[mixed]])]){
  assert.deepEqual(selectEnglishWords(source,state,{stage:'all',pos}),expected);
 }
 assert.deepEqual(source,original);
});
test('search puts the requested headword first and retains source order within each match strength',()=>{
 const source=[entry(1,'proceed',{forms:['go']}),entry(2,'let go'),entry(3,'goal'),entry(4,'go ahead'),entry(5,'go'),entry(6,'continue',{related:['go on']})],state=freshState(),original=[...source];
 assert.deepEqual(selectEnglishWords(source,state,{stage:'all',query:'  ＧＯ  '}).map(w=>w.word),['go','proceed','goal','go ahead','let go','continue']);
 assert.deepEqual(selectEnglishWords(source,state,{stage:'all',query:'  '}),original);
 assert.deepEqual(source,original,'search must not reorder the shared dictionary');
});
test('smart punctuation, full-width typing and repeated spaces match both headwords and inflections',()=>{
 const source=[entry(1,'can’t   stand'),entry(2,'well‑being'),entry(3,'take off',{forms:['took  off']}),entry(4,'succeed',{related:['make one’s way']})],state=freshState();
 for(const [query,id] of [[" CAN'T\t STAND ",source[0].id],['well—being',source[1].id],['ＴＯＯＫ　ＯＦＦ',source[2].id],["make one's way",source[3].id]]){
  assert.deepEqual(selectEnglishWords(source,state,{stage:'all',query}).map(w=>w.id),[id]);
 }
});
test('favorite, band and example filters compose without marking an unstudied favorite as learned',()=>{
 const fresh=entry(1,'bring about',{stage:'extension',kind:'phrase',pos:'v/phrase',eikenBand:'beyond',senses:[{definitions:[{example:{en:'The discovery brought about a change.'}}]}]}),learned=entry(2,'carry out',{stage:'extension',kind:'phrase',pos:'v/phrase',eikenBand:'beyond',example:'Carry out the plan.'}),noExample=entry(3,'clam up',{stage:'extension',kind:'phrase',pos:'v/phrase',eikenBand:'beyond'}),wrongBand=entry(4,'go on',{stage:'extension',kind:'phrase',pos:'v/phrase',eikenBand:'pre1',example:'Please go on.'}),source=[fresh,learned,noExample,wrongBand],state=freshState();
 for(const w of source)toggleEnglishFavorite(state,w.id);
 rateEnglishWord(state,learned.id,'again',1000);
 const options={stage:'extension',kind:'phrase',pos:'v',band:'beyond',favoriteOnly:true,exampleOnly:true};
 assert.deepEqual(selectEnglishWords(source,state,options).map(w=>w.id),[fresh.id,learned.id]);
 assert.deepEqual(selectEnglishWords(source,state,{...options,filter:'new'}).map(w=>w.id),[fresh.id]);
 assert.deepEqual(selectEnglishWords(source,state,{...options,filter:'learned'}).map(w=>w.id),[learned.id]);
 assert.deepEqual(selectEnglishWords(source,state,{...options,filter:'due'},601000).map(w=>w.id),[learned.id]);
 assert.equal(selectEnglishWords(source,state,{...options,filter:'due'},600999).length,0);
 toggleEnglishFavorite(state,fresh.id);
 assert.deepEqual(selectEnglishWords(source,state,options).map(w=>w.id),[learned.id]);
 assert.equal(state.vocabulary[fresh.id].repetitions,undefined);
 validState(state);
});
test('favorites and review ratings retain each other and unrelated learning history',()=>{
 const state=freshState(),id=entry(1,'remember').id,previous={repetitions:4,lapses:2,interval:3,due:9000,rating:'hard',legacySeen:17};
 state.vocabulary[id]={...previous};state.vocabulary['jp-v6-001']={repetitions:5};state.review['existing-card']={legacyDone:true};
 const unrelated=structuredClone({jp:state.vocabulary['jp-v6-001'],review:state.review});
 assert.equal(toggleEnglishFavorite(state,id),true);
 assert.deepEqual(state.vocabulary[id],{...previous,favorite:true});
 rateEnglishWord(state,id,'good',1000);
 assert.equal(state.vocabulary[id].favorite,true);assert.equal(state.vocabulary[id].legacySeen,17);
 const rated=structuredClone(state.vocabulary[id]);
 assert.equal(toggleEnglishFavorite(state,id),false);
 assert.deepEqual(state.vocabulary[id],{...rated,favorite:false});
 assert.deepEqual({jp:state.vocabulary['jp-v6-001'],review:state.review},unrelated);
 const before=structuredClone(state);assert.throws(()=>toggleEnglishFavorite(state,'__proto__'));assert.deepEqual(state,before);
 validState(state);
});

test('published exam choice forms resolve exactly and verb paradigms distinguish tense and participles', async()=>{
 const enriched=enrichEnglishWords(structuredClone(words));
 const byWord=new Map(enriched.map(entry=>[entry.word,entry]));
 const searchable=new Set(enriched.filter(entry=>entry.meaning&&!entry.meaning.includes('準備中')).flatMap(entry=>[entry.word,...entry.forms]));
 const observed=(await fs.readFile(new URL('../scripts/english-sources/pre1-published-forms.txt',import.meta.url),'utf8')).trim().split('\n');
 assert.equal(observed.length,212);
 assert.deepEqual(observed.filter(form=>!searchable.has(form)),[]);
 assert.ok(enriched.filter(entry=>entry.kind==='phrase').length>17000);
 assert.equal(new Set(enriched.map(entry=>entry.id)).size,enriched.length);
 assert.deepEqual(byWord.get('arise').verbForms,{past:['arose'],participle:['arisen'],present:['arises'],ing:['arising']});
 assert.deepEqual(byWord.get('be').verbForms,{past:['was','were'],participle:['been'],present:['am','is','are'],ing:['being']});
 assert.deepEqual(byWord.get('run up').verbForms,{past:['ran up'],participle:['run up'],present:['runs up'],ing:['running up']});
 assert.deepEqual(byWord.get('submit').verbForms.past,['submitted']);
 assert.deepEqual(byWord.get('panic').verbForms.ing,['panicking']);
 assert.deepEqual(byWord.get('quiz').verbForms.past,['quizzed']);
 assert.deepEqual(byWord.get('forbid').verbForms.ing,['forbidding']);
 assert.equal(byWord.get('fall through').eikenBand,'pre1');
 assert.equal(selectEnglishWords(enriched,freshState(),{query:'fell through',stage:'all',band:'pre1',kind:'phrase'})[0].word,'fall through');
 assert.ok(selectEnglishWords(enriched,freshState(),{query:'arisen',stage:'all'}).some(entry=>entry.word==='arise'));
});
