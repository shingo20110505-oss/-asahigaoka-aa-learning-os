import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechController} from '../src/speech.mjs';

const localUS = {voiceURI: 'local-us', name: 'English US', lang: 'en-US', localService: true, default: false};
const localGB = {voiceURI: 'local-gb', name: 'English GB', lang: 'en-GB', localService: true, default: true};
const remoteUS = {voiceURI: 'remote-us', name: 'Online English', lang: 'en-US', localService: false, default: true};
const localJP = {voiceURI: 'local-jp', name: 'Japanese', lang: 'ja-JP', localService: true, default: true};

function clock() {
  let now = 0, id = 0;
  const jobs = new Map();
  return {
    setTimer(fn, delay) { const key = ++id; jobs.set(key, {at: now + delay, fn}); return key; },
    clearTimer(key) { jobs.delete(key); },
    get pending() { return jobs.size; },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...jobs].filter(([, job]) => job.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; jobs.delete(next[0]); next[1].fn();
      }
      now = until;
    },
  };
}
class FakeUtterance {
  constructor(text) { this.text = text; }
}
class FakeSynthesis {
  constructor(voices = [localUS], {autoStart = true} = {}) {
    this.available = voices;
    this.autoStart = autoStart;
    this.spoken = [];
    this.calls = [];
    this.listeners = new Set();
    this.paused = false;
    this.current = null;
  }
  getVoices() { return this.available; }
  addEventListener(type, fn) { if (type === 'voiceschanged') this.listeners.add(fn); }
  removeEventListener(type, fn) { if (type === 'voiceschanged') this.listeners.delete(fn); }
  changeVoices(voices) { this.available = voices; for (const fn of this.listeners) fn(); }
  speak(utterance) {
    this.calls.push('speak'); this.spoken.push(utterance); this.current = utterance;
    if (this.autoStart && !this.paused) utterance.onstart?.({});
  }
  cancel() {
    this.calls.push('cancel');
    const old = this.current; this.current = null;
    old?.onerror?.({error: 'canceled'});
    // Deliberately preserve paused, as required by the Web Speech contract.
  }
  pause() { this.calls.push('pause'); this.paused = true; this.current?.onpause?.({}); }
  resume() {
    this.calls.push('resume');
    // Some implementations ignore resume() until there is an utterance.
    if (!this.current || !this.paused) return;
    this.paused = false;
    if (this.autoStart) this.current.onstart?.({});
    this.current.onresume?.({});
  }
  finish() { const old = this.current; this.current = null; old?.onend?.({}); }
  error(code) { this.current?.onerror?.({error: code}); }
}
function fixture({voices, autoStart = true, ...callbacks} = {}) {
  const time = clock(), synthesis = new FakeSynthesis(voices, {autoStart});
  const controller = createSpeechController({synthesis, Utterance: FakeUtterance, setTimer: time.setTimer, clearTimer: time.clearTimer, ...callbacks});
  return {controller, synthesis, time};
}

test('construction has no callbacks and exposes only native local English voices', () => {
  let changes = 0, voicesChanged = 0;
  const {controller} = fixture({voices: [remoteUS, localJP, localGB, localUS, localUS], onChange: () => changes++, onVoicesChange: () => voicesChanged++});
  assert.equal(changes, 0); assert.equal(voicesChanged, 0);
  assert.equal(controller.supported, true);
  assert.deepEqual(controller.voices, [localGB, localUS]);
  assert.equal(controller.voices[0], localGB);
  controller.voices.pop();
  assert.equal(controller.voices.length, 2);
  assert.equal(controller.state.status, 'idle');
  assert.match(controller.state.message, /準備ができました/);
  controller.dispose();
});

test('ready voices start synchronously with explicit local voice and the requested rate', () => {
  const {controller, synthesis, time} = fixture({voices: [remoteUS, localGB, localUS]});
  assert.equal(controller.speak('Hello.', {rate: .75, voiceURI: localGB.voiceURI}), true);
  assert.equal(synthesis.spoken.length, 1);
  assert.equal(synthesis.spoken[0].voice, localGB);
  assert.equal(synthesis.spoken[0].lang, 'en-GB');
  assert.equal(synthesis.spoken[0].rate, .75);
  assert.equal(controller.state.status, 'speaking');
  assert.equal(time.pending, 0);
  controller.dispose();
});

