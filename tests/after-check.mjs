import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'learning-engine-v15.js'), 'utf8');
const curriculum = fs.readFileSync(path.join(root, 'curriculum-v2-data.js'), 'utf8');
const engineV2 = fs.readFileSync(path.join(root, 'learning-engine-v2.js'), 'utf8');
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
  lexicalCoverageProfile, preteachPlan, overallReadiness, glossLookup, verbFormsFor,
  generateReading, fullReadingTranslation, importantGrammarNotes, hash,
  registerGlossWord, recordLexicalSignal, lexicalPosterior,
  v2: globalThis.AA_V2_TEST_API,
  readingJa: READING_JA,
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
  window.eval(`${inline}\n${engine}\n${curriculum}\n${engineV2}\n${bridge}`);
  return window;
}

const fresh = makeRuntime();
try {
  const aa = fresh.__aa;
  check('初期画面描画', fresh.document.querySelector('h1')?.textContent === '旭丘AA Learning OS');
  check('v2.1・schema 4', aa.version === '2.1.0' && aa.schema === 4, `${aa.version}/${aa.schema}`);
  check('iPhone safe-area設計', /viewport-fit=cover/.test(index) && /safe-area-inset-(?:top|bottom)/.test(index));
  check('レスポンシブ設計', /@media\(max-width:700px\)/.test(index) && /grid-template-columns:1fr/.test(index));

  aa.setRoute('subjects');
  check('40分モード導線', fresh.document.querySelectorAll('[data-action="start-reading-simulator"]').length === 1);
  check('漢字意味導線', fresh.document.querySelector('main')?.textContent.includes('漢字・意味'));
  check('演習/入試テスト分離UI', fresh.document.querySelector('main')?.textContent.includes('教科別演習') && fresh.document.querySelector('main')?.textContent.includes('入試対策テスト'));
  check('入試3段階コース', fresh.document.querySelectorAll('[data-action="select-course"]').length === 3);
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

  const readingSamples = Array.from({ length: 36 }, () => aa.generateReading(9, 'standard'));
  const japaneseChoices = readingSamples.flatMap(r => r.questions.flatMap(q => q.choices.map(c => c.text))).filter(x => /[ぁ-んァ-ヶ一-龠]/.test(x));
  check('英語長文の全選択肢が英語', japaneseChoices.length === 0, japaneseChoices.slice(0, 3).join(' / '));
  check('全文和訳20シナリオ対応', Object.keys(aa.readingJa).length === 20 && readingSamples.every(r => aa.fullReadingTranslation(r).length > 100 && !aa.fullReadingTranslation(r).includes('復元できません')), String(Object.keys(aa.readingJa).length));

  aa.state = aa.defaultState(); aa.state.profile.vocabDiagnosticDone = true; aa.save();
  aa.startSession({ kind: 'reading', subject: 'english', mode: 'standard', readingAssist: 'scaffold' });
  const reviewRead = aa.state.session.queue[0];
  reviewRead.firstReadDone = true; aa.state.session.subIndex = reviewRead.questions.length - 1; aa.render();
  aa.selectAnswer(aa.currentQ().answerIndex);
  const afterReading = fresh.document.querySelector('main')?.textContent || '';
  check('最終設問後に全文和訳', afterReading.includes('全文和訳') && afterReading.includes(aa.fullReadingTranslation(reviewRead).slice(0, 18)));
  check('最終設問後に重要文法', afterReading.includes('重要文法') && aa.importantGrammarNotes(reviewRead).length > 0 && afterReading.includes('本文例'));

  aa.state = aa.defaultState(); aa.state.profile.vocabDiagnosticDone = true; aa.save();
  aa.startSession({ kind: 'kanji', subject: 'japanese', mode: 'standard' });
  const kanji = aa.state.session.queue;
  const kanjiIndex = kanji.findIndex(q => q.format === 'meaning');
  const kanjiQuestion = kanji[kanjiIndex];
  check('漢字意味を出題', kanjiIndex >= 0 && kanjiQuestion.source?.meaning && kanjiQuestion.source?.example, kanji.map(q => q.format).join(','));
  aa.state.session.index = kanjiIndex; aa.state.session.itemStartedAt = Date.now(); aa.render();
  aa.selectAnswer(aa.currentQ().answerIndex);
  const kanjiFeedback = fresh.document.querySelector('[role="status"]')?.textContent || '';
  check('漢字フィードバックに意味・用例', kanjiFeedback.includes('語彙として確認') && kanjiFeedback.includes('用例'));

  const irregular = aa.glossLookup('went');
  const regular = aa.glossLookup('studied');
  const unchangedNoun = aa.glossLookup('evidence');
  check('不規則動詞3形式', irregular.verbForms?.base === 'go' && irregular.verbForms?.past === 'went' && irregular.verbForms?.pastParticiple === 'gone', JSON.stringify(irregular.verbForms));
  check('規則動詞3形式', regular.verbForms?.base === 'study' && regular.verbForms?.past === 'studied' && regular.verbForms?.pastParticiple === 'studied', JSON.stringify(regular.verbForms));
  check('非動詞に活用欄なし', unchangedNoun.verbForms === null && aa.glossLookup('likely').verbForms === null, JSON.stringify(unchangedNoun.verbForms));
  aa.state.ui.modal = { type: 'gloss', info: aa.glossLookup('changed') }; aa.render();
  const formModal = fresh.document.querySelector('.modal')?.textContent || '';
  check('単語モーダル3形式表示', formModal.includes('原形') && formModal.includes('過去形') && formModal.includes('過去分詞形') && formModal.includes('change'));

  aa.state = aa.defaultState();
  const evidenceRead = { id: 'read-a', title: 'A', passage: 'The students changed the plan.', glossedWords: [] };
  const evidenceInfo = aa.glossLookup('changed');
  aa.registerGlossWord(evidenceRead, evidenceInfo);
  check('未知語1回目は仮記録', aa.state.profile.lexicalEvidence.change?.lookups === 1 && !aa.state.profile.unknownWords.change);
  aa.recordLexicalSignal(evidenceInfo, 'lookup', { id: 'read-b', title: 'B', passage: 'The plan changed again.' });
  check('別文脈の再検索で保存', !!aa.state.profile.unknownWords.change && aa.state.profile.unknownWords.change.contexts.length === 2);
  const beforeKnown = aa.lexicalPosterior(evidenceInfo).known;
  aa.recordLexicalSignal(evidenceInfo, 'known', evidenceRead);
  check('既知確認で誤登録解除', !aa.state.profile.unknownWords.change && aa.state.profile.knownWords.change === true && aa.lexicalPosterior(evidenceInfo).known > beforeKnown);

  const lexical = aa.lexicalCoverageProfile('The students compared the result and changed the plan as a result.');
  const taught = aa.preteachPlan(lexical, .94, 14);
  check('個人語彙率の推定区間', lexical.lower <= lexical.coverage && lexical.coverage <= lexical.upper && lexical.standardError >= 0, `${lexical.lower}/${lexical.coverage}/${lexical.upper}`);
  check('保守的な先取り語彙', taught.assistedLower <= taught.assistedCoverage && taught.words.length <= 14, `${taught.assistedLower}/${taught.assistedCoverage}`);

  const payload = aa.backupPayload();
  check('JSON統合バックアップ', payload.format === 'asahigaoka-aa-learning-os-backup' && payload.schemaVersion === 4 && payload.learningProfile.format === 'aa-learning-profile/1', `${payload.format}/${payload.schemaVersion}`);
  check('バックアップ整合指紋', payload.stateFingerprint === aa.hash(JSON.stringify(payload.state)));

  const bankCounts = Object.fromEntries(Object.entries(aa.v2.banks).map(([k, v]) => [k, v.length]));
  check('非英語4教科知識幅', bankCounts.japanese >= 140 && bankCounts.math >= 40 && bankCounts.science >= 60 && bankCounts.social >= 330, JSON.stringify(bankCounts));
  const courseQueues = [1, 2, 3].map(level => aa.v2.testQueue('math', level));
  check('愛知県入試3コース', courseQueues.every(q => q.length === 15 && q.reduce((n, x) => n + x.points, 0) === 22));
  check('高校内容は旭丘レベル限定', !courseQueues[0].some(q => q.source?.area === 'advanced') && !courseQueues[1].some(q => q.source?.area === 'advanced') && courseQueues[2].some(q => q.source?.area === 'advanced'));

  aa.state = aa.defaultState(); aa.save(); aa.render();
  aa.v2.startTest('japanese', 3);
  const firstTestQ = aa.currentQ();
  aa.selectAnswer(firstTestQ.answerIndex);
  check('テスト途中解説なし', !aa.state.session.feedback && aa.state.session.answers[firstTestQ.id]?.pending === true && !fresh.document.querySelector('[role="status"]'));
  aa.v2.commitTestAnswer();
  check('テスト解答確定で次問', aa.state.session.index === 1 && aa.state.attempts.length === 1 && !aa.state.session.feedback);
  while (aa.state.session?.active) {
    const q = aa.currentQ();
    aa.selectAnswer(q.answerIndex);
    aa.v2.commitTestAnswer();
  }
  check('入試テスト終了後分析', aa.state.route === 'result' && aa.state.stats.aichiTests.length === 1 && aa.state.stats.aichiTests[0].converted22 === 22);
  check('終了後全問解説', fresh.document.querySelector('main')?.textContent.includes('全問アフターチェック'));

  aa.setRoute('analytics');
  check('忘却曲線と最適復習', fresh.document.querySelector('.retentionChart') && fresh.document.querySelector('[data-action="start-smart-review"]'));

  aa.state = aa.defaultState(); aa.save(); aa.qaRun();
  const failures = aa.state.qa.report.filter(x => !x.ok);
  check('アプリ内総合QA', aa.state.qa.report.length >= 39 && failures.length === 0, failures.map(x => `${x.name}:${x.detail}`).join(' / '));
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
  check('v1.4履歴欠損なし', migrated.schemaVersion === 4 && migrated.attempts.length === 1 && migrated.mastery['en.read.inference'] && migrated.items['v:v001'], `${migrated.schemaVersion}/${migrated.attempts.length}`);
  check('途中セッション移行', migrated.session?.id === 'legacy-session' && migrated.session.accumulatedMs === 4567 && migrated.session.scrollY === 137 && migrated.session.queue.length === 1, JSON.stringify(migrated.session));
  const pre = migratedRuntime.localStorage.getItem('asahi_learning_os_v1_pre_v15');
  check('移行前原本を完全保持', pre === legacyRaw);
  const preV2 = migratedRuntime.localStorage.getItem('asahi_learning_os_v1_pre_v2');
  check('v2移行前原本を完全保持', preV2 === legacyRaw);
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
