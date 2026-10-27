import test from 'node:test';import assert from 'node:assert/strict';
import{sourceAnswer}from'../experiments/rag/fast-answer.mjs';

test('Source policy copies definitions without generating a new interpretation',()=>{
 const doc={id:'classical-a',title:'古文：うつくし',text:'うつくし：かわいらしい。いとしい。'};
 const answer=sourceAnswer('古文の「うつくし」は美しいと同じ意味ですか',{refs:[doc]});
 assert.equal(answer.kind,'source');assert.equal(answer.text,doc.text);assert.deepEqual(answer.references,[doc]);
 assert.equal(sourceAnswer('古文の「未知語」の意味',{refs:[doc]}),null);
 assert.equal(sourceAnswer('古文の「うつくし」で例文を作って',{refs:[doc]}),null);
 assert.equal(sourceAnswer('古文の「うつくし」は現代語の「美しい」と同じ意味ですか',{refs:[doc]}).text,doc.text);
 assert.equal(sourceAnswer('古文の「うつくし」と「未知語」の意味の違い',{refs:[doc]}),null);
});
test('English lookups must cover the words asked for and not pretend to inflect verbs',()=>{
 const refs=[{id:'english-a',title:'a few',text:'a few：少しはある。'},{id:'english-f',title:'few',text:'few：ほとんどない。'},{id:'english-x',title:'a',text:'a：一つの。'}];
 const answer=sourceAnswer('few と a few の意味の違い',{refs});assert.equal(answer.references.length,2);assert.ok(!answer.text.includes('一つの'));
 assert.equal(sourceAnswer('few と unfamiliar の意味の違い',{refs}),null);
 assert.equal(sourceAnswer('arrive の意味と過去形',{refs:[{id:'english-r',title:'arrive',text:'arrive：到着する'}]}).kind,'insufficient-source');
});
test('Missing images are acknowledged without inventing their contents',()=>{
 const answer=sourceAnswer('写真を送っていませんがこの図の都市は？',{refs:[]});assert.equal(answer.kind,'missing-input');assert.match(answer.text,/特定できません/);
 assert.equal(sourceAnswer('この写真の都市は？',{refs:[]}),null);
});
