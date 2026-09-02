import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const E=require('../math-exam/engine.js');
globalThis.makeMathQ=()=>{throw new Error('legacy makeMathQ reached');};
globalThis.makeSubjectQ=(subject)=>({subject,legacy:true});
const A=require('../math-exam/adapter.js');
assert.equal(A.VERSION,'1.1.0');
assert.equal(A.ok,true);
assert.equal(globalThis.makeMathQ,A.createPracticeQuestion);
assert.equal(globalThis.makeSubjectQ('science',7).legacy,true);
const staticSource=fs.readFileSync(path.join(here,'../math-exam/adapter.js'),'utf8');
assert.match(staticSource,/data-aa-math-full-figure/);
assert.match(staticSource,/root\.makeMathQ=createPracticeQuestion/);
assert.match(staticSource,/subject==='math'\?createPracticeQuestion/);
function finiteTree(v){
 if(typeof v==='number')assert.ok(Number.isFinite(v));
 else if(Array.isArray(v))v.forEach(finiteTree);
 else if(v&&typeof v==='object')Object.values(v).forEach(finiteTree);
}
let count=0,figures=0,advanced=0;
for(let diff=1;diff<=11;diff++){
 const allowed=new Set(A.familyPool(diff));assert.ok(allowed.size>=5,`pool too small at ${diff}`);
 for(let seed=1;seed<=250;seed++){
  const q=A.createPracticeQuestion(diff,diff*100000+seed);count++;
  assert.equal(q.subject,'math');assert.equal(q.type,'math');assert.equal(q.format,'aichi-mark');
  assert.equal(q.source.origin,'verified-math-template');assert.equal(q.source.curriculum,'junior-high');
  assert.equal(q.source.route,'full-replacement');assert.equal(q.source.adapterVersion,A.VERSION);
  assert.equal(q.reviewKey,`aichi-math:${q.family}`);assert.equal(q.points,1);assert.equal(q.testMode,false);
  assert.equal(q.requestedDifficulty,diff);assert.ok(allowed.has(q.family));
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices.map(c=>c.text)).size,4);assert.equal(q.choices.filter(c=>c.ok).length,1);
  assert.ok(Number.isInteger(q.answerIndex));assert.equal(q.choices[q.answerIndex].ok,true);
  assert.ok(q.choices.every(c=>typeof c.reason==='string'&&c.reason.trim()));
  assert.ok(q.solutionSteps.length>=2);finiteTree(q);
  if(q.difficulty5>=4)advanced++;
  if(q.figure){const html=E.figureHTML(q.figure);assert.match(html,/class="mathFigure"/);assert.match(html,/<svg/);figures++;}
 }
}
assert.ok(figures>100,'figure-bearing application questions must be exercised');
assert.ok(advanced>100,'high-difficulty application questions must be exercised');
for(let seed=1;seed<=100;seed++){
 const a=A.createPracticeQuestion(9,seed),b=A.createPracticeQuestion(9,seed);
 assert.equal(a.family,b.family);assert.equal(a.stem,b.stem);assert.deepEqual(a.choices,b.choices);
}
console.log(`MATH_FULL_REPLACEMENT_OK: ${count} normal-practice questions; ${figures} figures; ${advanced} advanced items; legacy makeMathQ disconnected`);
