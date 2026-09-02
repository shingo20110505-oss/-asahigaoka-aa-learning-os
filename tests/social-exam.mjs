import assert from 'node:assert/strict';
import {applicationPack} from '../social-exam/application-pack.mjs';
import {PROFILE,validatePack,assertPack,scoreQuestion,scorePack,toLegacyQuestion} from '../social-exam/core.mjs';
const checked=validatePack(applicationPack);
assert.equal(checked.ok,true,checked.errors.join(', '));
assert.equal(checked.total,34);
assert.deepEqual(checked.counts,{geography:4,history:3,civics:3});
assert.equal(applicationPack.questions.length,10);
assert.equal(new Set(applicationPack.questions.map(q=>q.id)).size,10);
assert.equal(PROFILE.markSheetOnly,true);
for(const q of applicationPack.questions){
 assert.equal(scoreQuestion(q,q.answer).earned,q.points);
 for(const c of q.choices.filter(c=>c.id!==q.answer))assert.equal(scoreQuestion(q,c.id).earned,0);
 const legacy=toLegacyQuestion(q,{random:()=>.5});
 assert.equal(legacy.subject,'social');assert.equal(legacy.choices.length,4);assert.equal(legacy.choices.filter(c=>c.ok).length,1);
 assert.ok(legacy.stem.includes('【資料1'));
 assert.ok(legacy.explanation.includes('考え方：'));
}
const allCorrect=Object.fromEntries(applicationPack.questions.map(q=>[q.id,q.answer]));
assert.equal(scorePack(assertPack(applicationPack),allCorrect).earned,34);
assert.equal(applicationPack.questions.reduce((s,q)=>s+q.metadata.expectedSeconds,0),1440);
assert.deepEqual(applicationPack.questions.map(q=>q.metadata.expectedCorrectRate),[.40,.35,.50,.45,.30,.35,.50,.40,.35,.30]);
console.log(`social-exam ok: ${applicationPack.questions.length} questions / ${checked.total} points / 24 min metadata`);
