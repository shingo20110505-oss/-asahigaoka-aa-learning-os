import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'learning-engine-v15.js'), 'utf8');
const inline = [...index.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)][0]?.[1] || '';
const happyPath = process.env.HAPPY_DOM_PATH || '/workspace/sites/aa-v15-preview/node_modules/happy-dom/lib/index.js';
const { Window } = await import(pathToFileURL(happyPath).href);
const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) process.exitCode = 1;
};

const bridge = `
window.__aa = {
  get state(){ return state }, set state(value){ state=value },
  defaultState, migrate, save, render, setRoute, currentQ, currentReading,
  selectAnswer, nextQuestion, startVocabDiagnostic, startSession, handleAction,
  backupPayload, importJSON, mergeState, qaRun, planKanjiQueue,
  lexicalCoverageProfile, preteachPlan, overallReadiness, hash,
  version: APP_VERSION, schema: SCHEMA_VERSION, storeKey: STORE_KEY
};`;

function makeRuntime(entries = {}) {
  const window = new Window({ url: 'https://example.test/app/' });
  window.document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  window.document.body.innerHTML = '<div class="app" id="app"></div>';
  window.alert = () => {};
  window.confirm = () => true;
  window.open = () => null;
  window.scrollTo = () => {};
  for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value);
  window.eval(`${inline}\n${engine}\n${bridge}`);
  return window;
}

const fresh = makeRuntime();
try {
  const aa = fresh.__aa;
  check('初期画面描画', fresh.document.querySelector('h1')?.textContent === '旭丘AA Learning OS');
  check('v1.5・schema 3', aa.version === '1.5.0' && aa.schema === 3, `${aa.version}/${aa.schema}`);
  check('iPhone safe-area設計', /viewport-fit=cover/.test(index) && /safe-area-inset-(?:top|bottom)/.test(index));
  check('レスポンシブ設計', /@media\(max-width:700px\)/.test(index) && /grid-template-columns:1fr/.test(index));

  aa.setRoute('subjects');
  check('40分モード導線', fresh.document.querySelectorAll('[data-action="start-reading-simulator"]').length === 1);
  check('漢字意味導線', fresh.document.querySelector('main')?.textContent.includes('漢字・意味'));
  aa.setRoute('timeline');
  check('年表UI維持', !!fresh.document.querySelector('[data-action="timeline-search"]') && !!fresh.document.querySelector('[data-action="toggle-year"]') && !!fresh.document.querySelector('[data-action="toggle-event"]'));
  check('Chronologia想起導線', !!fresh.document.querySelector('[data-action="start-timeline-recall"]'));
  aa.handleAction({ dataset: { action: 'start-timeline-recall' } }, null);
  let session = aa.state.session;
  check('年表想起セッション', session.kind === 'chronologia' && session.queue.length === 8 && new Set(session.queue.map(q => q.source.id)).size === 8 && aa.currentQ().choices.length === 4, `${session.kind}/${session.queue.length}`);
  aa.selectAnswer(aa.currentQ().answerIndex);
  check('年表フィードバック', fresh.document.querySelector('[role="status"]')?.textContent.includes('正答'));

  aa.state = aa.defaultState(); aa.save(); aa.render(); aa.startVocabDiagnostic();
  for (let i = 0; i < 32 && aa.state.session?.active; i++) {
    const q = aa.currentQ();
    aa.selectAnswer(q.answerIndex);
    aa.nextQuestion();
  }
  const diagnosis = aa.state.profile.vocabDiagnosis;
  check('適応型語彙診断完了', aa.state.route === 'result' && diagnosis.count >= 18 && diagnosis.count <= 32 && aa.state.session.queue.length === diagnosis.count, JSON.stringify(diagnosis));
  check('語彙診断の不確実性', Number.isFinite(diagnosis.se) && diagnosis.lowerStage <= diagnosis.theta && diagnosis.theta <= diagnosis.upperStage, JSON.stringify(diagnosis));

  aa.state = aa.defaultState(); aa.state.profile.vocabDiagnosticDone = true; aa.save(); aa.render(); aa.setRoute('subjects');
  aa.handleAction({ dataset: { action: 'start-reading-simulator' } }, null);
  session = aa.state.session;
  check('愛知県英語40分セッション', session.kind === 'aichiEnglish40' && session.limitMs === 2400000 && session.queue.length === 3 && session.queue.every(x => x.assistMode === 'exam'), `${session.kind}/${session.limitMs}/${session.queue.length}`);
  check('40分モード支援OFF', fresh.document.querySelectorAll('[data-action="gloss"]').length === 0 && fresh.document.querySelector('[data-timer]')?.textContent.startsWith('残り'));

  aa.state = aa.defaultState(); aa.state.profile.vocabDiagnosticDone = true; aa.save();
  aa.startSession({ kind: 'kanji', subject: 'japanese', mode: 'standard' });
  const kanji = aa.state.session.queue;
  check('漢字意味を出題', kanji.some(q => q.format === 'meaning') && kanji.every(q => q.source?.meaning && q.source?.example), kanji.map(q => q.format).join(','));
  aa.selectAnswer(aa.currentQ().answerIndex);
  const kanjiFeedback = fresh.document.querySelector('[role="status"]')?.textContent || '';
  check('漢字フィードバックに意味・用例', kanjiFeedback.includes('語彙として確認') && kanjiFeedback.includes('用例'));

  const lexical = aa.lexicalCoverageProfile('The students compared the result and changed the plan as a result.');
  const taught = aa.preteachPlan(lexical, .94, 14);
  check('個人語彙率の推定区間', lexical.lower <= lexical.coverage && lexical.coverage <= lexical.upper && lexical.standardError >= 0, `${lexical.lower}/${lexical.coverage}/${lexical.upper}`);
  check('保守的な先取り語彙', taught.assistedLower <= taught.assistedCoverage && taught.words.length <= 14, `${taught.assistedLower}/${taught.assistedCoverage}`);

  const payload = aa.backupPayload();
  check('JSON統合バックアップ', payload.format === 'asahigaoka-aa-learning-os-backup' && payload.schemaVersion === 3 && payload.learningProfile.format === 'aa-learning-profile/1', `${payload.format}/${payload.schemaVersion}`);
  check('バックアップ整合指紋', payload.stateFingerprint === aa.hash(JSON.stringify(payload.state)));

  aa.state = aa.defaultState(); aa.save(); aa.qaRun();
  const failures = aa.state.qa.report.filter(x => !x.ok);
  check('アプリ内総合QA', aa.state.qa.report.length >= 29 && failures.length === 0, failures.map(x => `${x.name}:${x.detail}`).join(' / '));
} finally {
  fresh.happyDOM.abort();
}

