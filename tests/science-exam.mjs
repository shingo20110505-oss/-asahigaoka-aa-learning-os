import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildExam,generateQuestion,templateCounts} from '../science-exam/generator.mjs';
import {PROFILE,validateExam,validateQuestion,scoreExam,toLegacyQuestion} from '../science-exam/core.mjs';

assert.deepEqual(templateCounts(),{biology:5,chemistry:5,physics:5,earth:5});
for(let n=0;n<120;n++){
  const exam=buildExam('qa-'+n),v=validateExam(exam);
  assert.equal(v.ok,true,'exam '+n+': '+v.errors.join(','));
  assert.equal(exam.questions.length,20);assert.equal(v.total,22);assert.equal(v.applicationPoints>=15,true);
  assert.deepEqual(v.counts,{biology:5,chemistry:5,physics:5,earth:5});
  const correct=Object.fromEntries(exam.questions.map(q=>[q.id,q.answers]));
  const score=scoreExam(exam,correct);assert.equal(score.earned,22);assert.equal(score.max,22);
  for(const q of exam.questions){
    const qv=validateQuestion(q);assert.equal(qv.ok,true,q.id+': '+qv.errors.join(','));
    assert.equal(new Set(q.choices.map(c=>c.text)).size,q.choices.length,'duplicate choice '+q.id);
    const legacy=toLegacyQuestion(q,{random:()=>.5});assert.equal(legacy.answerIndex>=0,true);assert.equal(legacy.choices.filter(c=>c.ok).length,1);
    assert.equal(legacy.nonOfficial,true);assert.equal(legacy.source.meta.quality,'deterministic-recompute');
  }
}
const counts={biology:0,chemistry:0,physics:0,earth:0};
for(let n=0;n<800;n++){
  const q=generateQuestion({seed:'weighted-'+n});assert.equal(validateQuestion(q).ok,true);counts[q.domain]++;
}
for(const d of PROFILE.domains)assert.equal(counts[d]>120,true,'weighted domain missing '+d+': '+counts[d]);
const bridge=await readFile(new URL('../science-exam/bridge.js',import.meta.url),'utf8');
assert.match(bridge,/legacyGenericFallback:false/);assert.doesNotMatch(bridge,/return Math\.random\(\)<.*old\(/);
console.log(JSON.stringify({ok:true,version:PROFILE.version,examSeeds:120,generated:800,counts}));