test('no unsupported or remote-only engine can silently use a default remote voice', () => {
  const unsupported = createSpeechController({synthesis: null, Utterance: null});
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.speak('Hello.'), false);
  assert.equal(unsupported.state.error, 'unsupported');
  unsupported.stop(); unsupported.dispose();
  const {controller, synthesis} = fixture({voices: [remoteUS, localJP]});
  assert.equal(controller.speak('Hello.'), false);
  assert.equal(controller.state.error, 'local-voice-unavailable');
  assert.equal(synthesis.spoken.length, 0);
  synthesis.changeVoices([localUS, remoteUS]);
  assert.equal(controller.speak('Hello.', {voiceURI: remoteUS.voiceURI}), false);
  assert.equal(controller.state.error, 'voice-unavailable');
  assert.equal(synthesis.spoken.length, 0);
  controller.dispose();
});

test('voices that load after mount update readiness without requiring a first click', () => {
  const states = [], {controller, synthesis} = fixture({voices: [], onChange: s => states.push(s.status)});
  assert.match(controller.state.message, /確認しています/);
  synthesis.changeVoices([localUS]);
  assert.equal(controller.state.status, 'idle');
  assert.match(controller.state.message, /準備ができました/);
  assert.deepEqual(states, ['idle']);
  assert.equal(synthesis.spoken.length, 0);
  controller.dispose();
});

test('late voice initialization asks for a fresh click instead of auto-playing later', () => {
  const {controller, synthesis, time} = fixture({voices: []});
  assert.equal(controller.speak('Hello.'), false);
  assert.equal(controller.state.status, 'loading');
  synthesis.changeVoices([localUS]);
  assert.equal(controller.state.status, 'idle');
  assert.equal(synthesis.spoken.length, 0);
  assert.equal(time.pending, 0);
  controller.speak('Hello.');
  assert.equal(controller.state.status, 'speaking');
  controller.dispose();
});

test('an empty voice list cannot leave loading stuck and can recover after timeout', () => {
  const {controller, synthesis, time} = fixture({voices: []});
  controller.speak('Hello.'); time.advance(4000);
  assert.equal(controller.state.status, 'error');
  assert.equal(controller.state.error, 'local-voice-unavailable');
  assert.equal(time.pending, 0);
  synthesis.changeVoices([localUS]);
  assert.equal(controller.state.status, 'idle');
  assert.equal(synthesis.spoken.length, 0);
  controller.dispose();
});

test('voice initialization also recovers without a voiceschanged event', () => {
  const {controller, synthesis, time} = fixture({voices: []});
  controller.speak('Hello.'); synthesis.available = [localUS]; time.advance(4000);
  assert.equal(controller.state.status, 'idle');
  assert.match(controller.state.message, /準備ができました/);
  assert.equal(synthesis.spoken.length, 0);
  controller.dispose();
});

test('pause then stop then play clears prior paused state after queuing the new utterance', () => {
  const {controller, synthesis} = fixture();
  controller.speak('First.'); controller.togglePause();
  assert.equal(controller.state.status, 'paused');
  controller.stop(); assert.equal(synthesis.paused, true);
  controller.speak('Second.');
  assert.equal(synthesis.paused, false);
  assert.equal(controller.state.status, 'speaking');
  assert.deepEqual(synthesis.calls.slice(-3), ['cancel', 'speak', 'resume']);
  controller.togglePause(); controller.togglePause();
  assert.equal(controller.state.status, 'speaking');
  controller.dispose();
});

test('inactive view stop/dispose never cancels another controller on the same engine', () => {
  const time = clock(), synthesis = new FakeSynthesis();
  const make = () => createSpeechController({synthesis, Utterance: FakeUtterance, setTimer: time.setTimer, clearTimer: time.clearTimer});
  const reader = make(), dictionary = make();
  reader.speak(['First.', 'Do not continue.']);
  const oldEnd = synthesis.current.onend, oldError = synthesis.current.onerror;
  reader.togglePause(); dictionary.speak('Dictionary.');
  assert.equal(reader.state.status, 'idle');
  assert.equal(dictionary.state.status, 'speaking');
  const cancels = synthesis.calls.filter(x => x === 'cancel').length;
  reader.stop(); reader.refreshVoices(); reader.dispose();
  assert.equal(synthesis.calls.filter(x => x === 'cancel').length, cancels);
  oldEnd(); oldError({error: 'synthesis-failed'});
  assert.deepEqual(synthesis.spoken.map(u => u.text), ['First.', 'Dictionary.']);
  assert.equal(dictionary.state.status, 'speaking');
  synthesis.finish(); assert.equal(dictionary.state.status, 'ended');
  dictionary.dispose();
  assert.equal(synthesis.listeners.size, 0);
});

