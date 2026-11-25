// One global synthesizer can serve several cached views. Only its current owner
// may cancel playback; an inactive view's cleanup must not stop another view.
const owners = new WeakMap();
const CHUNK_LENGTH = 280;
const MAX_CHUNKS = 240;
const START_TIMEOUT = 6000;
const VOICES_TIMEOUT = 4000;

function chunksFor(texts, repeat) {
  const result = [];
  let length = 0;
  for (const value of Array.isArray(texts) ? texts : [texts]) {
    if (typeof value !== 'string') continue;
    let text = value.replace(/\s+/gu, ' ').trim();
    length += text.length;
    if (length > CHUNK_LENGTH * MAX_CHUNKS) return null;
    while (text) {
      let end = Math.min(text.length, CHUNK_LENGTH);
      if (text.length > CHUNK_LENGTH) {
        const head = text.slice(0, CHUNK_LENGTH + 1);
        const sentences = [...head.matchAll(/[.!?;:]["'”’)\]]*\s/gu)];
        const last = sentences.at(-1);
        const sentenceEnd = last ? last.index + last[0].trimEnd().length : 0;
        const space = head.lastIndexOf(' ', CHUNK_LENGTH);
        end = sentenceEnd >= CHUNK_LENGTH / 3 ? sentenceEnd : space > 0 ? space : CHUNK_LENGTH;
        // A very long unbroken token can require a hard split. Keep surrogate
        // pairs intact so a character is never corrupted at the boundary.
        if (/[\uD800-\uDBFF]/u.test(text[end - 1])) end--;
      }
      result.push(text.slice(0, end));
      if (result.length * repeat > MAX_CHUNKS) return null;
      text = text.slice(end).trimStart();
    }
  }
  // Repetition covers the whole supplied sequence, including all paragraphs.
  return Array.from({length: repeat}, () => result).flat();
}

const errorMessages = {
  unsupported: 'このブラウザは読み上げに対応していません。別のブラウザで開いてください。',
  'local-voice-unavailable': '端末内の英語音声が見つかりません。端末の音声設定で英語音声を用意してから、音声を再確認してください。',
  'voice-unavailable': '選択した端末内の英語音声が見つかりません。音声を再確認して選び直してください。',
  'not-allowed': '読み上げが許可されませんでした。画面の読み上げボタンをもう一度押してください。',
  'audio-busy': 'ほかの音声が端末を使用しています。再生が終わってから、もう一度押してください。',
  'audio-hardware': '端末の音声出力を利用できません。音量や出力先を確認して、もう一度押してください。',
  'language-unavailable': '端末で英語音声を利用できません。英語音声を用意して、音声を再確認してください。',
  'text-too-long': '一度に読み上げる量が多すぎます。段落や選択部分に分けて再生してください。',
  'empty-text': '読み上げる英語がありません。',
  'start-timeout': '読み上げが始まりませんでした。端末の英語音声・音量・出力先を確認して、もう一度押してください。',
  interrupted: '読み上げが中断されました。もう一度押すと最初から再生できます。',
  canceled: '読み上げが中断されました。もう一度押すと最初から再生できます。',
};

export function createSpeechController({
  onChange,
  onVoicesChange,
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  setTimer = globalThis.setTimeout.bind(globalThis),
  clearTimer = globalThis.clearTimeout.bind(globalThis),
} = {}) {
  const supported = Boolean(synthesis && typeof synthesis.speak === 'function' &&
    typeof synthesis.cancel === 'function' && typeof synthesis.getVoices === 'function' &&
    typeof Utterance === 'function');
  let disposed = false, constructed = false, generation = 0;
  let voices = [], voiceKey = '', nativeCount = 0;
  let queue = [], position = 0, current = null, selectedVoice = null, rate = .9;
  let startTimer = null, voicesTimer = null, pauseRequested = false;
  let state = Object.freeze({status: 'idle', message: '停止中', index: 0, total: 0});

  function update(status, message, {index = state.index, total = state.total, error} = {}) {
    state = Object.freeze({status, message, index, total, ...(error ? {error} : {})});
    if (constructed && !disposed) onChange?.(state);
  }
  function clearStartTimer() {
    if (startTimer !== null) clearTimer(startTimer);
    startTimer = null;
  }
  function clearVoicesTimer() {
    if (voicesTimer !== null) clearTimer(voicesTimer);
    voicesTimer = null;
  }
  function forgetUtterance() {
    if (current) {
      current.onstart = current.onend = current.onerror = null;
      current.onpause = current.onresume = current.onboundary = null;
      current = null;
    }
    clearStartTimer();
  }
  function release({cancel = true} = {}) {
    ++generation;
    clearVoicesTimer();
    forgetUtterance();
    queue = [];
    position = 0;
    pauseRequested = false;
    selectedVoice = null;
    if (supported && owners.get(synthesis) === owner) {
      owners.delete(synthesis);
      if (cancel) {
        try { synthesis.cancel(); } catch { /* Cleanup remains safe if the engine disappeared. */ }
      }
    }
  }
  const owner = {
    interrupt() {
      release({cancel: false});
      update('idle', '停止中', {index: 0, total: 0});
    },
  };
  function fail(error, message = errorMessages[error]) {
    const {index, total} = state;
    release();
    update('error', message || '再生できませんでした。端末の英語音声を再確認して、もう一度押してください。', {index, total, error});
    return false;
  }
  function refreshVoices() {
    if (disposed) return voices.slice();
    const hadVoices = voices.length > 0;
    let available = [];
    if (supported) {
      try { available = Array.from(synthesis.getVoices() || []); } catch { /* Show a recoverable unavailable state on play. */ }
    }
    nativeCount = available.length;
    const seen = new Set();
    voices = available.filter(voice => {
      if (!voice || voice.localService !== true || !/^en(?:[-_]|$)/iu.test(voice.lang || '')) return false;
      const key = JSON.stringify([voice.voiceURI, voice.lang, voice.name]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const nextKey = JSON.stringify(voices.map(v => [v.voiceURI, v.lang, v.name, Boolean(v.default)]));
    const changed = nextKey !== voiceKey;
    voiceKey = nextKey;
    if (constructed && changed) onVoicesChange?.(voices.slice());
    if (voices.length && (voicesTimer !== null || state.error === 'local-voice-unavailable' || (!hadVoices && state.status === 'idle'))) {
      clearVoicesTimer();
      update('idle', '端末の英語音声の準備ができました。読み上げボタンを押してください。', {index: 0, total: 0});
    }
    return voices.slice();
  }
  function active(token, utterance) {
    return !disposed && token === generation && owners.get(synthesis) === owner && current === utterance;
  }
  function playNext(token) {
    if (disposed || token !== generation || owners.get(synthesis) !== owner) return;
    if (position >= queue.length) {
      const total = queue.length;
      release({cancel: false});
      update('ended', '読み上げ完了', {index: total, total});
      return;
    }
    if (pauseRequested) {
      update('paused', `一時停止中 ${position + 1}/${queue.length}`, {index: position + 1});
      return;
    }
    let utterance;
    try {
      utterance = new Utterance(queue[position]);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      utterance.rate = rate;
      utterance.volume = 1;
    } catch { fail('synthesis-failed'); return; }
    current = utterance; // Keep a reference until its end/error/stop cleanup.
    const started = () => {
      if (!active(token, utterance)) return;
      clearStartTimer();
      update('speaking', `読み上げ中 ${position + 1}/${queue.length}`, {index: position + 1});
      utterance.onboundary = null;
    };
    utterance.onstart = started;
    utterance.onboundary = started;
    utterance.onpause = () => {
      if (!active(token, utterance)) return;
      update('paused', `一時停止中 ${position + 1}/${queue.length}`);
    };
    utterance.onresume = () => {
      if (!active(token, utterance)) return;
      update('speaking', `読み上げ中 ${position + 1}/${queue.length}`);
    };
    utterance.onerror = event => {
      if (active(token, utterance)) fail(event?.error || 'synthesis-failed');
    };
    utterance.onend = () => {
      if (!active(token, utterance)) return;
      forgetUtterance();
      ++position;
      playNext(token);
    };
    update('loading', `読み上げを準備しています ${position + 1}/${queue.length}`, {index: position + 1, total: queue.length});
    startTimer = setTimer(() => {
      startTimer = null;
      if (active(token, utterance)) fail('start-timeout');
    }, START_TIMEOUT);
    try {
      synthesis.speak(utterance);
      // cancel() does not clear the paused state in the API contract. Some
      // engines ignore resume() without a current utterance, so resume AFTER
      // speak(), still synchronously in the user's click for the first chunk.
      if (active(token, utterance)) synthesis.resume?.();
    } catch { if (active(token, utterance)) fail('synthesis-failed'); }
  }
  function speak(texts, options = {}) {
    if (disposed) return false;
    release();
    update('idle', '停止中', {index: 0, total: 0});
    if (!supported) return fail('unsupported');
    const repeatNumber = Number(options.repeat ?? 1);
    const repeat = Number.isFinite(repeatNumber) ? Math.max(1, Math.min(3, Math.trunc(repeatNumber))) : 1;
    const chunks = chunksFor(texts, repeat);
    if (!chunks) return fail('text-too-long');
    if (!chunks.length) return fail('empty-text');
    refreshVoices();
    if (!voices.length) {
      if (nativeCount) return fail('local-voice-unavailable');
      const token = generation;
      update('loading', '端末の英語音声を準備しています。準備ができたら、読み上げボタンをもう一度押してください。', {index: 0, total: 0});
      voicesTimer = setTimer(() => {
        voicesTimer = null;
        if (disposed || token !== generation) return;
        refreshVoices();
        if (voices.length) update('idle', '端末の英語音声の準備ができました。読み上げボタンをもう一度押してください。', {index: 0, total: 0});
        else fail('local-voice-unavailable');
      }, VOICES_TIMEOUT);
      return false;
    }
    const requestedVoice = typeof options.voiceURI === 'string' ? options.voiceURI : '';
    selectedVoice = requestedVoice ? voices.find(v => v.voiceURI === requestedVoice) :
      voices.find(v => /^en[-_]US$/iu.test(v.lang) && v.default) ||
      voices.find(v => /^en[-_]US$/iu.test(v.lang)) || voices.find(v => v.default) || voices[0];
    if (!selectedVoice) return fail('voice-unavailable');
    const requestedRate = Number(options.rate ?? .9);
    rate = Number.isFinite(requestedRate) ? Math.max(.1, Math.min(10, requestedRate)) : .9;
    queue = chunks;
    position = 0;
    const previous = owners.get(synthesis);
    if (previous && previous !== owner) previous.interrupt();
    owners.set(synthesis, owner);
    try { synthesis.cancel(); } catch { return fail('synthesis-failed'); }
    playNext(generation);
    return state.status !== 'error';
  }
  function stop() {
    if (disposed) return;
    release();
    update('idle', '停止中', {index: 0, total: 0});
  }
  function togglePause() {
    if (disposed || !supported || owners.get(synthesis) !== owner || !['speaking', 'paused'].includes(state.status)) return false;
    if (pauseRequested || state.status === 'paused') {
      pauseRequested = false;
      if (!current) { playNext(generation); return true; }
      try { synthesis.resume?.(); } catch { return fail('synthesis-failed'); }
      if (state.status === 'error') return false;
      if (!synthesis.paused) update('speaking', `読み上げ中 ${position + 1}/${queue.length}`);
      return true;
    }
    pauseRequested = true;
    try { synthesis.pause?.(); } catch { return fail('synthesis-failed'); }
    if (state.status === 'error') return false;
    if (synthesis.paused) update('paused', `一時停止中 ${position + 1}/${queue.length}`);
    else if (state.status !== 'paused') update('speaking', '一時停止を要求しました。端末が対応していない場合は、この区切りの後で停止します。');
    return true;
  }
  function voicesChanged() { refreshVoices(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    release();
    synthesis?.removeEventListener?.('voiceschanged', voicesChanged);
  }

  refreshVoices();
  if (!supported) update('error', errorMessages.unsupported, {error: 'unsupported'});
  else if (!voices.length) update('idle', '端末の英語音声を確認しています。読み上げボタンで再確認できます。');
  synthesis?.addEventListener?.('voiceschanged', voicesChanged);
  constructed = true;
  return {supported, get state() { return state; }, get voices() { return voices.slice(); }, refreshVoices, speak, stop, togglePause, dispose};
}
