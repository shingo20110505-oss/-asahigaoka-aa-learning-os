/* 旭丘AA Learning OS v1.5.0 enhancement layer
   The stable v1 storage key is intentionally preserved. */
(function () {
  'use strict';

  const AA15_BACKUP_FORMAT = 'asahigaoka-aa-learning-os-backup';
  const AA15_PROFILE_FORMAT = 'aa-learning-profile/1';
  const AA15_PRE_MIGRATION_KEY = STORE_KEY + '_pre_v15';
  const AA15_SNAPSHOT_PREFIX = STORE_KEY + '_snapshot_';
  const AA15_SNAPSHOT_META = STORE_KEY + '_snapshot_meta';
  const AA15_MIN_DIAG = 18;
  const AA15_MAX_DIAG = 32;
  const AA15_MOCK_LIMIT_MS = 40 * 60 * 1000;

  const AA15_COLLOCATIONS = [
    { id: 'take-part-in', phrase: 'take part in', meaning: '〜に参加する', example: 'Many students took part in the local project.', distractors: ['look forward to', 'be different from', 'take care of'] },
    { id: 'be-interested-in', phrase: 'be interested in', meaning: '〜に興味がある', example: 'She is interested in how the system works.', distractors: ['be proud of', 'be afraid of', 'be ready for'] },
    { id: 'as-a-result', phrase: 'as a result', meaning: 'その結果', example: 'The team changed the plan. As a result, waste decreased.', distractors: ['at first', 'for example', 'on the other hand'] },
    { id: 'instead-of', phrase: 'instead of', meaning: '〜の代わりに', example: 'They reused the boxes instead of buying new ones.', distractors: ['because of', 'in front of', 'according to'] },
    { id: 'not-only-but-also', phrase: 'not only A but also B', meaning: 'AだけでなくBも', example: 'The change saved not only time but also energy.', distractors: ['either A or B', 'both A and B', 'neither A nor B'] },
    { id: 'in-order-to', phrase: 'in order to', meaning: '〜するために', example: 'They measured the water in order to compare the two plans.', distractors: ['as soon as', 'even though', 'such as'] },
    { id: 'according-to', phrase: 'according to', meaning: '〜によると', example: 'According to the graph, the number increased in May.', distractors: ['instead of', 'because of', 'in addition to'] },
    { id: 'be-likely-to', phrase: 'be likely to', meaning: '〜しそうである', example: 'A familiar choice is likely to attract attention.', distractors: ['be able to', 'be used to', 'be ready to'] },
    { id: 'as-well-as', phrase: 'as well as', meaning: '〜と同様に、〜に加えて', example: 'The report included interviews as well as a graph.', distractors: ['as long as', 'as soon as', 'as far as'] },
    { id: 'make-a-difference', phrase: 'make a difference', meaning: '違いを生む、役に立つ', example: 'One small change can make a difference.', distractors: ['make a mistake', 'make a promise', 'make a choice'] }
  ];

  DATA.skills['en.vocab.collocation'] = DATA.skills['en.vocab.collocation'] || { subject: 'english', label: '語句・コロケーション', impact: 1.08 };
  DATA.skills['soc.history.network'] = DATA.skills['soc.history.network'] || { subject: 'social', label: '歴史・前後因果ネットワーク', impact: 1.02 };

  function aa15Parse(value) {
    try { return JSON.parse(value); } catch (error) { return null; }
  }

  function aa15ValidState(value) {
    return plainObj(value) && Number.isFinite(value.schemaVersion) && Array.isArray(value.attempts) && plainObj(value.mastery) && plainObj(value.items);
  }

  function aa15RawSnapshot(value, reason) {
    if (!aa15ValidState(value)) return false;
    const meta = aa15Parse(storageGet(AA15_SNAPSHOT_META) || '{}') || {};
    const slot = Number.isFinite(meta.nextSlot) ? meta.nextSlot % 3 : 0;
    const envelope = { savedAt: now(), reason, appVersion: value.appVersion || APP_VERSION, state: value };
    storageSet(AA15_SNAPSHOT_PREFIX + slot, JSON.stringify(envelope));
    storageSet(AA15_SNAPSHOT_META, JSON.stringify({ nextSlot: (slot + 1) % 3, lastSavedAt: envelope.savedAt }));
    return true;
  }

  // Preserve the exact pre-v1.5 payload before any v1.5 migration/save can run.
  const aa15OriginalRaw = storageGet(STORE_KEY);
  const aa15OriginalParsed = aa15Parse(aa15OriginalRaw || '');
  if (aa15ValidState(aa15OriginalParsed) && !storageGet(AA15_PRE_MIGRATION_KEY)) {
    storageSet(AA15_PRE_MIGRATION_KEY, aa15OriginalRaw);
  }

  const aa15BaseDefaultState = defaultState;
  defaultState = function () {
    const s = aa15BaseDefaultState();
    s.profile.vocabDiagnosis = null;
    s.profile.lexicalEvidence = {};
    s.stats.mockExams = [];
    s.sharedProfile = null;
    return s;
  };

  const aa15BaseMigrate = migrate;
  migrate = function (input) {
    const before = input;
    const s = aa15BaseMigrate(input);
    s.profile.vocabDiagnosis = plainObj(s.profile.vocabDiagnosis) ? s.profile.vocabDiagnosis : null;
    s.profile.lexicalEvidence = plainObj(s.profile.lexicalEvidence) ? s.profile.lexicalEvidence : {};
    s.stats.mockExams = safeArray(s.stats.mockExams).filter(plainObj).slice(-50);
    s.sharedProfile = plainObj(s.sharedProfile) ? s.sharedProfile : null;
    for (const sk of Object.values(s.mastery)) {
      const priorN = Math.max(2, Math.min(30, Number(sk.attempts || 0) + 4));
      if (!Number.isFinite(sk.alpha) || !Number.isFinite(sk.beta)) {
        sk.alpha = 1 + clamp(Number(sk.mastery) || .48, .03, .99) * priorN;
        sk.beta = 1 + (1 - clamp(Number(sk.mastery) || .48, .03, .99)) * priorN;
      }
    }
    s.schemaVersion = SCHEMA_VERSION;
    s.appVersion = APP_VERSION;
    if (aa15ValidState(before)) {
      const lostAttempts = safeArray(before.attempts).length > s.attempts.length && safeArray(before.attempts).length <= 2000;
      const lostSkills = Object.keys(plainObj(before.mastery) ? before.mastery : {}).length > Object.keys(s.mastery).length;
      const lostItems = Object.keys(plainObj(before.items) ? before.items : {}).length > Object.keys(s.items).length;
      if (lostAttempts || lostSkills || lostItems) throw new Error('学習履歴を保持できない移行を中止しました。');
    }
    return s;
  };

  const aa15BaseSave = save;
  save = function () {
    if (!aa15ValidState(state)) throw new Error('保存対象が不正なため、既存データを上書きしませんでした。');
    const meta = aa15Parse(storageGet(AA15_SNAPSHOT_META) || '{}') || {};
    if (!meta.lastSavedAt || now() - meta.lastSavedAt > 15 * 60 * 1000) aa15RawSnapshot(state, 'automatic');
    aa15BaseSave();
    const persisted = aa15Parse(storageGet(STORE_KEY) || '');
    if (!aa15ValidState(persisted) || persisted.attempts.length !== state.attempts.length) {
      storageOK = false;
      memStore[STORE_KEY] = JSON.stringify(state);
    }
  };

  function aa15SkillInterval(skill) {
    const alpha = Math.max(.1, Number(skill.alpha) || 1);
    const beta = Math.max(.1, Number(skill.beta) || 1);
    const p = alpha / (alpha + beta);
    const variance = alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const margin = 1.96 * Math.sqrt(variance);
    return { mean: p, lower: clamp(p - margin, 0, 1), upper: clamp(p + margin, 0, 1), evidence: alpha + beta - 2 };
  }

  const aa15BaseGetSkill = getSkill;
  getSkill = function (id) {
    const s = aa15BaseGetSkill(id);
    if (!Number.isFinite(s.alpha) || !Number.isFinite(s.beta)) {
      const n = Math.max(2, Math.min(30, Number(s.attempts || 0) + 4));
      s.alpha = 1 + s.mastery * n;
      s.beta = 1 + (1 - s.mastery) * n;
    }
    return s;
  };

  const aa15BaseUpdateSkill = updateSkill;
  updateSkill = function (skillId, correct, responseMs, meta = {}) {
    const s = aa15BaseUpdateSkill(skillId, correct, responseMs, meta);
    const weight = clamp((meta.transfer || .75) * (meta.hint ? .65 : 1), .35, 1.15);
    s.alpha += correct ? weight : 0;
    s.beta += correct ? 0 : weight;
    const posterior = aa15SkillInterval(s);
    s.mastery = clamp(.52 * posterior.mean + .18 * s.transfer + .15 * s.retention + .15 * s.speedIndex, .03, .99);
    s.confidence = clamp((1 - Math.exp(-posterior.evidence / 35)) * .72 + Math.min(1, s.contextsSucceeded.length / 4) * .28, 0, .99);
    return s;
  };

  const aa15BaseReadiness = overallReadiness;
  overallReadiness = function () {
    const base = aa15BaseReadiness();
    const skills = Object.entries(DATA.skills).map(([id, meta]) => ({ skill: getSkill(id), weight: meta.impact || 1 })).filter(x => x.skill.attempts > 0);
    if (!skills.length) return { ...base, lower: null, upper: null, evidence: 0 };
    let weighted = 0, weightSum = 0, variance = 0;
    for (const { skill, weight } of skills) {
      const ci = aa15SkillInterval(skill);
      weighted += skill.mastery * weight;
      weightSum += weight;
      const half = (ci.upper - ci.lower) / 3.92;
      variance += half * half * weight * weight;
    }
    const score = base.score == null ? null : Math.round(100 * weighted / weightSum);
    const margin = weightSum ? 1.96 * Math.sqrt(variance) / weightSum * 100 : 100;
    return { ...base, score, lower: score == null ? null : Math.round(clamp(score - margin, 0, 100)), upper: score == null ? null : Math.round(clamp(score + margin, 0, 100)), evidence: state.attempts.length };
  };

  function aa15WordDifficulty(v) {
    const index = Math.max(0, DATA.vocab.findIndex(x => x.id === v.id));
    const order = DATA.vocab.length > 1 ? index / (DATA.vocab.length - 1) : .5;
    return clamp(1 + order * 4 + (v.level === 'entrance' ? .35 : -.15), 1, 5);
  }

  function aa15Logistic(theta, difficulty) {
    return 1 / (1 + Math.exp(-1.35 * (theta - difficulty)));
  }

  function aa15NextDiagnosticQuestion(model) {
    const asked = new Set(model.askedIds || []);
    const candidates = DATA.vocab.filter(v => !asked.has(v.id)).sort((a, b) => Math.abs(aa15WordDifficulty(a) - model.theta) - Math.abs(aa15WordDifficulty(b) - model.theta));
    const v = candidates[0] || DATA.vocab.find(x => !asked.has(x.id));
    if (!v) return null;
    const q = makeVocabQ(v, 'meaning');
    q.diagnostic = true;
    q.diagnosticDifficulty = aa15WordDifficulty(v);
    q.id = 'diag-adaptive:' + v.id + ':' + uid('q');
    model.askedIds.push(v.id);
    return q;
  }

  function aa15UpdateDiagnosis(q, correct) {
    const model = state.session?.diagnostic;
    if (!model || !q?.diagnostic) return;
    const p = aa15Logistic(model.theta, q.diagnosticDifficulty);
    const information = 1.35 * 1.35 * p * (1 - p);
    model.information = (model.information || 1) + information;
    model.theta = clamp(model.theta + .72 * ((correct ? 1 : 0) - p) / Math.sqrt(model.information), 1, 5);
    model.se = clamp(1 / Math.sqrt(model.information), .18, 1.2);
    model.correct = (model.correct || 0) + (correct ? 1 : 0);
    model.count = (model.count || 0) + 1;
  }

  function aa15DiagnosisDone(model) {
    return model.count >= AA15_MAX_DIAG || (model.count >= AA15_MIN_DIAG && model.se <= .48);
  }

  startVocabDiagnostic = function () {
    const model = { method: 'adaptive-1pl-v1', theta: clamp(Number(state.profile.vocabStage) || 2.5, 1, 5), se: 1, information: 1, count: 0, correct: 0, askedIds: [] };
    const first = aa15NextDiagnosticQuestion(model);
    state.session = { id: uid('diag'), active: true, mode: 'diagnostic', kind: 'vocabDiagnostic', subject: 'english', queue: [first], index: 0, subIndex: 0, answers: {}, feedback: null, diagnostic: model, startedAt: now(), accumulatedMs: 0, lastActiveAt: now(), itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false, pausedAt: null };
    state.stats.sessions++;
    state.route = 'study';
    save(); render(); window.scrollTo(0, 0); startTicker();
  };

  const aa15BaseSelectAnswer = selectAnswer;
  selectAnswer = function (idx) {
    const q = currentQ();
    if (!q || state.session?.feedback) return aa15BaseSelectAnswer(idx);
    aa15BaseSelectAnswer(idx);
    if (q.diagnostic) {
      aa15UpdateDiagnosis(q, idx === q.answerIndex);
      save(); render();
    }
  };

  const aa15BaseNextQuestion = nextQuestion;
  nextQuestion = function () {
    const s = state.session;
    const q = currentQ();
    if (s?.kind === 'vocabDiagnostic' && q?.diagnostic && s.index === s.queue.length - 1 && s.feedback && !aa15DiagnosisDone(s.diagnostic)) {
      const next = aa15NextDiagnosticQuestion(s.diagnostic);
      if (next) s.queue.push(next);
    }
    aa15BaseNextQuestion();
  };

  completeDiagnostic = function (s) {
    const qs = s.queue.filter(q => q?.diagnostic);
    const model = s.diagnostic || { theta: 1 + 4 * (qs.filter(q => s.answers[q.id]?.correct).length / Math.max(1, qs.length)), se: .8, correct: 0, count: qs.length };
    const stage = clamp(Math.round(model.theta), 1, 5);
    state.profile.vocabDiagnosticDone = true;
    state.profile.vocabDiagnosticScore = model.correct;
    state.profile.vocabStage = stage;
    state.profile.readingLexLevel = stage;
    state.profile.vocabSupport = stage <= 4;
    state.profile.vocabDiagnosis = { method: model.method || 'adaptive-1pl-v1', theta: model.theta, se: model.se, count: model.count, correct: model.correct, completedAt: now(), lowerStage: clamp(model.theta - 1.96 * model.se, 1, 5), upperStage: clamp(model.theta + 1.96 * model.se, 1, 5) };
    for (const q of qs) {
      const correct = !!s.answers[q.id]?.correct;
      const it = itemState('v:' + q.source.id);
      if (correct) {
        it.seen = Math.max(it.seen, 1); it.correct = Math.max(it.correct, 1); it.lastReviewAt = now(); it.stabilityDays = Math.max(it.stabilityDays, 2); it.dueAt = now() + 86400000;
        state.profile.knownWords[q.source.word.toLowerCase()] = true;
      } else {
        state.profile.unknownWords[q.source.word.toLowerCase()] = { word: q.source.word, meaning: q.source.meaning, count: 1, lastSeenAt: now(), example: q.source.example, sourceReading: '適応型語彙診断', dataId: q.source.id };
      }
    }
  };

  const aa15BasePickMission = pickMission;
  pickMission = function () {
    const m = aa15BasePickMission();
    if (m.kind === 'vocabDiagnostic') m.title = '適応型英単語チェック（18〜32語）';
    if (m.kind === 'vocab') m.title = '英単語・語句';
    return m;
  };

  function aa15KnowledgeEstimate(info) {
    const word = (info?.lemma || info?.word || '').toLowerCase();
    if (!word) return { p: .5, variance: .08 };
    if (LEXICAL_FUNCTION_WORDS.has(word)) return { p: .995, variance: .00002 };
    if (state.profile.knownWords?.[word]) return { p: .99, variance: .0004 };
    if (state.profile.unknownWords?.[word]) return { p: .08, variance: .006 };
    const item = lexicalItemFor(info);
    if (item?.seen) {
      const alpha = 1 + Math.max(0, item.correct || 0);
      const beta = 1 + Math.max(0, (item.seen || 0) - (item.correct || 0));
      const recall = retention(item);
      const mean = alpha / (alpha + beta);
      const variance = alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
      return { p: clamp(.05 + .93 * mean * (.35 + .65 * recall), .04, .985), variance: variance * (.35 + .65 * recall) ** 2 };
    }
    const diagnosis = state.profile.vocabDiagnosis;
    if (info?.data && diagnosis) {
      const p = aa15Logistic(diagnosis.theta, aa15WordDifficulty(info.data));
      return { p: clamp(p, .04, .985), variance: p * (1 - p) * clamp(diagnosis.se * .35, .08, .42) };
    }
    const p = aa15BaseLexicalProbability(info);
    return { p, variance: p * (1 - p) * .28 };
  }

  const aa15BaseLexicalProbability = lexicalKnowledgeProbability;
  function aa15LexicalProbability(info) { return aa15KnowledgeEstimate(info).p; }
  lexicalKnowledgeProbability = aa15LexicalProbability;

  lexicalCoverageProfile = function (text) {
    const raw = String(text || '').match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    const lemmas = new Map();
    const unmapped = new Set();
    for (const token of raw) {
      const info = glossLookup(token);
      const key = (info.lemma || info.word || token).toLowerCase();
      const estimate = aa15KnowledgeEstimate(info);
      const old = lemmas.get(key) || { word: key, meaning: info.meaning || '', p: estimate.p, variance: estimate.variance, occ: 0 };
      old.occ++; old.p = Math.min(old.p, estimate.p); old.variance = Math.max(old.variance, estimate.variance); lemmas.set(key, old);
      if (!info.meaning && !LEXICAL_FUNCTION_WORDS.has(key)) unmapped.add(key);
    }
    let sum = 0, variance = 0;
    for (const x of lemmas.values()) { sum += x.p * x.occ; variance += x.variance * x.occ * x.occ; x.score = x.occ * (1 - x.p); }
    const tokenCount = raw.length;
    const coverage = tokenCount ? sum / tokenCount : 1;
    const standardError = tokenCount ? Math.sqrt(variance) / tokenCount : 0;
    const lower = clamp(coverage - 1.96 * standardError, 0, 1);
    const upper = clamp(coverage + 1.96 * standardError, 0, 1);
    const challengeWords = [...lemmas.values()].filter(x => x.p < .90 && x.meaning && !LEXICAL_FUNCTION_WORDS.has(x.word)).sort((a, b) => b.score - a.score);
    return { coverage, lower, upper, standardError, confidence: clamp(1 - standardError * 4, 0, 1), unknownExpected: tokenCount * (1 - coverage), tokenCount, hardWords: challengeWords.filter(x => x.p < .58).slice(0, 16), challengeWords, unmapped: [...unmapped].slice(0, 20) };
  };

  preteachPlan = function (lp, target, maxWords = 14) {
    let coverage = lp?.coverage ?? 0;
    let variance = (lp?.standardError || 0) ** 2;
    let lower = lp?.lower ?? coverage;
    const words = [];
    if (!target || !lp?.tokenCount) return { words, assistedCoverage: coverage, assistedLower: lower, assistedUpper: lp?.upper ?? coverage };
    for (const x of lp.challengeWords || []) {
      if (words.length >= maxWords || lower >= target) break;
      const weight = x.occ / Math.max(1, lp.tokenCount);
      const gain = weight * (.985 - x.p);
      if (gain <= 0) continue;
      coverage += gain;
      variance = Math.max(0, variance - (x.variance || 0) * weight * weight + .00002 * weight * weight);
      lower = clamp(coverage - 1.96 * Math.sqrt(variance), 0, 1);
      words.push({ ...x, gain });
    }
    return { words, assistedCoverage: clamp(coverage, 0, 1), assistedLower: lower, assistedUpper: clamp(coverage + 1.96 * Math.sqrt(variance), 0, 1) };
  };

  const aa15BaseGenerateForLearner = generateReadingForLearner;
  generateReadingForLearner = function (base, mode, assist) {
    const r = aa15BaseGenerateForLearner(base, mode, assist);
    const actualAssist = assist || r.assistMode || 'scaffold';
    r.lexicalProfile = lexicalCoverageProfile(r.passage);
    r.preteachPlan = actualAssist === 'exam' ? { words: [], assistedCoverage: r.lexicalProfile.coverage, assistedLower: r.lexicalProfile.lower, assistedUpper: r.lexicalProfile.upper } : preteachPlan(r.lexicalProfile, r.lexicalTarget, 14);
    return r;
  };

  const aa15BaseEvidenceRefs = evidenceRefs;
  evidenceRefs = function (passage, needles) {
    const passageId = hash(String(passage || '')).slice(0, 6).toUpperCase();
    return aa15BaseEvidenceRefs(passage, needles).map(r => ({ ...r, id: `E-${passageId}-P${r.paragraph}S${r.sentence}` }));
  };

  function aa15ScenarioDistractors(sc, type) {
    if (type === 'cause') return [
      { text: `The group stopped examining ${sc.title} only because the ${sc.setting} was closed.`, reason: '本文に閉鎖が原因だという記述はありません。', error: 'outside_information', distractorType: 'outside_information' },
      { text: `The group already knew the final result about ${sc.title} before collecting any information.`, reason: '本文では観察・測定後に考えを更新しています。', error: 'chronology_reverse', distractorType: 'chronology_reverse' },
      { text: `The group changed its idea simply to spend more money at the ${sc.setting}.`, reason: '費用を増やすことは本文の原因ではありません。', error: 'purpose_swap', distractorType: 'purpose_swap' }
    ];
    if (type === 'mainIdea') return [
      { text: `To give a complete history of the ${sc.setting}.`, reason: '場所の歴史ではなく、証拠に基づく判断修正が中心です。', error: 'scope_shift', distractorType: 'scope_shift' },
      { text: `To prove that every problem about ${sc.title} has one immediate answer.`, reason: '一つの例を「すべて」に広げすぎています。', error: 'overgeneralization', distractorType: 'overgeneralization' },
      { text: `To argue that evidence about ${sc.title} should be ignored.`, reason: '本文の教訓と逆です。', error: 'opposite', distractorType: 'opposite' }
    ];
    return [
      { text: `The group should keep its first idea about ${sc.title}, even when later evidence does not fit it.`, reason: '本文は根拠に応じて判断を更新することを述べています。', error: 'opposite', distractorType: 'opposite' },
      { text: `The information from the ${sc.setting} matters only when it agrees with the first prediction.`, reason: '都合のよい情報だけを使う考えは本文と一致しません。', error: 'confirmation_bias', distractorType: 'confirmation_bias' },
      { text: `One result about ${sc.title} is enough to prove the same conclusion in every situation.`, reason: '本文を越えて一般化しています。', error: 'overgeneralization', distractorType: 'overgeneralization' }
    ];
  }

  const aa15BaseReadingQuestionSet = readingQuestionSet;
  readingQuestionSet = function (sc, passage, diff) {
    const questions = aa15BaseReadingQuestionSet(sc, passage, diff);
    for (const q of questions) {
      let tailored = null;
      if (q.type === 'cause') tailored = aa15ScenarioDistractors(sc, 'cause');
      if (q.type === 'mainIdea') tailored = aa15ScenarioDistractors(sc, 'mainIdea');
      if (q.type === 'paraphrase') tailored = aa15ScenarioDistractors(sc, 'paraphrase');
      if (tailored) {
        const correct = q.choices.find(c => c.ok);
        q.choices = shuffleChoices([correct, ...tailored]);
        q.answerIndex = q.choices.findIndex(c => c.ok);
      }
      for (const c of q.choices) if (!c.ok) c.distractorType = c.distractorType || c.error || 'scenario_mismatch';
      q.evidenceRefs = safeArray(q.evidenceRefs).map(r => r.id ? r : ({ ...r, id: `E-${hash(String(passage || '')).slice(0, 6).toUpperCase()}-P${r.paragraph}S${r.sentence}` }));
      q.evidenceIds = q.evidenceRefs.map(r => r.id);
      q.distractorTypes = q.choices.filter(c => !c.ok).map(c => c.distractorType);
    }
    return questions;
  };

  function aa15MakeCollocationQuestion(item, cloze = false) {
    const correctText = cloze ? item.phrase : item.meaning;
    const wrong = cloze ? item.distractors : shuffle(AA15_COLLOCATIONS.filter(x => x.id !== item.id).map(x => x.meaning)).slice(0, 3);
    const stem = cloze ? `空所に最も適切な語句を選びなさい。\n\n${item.example.replace(new RegExp(item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____')}` : `「${item.phrase}」の意味として最も適切なものを選びなさい。`;
    const choices = shuffleChoices([{ text: correctText, ok: true, reason: `${item.phrase}＝${item.meaning}` }, ...wrong.map(text => ({ text, ok: false, reason: '意味または文脈が異なります。', error: 'collocation_confusion', distractorType: 'collocation_confusion' }))]);
    return { id: `phrase:${item.id}:${cloze ? 'cloze' : 'meaning'}:${uid('q')}`, type: 'vocab', stem, choices, answerIndex: choices.findIndex(c => c.ok), explanation: `${item.phrase}＝${item.meaning}`, skills: [{ id: 'en.vocab.collocation', role: 'primary' }], expectedMs: 18000, context: cloze ? 'phrase-cloze' : 'phrase-meaning', srsId: 'phrase:' + item.id, format: cloze ? 'phraseCloze' : 'phraseMeaning', source: { id: 'phrase_' + item.id, word: item.phrase, meaning: item.meaning, example: item.example } };
  }

  const aa15BasePlanVocabQueue = planVocabQueue;
  planVocabQueue = function (count = 8) {
    if (count < 4) return aa15BasePlanVocabQueue(count);
    const base = aa15BasePlanVocabQueue(Math.max(1, count - 2));
    const due = [...AA15_COLLOCATIONS].sort((a, b) => dueScore(itemState('phrase:' + b.id)) - dueScore(itemState('phrase:' + a.id)));
    return shuffle([...base, aa15MakeCollocationQuestion(due[0], false), aa15MakeCollocationQuestion(due[1], true)]).slice(0, count);
  };

  function aa15PassagePhrases(text) {
    const low = String(text || '').toLowerCase();
    return AA15_COLLOCATIONS.filter(x => low.includes(x.phrase.toLowerCase()));
  }

  const aa15BaseFeedbackHTML = feedbackHTML;
  feedbackHTML = function (q, a) {
    let html = aa15BaseFeedbackHTML(q, a);
    if (q.evidenceRefs?.length) {
      html = html.replace(/<span class="chip">第(\d+)段落(\d+)文目<\/span>/g, (all, p, s) => {
        const ref = q.evidenceRefs.find(x => String(x.paragraph) === p && String(x.sentence) === s);
        return `<span class="chip">${esc(ref?.id || '')}｜第${p}段落${s}文目</span>`;
      });
    }
    if (q.type === 'kanji' && q.source?.meaning) {
      html = html.replace(/<\/div>$/, `<div class="evidence" style="margin-top:10px"><b>語彙として確認：</b> ${esc(q.source.word)}（${esc(q.source.reading)}）＝${esc(q.source.meaning)}<br><b>用例：</b>${esc(q.source.example)}${q.source.syn ? `<br><b>類義語：</b>${esc(q.source.syn)}` : ''}</div></div>`);
    }
    return html;
  };

  const aa15BaseReadingReviewHTML = readingReviewHTML;
  readingReviewHTML = function (s) {
    let html = aa15BaseReadingReviewHTML(s);
    const phrases = [...new Map((s?.queue || []).filter(x => x?.type === 'readingSet').flatMap(x => aa15PassagePhrases(x.passage)).map(x => [x.id, x])).values()];
    if (phrases.length) html += `<div class="sp12"></div><section class="card"><div class="eyebrow">PHRASE TRANSFER</div><h3 class="h3">本文で出会った語句</h3><p>${phrases.map(x => `<span class="chip">${esc(x.phrase)}＝${esc(x.meaning)}</span>`).join(' ')}</p><div class="tiny">次の語彙MISSIONでは、意味確認→文脈穴埋め→別長文での再会へつなげます。</div></section>`;
    return html;
  };

  function aa15HistoryQuestion(event, format) {
    const index = DATA.history.findIndex(x => x.id === event.id);
    const previous = DATA.history[Math.max(0, index - 1)];
    const next = DATA.history[Math.min(DATA.history.length - 1, index + 1)];
    let stem, choices, skill = 'soc.history.chronology';
    if (format === 'event') {
      const others = distinctItems(DATA.history.filter(x => x.id !== event.id), x => x.event, event.event);
      stem = `${event.year}年の出来事を、答えを見る前に思い出してから選びなさい。`;
      choices = shuffleChoices([{ text: event.event, ok: true, reason: `${event.year}年：${event.event}` }, ...others.map(x => ({ text: x.event, ok: false, reason: `これは${x.year}年の出来事です。`, error: 'chronology', distractorType: 'chronology' }))]);
    } else if (format === 'cause') {
      skill = 'soc.history.network';
      const others = distinctItems(DATA.history.filter(x => x.id !== event.id), x => x.note, event.note);
      stem = `「${event.event}」と最も深く結びつく背景・結果・学習ポイントを選びなさい。`;
      choices = shuffleChoices([{ text: event.note, ok: true, reason: `前後関係：${previous.event} → ${event.event} → ${next.event}` }, ...others.map(x => ({ text: x.note, ok: false, reason: `これは主に「${x.event}」に結びつく説明です。`, error: 'causal_mismatch', distractorType: 'causal_mismatch' }))]);
    } else if (format === 'order') {
      const start = clamp(index - 1, 0, DATA.history.length - 4);
      const sequence = DATA.history.slice(start, start + 4);
      const shown = shuffle(sequence);
      const correct = sequence.map(x => String.fromCharCode(65 + shown.findIndex(y => y.id === x.id))).join('→');
      stem = `次の出来事を古い順に並べなさい。\n${shown.map((x, i) => `${String.fromCharCode(65 + i)} ${x.event}`).join('\n')}`;
      choices = shuffleChoices([{ text: correct, ok: true, reason: sequence.map(x => `${x.year} ${x.event}`).join(' → ') }, ...distinctPermutations(correct.split('→'), correct, 3).map(text => ({ text, ok: false, reason: '出来事の前後関係を取り違えています。', error: 'chronology_order', distractorType: 'chronology_order' }))]);
    } else {
      const years = distinctItems(DATA.history.filter(x => x.id !== event.id), x => x.year, event.year);
      stem = `「${event.event}」の年を、答えを見る前に思い出してから選びなさい。`;
      choices = shuffleChoices([{ text: String(event.year), ok: true, reason: `${event.year}年：${event.event}` }, ...years.map(x => ({ text: String(x.year), ok: false, reason: `${x.year}年は「${x.event}」です。`, error: 'year_confusion', distractorType: 'year_confusion' }))]);
    }
    return { id: `chronologia:${event.id}:${format}:${uid('q')}`, type: 'social', stem, choices, answerIndex: choices.findIndex(c => c.ok), explanation: choices.find(c => c.ok).reason, skills: [{ id: skill, role: 'primary' }, { id: 'soc.history.causality', role: 'secondary' }], expectedMs: format === 'order' ? 70000 : 40000, context: 'chronologia-' + format, srsId: 'history:' + event.id, format: 'history-' + format, source: event };
  }

  function aa15HistoryQueue(count = 8) {
    const ranked = DATA.history.map(x => ({ x, score: dueScore(itemState('history:' + x.id)) })).sort((a, b) => b.score - a.score);
    const picked = [];
    const pool = ranked.slice(0, Math.min(32, ranked.length));
    while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * Math.min(8, pool.length)), 1)[0].x);
    const formats = ['year', 'event', 'cause', 'order'];
    return picked.map((x, i) => aa15HistoryQuestion(x, formats[i % formats.length]));
  }

  function aa15StartHistoryRecall() {
    state.session = { id: uid('chronologia'), active: true, mode: 'retrieval-spacing', kind: 'chronologia', subject: 'social', queue: aa15HistoryQueue(8), index: 0, subIndex: 0, answers: {}, feedback: null, startedAt: now(), accumulatedMs: 0, lastActiveAt: now(), itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false, pausedAt: null };
    state.stats.sessions++;
    state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  const aa15BaseTimelineHTML = timelineHTML;
  timelineHTML = function () {
    let html = aa15BaseTimelineHTML();
    const controls = `<div class="sp12"></div><div class="actions"><button class="btn primary" data-action="start-timeline-recall">Chronologia想起復習 8問</button></div><div class="tiny" style="margin-top:8px">一覧の見た目と検索・隠す・お気に入りは維持。復習では、年号・出来事・前後関係・因果を混ぜ、項目別の忘却状態から再出題します。</div>`;
    return html.replace('</p><div class="timelineTools">', '</p>' + controls + '<div class="sp12"></div><div class="timelineTools">');
  };

  const aa15BaseSubjectsHTML = subjectsHTML;
  subjectsHTML = function () {
    return aa15BaseSubjectsHTML()
      .replace('漢字・語彙・論理', '漢字の読み・意味・文脈・類義語、国語論理')
      .replace('>漢字</button>', '>漢字・意味</button>');
  };

  function aa15StartSimulator() {
    const base = Math.max(7, Number(state.ui.subjectDifficulty) || 7);
    const queue = [];
    const graphMaker = globalThis.AA_V22_TEST_API?.graphReadingSet;
    if (typeof graphMaker === 'function') {
      const graph = graphMaker(base, 'exam');
      graph.simulatorPart = 1;
      queue.push(graph); registerReading(graph);
    }
    const genericCount = queue.length ? 2 : 3;
    for (let i = 0; i < genericCount; i++) {
      const part = queue.length + 1;
      const read = generateReadingForLearner(Math.min(11, base + i), part === 3 ? 'deep' : 'standard', 'exam');
      read.simulatorPart = part;
      queue.push(read); registerReading(read);
    }
    state.session = { id: uid('aichi40'), active: true, mode: 'timed-exam', kind: 'aichiEnglish40', subject: 'english', queue, index: 0, subIndex: 0, answers: {}, feedback: null, startedAt: now(), accumulatedMs: 0, lastActiveAt: now(), itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false, pausedAt: null, limitMs: AA15_MOCK_LIMIT_MS, officialTimingSource: 'Aichi public high school English written test: 40 minutes', nonOfficial: true };
    state.stats.sessions++;
    state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  const aa15BaseFinishSession = finishSession;
  finishSession = function () {
    const s = state.session;
    if (s?.kind === 'aichiEnglish40' && !s.mockRecorded) {
      const attempts = state.attempts.filter(a => a.sessionId === s.id);
      const totalQuestions = s.queue.reduce((n, r) => n + safeArray(r.questions).length, 0);
      state.stats.mockExams.push({ at: now(), durationMs: Math.min(AA15_MOCK_LIMIT_MS, (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt)), answered: attempts.length, correct: attempts.filter(a => a.correct).length, totalQuestions, timedOut: !!s.timedOut, mode: 'aichi-english-written-40-nonofficial' });
      state.stats.mockExams = state.stats.mockExams.slice(-50);
      s.mockRecorded = true;
    }
    aa15RawSnapshot(state, 'session-complete');
    aa15BaseFinishSession();
  };

  const aa15BaseStartTicker = startTicker;
  startTicker = function () {
    if (state.session?.kind !== 'aichiEnglish40') return aa15BaseStartTicker();
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const s = state.session;
      if (!s?.active || s.kind !== 'aichiEnglish40') return;
      const elapsed = (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt);
      const left = Math.max(0, s.limitMs - elapsed);
      const el = document.querySelector('[data-timer]');
      if (el) el.textContent = '残り ' + fmtTime(left);
      if (left <= 0) { s.timedOut = true; finishSession(); }
    }, 1000);
  };

  const aa15BaseStudyHTML = studyHTML;
  studyHTML = function () {
    let html = aa15BaseStudyHTML();
    const s = state.session;
    if (s?.kind === 'aichiEnglish40' && s.active) {
      const elapsed = (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt);
      html = html.replace(/<span data-timer>.*?<\/span>/, `<span data-timer>残り ${fmtTime(Math.max(0, s.limitMs - elapsed))}</span>`);
      html = html.replace('<main class="wrap">', '<main class="wrap"><section class="notice"><b>愛知県英語・筆記40分シミュレーター（非公式）</b><br>辞書・事前語彙支援なし。速度と正確性を同時に記録します。</section><div class="sp12"></div>');
    }
    return html;
  };

  const aa15BaseResultHTML = resultHTML;
  resultHTML = function () {
    let html = aa15BaseResultHTML();
    const s = state.session;
    if (s?.kind === 'vocabDiagnostic') {
      const d = state.profile.vocabDiagnosis || {};
      html = html.replace(/<div class="notice">20語中[\s\S]*?<\/div>/, `<div class="notice">${d.count || 0}語を適応出題し、${d.correct || 0}語正解。推定語彙段階 ${state.profile.vocabStage}/5（95%範囲 ${Number(d.lowerStage || 1).toFixed(1)}〜${Number(d.upperStage || 5).toFixed(1)}）。問題難度を回答ごとに調整した個人内推定です。</div>`);
    }
    if (s?.kind === 'aichiEnglish40') {
      const last = safeArray(state.stats.mockExams).slice(-1)[0];
      html = html.replace('セット完了', s.timedOut ? '40分終了' : '40分シミュレーター完了');
      html = html.replace('data-action="another-set"', 'data-action="start-reading-simulator"');
      html = html.replace('あと1セット', 'もう一度40分');
      if (last) html = html.replace('</section><div class="sp12"></div>', `<div class="sp12"></div><div class="notice">${last.answered}/${last.totalQuestions}問回答・${last.correct}問正解。これは公式問題の得点や合格可能性ではなく、時間内処理の練習記録です。</div></section><div class="sp12"></div>`);
    }
    return html;
  };

  const aa15BaseAnalyticsHTML = analyticsHTML;
  analyticsHTML = function () {
    let html = aa15BaseAnalyticsHTML();
    const r = overallReadiness();
    const range = r.score == null ? '測定データ不足' : `${r.lower}〜${r.upper}（95%推定範囲）`;
    html = html.replace('<div class="sp12"></div><div class="metricRow">', `<div class="sp12"></div><div class="rangeBand"><b>AA Readiness ${r.score ?? '--'}</b><span>${range}｜証拠 ${r.evidence}回答</span></div><div class="tiny">公式の合格率・偏差値ではありません。技能証拠が少ない間は範囲を広く表示します。</div><div class="sp12"></div><div class="metricRow">`);
    return html;
  };

  function aa15SharedLearningProfile() {
    const skills = {};
    for (const [id, s] of Object.entries(state.mastery || {})) {
      const ci = aa15SkillInterval(getSkill(id));
      skills[id] = { mastery: s.mastery, lower: ci.lower, upper: ci.upper, retention: s.retention, transfer: s.transfer, speedIndex: s.speedIndex, attempts: s.attempts, lastSeenAt: s.lastSeenAt, dueAt: s.dueAt };
    }
    return { format: AA15_PROFILE_FORMAT, generatedAt: now(), learnerTarget: 'asahigaoka-general', skills, items: state.items, lexical: { diagnosis: state.profile.vocabDiagnosis, knownWords: state.profile.knownWords, unknownWords: state.profile.unknownWords }, settings: { grammarGate: state.profile.grammarGate }, source: 'asahigaoka-aa-learning-os' };
  }

  backupPayload = function () {
    const exportedState = JSON.parse(JSON.stringify(state));
    return { format: AA15_BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: now(), stateFingerprint: hash(JSON.stringify(exportedState)), state: exportedState, learningProfile: aa15SharedLearningProfile() };
  };

  exportJSON = async function () {
    state.stats.lastBackupAt = now(); save();
    const payload = backupPayload();
    const name = `asahi_learning_os_backup_v${SCHEMA_VERSION}_${dayKey()}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], name, { type: 'application/json' });
    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '旭丘AA Learning OS バックアップ' }); return; } catch (error) { if (error?.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const aa15BaseMergeState = mergeState;
  mergeState = function (incoming) {
    const incomingState = incoming?.format === AA15_BACKUP_FORMAT ? incoming.state : incoming;
    const merged = aa15BaseMergeState(incomingState);
    if (incoming?.learningProfile?.format === AA15_PROFILE_FORMAT) merged.sharedProfile = incoming.learningProfile;
    return migrate(merged);
  };

  importJSON = function (text) {
    if (text.length > 5_000_000) throw new Error('バックアップが大きすぎます（5MB上限）');
    const incoming = JSON.parse(text);
    const incomingState = incoming?.format === AA15_BACKUP_FORMAT ? incoming.state : incoming;
    if (!aa15ValidState(incomingState)) throw new Error('Learning OS形式ではありません');
    if (incoming?.stateFingerprint && incoming.stateFingerprint !== hash(JSON.stringify(incomingState))) throw new Error('バックアップの整合性確認に失敗しました');
    aa15RawSnapshot(state, 'before-import');
    const beforeCounts = { attempts: state.attempts.length, skills: Object.keys(state.mastery).length, items: Object.keys(state.items).length };
    const merged = mergeState(incoming);
    if (merged.attempts.length < beforeCounts.attempts || Object.keys(merged.mastery).length < beforeCounts.skills || Object.keys(merged.items).length < beforeCounts.items) throw new Error('現在の学習履歴が減る統合を中止しました');
    state = merged; state.ui.modal = null; save(); render();
  };

  function aa15SnapshotList() {
    const out = [];
    for (let i = 0; i < 3; i++) { const x = aa15Parse(storageGet(AA15_SNAPSHOT_PREFIX + i) || ''); if (x?.state && aa15ValidState(x.state)) out.push({ ...x, slot: i }); }
    const pre = aa15Parse(storageGet(AA15_PRE_MIGRATION_KEY) || '');
    if (aa15ValidState(pre)) out.push({ savedAt: pre.updatedAt || pre.createdAt || 0, reason: 'pre-v1.5', state: pre, slot: 'pre' });
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }

  const aa15BaseSettingsHTML = settingsHTML;
  settingsHTML = function () {
    let html = aa15BaseSettingsHTML();
    const snapshots = aa15SnapshotList();
    const safety = `<div class="sp12"></div><section class="card"><h3 class="h3">学習履歴セーフティ</h3><p class="sub">移行前の原本と最大3世代の端末内コピーを保持します。通常のJSON書き出しは端末紛失・Safariデータ削除にも備える別の保護です。</p><div class="actions"><button class="btn ghost" data-action="restore-snapshot" ${snapshots.length ? '' : 'disabled'}>最新の端末内コピーを統合復元</button></div><div class="tiny">利用可能な端末内コピー ${snapshots.length}件。復元は上書きではなく統合し、現在の回答履歴を減らしません。</div></section>`;
    return html.replace(/<\/main>/, safety + '</main>');
  };

  const aa15BaseHandleAction = handleAction;
  handleAction = function (el, event) {
    const action = el.dataset.action;
    if (action === 'start-reading-simulator') return aa15StartSimulator();
    if (action === 'start-timeline-recall') return aa15StartHistoryRecall();
    if (action === 'restore-snapshot') {
      const latest = aa15SnapshotList()[0];
      if (!latest) return alert('復元できる端末内コピーがありません。');
      const before = state.attempts.length;
      state = mergeState(latest.state); save(); render();
      return alert(`端末内コピーを統合しました。回答履歴 ${before}件 → ${state.attempts.length}件。`);
    }
    if (action === 'reset') {
      aa15RawSnapshot(state, 'before-reset');
      if (confirm('全学習データを初期状態にしますか？ 直前の端末内コピーは残します。')) { state = defaultState(); save(); render(); }
      return;
    }
    return aa15BaseHandleAction(el, event);
  };

  const aa15BaseQaRun = qaRun;
  qaRun = function () {
    const savedState = state;
    aa15BaseQaRun();
    const report = state.qa.report || [];
    const add = (name, ok, detail) => report.push({ name, ok, detail });
    const legacyDiagnosticCheck = report.find(x => x.name === '初回語彙診断20語');
    if (legacyDiagnosticCheck) {
      legacyDiagnosticCheck.name = '語彙診断アンカー品質';
      legacyDiagnosticCheck.detail = '20語の旧アンカーを保持しつつ、実出題は107語から適応選択';
    }
    const stagedCheck = report.find(x => x.name === '段階学習プラン');
    if (stagedCheck) {
      const probe = planVocabQueue(8);
      stagedCheck.ok = probe.length === 8 && probe.filter(q => q.srsId?.startsWith('phrase:')).length === 2 && new Set(probe.map(q => q.id)).size === 8;
      stagedCheck.detail = '英単語6問＋語句/collocation 2問、同一問題なし';
    }
    try {
      const old = state;
      state = migrate(defaultState());
      state.profile.vocabDiagnosticDone = false;
      startVocabDiagnostic();
      const q = currentQ();
      add('適応型語彙診断', !!q?.diagnostic && Number.isFinite(q.diagnosticDifficulty) && state.session.queue.length === 1, '18〜32語・回答ごとに難度選択');
      const lp = lexicalCoverageProfile('The students compared the result and changed the plan as a result.');
      add('語彙カバレッジ不確実性', lp.lower <= lp.coverage && lp.coverage <= lp.upper && lp.standardError >= 0, `${Math.round(lp.lower * 1000) / 10}〜${Math.round(lp.upper * 1000) / 10}%`);
      const pp = preteachPlan(lp, .94, 14);
      add('保守的語彙先取り', pp.assistedLower <= pp.assistedCoverage && pp.words.length <= 14, `下限 ${Math.round(pp.assistedLower * 1000) / 10}%・${pp.words.length}語`);
      const cq = aa15MakeCollocationQuestion(AA15_COLLOCATIONS[0], true);
      add('語句・collocation', cq.choices.length === 4 && cq.choices.filter(c => c.ok).length === 1 && new Set(cq.choices.map(c => c.text)).size === 4, '意味・文脈穴埋め・SRS対象');
      const kanjiPlan = planKanjiQueue(8);
      add('漢字の意味・文脈', kanjiPlan.some(x => x.format === 'meaning') && kanjiPlan.every(x => x.source?.meaning && x.source?.example), '読みだけでなく意味・用例・類義語を全問に保持');
      const read = generateReading(7, 'standard');
      add('Evidence ID', read.questions.every(x => x.evidenceRefs?.every(r => /^E-[A-Z0-9]+-P\d+S\d+$/.test(r.id))), `${read.questions.flatMap(x => x.evidenceRefs || []).length}根拠`);
      add('専用誤答タイプ', read.questions.every(x => x.choices.filter(c => !c.ok).every(c => c.distractorType)), '全誤答に分類を付与');
      const sk = getSkill('en.read.inference'), ci = aa15SkillInterval(sk);
      add('Knowledge Tracing区間', ci.lower <= ci.mean && ci.mean <= ci.upper, `${Math.round(ci.lower * 100)}〜${Math.round(ci.upper * 100)}%`);
      const hq = aa15HistoryQueue(8);
      add('Chronologia想起設計', hq.length === 8 && new Set(hq.map(x => x.source.id)).size === 8 && hq.every(x => x.choices.length === 4 && x.choices.filter(c => c.ok).length === 1), '年号・出来事・前後順・因果＋項目別SRS');
      aa15StartSimulator();
      add('愛知県英語40分', state.session.limitMs === 2400000 && state.session.queue.length === 3 && state.session.queue.every(x => x.assistMode === 'exam'), '非公式・筆記40分・支援OFF');
      const probe = defaultState(); probe.attempts = [{ attemptId: 'keep', itemId: 'v:test', timestamp: now(), correct: true, skills: [], responseMs: 1000 }]; probe.mastery.keep = { skillId: 'keep', attempts: 1, correct: 1, mastery: .8 }; probe.items.keep = { seen: 1, correct: 1 };
      const migrated = migrate(probe);
      add('v1.4→v1.5履歴保持', migrated.attempts.length === 1 && migrated.mastery.keep && migrated.items.keep, '回答・技能・復習項目の件数保持');
      const legacy = migrate({ schemaVersion: 1, appVersion: '1.0.0', route: 'study', profile: { grammarGate: { ...GRAMMAR_DEFAULT } }, mastery: { legacy: { skillId: 'legacy', attempts: 2, correct: 1, mastery: .6 } }, items: { 'h:h001': { seen: 2, correct: 1 } }, attempts: [{ attemptId: 'legacy-a', itemId: 'history:h001', timestamp: now() - 1000, correct: true, responseMs: 2000, skills: [] }], session: { active: true, queue: [hq[0]], index: 0, subIndex: 0, answers: {}, accumulatedMs: 1234, scrollY: 88 } });
      add('旧統合版v1データ移行', legacy.attempts.length === 1 && legacy.mastery.legacy && legacy.items['h:h001'] && legacy.session?.accumulatedMs === 1234 && legacy.session?.scrollY === 88, '貼付版の回答・技能・年表・途中位置を保持');
      const payload = (() => { state = migrated; return backupPayload(); })();
      add('バックアップv3', payload.format === AA15_BACKUP_FORMAT && payload.learningProfile.format === AA15_PROFILE_FORMAT && payload.stateFingerprint === hash(JSON.stringify(payload.state)), '旧形式読込＋統合形式＋整合指紋');
      state = old;
    } catch (error) {
      add('v1.5追加検査', false, error.message);
    }
    state = savedState;
    state.qa = { lastRun: now(), report };
    state.ui.modal = 'qa'; save(); render();
  };

  try {
    const migrated = migrate(state);
    if (aa15OriginalParsed && aa15ValidState(aa15OriginalParsed)) {
      const safe = migrated.attempts.length >= safeArray(aa15OriginalParsed.attempts).length && Object.keys(migrated.mastery).length >= Object.keys(aa15OriginalParsed.mastery || {}).length && Object.keys(migrated.items).length >= Object.keys(aa15OriginalParsed.items || {}).length;
      if (!safe) throw new Error('学習履歴件数が一致しないためv1.5移行を中止しました。');
    }
    state = migrated;
    save(); render();
  } catch (error) {
    const fallback = aa15Parse(storageGet(AA15_PRE_MIGRATION_KEY) || '');
    if (aa15ValidState(fallback)) state = fallback;
    console.error('[AA Learning OS] safe migration stopped:', error);
    render();
  }
})();
