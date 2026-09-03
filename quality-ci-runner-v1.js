(() => {
  'use strict';
  if (window.__AA_QUALITY_CI_RUNNER_V1__) return;
  window.__AA_QUALITY_CI_RUNNER_V1__ = true;
  const params = new URLSearchParams(location.search);
  async function audit() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({name, ok: !!ok, detail});
    const riseRoot = document.documentElement;
    const riseBrand = document.querySelector('#app .brand h1')?.textContent?.trim();
    const riseHome = document.querySelector('#app main .riseHomeV4');
    add('Rise UI v4・表示レイヤー', riseRoot.dataset.riseSkin === 'v4' && riseRoot.dataset.riseUi === '4' && riseBrand === 'Rise' && !!riseHome, `skin=${riseRoot.dataset.riseSkin || '-'} / ui=${riseRoot.dataset.riseUi || '-'} / brand=${riseBrand || '-'} / home=${riseHome ? 'yes' : 'no'}`);
    let clozeBad = 0;
    for (const v of DATA.vocab) {
      const q = makeVocabQ(v, 'cloze');
      if (!q.stem.includes('_____') || clozeLeaksAnswer(q.stem, v.word) || q.choices[q.answerIndex]?.text !== v.word || new Set(q.choices.map(c => c.text)).size !== 4) clozeBad++;
    }
    add('英単語穴埋め・答え露出防止', clozeBad === 0, `${DATA.vocab.length}語 / 異常${clozeBad}`);
    const queue = planVocabQueue(8);
    add('段階学習プラン', queue.length === 8 && queue.filter(q => q.srsId?.startsWith('phrase:')).length === 2 && new Set(queue.map(q => q.id)).size === 8, '8問・熟語2問・問題ID重複なし');
    const mathSets = [1401,2202,3503,4804].map(seed => window.AAMathEngine.buildSet(seed, 2));
    const math = mathSets.flat();
    const mathFormulaPracticePreserved = window.AA_QUALITY_REPAIR_FINAL?.math?.ok === true;
    const normalMath = Array.from({length: 44}, (_,i) => makeMathQ(9, 910000 + i));
    const mathFull = window.AAMathFullReplacement;
    add('愛知県型数学・応用検算', mathFormulaPracticePreserved && mathFull?.ok === true && document.documentElement.dataset.aaMathFullReplacement === 'PASS' && math.length === 76 && mathSets.every(qs => qs.length === 19 && qs.reduce((n,q)=>n+q.points,0) === 22) && math.every(q => q.choices.length === 4 && q.choices.filter(c => c.ok).length === 1 && q.source.curriculum === 'junior-high') && normalMath.every(q => q.source?.route === 'full-replacement' && q.source?.origin === 'verified-math-template' && q.choices.length === 4 && q.choices.filter(c=>c.ok).length === 1) && normalMath.some(q => q.mathFigure) && math.some(q => q.thinking === 'certainty') && math.some(q => q.thinking === 'reflection_area_bisection') && math.some(q => q.thinking === 'piecewise_intersections'), '通常演習も検証済みエンジンへ完全置換／既存FINAL品質ゲート保持／4セット・76問／通常44問／図・応用思考を検査');
    const vocabAudit = window.AA_ENGLISH_EXAMPLE_AUDIT || {};
    const advise = DATA.vocab.find(v => v.word.toLowerCase() === 'advise');
    const lookAfter = DATA.vocab.find(v => v.word.toLowerCase() === 'look after');
    add('英単語例文・全件品質ゲート', vocabAudit.placeholdersAfter === 0 && vocabAudit.uncoveredCount === 0 && /advis/i.test(advise?.example || '') && /look.+after/i.test(lookAfter?.example || ''), `例文未整備${vocabAudit.uncoveredCount} ${(vocabAudit.uncovered || []).map(x => x.word).join(', ')}`);
    add('非API長文の出題廃止', window.AA_API_READING_ONLY && DATA.readingScenarios.length === 0, '従来素材の出題バンクは空');
    const catalog = await window.AAReadingLibrary.load(true);
    const request = window.AA_AI_READING_TEST_API__.buildRequest('scaffold');
    const compatible = window.AAReadingLibrary.rank(catalog.entries, request);
    add('Gemini教材一覧・文法ゲート', catalog.entries.length > 0 && compatible.length > 0 && compatible.every(e => e.requiredGrammar.every(g => request.allowedGrammar.includes(g))), `全${catalog.entries.length}本 / 現在の範囲${compatible.length}本`);
    for (const entry of compatible.slice(0, 4)) {
      const payload = await window.AAReadingLibrary.fetchEntry(entry);
      const read = window.AA_AI_READING_TEST_API__.normalizeReading(payload, 'scaffold');
      const exam = window.AA_AI_READING_TEST_API__.normalizeReading(payload, 'exam');
      add('Gemini長文・根拠・実戦モード', read.aiGenerated && read.questions.length === 5 && !grammarLeakAudit(read.passage).length && read.questions.every(q => q.choices.filter(c => c.ok).length === 1 && read.passage.includes(q.evidenceQuote)) && exam.assistMode === 'exam' && exam.lexicalTarget === null && read.lexicalTarget > 0, `${entry.title} / Level ${entry.difficulty}`);
    }
    const html = subjectsHTML();
    add('長文表示・開始経路', html.includes('data-aa-reading-library="2"') && html.includes('data-action="ai-reading-scaffold"') && !html.includes('data-action="start-reading-simulator"') && !html.includes('data-action="start-graph-reading"'), 'サポート付き・実戦・教材数・単語復習リンク');
    // Work on a temporary state: a self-check must not change the learner's records.
    const original = state;
    try {
      state = JSON.parse(JSON.stringify(original));
      const v = DATA.vocab.find(x => x.word.toLowerCase() === 'evidence') || DATA.vocab[0];
      const info = glossLookup(v.word), key = 'v:' + v.id;
      state.items[key] = {...itemState(key), seen: 10, correct: 1, lapses: 9, lastReviewAt: Date.now()};
      delete state.profile.knownWords[info.lemma];
      const low = lexicalKnowledgeProbability(info);
      state.items[key] = {...state.items[key], correct: 10, lapses: 0};
      const high = lexicalKnowledgeProbability(info);
      state.profile.aiReadingGlossary = {...state.profile.aiReadingGlossary, testlexeme: {word: 'testlexeme', meaning: '検査用語', example: 'This is a testlexeme.'}};
      add('長文と単語の学習記録連携', high > low && customVocab().some(x => x.word === 'testlexeme' && x.srsId === 'g:testlexeme'), '単語正答率→既知語率 / 長文語彙→単語一覧');
    } finally { state = original; }
    return {pass: checks.every(x => x.ok), checks, failed: checks.filter(x => !x.ok)};
  }
  window.AA_READING_QUALITY_AUDIT = audit;
  if (typeof qaRun === 'function') qaRun = async function () {
    try { const result = await audit(); state.qa = {lastRun: now(), report: result.checks}; state.ui.modal = 'qa'; save(); render(); }
    catch (error) { window.alert('品質検査を完了できませんでした：' + error.message); }
  };
  if(params.get('aa_quality_ci')!=='1')return;
  function finish(result) {
    window.__AA_QUALITY_CI_RESULT__ = result;
    document.documentElement.dataset.aaQualityCi=result.pass?'PASS':'FAIL';
    const pre = document.createElement('pre'); pre.id = 'aa-ci-quality-result';
    pre.textContent = 'AA_QUALITY_CI=' + JSON.stringify(result); document.body.appendChild(pre);
  }
  audit().then(finish).catch(error => finish({pass: false, error: String(error.stack || error)}));
})();
