import fs from 'node:fs';

const file = process.argv[2] || 'verified-question-pool-v1.json';
const pool = JSON.parse(fs.readFileSync(file, 'utf8'));
const subjects = ['english', 'math', 'japanese', 'science', 'social'];
const ids = new Set();
const fingerprints = new Set();

if (pool?.schemaVersion !== 1) throw new Error('pool schemaVersion must be 1');
if (!Number.isInteger(pool?.targetPerSubject) || pool.targetPerSubject < 1 || pool.targetPerSubject > 200) throw new Error('invalid targetPerSubject');

for (const subject of subjects) {
  const items = pool?.subjects?.[subject];
  if (!Array.isArray(items)) throw new Error(`missing subject array: ${subject}`);
  if (items.length > pool.targetPerSubject) throw new Error(`${subject}: pool exceeds target`);
  for (const item of items) {
    if (item?.subject !== subject) throw new Error(`${subject}: subject mismatch`);
    if (!/^rise-(english|math|japanese|science|social)-[0-9a-f]{16}$/.test(String(item?.id || ''))) throw new Error(`${subject}: invalid id`);
    if (!item?.fingerprint) throw new Error(`${subject}: missing fingerprint`);
    if (ids.has(item.id)) throw new Error(`${subject}: duplicate id ${item.id}`);
    if (fingerprints.has(item.fingerprint)) throw new Error(`${subject}: duplicate fingerprint ${item.fingerprint}`);
    ids.add(item.id);
    fingerprints.add(item.fingerprint);
    if (!Array.isArray(item.choices) || item.choices.length !== 4) throw new Error(`${subject}: choices must be 4`);
    if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) throw new Error(`${subject}: invalid answerIndex`);
    if (item.answer !== item.choices[item.answerIndex]) throw new Error(`${subject}: answer mismatch`);
    if (item?.quality?.verified !== true) throw new Error(`${subject}: unverified item`);
    if (!String(item?.quality?.method || '').includes('cross-provider-blind-answer-check')) throw new Error(`${subject}: blind verification marker missing`);
  }
}

console.log(`verified-question-pool: OK (${ids.size} items)`);