const legacyState = {
  schemaVersion: 2, appVersion: '1.4.0', createdAt: Date.now() - 5000, updatedAt: Date.now() - 1000, route: 'study', theme: 'light',
  profile: { target: 'asahigaoka', grammarGate: { basic: true, past: true, future: true, modal: true, infinitive: true, gerund: true, comparison: true, passive: true, presentPerfect: true, asMuchAs: true, asManyAs: true, participle: false, relativePronoun: false, indirectQuestion: false, presentPerfectProgressive: false, subjunctive: false }, knownWords: {}, unknownWords: {}, vocabDiagnosticDone: true, vocabStage: 3 },
  mastery: { 'en.read.inference': { skillId: 'en.read.inference', attempts: 4, correct: 3, mastery: .72, confidence: .3, transfer: .55, speedIndex: .6, retention: .7, contextsSucceeded: ['legacy'], recentErrors: [], updatedAt: Date.now() - 1000 } },
  items: { 'v:v001': { difficulty: 5, stabilityDays: 4, seen: 3, correct: 2, lastReviewAt: Date.now() - 1000, dueAt: Date.now() + 1000, recentFormats: ['meaning'] } },
  attempts: [{ attemptId: 'legacy-attempt', itemId: 'vocab:v001', timestamp: Date.now() - 1000, answer: 0, correct: true, responseMs: 3200, skills: [] }],
  historyFingerprints: [], recentTexts: [], favorites: { history: ['h001'] }, stats: { days: {}, sessions: 1, totalMs: 1234, readingPace: [], lexicalSessions: [] },
  session: { id: 'legacy-session', active: true, mode: 'standard', kind: 'vocab', subject: 'english', queue: [{ id: 'legacy-q', type: 'vocab', stem: 'legacy', choices: [{ text: 'a', ok: true, reason: 'a' }, { text: 'b', ok: false, reason: 'b' }, { text: 'c', ok: false, reason: 'c' }, { text: 'd', ok: false, reason: 'd' }], answerIndex: 0, skills: [], source: { id: 'v001', word: 'available', meaning: '利用できる' } }], index: 0, subIndex: 0, answers: {}, feedback: null, accumulatedMs: 4567, itemStartedAt: Date.now() - 2000, lastActiveAt: Date.now() - 1000, scrollY: 137, clockPaused: true, pausedAt: Date.now() - 1000 },
  ui: { modal: null, subjectDifficulty: 7, timelineQuery: '', timelineHideYear: false, timelineHideEvent: false }, qa: { lastRun: null, report: [] }
};

const legacyRaw = JSON.stringify(legacyState);
const migratedRuntime = makeRuntime({ asahi_learning_os_v1: legacyRaw });
let persistedRaw;
try {
  const aa = migratedRuntime.__aa;
  const migrated = aa.state;
  check('v1.4履歴欠損なし', migrated.schemaVersion === 3 && migrated.attempts.length === 1 && migrated.mastery['en.read.inference'] && migrated.items['v:v001'], `${migrated.schemaVersion}/${migrated.attempts.length}`);
  check('途中セッション移行', migrated.session?.id === 'legacy-session' && migrated.session.accumulatedMs === 4567 && migrated.session.scrollY === 137 && migrated.session.queue.length === 1, JSON.stringify(migrated.session));
  const pre = migratedRuntime.localStorage.getItem('asahi_learning_os_v1_pre_v15');
  check('移行前原本を完全保持', pre === legacyRaw);
  const snapshots = Object.keys(migratedRuntime.localStorage).filter(k => k.startsWith('asahi_learning_os_v1_snapshot_'));
  check('端末内世代コピー', snapshots.length >= 1, String(snapshots.length));
  persistedRaw = migratedRuntime.localStorage.getItem('asahi_learning_os_v1');
} finally {
  migratedRuntime.happyDOM.abort();
}

const reloaded = makeRuntime({ asahi_learning_os_v1: persistedRaw });
try {
  const state = reloaded.__aa.state;
  check('強制終了相当の再読込復元', state.attempts.length === 1 && state.attempts[0].attemptId === 'legacy-attempt' && state.session?.id === 'legacy-session' && state.session.accumulatedMs === 4567, `${state.attempts.length}/${state.session?.id}/${state.session?.accumulatedMs}`);
} finally {
  reloaded.happyDOM.abort();
}

for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
console.log(`\n${checks.filter(x => x.ok).length}/${checks.length} after-checks passed`);
