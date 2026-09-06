import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../high-school-math/formulas.js',import.meta.url),'utf8');
const context={window:{}};
vm.createContext(context);
vm.runInContext(src,context);
const bank=context.window.RISE_EXAM_MATH_FORMULAS;
assert.ok(bank,'formula bank missing');
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
console.log(`exam-math-formula-bank ok: total=${bank.items.length} speed=${speed.length} advanced=${advanced.length}`);
