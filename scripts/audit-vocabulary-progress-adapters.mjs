import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const checks = [];

function check(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) failures.push(name + (details ? `: ${details}` : ''));
}

function load(pathname) {
  const sandbox = { module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read(pathname), sandbox, { timeout: 3000, filename: pathname });
  return sandbox.module.exports;
}

const core = load('vocabulary-core/core-v1.js');
const adapters = load('vocabulary-core/progress-adapters-v1.js');
const source = read('vocabulary-core/progress-adapters-v1.js');
const NOW = 2_000_000_000_000;

check('Progress adapters are pure storage readers', !/localStorage|indexedDB|\.setItem\(|\.removeItem\(|\.clear\(/.test(source));
check('Canonical statuses remain compact and stable', JSON.stringify([...adapters.STATUSES]) === JSON.stringify(['new', 'learning', 'weak', 'mastered']));

const en = core.normalizeEnglish({ id: 'environment', en: 'environment', ja: '環境', pos: 'n', level: 'core' });
const enNew = adapters.readEnglish(en, { progress: { seen: 0, correct: 0, lapses: 0, retention: 0 } }, { now: NOW, wrongBank: {} });
check('English unseen maps to new', enNew.status === 'new');
const enWrong = adapters.readEnglish(en, { progress: { seen: 4, correct: 4, lapses: 0, retention: 0.95 } }, { now: NOW, wrongBank: { environment: NOW - 1 } });
check('English current wrong queue overrides strong SRS to weak', enWrong.status === 'weak' && enWrong.currentWrong === true);
const enReading = adapters.readEnglish(en, { progress: { seen: 0, correct: 0, fromReading: true } }, { now: NOW });
check('English long-reading unknown flag maps to weak', enReading.status === 'weak' && enReading.fromReading === true);
const enDue = adapters.readEnglish(en, { progress: { seen: 3, correct: 3, lapses: 0, retention: 0.9, lastReviewAt: NOW - 10_000, dueAt: NOW - 1 } }, { now: NOW });
check('English due SRS maps to weak', enDue.status === 'weak' && enDue.due === true);
const enMastered = adapters.readEnglish(en, { progress: { seen: 5, correct: 5, lapses: 0, retention: 0.91, lastReviewAt: NOW - 10_000, dueAt: NOW + 10_000, due: false } }, { now: NOW });
check('English strong SRS maps to mastered', enMastered.status === 'mastered');
check('English adapter keeps existing SRS ID', enMastered.nativeIds[0] === 'v:environment');

const ja = core.normalizeJapanese({ id: 42, term: '換骨奪胎', reading: 'かんこつだったい', meaning: '他人の表現を取り入れて新しいものに作り変えること', type: 'yoji' });
check('Japanese canonical record exposes both native IDs', ja.progressRef.nativeId === 'j42' && ja.progressRef.aliases.includes('quiz-full-42'));
const jaNew = adapters.readJapanese(ja, {}, { wrongQueue: [] });
check('Japanese untouched maps to new', jaNew.status === 'new');
const jaLearned = adapters.readJapanese(ja, { j42: 'learned' }, { wrongQueue: [] });
check('Japanese list learned state maps to mastered', jaLearned.status === 'mastered');
const jaAliasLearned = adapters.readJapanese(ja, { 'quiz-full-42': 'learned' }, { wrongQueue: [] });
check('Japanese quiz alias learned state is still visible', jaAliasLearned.status === 'mastered');
const jaConflict = adapters.readJapanese(ja, { j42: 'learned', 'quiz-full-42': 'review' }, { wrongQueue: [] });
check('Japanese review wins over learned when legacy IDs disagree', jaConflict.status === 'weak');
const jaWrongById = adapters.readJapanese(ja, {}, { wrongQueue: [{ id: 'quiz-full-42', word: '換骨奪胎', reading: 'かんこつだったい' }] });
check('Japanese wrong queue recognizes quiz alias ID', jaWrongById.status === 'weak' && jaWrongById.currentWrong === true);
const jaWrongByTerm = adapters.readJapanese(ja, {}, { wrongQueue: [{ id: 'legacy-x', word: '換骨奪胎', reading: 'かんこつだったい' }] });
check('Japanese wrong queue can recover by exact term/reading', jaWrongByTerm.status === 'weak');

const social = core.normalizeSocial({ id: 645, date: '645年', event: '大化の改新', period: '古代', area: '日本', level: 'S' });
const socialNew = adapters.readSocial(social, { progress: {} }, { now: NOW });
check('Social untouched maps to new', socialNew.status === 'new');
const socialLearning = adapters.readSocial(social, { progress: { 645: { seen: 3, correct: 3, wrong: 0, stage: 2, nextReview: NOW - 1, last: NOW - 100 } } }, { now: NOW });
check('Social due without any wrong remains non-weak like native Chronologia', socialLearning.status === 'learning' && socialLearning.due === true);
const socialWeakBalance = adapters.readSocial(social, { progress: { 645: { seen: 4, correct: 2, wrong: 2, stage: 0, nextReview: NOW + 99, last: NOW - 100 } } }, { now: NOW });
check('Social wrong>=correct maps to native weak', socialWeakBalance.status === 'weak');
const socialWeakDue = adapters.readSocial(social, { progress: { 645: { seen: 6, correct: 5, wrong: 1, stage: 2, nextReview: NOW - 1, last: NOW - 100 } } }, { now: NOW });
check('Social past nextReview with prior wrong maps to native weak', socialWeakDue.status === 'weak');
check('Social adapter preserves Chronologia native ID', socialWeakDue.nativeIds[0] === '645');

const immutableInputs = {
  enNative: { progress: { seen: 2, correct: 1, lapses: 1, retention: 0.5 } },
  enWrong: { environment: 123 },
  jaState: { j42: 'learned', 'quiz-full-42': 'review' },
  jaWrong: [{ id: 'quiz-full-42', word: '換骨奪胎', reading: 'かんこつだったい' }],
  socialState: { progress: { 645: { seen: 1, correct: 0, wrong: 1, stage: 0, nextReview: 1, last: 1 } } }
};
const before = JSON.stringify(immutableInputs);
adapters.readEnglish(en, immutableInputs.enNative, { now: NOW, wrongBank: immutableInputs.enWrong });
adapters.readJapanese(ja, immutableInputs.jaState, { wrongQueue: immutableInputs.jaWrong });
adapters.readSocial(social, immutableInputs.socialState, { now: NOW });
check('Adapters never mutate native snapshots', JSON.stringify(immutableInputs) === before);

check('Dispatcher routes English', adapters.read(en, { progress: {} }, { now: NOW }).subject === 'english');
check('Dispatcher routes Japanese', adapters.read(ja, {}, { wrongQueue: [] }).subject === 'japanese');
check('Dispatcher routes Social', adapters.read(social, { progress: {} }, { now: NOW }).subject === 'social');
let unsupportedThrows = false;
try { adapters.read({ subject: 'science', id: 'x' }, {}); } catch { unsupportedThrows = true; }
check('Dispatcher rejects subjects outside English/Japanese/Social', unsupportedThrows);

console.log(JSON.stringify({
  version: '1.0.0',
  checkedAt: new Date().toISOString(),
  adapterVersion: adapters.VERSION,
  checks,
  failures
}, null, 2));
if (failures.length) process.exit(1);
