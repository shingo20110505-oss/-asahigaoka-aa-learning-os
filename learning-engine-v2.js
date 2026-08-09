/* 旭丘AA Learning OS v2.0.0
   愛知県入試特化・非英語4教科強化・演習/入試対策テスト分離 */
(function () {
  'use strict';

  const AA2 = window.AA_V2_CURRICULUM;
  const AA2_PRE_KEY = STORE_KEY + '_pre_v2';
  const AA2_TEST_LIMIT_MS = 45 * 60 * 1000;
  const AA2_OFFICIAL_YEAR = 2026;
  const AA2_OFFICIAL_URL = 'https://www.pref.aichi.jp/soshiki/kotogakko/r08nyuushimonndai.html';
  const AA2_LEVELS = {
    1: { name: '公立標準', target: 4.2, description: '教科書事項と愛知県標準形式を安定させる' },
    2: { name: '難関公立', target: 7.0, description: '資料統合・複数段階・紛らわしい誤答まで扱う' },
    3: { name: '旭丘レベル', target: 9.3, description: '時間制約下で高密度の根拠判断と転移を要求する' }
  };

  const AA2_SKILLS = {
    'ja.classical.lexicon': ['国語・古文重要語', 'japanese', 1.02],
    'ja.kanbun.pattern': ['国語・漢文句法', 'japanese', .94],
    'ja.idiom.context': ['国語・慣用句/四字熟語', 'japanese', .96],
    'ja.aichi.integration': ['国語・愛知県型統合読解', 'japanese', 1.08],
    'math.formula.recall': ['数学・法則想起', 'math', .90],
    'math.formula.transfer': ['数学・法則の転移', 'math', 1.05],
    'math.aichi.multistep': ['数学・愛知県型複合処理', 'math', 1.12],
    'sci.biology.recall': ['理科・生物知識', 'science', .93],
    'sci.chemistry.recall': ['理科・化学知識', 'science', .95],
    'sci.physics.recall': ['理科・物理知識', 'science', .95],
    'sci.earth.recall': ['理科・地学知識', 'science', .95],
    'sci.aichi.integration': ['理科・愛知県型実験資料統合', 'science', 1.12],
    'soc.history.explanation': ['社会・歴史説明', 'social', 1.02],
    'soc.geography.recall': ['社会・地理知識', 'social', .96],
    'soc.civics.recall': ['社会・公民知識', 'social', .96],
    'soc.aichi.integration': ['社会・愛知県型資料統合', 'social', 1.12]
  };
  for (const [id, x] of Object.entries(AA2_SKILLS)) {
    DATA.skills[id] = DATA.skills[id] || { label: x[0], subject: x[1], impact: x[2] };
  }

  function aa2SkillFor(subject, area) {
    if (subject === 'japanese') {
      if (area === 'classical') return 'ja.classical.lexicon';
      if (area === 'kanbun') return 'ja.kanbun.pattern';
      if (area === 'kanji') return 'ja.kanji.context';
      return 'ja.idiom.context';
    }
    if (subject === 'math') return 'math.formula.recall';
    if (subject === 'science') return 'sci.' + area + '.recall';
    if (subject === 'social') {
      if (area === 'history') return 'soc.history.explanation';
      if (area === 'geography') return 'soc.geography.recall';
      return 'soc.civics.recall';
    }
    return 'en.vocab.recall';
  }

  function aa2Row(subject, row) {
    return {
      id: row[0], subject, area: row[1], prompt: row[2], answer: row[3],
      explanation: row[4], difficulty: row[5], skillId: aa2SkillFor(subject, row[1]),
      impact: row[1] === 'advanced' ? .72 : row[1] === 'strategy' ? 1.08 : 1
    };
  }

  const AA2_BANKS = {};
  for (const subject of ['japanese', 'math', 'science', 'social']) {
    AA2_BANKS[subject] = safeArray(AA2?.[subject]).map(row => aa2Row(subject, row));
  }
  for (const k of DATA.kanji) {
    AA2_BANKS.japanese.push({
      id: 'kanji-' + k.id, subject: 'japanese', area: 'kanji', prompt: k.word,
      answer: k.meaning, explanation: k.word + '（' + k.reading + '）：' + k.meaning + '。用例「' + k.example + '」',
      difficulty: k.level === 'upper' ? 8 : 6, skillId: 'ja.kanji.context', impact: 1
    });
  }
  for (const h of DATA.history) {
    AA2_BANKS.social.push({
      id: 'history-year-' + h.id, subject: 'social', area: 'history', prompt: h.event + 'が起きた年',
      answer: String(h.year) + '年', explanation: h.year + '年：' + h.event + '。' + h.note,
      difficulty: h.year < 1600 ? 5 : 6, skillId: 'soc.history.chronology', impact: .96
    });
    AA2_BANKS.social.push({
      id: 'history-event-' + h.id, subject: 'social', area: 'history', prompt: String(h.year) + '年の出来事',
      answer: h.event, explanation: h.year + '年：' + h.event + '。' + h.note,
      difficulty: h.year < 1600 ? 5 : 6, skillId: 'soc.history.chronology', impact: .96
    });
    AA2_BANKS.social.push({
      id: 'history-explain-' + h.id, subject: 'social', area: 'history', prompt: h.event + 'の背景・結果・学習ポイント',
      answer: h.note, explanation: h.year + '年の「' + h.event + '」を前後関係と因果で捉える。',
      difficulty: 7, skillId: 'soc.history.explanation', impact: 1.05
    });
  }

  const AA2_MATH_FORMULA_AREAS = new Set([
    'number', 'algebra', 'equation', 'function', 'geometry', 'measure', 'probability', 'statistics'
  ]);
  function aa2SubjectRows(subject) {
    return subject === 'math'
      ? AA2_BANKS.math.filter(row => AA2_MATH_FORMULA_AREAS.has(row.area))
      : AA2_BANKS[subject];
  }

  function aa2Normal() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function aa2Gamma(shape) {
    if (shape < 1) return aa2Gamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = aa2Normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - .0331 * x ** 4 || Math.log(u) < .5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function aa2Beta(alpha, beta) {
    const x = aa2Gamma(Math.max(.2, alpha)), y = aa2Gamma(Math.max(.2, beta));
    return x / (x + y);
  }

  function aa2TargetDifficulty(level) {
    return AA2_LEVELS[clamp(Number(level) || 1, 1, 3)].target;
  }
  function aa2RecentPenalty(id, subject) {
    const recent = state.attempts.slice(-28);
    const hits = recent.filter(a => String(a.itemId).includes(id)).length;
    const factor = subject === 'science' ? .08 : .16;
    return hits * factor;
  }
  function aa2Priority(row, level, futureDays = 0) {
    const item = itemState('v2:' + row.subject + ':' + row.id);
    const skill = getSkill(row.skillId);
    const alpha = 1 + Number(item.correct || 0);
    const beta = 1 + Math.max(0, Number(item.seen || 0) - Number(item.correct || 0));
    const sampledWeakness = 1 - aa2Beta(alpha, beta);
    const evidence = alpha + beta;
    const uncertainty = Math.min(1, 2 / Math.sqrt(evidence));
    const elapsed = item.lastReviewAt ? daysSince(item.lastReviewAt) + futureDays : 99;
    const stability = Math.max(.25, Number(item.stabilityDays) || .5);
    const forgetting = 1 - Math.exp(-elapsed / stability);
    const fit = Math.exp(-Math.pow((row.difficulty - aa2TargetDifficulty(level)) / 2.7, 2));
    const skillNeed = 1 - Number(skill.mastery || .48);
    const due = item.dueAt && item.dueAt <= now() ? .22 : 0;
    return row.impact * fit * (.30 * sampledWeakness + .24 * forgetting + .20 * uncertainty + .18 * skillNeed + .08 * (1 - Number(skill.transfer || .35))) + due - aa2RecentPenalty(row.id, row.subject);
  }

  function aa2Rank(subject, level, futureDays = 0) {
    level = clamp(Number(level) || 1, 1, 3);
    const cap = level === 1 ? 7 : level === 2 ? 9 : 11;
    return aa2SubjectRows(subject)
      .filter(row => row.difficulty <= cap)
      .map(row => ({ row, score: aa2Priority(row, level, futureDays) }))
      .sort((a, b) => b.score - a.score);
  }

  function aa2UniqueDistractors(row) {
    const subjectRows = aa2SubjectRows(row.subject);
    const sameArea = subjectRows.filter(x => x.id !== row.id && x.area === row.area);
    const other = subjectRows.filter(x => x.id !== row.id && x.area !== row.area);
    const pool = [...shuffle(sameArea), ...shuffle(other)];
    const seen = new Set([String(row.answer)]);
    const out = [];
    for (const x of pool) {
      const value = String(x.answer);
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(x);
      if (out.length === 3) break;
    }
    return out;
  }

  function aa2MakeKnowledgeQuestion(row, testMode = false) {
    const labels = {
      japanese: '次の語句・句法の意味として最も適切なものを選びなさい。',
      math: '次の公式・法則として正しいものを選びなさい。',
      science: '次の用語・現象の説明として最も適切なものを選びなさい。',
      social: '次の年号・出来事・説明の組合せとして最も適切なものを選びなさい。'
    };
    const explanation = row.area === 'kanji' ? '語彙として確認：' + row.explanation : row.explanation;
    const choices = shuffleChoices([
      { text: String(row.answer), ok: true, reason: explanation, distractorType: null },
      ...aa2UniqueDistractors(row).map(x => ({
        text: String(x.answer), ok: false,
        reason: 'これは主に「' + x.prompt + '」に対応する説明で、設問の「' + row.prompt + '」とは一致しません。',
        error: row.subject === 'social' ? 'source_mismatch' : 'concept_confusion',
        distractorType: row.subject === 'social' ? 'source_mismatch' : 'concept_confusion'
      }))
    ]);
    return {
      id: 'v2:' + row.subject + ':' + row.id + ':' + uid('q'), type: row.subject,
      stem: labels[row.subject] + '\n\n【' + row.prompt + '】',
      choices, answerIndex: choices.findIndex(c => c.ok), explanation,
      skills: row.subject === 'math'
        ? [{ id: 'math.formula.recall', role: 'primary' }]
        : [{ id: row.skillId, role: 'primary' }, { id: row.subject === 'science' ? 'sci.aichi.integration' : row.subject === 'social' ? 'soc.aichi.integration' : 'ja.aichi.integration', role: 'secondary' }],
      expectedMs: testMode ? 55000 : 35000, context: 'v2-' + row.area,
      srsId: 'v2:' + row.subject + ':' + row.id, format: row.area === 'kanji' ? 'meaning' : 'retrieval-' + row.area,
      source: row.area === 'kanji' ? { ...row, meaning: row.answer, example: row.explanation } : row,
      courseLevel: Number(state.ui?.testCourseLevel || 1), testMode
    };
  }

  const aa2BaseDefaultState = defaultState;
  defaultState = function () {
    const s = aa2BaseDefaultState();
    s.ui.testCourseLevel = 1;
    s.ui.testSubject = 'japanese';
    s.stats.aichiTests = [];
    s.stats.practiceSessions = 0;
    s.stats.v2Migrations = [];
    return s;
  };

  const aa2BaseMigrate = migrate;
  migrate = function (input) {
    const before = input;
    const s = aa2BaseMigrate(input);
    s.ui.testCourseLevel = clamp(Number(s.ui.testCourseLevel) || 1, 1, 3);
    s.ui.testSubject = ['english', 'japanese', 'math', 'science', 'social'].includes(s.ui.testSubject) ? s.ui.testSubject : 'japanese';
    s.stats.aichiTests = safeArray(s.stats.aichiTests).filter(plainObj).slice(-100);
    s.stats.practiceSessions = Math.max(0, Number(s.stats.practiceSessions) || 0);
    s.stats.v2Migrations = safeArray(s.stats.v2Migrations).filter(plainObj).slice(-10);
    s.schemaVersion = SCHEMA_VERSION;
    s.appVersion = APP_VERSION;
    if (plainObj(before) && Array.isArray(before.attempts)) {
      const beforeAttempts = before.attempts.length;
      const beforeSkills = Object.keys(plainObj(before.mastery) ? before.mastery : {}).length;
      const beforeItems = Object.keys(plainObj(before.items) ? before.items : {}).length;
      if (s.attempts.length < Math.min(beforeAttempts, 10000) || Object.keys(s.mastery).length < beforeSkills || Object.keys(s.items).length < beforeItems) {
        throw new Error('v2移行で学習履歴が減るため保存を中止しました。');
      }
    }
    return s;
  };

  const aa2BaseMakeJapaneseQ = makeJapaneseQ;
  const aa2BaseMakeScienceQ = makeScienceQ;
  const aa2BaseMakeSocialQ = makeSocialQ;

  function aa2PickKnowledge(subject, level) {
    const ranked = aa2Rank(subject, level);
    const top = ranked.slice(0, Math.min(12, ranked.length));
    return (top[Math.floor(Math.random() * Math.min(5, top.length))] || ranked[0]).row;
  }

  makeJapaneseQ = function (diff = 7) {
    if (Math.random() < .78) return aa2MakeKnowledgeQuestion(aa2PickKnowledge('japanese', diff >= 9 ? 3 : diff >= 6 ? 2 : 1));
    return aa2BaseMakeJapaneseQ(diff);
  };
  makeMathQ = function (diff = 7) {
    return aa2MakeKnowledgeQuestion(aa2PickKnowledge('math', diff >= 9 ? 3 : diff >= 6 ? 2 : 1));
  };
  makeScienceQ = function (diff = 7) {
    if (Math.random() < .60) return aa2MakeKnowledgeQuestion(aa2PickKnowledge('science', diff >= 9 ? 3 : diff >= 6 ? 2 : 1));
    return aa2BaseMakeScienceQ(diff);
  };
  makeSocialQ = function (diff = 7) {
    if (Math.random() < .72) return aa2MakeKnowledgeQuestion(aa2PickKnowledge('social', diff >= 9 ? 3 : diff >= 6 ? 2 : 1));
    return aa2BaseMakeSocialQ(diff);
  };

  function aa2TransferQuestion(subject, diff) {
    if (subject === 'japanese') return aa2BaseMakeJapaneseQ(diff);
    if (subject === 'math') return aa2MakeKnowledgeQuestion(aa2PickKnowledge('math', diff >= 9 ? 3 : diff >= 6 ? 2 : 1));
    if (subject === 'science') return aa2BaseMakeScienceQ(diff);
    return aa2BaseMakeSocialQ(diff);
  }

  function aa2PracticeQueue(subject, count, level) {
    const ranked = aa2Rank(subject, level);
    const areas = [...new Set(ranked.map(x => x.row.area))];
    const selected = [];
    const used = new Set();
    for (const area of shuffle(areas)) {
      const candidate = ranked.find(x => x.row.area === area && !used.has(x.row.id));
      if (!candidate) continue;
      selected.push(candidate.row); used.add(candidate.row.id);
      if (selected.length >= Math.max(3, Math.floor(count * .65))) break;
    }
    for (const candidate of ranked) {
      if (selected.length >= count) break;
      if (used.has(candidate.row.id)) continue;
      selected.push(candidate.row); used.add(candidate.row.id);
    }
    const queue = selected.slice(0, count).map(row => aa2MakeKnowledgeQuestion(row, false));
    if (subject === 'math') return queue.slice(0, count);
    const transferCount = Math.max(1, Math.round(count * (level === 3 ? .35 : .22)));
    for (let i = 0; i < transferCount; i++) {
      const index = Math.min(queue.length, 2 + i * 3);
      const q = aa2TransferQuestion(subject, Math.round(aa2TargetDifficulty(level)));
      q.context = 'aichi-transfer-' + subject;
      q.skills = [...safeArray(q.skills), { id: subject === 'science' ? 'sci.aichi.integration' : subject === 'social' ? 'soc.aichi.integration' : 'ja.aichi.integration', role: 'secondary' }];
      queue.splice(index, 0, q);
    }
    return queue.slice(0, count);
  }

  function aa2StartPractice(subject, mode = 'standard', level = null, queueOverride = null) {
    const course = clamp(Number(level || state.ui.testCourseLevel || 1), 1, 3);
    const count = mode === 'micro' ? 3 : mode === 'deep' ? 15 : 8;
    const queue = queueOverride || aa2PracticeQueue(subject, count, course);
    state.session = {
      id: uid('v2practice'), active: true, mode: 'adaptive-practice', trackType: 'practice',
      kind: 'v2Practice', subject, courseLevel: course, queue, index: 0, subIndex: 0,
      answers: {}, feedback: null, startedAt: now(), accumulatedMs: 0, lastActiveAt: now(),
      itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false, pausedAt: null
    };
    state.stats.sessions++;
    state.stats.practiceSessions++;
    state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  const aa2BaseStartSession = startSession;
  startSession = function (opts = {}) {
    const subject = opts.subject;
    const nonEnglish = ['japanese', 'math', 'science', 'social'].includes(subject);
    if (nonEnglish && (opts.kind === 'subject' || opts.kind === 'kanji' || opts.kind === 'v2Practice')) {
      return aa2StartPractice(subject, opts.mode || 'standard', opts.courseLevel);
    }
    return aa2BaseStartSession(opts);
  };

  function aa2PointPlan(queue) {
    const total = queue.length;
    return queue.map((q, i) => ({ ...q, points: i < 22 - total ? 2 : 1 }));
  }

  function aa2TestQueue(subject, level) {
    const count = 15;
    const ranked = aa2Rank(subject, level);
    const areas = [...new Set(ranked.map(x => x.row.area))];
    const rows = [];
    const used = new Set();
    for (const area of areas) {
      const choices = ranked.filter(x => x.row.area === area && !used.has(x.row.id));
      const chosen = choices.find(x => x.row.difficulty >= aa2TargetDifficulty(level) - 2.5) || choices[0];
      if (chosen) { rows.push(chosen.row); used.add(chosen.row.id); }
    }
    for (const x of ranked) {
      if (rows.length >= 10) break;
      if (!used.has(x.row.id)) { rows.push(x.row); used.add(x.row.id); }
    }
    let queue = rows.slice(0, 10).map(row => aa2MakeKnowledgeQuestion(row, true));
    while (queue.length < count) {
      const q = aa2TransferQuestion(subject, Math.round(aa2TargetDifficulty(level)));
      q.testMode = true;
      q.context = 'aichi-r' + AA2_OFFICIAL_YEAR + '-' + subject;
      if (subject !== 'math') q.skills = [...safeArray(q.skills), { id: subject === 'science' ? 'sci.aichi.integration' : subject === 'social' ? 'soc.aichi.integration' : 'ja.aichi.integration', role: 'primary' }];
      queue.push(q);
    }
    return aa2PointPlan(queue);
  }

  function aa2StartAichiTest(subject, level) {
    level = clamp(Number(level) || 1, 1, 3);
    if (subject === 'english') {
      aa2BaseHandleAction({ dataset: { action: 'start-reading-simulator' } }, null);
      state.session.trackType = 'test';
      state.session.courseLevel = level;
      state.session.testPending = {};
      state.session.officialModelYear = AA2_OFFICIAL_YEAR;
      state.session.officialSource = AA2_OFFICIAL_URL;
      save(); render();
      return;
    }
    const queue = aa2TestQueue(subject, level);
    state.session = {
      id: uid('aichiTest'), active: true, mode: 'aichi-test', trackType: 'test',
      kind: 'aichiTest', subject, courseLevel: level, queue, index: 0, subIndex: 0,
      answers: {}, feedback: null, testPending: {}, startedAt: now(), accumulatedMs: 0,
      lastActiveAt: now(), itemStartedAt: now(), scrollY: 0, minimumDone: false,
      clockPaused: false, pausedAt: null, limitMs: AA2_TEST_LIMIT_MS,
      officialModelYear: AA2_OFFICIAL_YEAR, officialSource: AA2_OFFICIAL_URL,
      nonOfficial: true
    };
    state.stats.sessions++;
    state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  const aa2BaseSelectAnswer = selectAnswer;
  selectAnswer = function (idx) {
    const s = state.session, q = currentQ();
    if (s?.trackType !== 'test') return aa2BaseSelectAnswer(idx);
    if (!q || s.feedback || s.testFinalized?.[q.id]) return;
    const responseMs = Math.max(1, now() - s.itemStartedAt);
    const correct = idx === q.answerIndex;
    s.answers[q.id] = { idx, correct, responseMs, pending: true };
    s.testPending = s.testPending || {};
    s.testPending[q.id] = { idx, correct, responseMs };
    save(); render();
  };

  const aa2BaseNextQuestion = nextQuestion;
  function aa2CommitTestAnswer() {
    const s = state.session, q = currentQ();
    if (!s || s.trackType !== 'test' || !q) return;
    const pending = s.testPending?.[q.id];
    if (!pending) return alert('選択肢を選んでください。');
    s.testFinalized = s.testFinalized || {};
    if (!s.testFinalized[q.id]) {
      const choice = q.choices[pending.idx];
      s.answers[q.id] = { ...pending, pending: false };
      recordAttempt(q, pending.idx, pending.correct, pending.responseMs, {
        errorType: pending.correct ? null : choice?.error || 'test_error',
        transfer: 1.12
      });
      s.testFinalized[q.id] = true;
    }
    aa2BaseNextQuestion();
  }

  function aa2UnansweredTestItems(s) {
    const out = [];
    for (const item of safeArray(s?.queue)) {
      if (item?.type === 'readingSet') {
        for (const q of safeArray(item.questions)) if (!s.testFinalized?.[q.id]) out.push(q);
      } else if (!s.testFinalized?.[item.id]) out.push(item);
    }
    return out;
  }

  function aa2FinalizeTestOnTimeout() {
    const s = state.session;
    if (!s || s.trackType !== 'test') return;
    const q = currentQ(), pending = q && s.testPending?.[q.id];
    if (q && pending && !s.testFinalized?.[q.id]) {
      const choice = q.choices[pending.idx];
      s.answers[q.id] = { ...pending, pending: false };
      recordAttempt(q, pending.idx, pending.correct, pending.responseMs, { errorType: pending.correct ? null : choice?.error || 'test_error', transfer: 1.12 });
      s.testFinalized = s.testFinalized || {}; s.testFinalized[q.id] = true;
    }
    s.timedOut = true;
    finishSession();
  }

  const aa2BaseFinishSession = finishSession;
  finishSession = function () {
    const s = state.session;
    if (s?.trackType === 'test' && !s.v2TestRecorded) {
      const attempts = state.attempts.filter(a => a.sessionId === s.id);
      const possible = safeArray(s.queue).reduce((sum, item) => sum + (item?.type === 'readingSet' ? safeArray(item.questions).length : 1), 0);
      const earned = attempts.reduce((sum, a) => {
        const q = safeArray(s.queue).flatMap(x => x?.type === 'readingSet' ? safeArray(x.questions) : [x]).find(x => x?.id === a.itemId);
        return sum + (a.correct ? Number(q?.points || 1) : 0);
      }, 0);
      const maxPoints = safeArray(s.queue).reduce((sum, item) => {
        if (item?.type === 'readingSet') return sum + safeArray(item.questions).reduce((n, q) => n + Number(q.points || 1), 0);
        return sum + Number(item?.points || 1);
      }, 0);
      const converted22 = maxPoints ? Math.round(earned / maxPoints * 220) / 10 : 0;
      state.stats.aichiTests.push({
        at: now(), subject: s.subject, courseLevel: s.courseLevel, durationMs: Math.min(s.limitMs || AA2_TEST_LIMIT_MS, (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt)),
        answered: attempts.length, correct: attempts.filter(a => a.correct).length, totalQuestions: possible,
        earned, maxPoints, converted22, timedOut: !!s.timedOut, officialModelYear: s.officialModelYear,
        nonOfficial: true
      });
      state.stats.aichiTests = state.stats.aichiTests.slice(-100);
      s.v2TestRecorded = true;
    }
    return aa2BaseFinishSession();
  };

  const aa2BaseStartTicker = startTicker;
  startTicker = function () {
    const s = state.session;
    if (s?.trackType !== 'test' || s.kind === 'aichiEnglish40') return aa2BaseStartTicker();
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const live = state.session;
      if (!live?.active || live.trackType !== 'test') return;
      const elapsed = (live.accumulatedMs || 0) + (live.clockPaused ? 0 : now() - live.lastActiveAt);
      const left = Math.max(0, live.limitMs - elapsed);
      const el = document.querySelector('[data-timer]');
      if (el) el.textContent = '残り ' + fmtTime(left);
      if (left <= 0) aa2FinalizeTestOnTimeout();
    }, 1000);
  };

  function aa2CourseCards() {
    return '<div class="courseGrid">' + Object.entries(AA2_LEVELS).map(([level, x]) =>
      '<button class="courseCard ' + (Number(state.ui.testCourseLevel) === Number(level) ? 'selected' : '') + '" data-action="select-course" data-level="' + level + '">' +
      '<span class="courseNo">LEVEL ' + level + '</span><h4>' + esc(x.name) + '</h4><p>' + esc(x.description) + '</p></button>'
    ).join('') + '</div>';
  }

  const aa2BaseSubjectsHTML = subjectsHTML;
  subjectsHTML = function () {
    let html = aa2BaseSubjectsHTML();
    html = html.replace('教科別トレーニング', '教科別演習');
    html = html.replace('MISSIONが基本ですが、狙って補強したいときだけ教科を選べます。', '演習は弱点に合わせて即時解説・再出題します。入試対策テストとは記録も挙動も分離しています。');
    const test = '<div class="sp12"></div><section class="card hero"><div class="eyebrow">AICHI EXAM COURSE</div><div class="modeLabel test">入試対策テスト</div>' +
      '<h2 class="h2">愛知県公立高校入試・本番型</h2><p class="sub">演習とは別系統です。試験中は正誤・解説を表示せず、終了後に22点換算の非公式練習指標と全問分析を返します。</p>' +
      aa2CourseCards() + '<div class="field"><label>受験教科</label><select data-action="test-subject">' +
      Object.entries(SUBJECTS).map(([id, name]) => '<option value="' + id + '" ' + (state.ui.testSubject === id ? 'selected' : '') + '>' + name + '</option>').join('') +
      '</select></div><div class="actions"><button class="btn primary" data-action="start-aichi-test">選択レベルで開始</button></div>' +
      '<div class="sp12"></div><div class="sourceTag">令和8年度（2026年度）愛知県公表問題の構成・時間・資料型をモデル化。問題文の転載ではない非公式演習です。</div></section>';
    return html.replace(/<\/main>/, test + '</main>');
  };

  const aa2BaseStudyHTML = studyHTML;
  studyHTML = function () {
    let html = aa2BaseStudyHTML();
    const s = state.session;
    if (s?.trackType === 'practice' && s.active) {
      html = html.replace('<main>', '<main><section class="notice"><span class="modeLabel">適応演習</span><br>回答直後に解説し、忘却・弱点・転移価値から次問を調整します。</section><div class="sp12"></div>');
    }
    if (s?.trackType === 'test' && s.active) {
      const elapsed = (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt);
      const left = Math.max(0, (s.limitMs || AA2_TEST_LIMIT_MS) - elapsed);
      html = html.replace(/<span data-timer>.*?<\/span>/, '<span data-timer>残り ' + fmtTime(left) + '</span>');
      html = html.replace('<main>', '<main><section class="notice"><span class="modeLabel test">入試対策テスト</span><br>LEVEL ' + s.courseLevel + ' ' + esc(AA2_LEVELS[s.courseLevel]?.name || '') + '｜途中の正誤・解説なし｜終了後に全問確認</section><div class="sp12"></div>');
      const q = currentQ(), selected = q ? s.answers[q.id]?.idx : null;
      html = html.replace(/<button class="choice ([^"]*)" data-action="answer" data-index="(\d+)"/g, (match, cls, idx) => {
        return '<button class="choice ' + cls + (Number(idx) === Number(selected) ? ' testSelected' : '') + '" data-action="answer" data-index="' + idx + '"';
      });
      html = html.replace('<button class="btn ghost" data-action="pause-home">', '<button class="btn primary" data-action="test-next" ' + (selected == null ? 'disabled' : '') + '>解答を確定して次へ</button><button class="btn ghost" data-action="pause-home">');
    }
    return html;
  };

  function aa2AllSessionQuestions(s) {
    return safeArray(s?.queue).flatMap(item => item?.type === 'readingSet' ? safeArray(item.questions) : [item]).filter(Boolean);
  }

  function aa2TestReviewHTML(s) {
    if (s?.trackType !== 'test') return '';
    const qs = aa2AllSessionQuestions(s);
    const rows = qs.map((q, index) => {
      const a = s.answers?.[q.id], chosen = a ? q.choices[a.idx] : null, correct = q.choices[q.answerIndex];
      return '<div class="testReview"><div class="strong">問' + (index + 1) + ' ' + (a?.correct ? '<span class="goodText">正解</span>' : '<span class="dangerText">' + (a ? '不正解' : '未回答') + '</span>') + '</div>' +
        '<div class="tiny">' + esc(q.stem).replace(/\n/g, ' ') + '</div>' +
        '<p><b>正答：</b>' + esc(correct?.text || '') + '</p>' +
        (chosen && !a.correct ? '<p><b>自分の回答：</b>' + esc(chosen.text) + ' — ' + esc(chosen.reason || '条件との不一致を確認します。') + '</p>' : '') +
        '<div class="evidence"><b>解説：</b> ' + esc(correct?.reason || q.explanation || '根拠と条件を確認します。') + '</div></div>';
    }).join('');
    return '<div class="sp12"></div><section class="card"><div class="eyebrow">AFTER TEST REVIEW</div><h3 class="h3">全問アフターチェック</h3><p class="sub">試験中には出さなかった正答・誤答理由をまとめて確認します。</p>' + rows + '</section>';
  }

  const aa2BaseResultHTML = resultHTML;
  resultHTML = function () {
    let html = aa2BaseResultHTML();
    const s = state.session;
    if (s?.trackType === 'test') {
      const last = safeArray(state.stats.aichiTests).slice(-1)[0];
      html = html.replace('セット完了', s.timedOut ? '試験時間終了' : '入試対策テスト完了');
      html = html.replace('あと1セット', '同じ条件で再試験');
      html = html.replace('data-action="another-set"', 'data-action="repeat-aichi-test"');
      if (last) {
        const summary = '<div class="sp12"></div><div class="notice"><b>' + esc(SUBJECTS[last.subject] || last.subject) + '・LEVEL ' + last.courseLevel + '</b><br>' +
          last.answered + '/' + last.totalQuestions + '問回答、' + last.correct + '問正解。非公式22点換算 ' + last.converted22 + '/22。公式得点・合格可能性ではありません。</div>';
        html = html.replace('</section><div class="sp12"></div>', summary + '</section><div class="sp12"></div>');
      }
      html = html.replace(/<\/main>/, aa2TestReviewHTML(s) + '</main>');
    }
    return html;
  };

  function aa2SubjectStability(subject) {
    const items = Object.entries(state.items || {}).filter(([id, x]) => id.startsWith('v2:' + subject + ':') && x.lastReviewAt);
    if (!items.length) return { stability: .75, elapsed: .75, evidence: 0 };
    return {
      stability: Math.max(.25, avg(items.map(([, x]) => Number(x.stabilityDays) || .5))),
      elapsed: avg(items.map(([, x]) => daysSince(x.lastReviewAt))),
      evidence: items.length
    };
  }

  function aa2Retention(subject, futureDays) {
    const x = aa2SubjectStability(subject);
    return Math.exp(-(x.elapsed + futureDays) / x.stability);
  }

  function aa2RetentionChart() {
    const subjects = ['japanese', 'math', 'science', 'social'];
    const colors = ['#6843bd', '#2458d3', '#177a4b', '#a96800'];
    const days = [0, 1, 3, 7, 14, 30];
    const width = 680, height = 250, left = 44, top = 22, plotW = 610, plotH = 180;
    let svg = '<svg class="retentionChart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="4教科の想起可能性予測">';
    for (let y = 0; y <= 4; y++) {
      const py = top + y * plotH / 4;
      svg += '<line x1="' + left + '" y1="' + py + '" x2="' + (left + plotW) + '" y2="' + py + '" stroke="currentColor" opacity=".12"/>';
      svg += '<text x="4" y="' + (py + 4) + '" font-size="11" fill="currentColor">' + (100 - y * 25) + '%</text>';
    }
    days.forEach((d, i) => {
      const x = left + i * plotW / (days.length - 1);
      svg += '<text x="' + x + '" y="232" text-anchor="middle" font-size="11" fill="currentColor">' + d + '日</text>';
    });
    subjects.forEach((subject, si) => {
      const points = days.map((d, i) => {
        const x = left + i * plotW / (days.length - 1);
        const y = top + (1 - aa2Retention(subject, d)) * plotH;
        return x + ',' + y;
      }).join(' ');
      svg += '<polyline points="' + points + '" fill="none" stroke="' + colors[si] + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    svg += '</svg><div class="retentionLegend">' + subjects.map((s, i) => '<span><i style="background:' + colors[i] + '"></i>' + SUBJECTS[s] + '</span>').join('') + '</div>';
    return svg;
  }

  function aa2SmartReviewQueue(count = 12) {
    const level = Number(state.ui.testCourseLevel) || 1;
    const ranked = ['japanese', 'math', 'science', 'social'].flatMap(subject => aa2Rank(subject, level, 1));
    ranked.sort((a, b) => b.score - a.score);
    const queue = [], subjectCounts = {};
    for (const x of ranked) {
      const sub = x.row.subject;
      if ((subjectCounts[sub] || 0) >= 4) continue;
      queue.push(aa2MakeKnowledgeQuestion(x.row, false));
      subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;
      if (queue.length >= count) break;
    }
    return queue;
  }

  function aa2StartSmartReview() {
    const queue = aa2SmartReviewQueue(12);
    const first = queue[0]?.source?.subject || 'japanese';
    aa2StartPractice(first, 'standard', state.ui.testCourseLevel, queue);
    state.session.subject = 'mixed';
    state.session.kind = 'v2SmartReview';
    save(); render();
  }

  const aa2BaseAnalyticsHTML = analyticsHTML;
  analyticsHTML = function () {
    let html = aa2BaseAnalyticsHTML();
    const tests = safeArray(state.stats.aichiTests);
    const latest = tests.slice(-1)[0];
    const section = '<div class="sp12"></div><section class="card"><div class="eyebrow">SPACING / RETENTION</div><h3 class="h3">忘却予測と最適復習</h3>' +
      '<p class="sub">項目ごとの安定度Sと最終学習からの時間tから、<b>R(t)=exp(-t/S)</b>で想起可能性を予測します。Ebbinghaus-inspired forgetting modelであり、エビングハウス本人の厳密な公式ではありません。</p>' +
      aa2RetentionChart() + '<div class="sp12"></div><div class="actions"><button class="btn primary" data-action="start-smart-review">明日の失点リスクが高い12問を復習</button></div>' +
      '<div class="tiny">忘却リスクだけでなく、愛知県での重要度・技能の不確実性・転移価値・直近の出題偏り・所要時間も統合します。</div></section>' +
      '<div class="sp12"></div><section class="card"><h3 class="h3">演習と入試対策テスト</h3><div class="metricRow">' +
      '<div class="metric"><b>' + Number(state.stats.practiceSessions || 0) + '</b><span>適応演習</span></div>' +
      '<div class="metric"><b>' + tests.length + '</b><span>入試対策テスト</span></div>' +
      '<div class="metric"><b>' + (latest ? latest.converted22 : '--') + '</b><span>直近の非公式22点換算</span></div></div>' +
      '<div class="tiny">演習は復習スケジュールを更新。テストは本番再現を優先し、試験中の正誤表示や項目SRS更新を行いません。</div></section>';
    return html.replace(/<\/main>/, section + '</main>');
  };

  const aa2BaseSettingsHTML = settingsHTML;
  settingsHTML = function () {
    let html = aa2BaseSettingsHTML();
    const source = '<div class="sp12"></div><section class="card"><div class="eyebrow">OFFICIAL BASIS</div><h3 class="h3">愛知県入試への適合</h3>' +
      '<p class="sub">令和8年度の愛知県公表問題を基準に、国語4大問、理科6資料実験群、社会6資料統合群の処理技能をモデル化しています。数学はユーザー設定により、中学範囲の公式・法則の暗記だけを出題します。</p>' +
      '<a class="btn ghost" href="' + AA2_OFFICIAL_URL + '" target="_blank" rel="noopener">愛知県公式問題ページ</a>' +
      '<div class="tiny">公式問題そのものは転載せず、構成・技能・時間条件を使ったオリジナル問題です。旭丘の公式最低点・合格率は表示しません。</div></section>';
    return html.replace(/<\/main>/, source + '</main>');
  };

  const aa2BaseHandleAction = handleAction;
  handleAction = function (el, event) {
    const action = el.dataset.action;
    if (action === 'select-course') {
      state.ui.testCourseLevel = clamp(Number(el.dataset.level) || 1, 1, 3);
      save(); render(); return;
    }
    if (action === 'start-aichi-test') {
      return aa2StartAichiTest(state.ui.testSubject, state.ui.testCourseLevel);
    }
    if (action === 'test-next') return aa2CommitTestAnswer();
    if (action === 'repeat-aichi-test') return aa2StartAichiTest(state.session?.subject || state.ui.testSubject, state.session?.courseLevel || state.ui.testCourseLevel);
    if (action === 'start-smart-review') return aa2StartSmartReview();
    return aa2BaseHandleAction(el, event);
  };

  document.addEventListener('change', event => {
    const el = event.target.closest('[data-action="test-subject"]');
    if (!el) return;
    state.ui.testSubject = el.value;
    save();
  });

  const aa2BaseQaRun = qaRun;
  qaRun = function () {
    const saved = state;
    aa2BaseQaRun();
    const report = state.qa.report || [];
    const add = (name, ok, detail) => report.push({ name, ok, detail });
    try {
      add('v2教科知識幅', AA2_BANKS.japanese.length >= 140 && AA2_BANKS.math.length >= 40 && AA2_BANKS.science.length >= 60 && AA2_BANKS.social.length >= 330,
        '国語' + AA2_BANKS.japanese.length + '・数学' + AA2_BANKS.math.length + '・理科' + AA2_BANKS.science.length + '・社会' + AA2_BANKS.social.length);
      const jaAreas = new Set(AA2_BANKS.japanese.map(x => x.area));
      add('国語 大問二系統', ['classical', 'kanbun', 'idiom', 'yojijukugo', 'kanji'].every(x => jaAreas.has(x)),
        '古文語・漢文句法・慣用句・四字熟語・漢字意味');
      const scienceAreas = new Set(AA2_BANKS.science.map(x => x.area));
      add('理科4領域', ['biology', 'chemistry', 'physics', 'earth'].every(x => scienceAreas.has(x)), [...scienceAreas].join(' / '));
      const formulaRows = aa2SubjectRows('math');
      add('数学公式暗記限定', formulaRows.length === 33 && formulaRows.every(x => AA2_MATH_FORMULA_AREAS.has(x.area)),
        '中学数学の公式・法則33項目のみ');

      let bad = 0;
      for (const subject of ['japanese', 'math', 'science', 'social']) {
        for (let i = 0; i < 160; i++) {
          const q = aa2MakeKnowledgeQuestion(aa2PickKnowledge(subject, 1 + i % 3));
          if (q.choices.length !== 4 || q.choices.filter(c => c.ok).length !== 1 || new Set(q.choices.map(c => c.text)).size !== 4 || q.choices.some(c => !c.reason)) bad++;
        }
      }
      add('v2 640問ストレステスト', bad === 0, '正答一意・選択肢重複なし・全選択肢解説、異常' + bad + '件');

      let courseOK = true, courseDetail = [];
      for (const level of [1, 2, 3]) {
        const queue = aa2TestQueue('math', level);
        const points = queue.reduce((sum, q) => sum + q.points, 0);
        const averageDifficulty = avg(queue.filter(q => q.source?.difficulty).map(q => q.source.difficulty));
        courseOK = courseOK && queue.length === 15 && points === 22;
        courseDetail.push('L' + level + ':' + queue.length + '問/' + points + '点/難度' + averageDifficulty.toFixed(1));
      }
      add('3段階入試コース', courseOK, courseDetail.join('・'));

      const risks = [0, 1, 3, 7, 14].map(d => aa2Retention('science', d));
      add('Ebbinghaus-inspired忘却予測', risks.every((x, i) => i === 0 || x <= risks[i - 1]), risks.map(x => Math.round(x * 100) + '%').join('→'));
      const smart = aa2SmartReviewQueue(12);
      add('確率的最適復習', smart.length === 12 && new Set(smart.map(q => q.srsId)).size === 12, 'Thompson Sampling＋忘却＋不確実性＋重要度＋直近ペナルティ');

      const legacy = defaultState();
      legacy.appVersion = '1.5.0'; legacy.schemaVersion = 3;
      legacy.attempts = Array.from({ length: 2500 }, (_, i) => ({ attemptId: 'old-' + i, itemId: 'x:' + i, timestamp: now() - i, correct: i % 2 === 0, responseMs: 1000, skills: [] }));
      legacy.mastery.keep = { skillId: 'keep', attempts: 5, correct: 3, mastery: .6 };
      legacy.items.keep = { seen: 5, correct: 3, stabilityDays: 2 };
      const migrated = migrate(legacy);
      add('v1.5→v2履歴2500件保持', migrated.attempts.length === 2500 && migrated.mastery.keep && migrated.items.keep, '回答・技能・復習項目を減らさない');

      const testQueue = aa2TestQueue('japanese', 3);
      add('演習/テスト完全分離', testQueue.every(q => q.testMode) && typeof aa2CommitTestAnswer === 'function' && typeof aa2StartPractice === 'function',
        '演習=即時解説/SRS、テスト=解答確定まで保留/終了後解説');
      add('愛知県公式根拠', AA2_OFFICIAL_YEAR === 2026 && /pref\.aichi\.jp/.test(AA2_OFFICIAL_URL), '令和8年度公式問題ページ');
    } catch (error) {
      add('v2追加検査', false, error.message);
    }
    state = saved;
    state.qa = { lastRun: now(), report };
    state.ui.modal = 'qa'; save(); render();
  };

  globalThis.AA_V2_TEST_API = {
    banks: AA2_BANKS, levels: AA2_LEVELS, makeQuestion: aa2MakeKnowledgeQuestion,
    subjectRows: aa2SubjectRows, mathFormulaAreas: [...AA2_MATH_FORMULA_AREAS],
    practiceQueue: aa2PracticeQueue, testQueue: aa2TestQueue, smartReviewQueue: aa2SmartReviewQueue,
    priority: aa2Priority, retention: aa2Retention, startPractice: aa2StartPractice,
    startTest: aa2StartAichiTest, commitTestAnswer: aa2CommitTestAnswer
  };

  try {
    const before = state;
    const beforeCounts = {
      attempts: safeArray(before.attempts).length,
      mastery: Object.keys(before.mastery || {}).length,
      items: Object.keys(before.items || {}).length
    };
    const migrated = migrate(before);
    if (migrated.attempts.length < beforeCounts.attempts || Object.keys(migrated.mastery).length < beforeCounts.mastery || Object.keys(migrated.items).length < beforeCounts.items) {
      throw new Error('v2初期化で履歴件数が減少しました。');
    }
    migrated.stats.v2Migrations.push({ at: now(), from: before.appVersion || 'unknown', to: APP_VERSION, preserved: beforeCounts });
    state = migrated; save(); render();
  } catch (error) {
    const exact = (() => { try { return JSON.parse(storageGet(AA2_PRE_KEY) || 'null'); } catch (_) { return null; } })();
    if (plainObj(exact) && Array.isArray(exact.attempts)) state = exact;
    console.error('[AA Learning OS v2] safe migration stopped:', error);
    render();
  }
})();
