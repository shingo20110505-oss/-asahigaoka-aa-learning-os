import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const storage = new Map();
const learnerState = {
  attempts: [],
  items: {},
  mastery: {},
  ui: { subjectDifficulty: 7, practiceConfig: {} },
  session: null
};
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(String(key), String(value)); },
  removeItem(key) { storage.delete(String(key)); }
};
const document = {
  addEventListener() {},
  getElementById() { return null; },
  createElement() { return { setAttribute() {}, style: {}, hidden: false, appendChild() {}, innerHTML: '' }; },
  body: { appendChild() {} }
};
const context = {
  console,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  localStorage,
  document,
  navigator: { onLine: false },
  fetch: async () => { throw new Error('network must not be used by this contract'); }
};
context.window = context;
context.window.AA_APP = {
  get(name) {
    if (name === 'state') return { get: () => learnerState, save() {} };
    if (name === 'ui') return { render() {} };
    return null;
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('app/learning/verified-question-pool-v1.js', 'utf8'), context, { filename: 'verified-question-pool-v1.js' });

const pool = context.RiseVerifiedQuestionPool;
assert.ok(pool, 'verified question pool must register');
assert.equal(pool.version, '1.1.0');
assert.equal(pool.storeKey, 'rise_verified_question_pool_v1', 'storage key must stay backward compatible');
const t = pool.__test;

function hex(value) { return Number(value).toString(16).padStart(16, '0').slice(-16); }
function makeItem(subject, index, confidence, overrides = {}) {
  const choices = ['選択肢A', '選択肢B', '選択肢C', '選択肢D'];
  return {
    id: `rise-${subject}-${hex(index)}`,
    fingerprint: hex(index + 100000),
    subject,
    skill: `${subject === 'science' ? 'sci' : subject === 'social' ? 'soc' : subject === 'japanese' ? 'ja' : subject === 'english' ? 'en' : 'math'}.aichi.application`,
    difficulty: 7,
    question: '資料を根拠に正しいものを一つ選びなさい。',
    context: '検証用の資料文です。条件を比較して判断します。',
    choices,
    answerIndex: 1,
    answer: choices[1],
    explanation: '資料中の条件を順に照合すると、選択肢Bだけがすべての条件を満たします。',
    evidence: '資料文の条件と選択肢Bが一致する。',
    misconception: '一つの条件だけを見て判断すると誤る。',
    marks: 1,
    quality: {
      verified: true,
      verifierConfidence: confidence,
      generationProvider: 'gemini',
      verificationProvider: 'groq',
      verifierMode: 'json_schema',
      strictStructuredOutput: true
    },
    ...overrides
  };
}
function record(item, examUnit = 'experiment', addedAt = Date.now()) {
  return { subject: item.subject, examUnit, item, addedAt, lastUsedAt: 0, useCount: 0 };
}

assert.equal(t.confidenceFloor('math'), 0.90);
assert.equal(t.confidenceFloor('science'), 0.90);
assert.equal(t.confidenceFloor('social'), 0.90);
assert.equal(t.confidenceFloor('english'), 0.86);
assert.equal(t.confidenceFloor('japanese'), 0.86);
assert.equal(t.validateItem(makeItem('math', 1, 0.89), 'math'), false, 'math below 0.90 must be rejected');
assert.equal(t.validateItem(makeItem('math', 2, 0.90), 'math'), true);
assert.equal(t.validateItem(makeItem('english', 3, 0.85), 'english'), false, 'English below 0.86 must be rejected');
assert.equal(t.validateItem(makeItem('english', 4, 0.86), 'english'), true);

const strict = makeItem('science', 5, 0.94);
assert.equal(t.validateIncomingItem(strict, 'science'), true);
assert.equal(t.validateIncomingItem({ ...strict, fingerprint: '' }, 'science'), false, 'new API items need a stable fingerprint');
assert.equal(t.validateIncomingItem({ ...strict, quality: { ...strict.quality, verifierMode: 'json_object' } }, 'science'), false, 'new API items must come from strict Groq schema mode');
const legacyStored = { ...strict }; delete legacyStored.fingerprint;
assert.equal(t.validateItem(legacyStored, 'science'), true, 'previous verified stored items remain readable during migration');

storage.clear();
const store = { schemaVersion: 1, version: '1.1.0', updatedAt: 0, items: [] };
const first = makeItem('science', 10, 0.95);
const sameFingerprint = makeItem('science', 11, 0.96, { fingerprint: first.fingerprint });
assert.equal(t.ingestPayload(store, { subject: 'science', quality: { verified: true }, items: [first] }, 'science', 'experiment').length, 1);
assert.equal(t.ingestPayload(store, { subject: 'science', quality: { verified: true }, items: [sameFingerprint] }, 'science', 'experiment').length, 0, 'same fingerprint with another ID must not enter the pool');
assert.equal(store.items.length, 1);

const practice = pool.toPracticeQuestion(record(first), 2);
assert.ok(practice);
assert.equal(practice.id, first.id);
assert.equal(practice.reviewKey, first.id);
assert.equal(practice.srsId, first.id, 'verified questions must update existing item-level SRS using the stable ID');
assert.equal(practice.source.verified, true);
assert.equal(practice.source.fingerprint, first.fingerprint);

const dueId = makeItem('math', 20, 0.94).id;
const freshId = makeItem('math', 21, 0.94).id;
learnerState.items[dueId] = { seen: 3, correct: 1, lapses: 2, dueAt: Date.now() - 1000 };
learnerState.items[freshId] = { seen: 3, correct: 3, lapses: 0, dueAt: Date.now() + 86400000 };
assert.ok(t.itemReviewNeed(learnerState, dueId) > t.itemReviewNeed(learnerState, freshId), 'due/lapsed item must have greater adaptive review need');

const wrong = makeItem('math', 30, 0.94);
const correct = makeItem('math', 31, 0.94);
learnerState.attempts = [
  { itemId: wrong.id, reviewKey: wrong.id, correct: false },
  { itemId: correct.id, reviewKey: correct.id, correct: true }
];
learnerState.items[wrong.id] = { seen: 1, correct: 0, lapses: 1, dueAt: Date.now() - 1 };
learnerState.items[correct.id] = { seen: 1, correct: 1, lapses: 0, dueAt: Date.now() + 86400000 };
const ranked = t.selectRecords({ items: [record(correct, 'algebra'), record(wrong, 'algebra')] }, {
  subject: 'math', units: ['algebra'], difficulty: 7,
  recentQuestionIds: [wrong.id, correct.id], state: learnerState
}, 2);
assert.equal(ranked[0].item.id, wrong.id, 'recent wrong verified question should be eligible for spaced retry before a recent correct one');

const manyMath = Array.from({ length: 70 }, (_, i) => record(makeItem('math', 1000 + i, 0.94), 'algebra', 1000 + i));
const manyScience = Array.from({ length: 70 }, (_, i) => record(makeItem('science', 2000 + i, 0.94), 'experiment', 2000 + i));
const pruned = t.pruneItems([...manyMath, ...manyScience]);
assert.equal(pruned.filter(row => row.subject === 'math').length, 60, 'one subject cannot monopolize the pool');
assert.equal(pruned.filter(row => row.subject === 'science').length, 60);
assert.ok(pruned.length <= 180);

const fps = t.recentFingerprints({ items: [record(first), record(first), record(makeItem('science', 12, 0.95))] });
assert.equal(new Set(fps).size, fps.length, 'fingerprints sent to the API must be deduplicated');
assert.ok(fps.includes(first.fingerprint));

const source = fs.readFileSync('app/learning/verified-question-pool-v1.js', 'utf8');
assert.match(source, /recentFingerprints:recentFingerprints\(store\)/, 'pool refill must send recent fingerprints to /v1/exam');
assert.match(source, /const STORE_KEY='rise_verified_question_pool_v1'/, 'existing stored pool data must be preserved');
assert.doesNotMatch(source, /GEMINI_API_KEY|GROQ_API_KEY/, 'frontend pool must never contain provider API keys');

console.log('Verified Question Pool contract OK: strict provider provenance, subject confidence floors, fingerprint dedupe, balanced retention, stable-ID SRS, wrong-answer retry, and storage compatibility passed');
