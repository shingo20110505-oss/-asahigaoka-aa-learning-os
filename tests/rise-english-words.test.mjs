import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {freshState,validState} from '../src/domain.mjs';
import {selectEnglishWords,rateEnglishWord} from '../src/english-words.mjs';
const words=JSON.parse(await fs.readFile(new URL('../data/english/words.json',import.meta.url))),meta=JSON.parse(await fs.readFile(new URL('../data/english/metadata.json',import.meta.url)));
test('large vocabulary is unique, traceable, valid Japanese and reproducible in its totals',()=>{
 assert.ok(words.length>35000);assert.equal(new Set(words.map(w=>w.id)).size,words.length);assert.equal(new Set(words.map(w=>w.word)).size,words.length);
 assert.equal(meta.counts.headwords,words.length);assert.equal(meta.counts.ngslCovered,2809);assert.deepEqual(meta.missingNGSL,[]);
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