test('whole input sequence repeats one chunk at a time and old callbacks cannot advance it', () => {
  const {controller, synthesis} = fixture();
  controller.speak(['First.', 'Second.'], {repeat: 3});
  assert.equal(synthesis.spoken.length, 1);
  assert.equal(controller.state.total, 6);
  const staleEnd = synthesis.current.onend;
  synthesis.finish();
  staleEnd();
  assert.equal(synthesis.spoken.length, 2);
  for (let i = 0; i < 5; i++) synthesis.finish();
  assert.deepEqual(synthesis.spoken.map(u => u.text), ['First.', 'Second.', 'First.', 'Second.', 'First.', 'Second.']);
  assert.equal(controller.state.status, 'ended');
  assert.equal(controller.state.index, 6);
  controller.dispose();
});

test('chunking bounds long utterances while preserving every non-whitespace character', () => {
  const {controller, synthesis} = fixture();
  const text = 'A complete sentence stays readable. '.repeat(35) + 'x'.repeat(279) + '😀' + 'y'.repeat(300);
  controller.speak(text);
  for (let i = 0; controller.state.status !== 'ended' && i < 100; i++) synthesis.finish();
  assert.equal(controller.state.status, 'ended');
  assert.ok(synthesis.spoken.length > 2);
  assert.ok(synthesis.spoken.every(u => u.text.length <= 280));
  assert.equal(synthesis.spoken.map(u => u.text.replace(/\s/gu, '')).join(''), text.replace(/\s/gu, ''));
  assert.ok(synthesis.spoken.every(u => !/[\uD800-\uDBFF]$/u.test(u.text) && !/^[\uDC00-\uDFFF]/u.test(u.text)));
  controller.dispose();
});

test('limits fail explicitly instead of silently truncating or building an unbounded queue', () => {
  const {controller, synthesis} = fixture();
  assert.equal(controller.speak('x'.repeat(70000)), false);
  assert.equal(controller.state.error, 'text-too-long');
  assert.equal(controller.speak(Array(81).fill('A.'), {repeat: 3}), false);
  assert.equal(controller.state.error, 'text-too-long');
  assert.equal(synthesis.spoken.length, 0);
  assert.equal(controller.speak(['', null, '  ']), false);
  assert.equal(controller.state.error, 'empty-text');
  controller.dispose();
});

test('start watchdog exposes silent engine failures and prevents later ghost playback', () => {
  const {controller, synthesis, time} = fixture({autoStart: false});
  controller.speak(['Silent.', 'Never queue this.']);
  const oldStart = synthesis.current.onstart, oldEnd = synthesis.current.onend;
  assert.equal(controller.state.status, 'loading'); time.advance(6000);
  assert.equal(controller.state.status, 'error');
  assert.equal(controller.state.error, 'start-timeout');
  assert.equal(synthesis.current, null);
  oldStart(); oldEnd();
  assert.equal(controller.state.status, 'error');
  assert.equal(synthesis.spoken.length, 1);
  assert.equal(time.pending, 0);
  controller.dispose();
});

test('native errors are visible and a retry is not overwritten by stale events', () => {
  const errors = [], {controller, synthesis} = fixture({onChange: s => { if (s.status === 'error') errors.push(s.error); }});
  controller.speak('First.'); const oldError = synthesis.current.onerror;
  synthesis.error('not-allowed');
  assert.equal(controller.state.error, 'not-allowed');
  assert.match(controller.state.message, /もう一度/);
  controller.speak('Retry.'); oldError({error: 'synthesis-failed'});
  assert.equal(controller.state.status, 'speaking');
  assert.deepEqual(errors, ['not-allowed']);
  controller.stop(); assert.deepEqual(errors, ['not-allowed']);
  controller.dispose();
});

test('unsupported pause can pause at the next chunk boundary and resume without repeating text', () => {
  const {controller, synthesis} = fixture();
  synthesis.pause = () => {};
  controller.speak(['First.', 'Second.']); controller.togglePause();
  assert.match(controller.state.message, /この区切りの後/);
  synthesis.finish();
  assert.equal(controller.state.status, 'paused');
  assert.equal(synthesis.spoken.length, 1);
  controller.togglePause();
  assert.equal(controller.state.status, 'speaking');
  assert.deepEqual(synthesis.spoken.map(u => u.text), ['First.', 'Second.']);
  controller.dispose();
});

test('dispose removes timers/listeners and invalidates pending utterance events', () => {
  const states = [], {controller, synthesis, time} = fixture({autoStart: false, onChange: s => states.push(s.status)});
  controller.speak('Pending.');
  const oldStart = synthesis.current.onstart, oldEnd = synthesis.current.onend;
  controller.dispose(); const count = states.length;
  oldStart(); oldEnd(); time.advance(10000); synthesis.changeVoices([localGB]);
  assert.equal(states.length, count);
  assert.equal(time.pending, 0);
  assert.equal(synthesis.listeners.size, 0);
  assert.equal(controller.speak('After disposal.'), false);
  assert.equal(synthesis.spoken.length, 1);
});
