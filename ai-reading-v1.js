(() => {
  'use strict';

  if (window.__AA_AI_READING_V1__) return;

  const VERSION = '2.0.0';
  const CONFIG_KEY = 'aa_ai_reading_config_v1';
  const DEFAULT_ENDPOINT = 'https://asahigaoka-aa-ai-reading.shingo-20110505.workers.dev';
  const ENDPOINT_PATH = '/v1/reading';
  const STATUS_PATH = '/v1/status';
  const REQUEST_TIMEOUT_MS = 180000;
  const SKILL_BY_TYPE = Object.freeze({
    detail: 'en.read.detail',
    cause: 'en.read.cause',
    inference: 'en.read.inference',
    paraphrase: 'en.read.paraphrase',
    mainIdea: 'en.read.mainIdea',
    title: 'en.read.mainIdea',
    referent: 'en.read.detail',
    paragraphRole: 'en.read.mainIdea',
    sentenceInsertion: 'en.read.inference',
    summary: 'en.read.mainIdea'
  });

  let busy = false;
  let connectionStatus = { state: 'idle', message: '' };

  function readConfig() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      return {
        endpoint: normalizeEndpoint(raw.endpoint) || DEFAULT_ENDPOINT,
        accessToken: typeof raw.accessToken === 'string' ? raw.accessToken : ''
      };
    } catch (_) {
      return { endpoint: DEFAULT_ENDPOINT, accessToken: '' };
    }
  }

  function normalizeEndpoint(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!text) return '';
    try {
      const url = new URL(text);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return '';
      if (url.username || url.password || url.search || url.hash) return '';
      return url.origin + url.pathname.replace(/\/+$/, '');
    } catch (_) {
      return '';
    }
  }

  function writeConfig(config) {
    const serialized = JSON.stringify({
      endpoint: normalizeEndpoint(config.endpoint),
      accessToken: String(config.accessToken || '')
    });
    try {
      localStorage.setItem(CONFIG_KEY, serialized);
      if (localStorage.getItem(CONFIG_KEY) !== serialized) throw new Error('Storage verification failed');
    } catch (_) {
      throw appError('storage_unavailable', 'このブラウザに接続設定を保存できませんでした。ブラウザの保存制限や端末の空き容量を確認してください。');
    }
  }

  function isConfigured() {
    const config = readConfig();
    return Boolean(config.endpoint && config.accessToken.length >= 24);
  }

  function configModal() {
    document.getElementById('aaAiReadingConfig')?.remove();
    const current = readConfig();
    const host = document.createElement('div');
    host.id = 'aaAiReadingConfig';
    host.className = 'aaAiReadingConfig';
    host.innerHTML = `<div class="aaAiReadingConfigCard" role="dialog" aria-modal="true" aria-labelledby="aaAiReadingConfigTitle"><div class="eyebrow">AI CONNECTION</div><h3 class="h3" id="aaAiReadingConfigTitle">AI接続設定</h3><p class="sub">GitHubに登録した <b>AI_ACCESS_TOKEN</b> と同じ文字列を入力します。Gemini APIキーではありません。</p><label class="field"><span>接続用トークン（24文字以上）</span><div class="aaAiTokenRow"><input type="password" data-ai-token-input autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${current.accessToken ? '変更しない場合は空欄のまま' : 'AI_ACCESS_TOKENを入力'}"><button class="btn ghost" type="button" data-action="ai-reading-token-toggle">表示</button></div></label><div class="notice"><b>毎日の音声と別保存：</b>この操作で音声・画像・連続記録は変更しません。</div><div class="actions"><button class="btn primary" type="button" data-action="ai-reading-config-save">保存して接続確認</button><button class="btn ghost" type="button" data-action="ai-reading-config-close">閉じる</button></div><div class="aaAiConfigStatus" data-ai-config-status role="status" aria-live="polite">${current.accessToken ? '現在の設定があります。空欄のまま保存すると、現在のトークンで接続確認します。' : 'まだ保存していません。'}</div></div>`;
    document.body.appendChild(host);
    const input = host.querySelector('[data-ai-token-input]');
    input?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      void saveConfigFromModal();
    });
    setTimeout(() => input?.focus(), 50);
  }

  function closeConfigModal() {
    document.getElementById('aaAiReadingConfig')?.remove();
  }

  async function saveConfigFromModal() {
    const host = document.getElementById('aaAiReadingConfig');
    const input = host?.querySelector('[data-ai-token-input]');
    const status = host?.querySelector('[data-ai-config-status]');
    const saveButton = host?.querySelector('[data-action="ai-reading-config-save"]');
    if (!host || !input || !status || !saveButton || saveButton.disabled) return false;
    const current = readConfig();
    const endpoint = current.endpoint || DEFAULT_ENDPOINT;
    const accessToken = input.value.trim() || current.accessToken;
    if (accessToken.length < 24 || /\s/.test(accessToken)) {
      status.textContent = '入力エラー：空白を含まない24文字以上の接続用トークンを入力してください。';
      status.dataset.state = 'error';
      input.focus();
      return false;
    }
    saveButton.disabled = true;
    input.disabled = true;
    let saved = false;
    let ok = false;
    try {
      status.textContent = '接続設定を保存中…';
      status.dataset.state = 'checking';
      writeConfig({ endpoint, accessToken });
      saved = true;
      input.value = '';
      input.type = 'password';
      input.placeholder = '保存済み。再確認は空欄のままでOK';
      const toggle = host.querySelector('[data-action="ai-reading-token-toggle"]');
      if (toggle) toggle.textContent = '表示';
      status.textContent = '端末に保存しました。AIサーバーへの接続を確認中…';
      connectionStatus = { state: 'checking', message: '保存済み・接続確認中' };
      render();
      ok = await verifyConnection({ configuredNow: true, notify: false });
      status.textContent = ok
        ? `接続成功：${connectionStatus.message}。この画面を閉じて「AI個別最適長文」を押してください。`
        : `設定は保存済みです。${connectionStatus.message}\n${connectionDiagnostics()}`;
      status.dataset.state = ok ? 'ready' : 'error';
      return ok;
    } catch (error) {
      connectionStatus = { state: 'error', code: error.code || 'client_error', message: friendlyError(error) };
      status.textContent = `${saved ? '設定は保存済みです。' : ''}${connectionStatus.message}\n${connectionDiagnostics()}`;
      status.dataset.state = 'error';
      return false;
    } finally {
      saveButton.disabled = false;
      input.disabled = false;
      saveButton.textContent = ok ? 'もう一度接続確認' : saved ? '保存済みの設定で再確認' : '保存して接続確認';
    }
  }

  function clearConfig() {
    if (!window.confirm('AI接続設定をこの端末から削除しますか？\n学習履歴は削除されません。')) return;
    localStorage.removeItem(CONFIG_KEY);
    connectionStatus = { state: 'idle', message: '' };
    render();
  }

  function allowedGrammarTags() {
    return Object.entries(state.profile?.grammarGate || {})
      .filter(([, enabled]) => enabled !== false)
      .map(([tag]) => tag)
      .slice(0, 24);
  }

  function weakReadingSkills() {
    return weakSkills(24)
      .filter(item => item.id.startsWith('en.read.') || item.id.startsWith('en.grammar.'))
      .slice(0, 8)
      .map(item => ({ id: item.id, label: String(item.label || item.id).slice(0, 60) }));
  }

  function weakWords() {
    const unknown = Object.entries(state.profile?.unknownWords || {})
      .map(([word]) => {
        const lookup = glossLookup(word);
        return {
          word: String(word).toLowerCase().replace(/[^a-z'-]/g, '').slice(0, 40),
          meaningJa: String(lookup?.meaning || '').slice(0, 80)
        };
      })
      .filter(item => item.word && item.meaningJa)
      .slice(0, 18);
    const seen = new Set(unknown.map(x => x.word));
    // The vocabulary catalogue and reading share the same SRS records.
    for (const v of vocabPool()) {
      const item = state.items?.[v.srsId || ('v:' + v.id)];
      if (!seen.has(v.word.toLowerCase()) && item?.seen && ((item.correct || 0) / item.seen < .7 || item.lapses > 0)) {
        unknown.push({word: v.word.toLowerCase(), meaningJa: v.meaning});
        seen.add(v.word.toLowerCase());
      }
      if (unknown.length >= 18) break;
    }
    return unknown.slice(0, 18);
  }

  function knownWords() {
    return Object.keys(state.profile?.knownWords || {})
      .map(word => String(word).toLowerCase().replace(/[^a-z'-]/g, '').slice(0, 40))
      .filter(Boolean)
      .slice(-100);
  }

  function recentTopics() {
    const topics = [];
    for (const record of safeArray(state.historyFingerprints).slice(-30).reverse()) {
      const scenarioId = String(record?.id || '').split(':')[1];
      const scenario = DATA.readingScenarios?.find(item => item.id === scenarioId);
      const topic = String(scenario?.theme || scenario?.title || '').trim();
      if (topic && !topics.includes(topic)) topics.push(topic.slice(0, 60));
      if (topics.length >= 8) break;
    }
    return topics;
  }

  function recentErrorTypes() {
    const values = [];
    for (const attempt of safeArray(state.attempts).slice(-80).reverse()) {
      if (attempt.correct || !String(attempt.itemId || '').startsWith('reading:')) continue;
      const error = String(attempt.errorType || '').replace(/[^a-zA-Z_-]/g, '').slice(0, 32);
      if (error && !values.includes(error)) values.push(error);
      if (values.length >= 6) break;
    }
    return values;
  }

  function buildRequest(assistMode) {
    return {
      schemaVersion: 1,
      difficulty: clamp(Math.round(Number(state.ui.subjectDifficulty) || 7), 1, 11),
      readingType: ['narrative', 'argument'].includes(state.ui.readingType) ? state.ui.readingType : 'mixed',
      assistMode: assistMode === 'exam' ? 'exam' : 'scaffold',
      allowedGrammar: allowedGrammarTags(),
      weakSkills: weakReadingSkills(),
      weakWords: weakWords(),
      knownWords: knownWords(),
      recentTopics: recentTopics(),
      recentErrorTypes: recentErrorTypes()
    };
  }

  async function post(path, body, timeoutMs = REQUEST_TIMEOUT_MS) {
    const config = readConfig();
    if (!config.endpoint || !config.accessToken) throw appError('not_configured', 'AI接続が未設定です。');
    if (navigator.onLine === false) throw appError('offline', '端末がオフラインです。インターネットに接続して再確認してください。');
    if (typeof fetch !== 'function' || typeof AbortController !== 'function') {
      throw appError('client_unsupported', 'このブラウザはAI接続に必要な通信機能に対応していません。ブラウザを更新するか、対応するブラウザで開いてください。');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(config.endpoint + path, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + config.accessToken
        },
        body: JSON.stringify(body || {}),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      let payload = null;
      try { payload = await response.json(); } catch (_) { /* handled below */ }
      if (!response.ok) {
        const code = String(payload?.error?.code || (path === STATUS_PATH && payload?.ready === false ? 'worker_not_ready' : 'request_failed'));
        const error = appError(code, String(payload?.error?.message || `AIサーバーがエラーを返しました（HTTP ${response.status}）。`));
        error.httpStatus = response.status;
        throw error;
      }
      if (!payload || typeof payload !== 'object') throw appError('invalid_response', 'AIサーバーから正常な応答を受け取れませんでした。');
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') throw appError(path === STATUS_PATH ? 'connection_timeout' : 'timeout', path === STATUS_PATH ? 'AIサーバーの接続確認が15秒で時間切れになりました。' : '生成が3分以内に完了しませんでした。');
      if (typeof error?.code === 'string') throw error;
      throw appError(navigator.onLine === false ? 'offline' : 'network_error', 'AIサーバーへ通信できませんでした。');
    } finally {
      clearTimeout(timer);
    }
  }

  function appError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function addGlossary(items) {
    for (const item of safeArray(items)) {
      const word = String(item?.word || '').toLowerCase().trim();
      const meaning = String(item?.meaningJa || '').trim();
      if (/^[a-z]+(?:[-'][a-z]+)*$/.test(word) && meaning) READING_GLOSSARY[word] = meaning.slice(0, 100);
    }
  }

  function normalizeQuestion(question, index, passage, readingId, topic) {
    const type = String(question.type || 'inference');
    const originalAnswerIndex = Number(question.answerIndex);
    const evidenceQuote = String(question.evidenceQuote || '').trim();
    const refs = typeof evidenceRefs === 'function' ? evidenceRefs(passage, evidenceQuote ? [evidenceQuote] : []) : [];
    const choices = shuffle(safeArray(question.choices).map((choice, choiceIndex) => ({
      text: String(choice.text || '').trim(),
      ok: choiceIndex === originalAnswerIndex,
      reason: String(choice.reasonJa || '').trim(),
      error: choiceIndex === originalAnswerIndex ? null : 'ai_distractor',
      distractorType: choiceIndex === originalAnswerIndex ? null : 'ai_distractor'
    })));
    const answerIndex = choices.findIndex(choice => choice.ok);
    return prepareQuestionReview({
      id: `${readingId}:q${index}`,
      type,
      subject: 'english',
      stem: String(question.stemJa || '').trim(),
      choices,
      answerIndex,
      explanation: String(question.explanationJa || choices[answerIndex]?.reason || '').trim(),
      skills: [{ id: SKILL_BY_TYPE[type] || 'en.read.inference', role: 'primary' }],
      expectedMs: type === 'inference' || type === 'sentenceInsertion' ? 75000 : 55000,
      context: topic,
      evidenceRefs: refs,
      evidence: refs.length ? refs.map(ref => `第${ref.paragraph}段落${ref.sentence}文目`).join('・') : evidenceQuote,
      evidenceQuote,
      aiVerified: true
    });
  }

  function normalizeReading(payload, assistMode) {
    if (payload?.schemaVersion !== 1 || payload?.quality?.verified !== true) {
      throw appError('invalid_response', '二重検査済みの長文を受け取れませんでした。');
    }
    const source = payload.reading || {};
    const passage = String(source.passage || '').trim();
    addGlossary(source.glossary);
    const leaks = grammarLeakAudit(passage);
    if (leaks.length) throw appError('grammar_rejected', `未履修文法が検出されました（${leaks.join(', ')}）。`);
    const wordCount = (passage.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;
    if (!passage || wordCount < 180 || safeArray(source.questions).length !== 5) {
      throw appError('invalid_response', '長文の構造検査に失敗しました。');
    }
    const id = `reading:ai:${hash(passage + JSON.stringify(source.questions))}`;
    const topic = String(source.topic || 'AI adaptive reading').slice(0, 80);
    const questions = source.questions.map((question, index) => normalizeQuestion(question, index, passage, id, topic));
    for (const question of questions) {
      if (question.choices.length !== 4 || !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
        throw appError('invalid_response', '選択肢の構造検査に失敗しました。');
      }
      if (!question.evidenceQuote || !passage.includes(question.evidenceQuote)) {
        throw appError('invalid_response', '本文と設問根拠の照合に失敗しました。');
      }
    }
    const difficulty = clamp(Math.round(Number(source.difficulty) || Number(state.ui.subjectDifficulty) || 7), 1, 11);
    const lexicalProfile = lexicalCoverageProfile(passage);
    const lexicalTargetValue = assistMode === 'exam' ? null : lexicalTarget('standard', 'scaffold');
    const preteach = assistMode === 'exam'
      ? { words: [], assistedCoverage: lexicalProfile.coverage }
      : preteachPlan(lexicalProfile, lexicalTargetValue, 14);
    return {
      id,
      type: 'readingSet',
      scenarioId: 'ai',
      title: String(source.title || 'AI Adaptive Reading').trim(),
      passage,
      translationJa: String(source.translationJa || '').trim(),
      dna: { provider: 'gemini', topic, readingType: source.readingType, difficulty, variant: hash(id).slice(0, 6) },
      questions,
      skills: [{ id: 'en.read.inference', role: 'primary' }, { id: 'en.read.paraphrase', role: 'secondary' }],
      expectedMs: 7 * 60000,
      context: topic,
      wordCount,
      difficulty,
      requestedDifficulty: difficulty,
      difficultyLabel: typeof readingDifficultyLabel === 'function' ? readingDifficultyLabel(difficulty) : `Level ${difficulty}`,
      readingMode: 'standard',
      readingType: String(source.readingType || 'mixed'),
      readingTypeLabel: source.readingType === 'narrative' ? '物語文' : source.readingType === 'argument' ? '筆者の主張' : '自動',
      grammarTags: safeArray(source.grammarTags).filter(tag => allowedGrammarTags().includes(tag)),
      lesson: String(source.lessonJa || '本文の根拠から最も妥当な結論を選びます。').trim(),
      firstReadDone: false,
      firstReadMs: null,
      wpm: null,
      paceScored: false,
      assistMode,
      lexicalProfile,
      lexicalTarget: lexicalTargetValue,
      preteachPlan: preteach,
      lexicalScaffold: preteach.words.length > 0,
      aiGenerated: true,
      aiProvider: 'Gemini',
      aiSchemaVersion: 1,
      aiGlossary: safeArray(source.glossary),
      aiQuality: payload.quality
    };
  }

  function startReadingSession(read, assistMode) {
    rememberReadingWords(read);
    if (read.aiLibraryId) {
      state.profile.aiReadingSeen = {...(state.profile.aiReadingSeen || {}), [read.aiLibraryId]: now()};
    }
    registerReading(read);
    const stamp = now();
    state.session = {
      id: uid('session'),
      active: true,
      mode: 'standard',
      kind: 'reading',
      subject: 'english',
      queue: [read],
      index: 0,
      subIndex: 0,
      answers: {},
      feedback: null,
      startedAt: stamp,
      accumulatedMs: 0,
      lastActiveAt: stamp,
      itemStartedAt: stamp,
      scrollY: 0,
      minimumDone: false,
      clockPaused: false,
      pausedAt: null,
      aiGenerated: true,
      readingAssist: assistMode
    };
    state.stats.sessions++;
    state.route = 'study';
    save();
    render();
    window.scrollTo(0, 0);
    startTicker();
  }

  function showBusy(message, detail = '本文作成後、別のAI判定で全5問を解き直しています。画面を閉じないでください。') {
    let overlay = document.getElementById('aaAiReadingBusy');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'aaAiReadingBusy';
      overlay.className = 'aaAiReadingBusy';
      overlay.innerHTML = '<div class="aaAiReadingBusyCard"><div class="aaAiReadingSpinner" aria-hidden="true"></div><div class="strong" data-ai-busy-message></div><div class="tiny" data-ai-busy-detail></div></div>';
      document.body.appendChild(overlay);
    }
    const label = overlay.querySelector('[data-ai-busy-message]');
    if (label) label.textContent = message;
    const description = overlay.querySelector('[data-ai-busy-detail]');
    if (description) description.textContent = detail;
    overlay.hidden = false;
  }

  function hideBusy() {
    const overlay = document.getElementById('aaAiReadingBusy');
    if (overlay) overlay.hidden = true;
  }

  function rememberReadingWords(read) {
    const dictionary = state.profile.aiReadingGlossary || (state.profile.aiReadingGlossary = {});
    for (const item of read.aiGlossary || []) {
      const word = String(item.word || '').toLowerCase();
      if (!/^[a-z]+(?:[-'][a-z]+)*$/.test(word) || !item.meaningJa) continue;
      dictionary[word] = {word, meaning: item.meaningJa, example: sentenceForWord(read.passage, word), sourceReading: read.title};
    }
  }

  function vocabularyScore(entry) {
    const words = safeArray(entry.words);
    if (!words.length) return 0;
    const probabilities = words.map(word => lexicalKnowledgeProbability(glossLookup(word)));
    const coverage = probabilities.reduce((sum, p) => sum + p, 0) / words.length;
    const weak = new Set(weakWords().map(w => w.word));
    return -Math.abs(.8 - coverage) * 20 + words.filter(word => weak.has(word)).length * 3;
  }

  async function startPrepared(assistMode = 'scaffold') {
    if (busy) return;
    if (state.session?.active && !window.confirm('進行中のセットを終了して、新しい長文を始めますか？')) return;
    busy = true;
    showBusy('あなたに合う長文を選んでいます…', '文法範囲・単語の復習記録・読解の弱点に合わせて、検査済み教材から選びます。');
    try {
      if (!window.AAReadingLibrary) throw new Error('教材機能を読み込めませんでした。ページを再読み込みしてください。');
      const request = buildRequest(assistMode);
      const {entry, payload} = await window.AAReadingLibrary.select(request, state.profile.aiReadingSeen || {}, vocabularyScore);
      const read = normalizeReading(payload, assistMode);
      read.aiLibraryId = entry.id;
      read.requestedDifficulty = request.difficulty;
      read.sourceGenre = entry.readingType === 'argument' ? 'expository' : 'narrative';
      startReadingSession(read, assistMode);
    } catch (error) { window.alert(error.message || '教材を開始できませんでした。'); }
    finally { busy = false; hideBusy(); }
  }

  let libraryMessage = '';
  async function refreshLibrary() {
    try { await window.AAReadingLibrary.load(true); libraryMessage = ''; }
    catch (_) { libraryMessage = '教材数を取得できませんでした。通信を確認して、更新してください。'; }
    if (state.route === 'subjects' || state.route === 'settings') render();
  }

  function libraryCard() {
    const snapshot = window.AAReadingLibrary?.snapshot() || {};
    const total = snapshot.loaded ? Number(snapshot.total).toLocaleString() : '—';
    const questionCount = snapshot.loaded ? Number(snapshot.questions).toLocaleString() : '—';
    const date = snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '最初の教材を準備中';
    const run = snapshot.status || {};
    const refill = run.state === 'quota' ? '利用上限のため補充待ち' : run.state === 'retry_later' ? '品質検査・再試行待ち' : '毎朝6時17分ごろに自動補充';
    return `<section class="card aaReadingLibrary" data-aa-reading-library="2"><div class="aaReadingTop"><div><div class="eyebrow">GEMINI READING</div><h2 class="h2">あなたの単語力から、次の長文へ。</h2></div><span class="aaReadingPill">API生成・正答検査済み</span></div><p class="sub">習った文法の範囲で、単語の復習記録と読解の弱点に合う長文を選びます。</p><div class="aaReadingMetrics"><div><strong>${total}</strong><span>長文</span></div><div><strong>${questionCount}</strong><span>設問</span></div><div><strong>最大10<span>本 / 日</span></strong><span>自動補充</span></div></div><div class="aaReadingModes"><button class="btn primary" data-action="ai-reading-scaffold"><b>サポート付きで読む</b><span>単語の意味を確認しながら · 5問</span></button><button class="btn soft" data-action="ai-reading-exam"><b>実戦で解く</b><span>辞書を使わず力を試す · 5問</span></button></div><div class="aaReadingFoot"><span>${esc(libraryMessage || refill)}<br>教材更新：${esc(date)}</span><button class="btn ghost" data-action="ai-reading-refresh">更新</button></div><a class="aaReadingVocabLink" href="./vocab.html">単語を復習する →</a><p class="tiny">長文で「知らなかった」にした語は単語学習へ。単語の正答記録は、次の長文と語彙サポートに反映します。生成数はAPIの利用上限と検査結果により変わります。</p></section>`;
  }

  function friendlyError(error) {
    const messages = {
      quota_exceeded: 'Gemini無料枠の上限に達しました。時間を置くと再開できます。',
      quality_rejected: '正答の二重検査を通過できなかったため、この問題は出題しませんでした。',
      unauthorized: 'AIサーバーが認証を拒否しました。サーバー側の接続設定との照合が必要です。',
      forbidden_origin: 'このページのURLからの接続がAIサーバーで許可されていません。',
      worker_not_ready: 'AIサーバー側の接続設定が完了していません。',
      timeout: 'AI生成が時間内に終わりませんでした。',
      connection_timeout: 'AIサーバーの接続確認が15秒で時間切れになりました。',
      offline: '端末がオフラインです。インターネットに接続して再確認してください。',
      network_error: 'ブラウザからAIサーバーへの通信が失敗しました。認証結果は取得できていません。'
    };
    return messages[error?.code] || error?.message || 'AI長文を生成できませんでした。';
  }

  async function probeConnection() {
    // No token, cookies, or learner data is sent by this reachability check.
    if (navigator.onLine === false || typeof fetch !== 'function' || typeof AbortController !== 'function') return 'unavailable';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(readConfig().endpoint + '/health', {
        method: 'GET', signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) return 'http_' + response.status;
      const result = await response.json();
      return result?.ok === true && result?.service === 'aa-ai-reading' ? 'reachable' : 'unexpected_response';
    } catch (_) {
      return 'unreachable';
    } finally {
      clearTimeout(timer);
    }
  }

  function connectionDiagnostics() {
    const details = [`接続診断 v${VERSION}`, `種類: ${connectionStatus.code || 'unknown'}`];
    if (connectionStatus.httpStatus) details.push(`HTTP: ${connectionStatus.httpStatus}`);
    details.push(`通信状態: ${navigator.onLine === false ? 'オフライン' : 'オンライン表示'}`);
    details.push(`ページ: ${location.origin}`, `接続先: ${readConfig().endpoint}`);
    if (connectionStatus.health) details.push(`疎通確認: ${connectionStatus.health}`);
    return details.join('\n');
  }

  async function generate(assistMode) {
    if (busy) return;
    if (state.session?.active && !window.confirm('進行中のセットを保存したまま、AI長文を新しく開始しますか？')) return;
    if (!isConfigured()) {
      configModal();
      return;
    }
    busy = true;
    showBusy('あなたの弱点に合わせてAI長文を生成中…');
    try {
      const payload = await post(ENDPOINT_PATH, buildRequest(assistMode));
      const read = normalizeReading(payload, assistMode);
      startReadingSession(read, assistMode);
    } catch (error) {
      window.alert(friendlyError(error));
    } finally {
      busy = false;
      hideBusy();
    }
  }

  async function verifyConnection({ configuredNow = false, notify = true } = {}) {
    showBusy(configuredNow ? '設定を保存して、AI接続を確認中…' : 'AIサーバーへの接続だけを確認中…', 'AIサーバーへの認証と準備状態を確認しています。長文は生成しません。');
    try {
      const result = await post(STATUS_PATH, {}, 15000);
      if (!result?.ready) throw appError('worker_not_ready', 'Workerには接続できましたが、Gemini設定が未完了です。');
      connectionStatus = { state: 'ready', message: `接続確認済み（${result.model || 'Gemini'}）` };
      render();
      document.dispatchEvent(new CustomEvent('aa:ai-reading-connection', {
        detail: { ready: true, model: String(result.model || 'Gemini') }
      }));
      if (notify) window.alert(`${configuredNow ? '接続設定を保存し、AIサーバーへの認証に成功しました。' : 'AIサーバーへの認証に成功しました。'}\n設定モデル: ${result.model || 'Gemini'}\n\n毎日の音声・画像・学習履歴の設定は変更していません。`);
      return true;
    } catch (error) {
      connectionStatus = { state: 'error', code: error.code || 'client_error', httpStatus: error.httpStatus, message: friendlyError(error) };
      if (['network_error', 'connection_timeout'].includes(error.code)) {
        connectionStatus.health = await probeConnection();
        connectionStatus.message += connectionStatus.health === 'reachable'
          ? ' 疎通確認ではサーバーに到達しました。認証を含む通信の制限や一時的な応答遅延が考えられます。'
          : ' 疎通確認も正常に完了しませんでした。フィルターのある端末では、管理者に接続先のブロック記録と個別の通信許可を確認してください。';
      }
      render();
      if (notify) window.alert(`${connectionStatus.message}\n\n${connectionDiagnostics()}`);
      return false;
    } finally {
      hideBusy();
    }
  }

  async function testConnection() {
    if (!isConfigured()) {
      configModal();
      return;
    }
    await verifyConnection();
  }

  function aiCard() {
    const configured = isConfigured();
    const config = readConfig();
    const status = connectionStatus.message || (configured ? '接続設定済み' : '未設定');
    return `<div class="sp12"></div>${libraryCard()}<details class="card aaReadingAdvanced" data-aa-ai-reading-card="${VERSION}"><summary>追加設定：その場で長文を生成</summary><p class="sub">個別生成を使う端末だけ、AI接続を設定します。</p><div class="actions"><button class="btn soft" data-action="ai-reading-config">${configured ? '接続設定を変更' : '接続を設定'}</button><button class="btn ghost" data-action="ai-reading-test" ${configured ? '' : 'disabled'}>接続テスト</button>${configured ? '<button class="btn soft" data-action="ai-reading-live-scaffold">今の弱点で生成</button><button class="btn ghost" data-action="ai-reading-clear">接続設定を削除</button>' : ''}</div><p class="tiny">${esc(status)}</p><p class="tiny">毎日の音声と互換：接続設定は専用領域に保存します。個別生成では、弱点語・読解技能・文法範囲をGeminiへ送信します。無料枠では送信内容がGoogleの製品改善に利用される場合があります。</p></details>`;
  }

  function installStyle() {
    if (document.getElementById('aaAiReadingStyle')) return;
    const style = document.createElement('style');
    style.id = 'aaAiReadingStyle';
    style.textContent = `
      .aaAiReadingBusy{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:22px;background:rgba(6,12,24,.72);backdrop-filter:blur(8px)}
      .aaAiReadingBusy[hidden]{display:none}
      .aaAiReadingBusyCard{width:min(420px,100%);padding:24px;border-radius:22px;background:var(--card,#fff);color:var(--text,#172033);box-shadow:0 24px 70px rgba(0,0,0,.34);text-align:center}
      .aaAiReadingSpinner{width:36px;height:36px;margin:0 auto 14px;border-radius:50%;border:4px solid rgba(73,118,255,.2);border-top-color:#4976ff;animation:aaAiSpin .85s linear infinite}
      .aaAiReadingBusyCard .tiny{margin-top:10px}
      .aiReadingBadge{display:inline-flex;align-items:center;gap:6px;margin:8px 0;padding:6px 10px;border-radius:999px;background:rgba(73,118,255,.12);color:#3152b7;font-size:12px;font-weight:800}
      .aaAiReadingConfig{position:fixed;inset:0;z-index:10002;display:grid;place-items:center;padding:18px;background:rgba(6,12,24,.78);backdrop-filter:blur(9px)}
      .aaAiReadingConfigCard{width:min(460px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:22px;border-radius:22px;background:var(--card,#fff);color:var(--text,#172033);box-shadow:0 24px 70px rgba(0,0,0,.38)}
      .aaAiReadingConfigCard .field{display:block;margin:16px 0}.aaAiReadingConfigCard .field>span{display:block;margin-bottom:7px;font-weight:800}
      .aaAiTokenRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.aaAiTokenRow input{min-width:0;min-height:48px;padding:10px 12px;border:1px solid var(--line,#d7ddea);border-radius:12px;font:inherit;background:var(--card,#fff);color:var(--text,#172033)}
      .aaAiConfigStatus{margin-top:12px;padding:11px 12px;border-radius:12px;background:rgba(73,118,255,.1);font-size:14px;font-weight:800;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere}.aaAiConfigStatus[data-state="ready"]{background:#eaf8f1;color:#16724a}.aaAiConfigStatus[data-state="error"]{background:#fff0ef;color:#b42318}
      .aaReadingLibrary{margin-top:16px;background:linear-gradient(145deg,var(--card,#fff),rgba(73,118,255,.07));overflow:hidden}
      .aaReadingTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.aaReadingTop .h2{margin:5px 0 10px;line-height:1.4;font-size:clamp(21px,3vw,28px)}
      .aaReadingPill{flex:none;display:inline-block;padding:7px 10px;border-radius:20px;background:rgba(39,139,98,.12);color:var(--text,#172033);font-size:11px;font-weight:700}
      .aaReadingMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:24px 0}.aaReadingMetrics>div{display:grid;gap:4px;border-left:2px solid rgba(73,118,255,.2);padding-left:14px}.aaReadingMetrics strong{font-size:28px;line-height:1.2;font-variant-numeric:tabular-nums}.aaReadingMetrics span{font-size:12px;color:var(--muted,#65718a);font-weight:500}.aaReadingMetrics strong span{margin-left:4px}
      .aaReadingModes{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aaReadingModes button{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0;min-height:84px;padding:16px;text-align:left;white-space:normal}.aaReadingModes b{font-size:16px}.aaReadingModes span{font-weight:400;font-size:12px;margin-top:6px;opacity:.85}
      .aaReadingFoot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 8px;font-size:12px;line-height:1.7;color:var(--muted,#65718a)}.aaReadingVocabLink{display:inline-block;margin:8px 0;color:var(--accent,#3152b7);font-weight:700}.aaReadingAdvanced{margin-top:16px}.aaReadingAdvanced summary{cursor:pointer;font-weight:700;padding:4px 0}.aaReadingAdvanced[open] summary{margin-bottom:16px}
      @media(max-width:560px){.aaReadingTop{display:block}.aaReadingPill{margin:3px 0 10px}.aaReadingModes{grid-template-columns:1fr}.aaReadingMetrics{gap:6px}.aaReadingMetrics strong{font-size:24px}.aaReadingMetrics>div{padding-left:9px}.aaReadingFoot{align-items:flex-start}}
      @keyframes aaAiSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){.aaAiReadingSpinner{animation:none}}
    `;
    document.head.appendChild(style);
  }

  const subjectsBeforeAi = subjectsHTML;
  subjectsHTML = function () {
    let html = subjectsBeforeAi();
    // Retired non-API reading routes are removed from the learner's screen.
    html = html.replace('<button class="btn soft" data-action="start-custom" data-kind="reading" data-subject="english">語彙支援長文</button>', '');
    html = html.replace('<button class="btn ghost" data-action="start-reading-exam">入試実戦長文（辞書OFF）</button>', '');
    html = html.replace(/<button[^>]*data-action="(?:start-reading-simulator|start-graph-reading)"[^>]*>[\s\S]*?<\/button>/g, '');
    html = html.replace(/語彙支援長文は、[\s\S]*?シミュレーターです。/, '単語の学習記録は長文の選択と語彙サポートに反映します。');
    const marker = '<section class="grid g2">';
    html = html.includes(marker) ? html.replace(marker, libraryCard() + '<div class="sp12"></div>' + marker) : html.replace('</main>', libraryCard() + '</main>');
    return html;
  };

  const settingsBeforeAi = settingsHTML;
  settingsHTML = function () {
    let html = settingsBeforeAi();
    if (html.includes('data-aa-ai-reading-card')) return html;
    const marker = '<div class="sp12"></div><section class="card"><h3 class="h3">品質検査ラボ</h3>';
    return html.includes(marker) ? html.replace(marker, aiCard() + marker) : html.replace('</main>', aiCard() + '</main>');
  };

  const studyBeforeAi = studyHTML;
  studyHTML = function () {
    let html = studyBeforeAi();
    const read = currentReading();
    if (!read?.aiGenerated) return html;
    const badge = '<div class="aiReadingBadge">Gemini生成・正答二重検査済み</div>';
    return html.replace(/(<h2 class="h2">[^<]*<\/h2>)/, '$1' + badge);
  };

  const translationBeforeAi = fullReadingTranslation;
  fullReadingTranslation = function (read) {
    if (read?.aiGenerated && read.translationJa) return read.translationJa;
    return translationBeforeAi(read);
  };

  document.addEventListener('click', event => {
    const element = event.target.closest('[data-action]');
    const action = element?.dataset?.action;
    if (['start-reading-simulator', 'start-graph-reading', 'start-reading-exam'].includes(action)) {
      event.preventDefault(); event.stopImmediatePropagation(); void startPrepared('exam'); return;
    }
    if (!action?.startsWith('ai-reading-')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === 'ai-reading-scaffold') void startPrepared('scaffold');
    else if (action === 'ai-reading-exam') void startPrepared('exam');
    else if (action === 'ai-reading-live-scaffold') void generate('scaffold');
    else if (action === 'ai-reading-refresh') void refreshLibrary();
    else if (action === 'ai-reading-config') configModal();
    else if (action === 'ai-reading-test') void testConnection();
    else if (action === 'ai-reading-clear') clearConfig();
    else if (action === 'ai-reading-config-save') void saveConfigFromModal();
    else if (action === 'ai-reading-config-close') closeConfigModal();
    else if (action === 'ai-reading-token-toggle') {
      const input = document.querySelector('[data-ai-token-input]');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        element.textContent = input.type === 'password' ? '表示' : '隠す';
      }
    }
  }, true);

  function installLibraryIntegration() {
    if (typeof state === 'undefined' || typeof DATA === 'undefined' || !window.AAReadingLibrary) return;
    window.AA_API_READING_ONLY = true;
    // Retire all assembled passage banks after the legacy modules finish initialising.
    DATA.readingScenarios.length = 0;
    const savedDictionary = state.profile.aiReadingGlossary || {};
    addGlossary(Object.values(savedDictionary).map(x => ({word: x.word, meaningJa: x.meaning})));
    const lookupBefore = glossLookup;
    glossLookup = function (raw) {
      const info = lookupBefore(raw);
      const exact = String(raw || '').toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g, '');
      const saved = state.profile.aiReadingGlossary?.[exact];
      if (!info.data && saved) return {...info, lemma: exact, meaning: saved.meaning, source: 'geminiReading'};
      return info;
    };
    const customBefore = customVocab;
    customVocab = function () {
      const byWord = new Map(customBefore().map(v => [v.word.toLowerCase(), v]));
      for (const x of Object.values(state.profile.aiReadingGlossary || {})) {
        if (!x.word || !x.meaning || byWord.has(x.word)) continue;
        byWord.set(x.word, {id: 'g_' + hash(x.word), word: x.word, meaning: x.meaning,
          pos: '', syn: '', example: x.example || '', cloze: '', level: 'reading',
          origin: 'geminiReading', srsId: 'g:' + x.word});
      }
      return [...byWord.values()];
    };
    const signalBefore = recordLexicalSignal;
    recordLexicalSignal = function (info, signal, read = null) {
      if (signal === 'incorrectRecall' && info?.lemma) delete state.profile.knownWords[info.lemma];
      return signalBefore(info, signal, read);
    };
    const registerBefore = registerReading;
    registerReading = function (read) {
      if (read?.aiGenerated) {
        rememberReadingWords(read);
        if (read.aiLibraryId) state.profile.aiReadingSeen = {...(state.profile.aiReadingSeen || {}), [read.aiLibraryId]: now()};
      }
      return registerBefore(read);
    };
    function cachedReading(diff, assist = 'scaffold', type = null) {
      const request = {...buildRequest(assist), difficulty: clamp(Number(diff) || 7, 1, 11)};
      if (type) request.readingType = type;
      const cached = window.AAReadingLibrary.cached();
      const ranked = window.AAReadingLibrary.rank(cached.map(x => x.entry), request, state.profile.aiReadingSeen || {}, vocabularyScore);
      if (!ranked.length) throw new Error('検査済みの長文を選ぶ画面から開始してください。');
      const selected = cached.find(x => x.entry.id === ranked[0].id);
      const read = normalizeReading(selected.payload, assist);
      read.aiLibraryId = selected.entry.id;
      read.sourceGenre = selected.entry.readingType === 'argument' ? 'expository' : 'narrative';
      read.dna.grammarComposition = read.grammarTags.join('+');
      return read;
    }
    generateReading = (diff = 7, _mode, type = null) => cachedReading(diff, 'scaffold', type);
    generateReadingForLearner = (diff = 7, _mode, assist = 'scaffold', type = null) => cachedReading(diff, assist, type);
    const startBefore = startSession;
    startSession = function (opts = {}) {
      if (opts.kind === 'reading') return startPrepared(opts.readingAssist || 'scaffold');
      return startBefore(opts);
    };
    const reviewBefore = startWrongReview;
    startWrongReview = async function () {
      const readingWrong = state.attempts.some(a => !a.correct && a.skills?.some(s => s.id?.startsWith('en.read.') || s.id?.startsWith('en.grammar.')));
      if (readingWrong) {
        try { await window.AAReadingLibrary.select(buildRequest('scaffold'), state.profile.aiReadingSeen || {}, vocabularyScore); }
        catch (error) { window.alert(error.message); return; }
      }
      return reviewBefore();
    };
    const actionBefore = handleAction;
    handleAction = function (element, event) {
      if (element?.dataset?.action === 'grammar') {
        state.profile.grammarGate[element.dataset.key] = element.checked; save(); return;
      }
      return actionBefore(element, event);
    };
    // Metadata only: no token, learner profile, or history leaves this device.
    void refreshLibrary();
  }

  installStyle();
  installLibraryIntegration();
  window.__AA_AI_READING_V1__ = Object.freeze({ version: VERSION, configured: isConfigured });
  window.AA_AI_READING_TEST_API__ = Object.freeze({
    buildRequest,
    normalizeEndpoint,
    normalizeReading,
    startPrepared,
    libraryCard,
    configKey: CONFIG_KEY
  });
  render();
})();
