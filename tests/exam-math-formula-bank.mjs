import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context={window:{}};
vm.createContext(context);
for(const file of ['formulas.js','practice.js']){
  const src=fs.readFileSync(new URL(`../high-school-math/${file}`,import.meta.url),'utf8');
  vm.runInContext(src,context,{filename:file});
}

const bank=context.window.RISE_EXAM_MATH_FORMULAS;
const practice=context.window.RISE_EXAM_MATH_PRACTICE;
assert.ok(bank,'formula bank missing');
assert.ok(practice,'practice bank missing');
assert.equal(bank.version,'1.2.0');
assert.equal(bank.items.length,44,'expected 44 curated formulas');
const speed=bank.items.filter(x=>x.tier==='speed');
const advanced=bank.items.filter(x=>x.tier==='advanced');
assert.equal(speed.length,17,'expected 17 exam-shortcut formulas');
assert.equal(advanced.length,27,'expected 27 advanced formulas');
assert.ok(advanced.length>speed.length,'advanced formulas should be the majority');
assert.deepEqual([...new Set(bank.items.map(x=>x.tier))].sort(),['advanced','speed']);
assert.equal(new Set(bank.items.map(x=>x.id)).size,bank.items.length,'duplicate formula id');
for(const x of bank.items){
  for(const key of ['id','tier','priority','title','formula','trigger','meaning','caution']) assert.ok(String(x[key]||'').trim(),`${x.id}: missing ${key}`);
  assert.ok(['S','A','B'].includes(x.priority),`${x.id}: invalid priority`);
}
const mustHave=['チェバの定理','メネラウスの定理','方べき（2本の割線・交わる弦）','トレミーの定理','ヘロンの公式','スチュワートの定理','余弦定理','正弦定理','ブラーマグプタの公式','正四面体の体積'];
for(const title of mustHave) assert.ok(bank.items.some(x=>x.title===title),`missing advanced formula: ${title}`);

assert.equal(practice.version,'1.0.0');
assert.equal(practice.items.length,28,'expected 28 practical drills');
const speedPractice=practice.items.filter(x=>x.tier==='speed');
const advancedPractice=practice.items.filter(x=>x.tier==='advanced');
assert.equal(speedPractice.length,8,'expected 8 shortcut drills');
assert.equal(advancedPractice.length,20,'expected 20 advanced drills');
assert.ok(advancedPractice.length>speedPractice.length,'practice should be advanced-heavy');
assert.equal(new Set(practice.items.map(x=>x.id)).size,practice.items.length,'duplicate practice id');
for(const q of practice.items){
  const formula=bank.items.find(x=>x.id===q.formulaId);
  assert.ok(formula,`${q.id}: unknown formula ${q.formulaId}`);
  assert.equal(q.tier,formula.tier,`${q.id}: tier differs from referenced formula`);
  assert.ok(['S','A','B'].includes(q.level),`${q.id}: invalid level`);
  assert.ok(String(q.prompt||'').trim(),`${q.id}: missing prompt`);
  assert.equal(q.choices.length,4,`${q.id}: expected four choices`);
  assert.equal(new Set(q.choices).size,4,`${q.id}: duplicate choices`);
  assert.equal(q.choices.filter(x=>x===q.answer).length,1,`${q.id}: answer must appear exactly once`);
  assert.ok(Array.isArray(q.solution)&&q.solution.length>=2,`${q.id}: solution steps missing`);
  assert.ok(q.solution.every(x=>String(x).trim()),`${q.id}: empty solution step`);
  assert.ok(String(q.shortcut||'').trim(),`${q.id}: missing shortcut explanation`);
}

const html=fs.readFileSync(new URL('../high-school-math/index.html',import.meta.url),'utf8');
for(const token of ['./formulas.js?v=1.2.0','./practice.js?v=1.0.0','実戦ミニ問題','自己ベスト','Sランク','未定着','お気に入り','弱点優先','serviceWorker.register(\'./sw.js\'']) assert.ok(html.includes(token),`index missing ${token}`);
assert.ok(!html.includes('visuals.js'),'index must not load formula diagrams');
assert.ok(!html.includes('mathDiagramSvg'),'diagram CSS should be removed');
assert.ok(!html.includes('図で見抜く'),'diagram-oriented copy should be removed');
const sw=fs.readFileSync(new URL('../high-school-math/sw.js',import.meta.url),'utf8');
for(const asset of ['./index.html','./formulas.js','./practice.js']) assert.ok(sw.includes(asset),`scoped SW missing ${asset}`);
assert.ok(sw.includes("rise-exam-formula-lab-1.2.0"),'scoped SW cache version must match formula lab 1.2.0');
assert.ok(!sw.includes('visuals.js'),'scoped SW must not cache removed diagrams');

console.log(`exam-math-formula-lab ok: formulas=${bank.items.length} speed=${speed.length} advanced=${advanced.length} drills=${practice.items.length} advancedDrills=${advancedPractice.length} cleanUI=true`);
