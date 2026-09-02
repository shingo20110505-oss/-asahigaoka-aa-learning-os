import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../ai-reading-v1.js', import.meta.url), 'utf8');
const TOKEN = 'test-only-connection-token-1234567890';
const CONFIG_KEY = 'aa_ai_reading_config_v1';
const ENDPOINT = 'https://asahigaoka-aa-ai-reading.shingo-20110505.workers.dev';
const success = () => Response.json({ ready: true, model: 'test-model' });
const health = () => Response.json({ ok: true, service: 'aa-ai-reading' });

// Minimal DOM adapter: drive the production click handler and inspect its output.
function harness({ fetcher = success, online = true, storageFails = false, abortAvailable = true, fastTimeout = false } = {}) {
  const elements = new Map();
  const listeners = new Map();
  class Element {
    constructor() { this.dataset = {}; this.children = new Map(); this.value = ''; this.disabled = false; this.textContent = ''; }
    set innerHTML(html) {
      this.html = html;
      for (const selector of ['[data-ai-token-input]', '[data-ai-config-status]', '[data-action="ai-reading-config-save"]', '[data-action="ai-reading-token-toggle"]', '[data-ai-busy-message]', '[data-ai-busy-detail]']) {
        const attribute = selector.slice(1, -1);
        if (html.includes(attribute)) this.children.set(selector, new Element());
      }
    }
    get innerHTML() { return this.html || ''; }
    querySelector(selector) { return this.children.get(selector) || null; }
    appendChild(child) { elements.set(child.id, child); }
    addEventListener() {}
    focus() {}
    remove() { elements.delete(this.id); }
  }
  const preserved = new Map([
    ['asahi_learning_os_v1', '{"attempts":[{"id":"existing"}]}'],
    ['aa-review-progress-v2', '{"existing":"learned"}'],
    ['aa-companion-voice-daily-seen', 'existing-daily-voice']
  ]);
  const storage = new Map(preserved);
  const calls = [];
  const alerts = [];
  const events = [];
  const document = {
    body: new Element(), head: new Element(),
    getElementById: id => elements.get(id) || null,
    createElement: () => new Element(),
    addEventListener: (name, handler) => listeners.set(name, handler),
    dispatchEvent: event => events.push(event),
    querySelector: selector => elements.get('aaAiReadingConfig')?.querySelector(selector)
  };
  const context = vm.createContext({
    document, location: { origin: 'https://shingo20110505-oss.github.io' }, navigator: { onLine: online }, URL,
    AbortController: abortAvailable ? AbortController : undefined,
    setTimeout: (fn, ms) => setTimeout(fn, fastTimeout && ms >= 5000 ? 1 : ms), clearTimeout,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { if (storageFails) throw new DOMException('Full', 'QuotaExceededError'); storage.set(key, value); },
      removeItem: key => storage.delete(key)
    },
    fetch: async (url, options) => { calls.push({ url, options }); return fetcher(url, options); },
    window: { alert: message => alerts.push(message), confirm: () => true },
    subjectsHTML: () => '', settingsHTML: () => '', studyHTML: () => '', fullReadingTranslation: () => '', render: () => {}
  });
  vm.runInContext(source, context);
  function click(action) {
    const element = { dataset: { action } };
    listeners.get('click')({ target: { closest: () => element }, preventDefault() {}, stopImmediatePropagation() {} });
  }
  click('ai-reading-config');
  const modal = elements.get('aaAiReadingConfig');
  const input = modal.querySelector('[data-ai-token-input]');
  const status = modal.querySelector('[data-ai-config-status]');
  const button = modal.querySelector('[data-action="ai-reading-config-save"]');
  async function settle() {
    for (let i = 0; i < 150 && button.disabled; i++) await new Promise(resolve => setTimeout(resolve, 2));
    assert.equal(button.disabled, false, 'save button must recover after success or failure');
    assert.equal(input.disabled, false);
    for (const [key, value] of preserved) assert.equal(storage.get(key), value, 'unrelated learner data must be preserved');
    assert.equal(status.textContent.includes(TOKEN), false, 'diagnostics must not expose the token');
    return status.textContent;
  }
  async function save(token = TOKEN) { input.value = token; click('ai-reading-config-save'); return settle(); }
  return { save, settle, click, status, input, button, calls, alerts, events, storage, elements };
}

const connected = harness();
assert.match(await connected.save(), /接続成功/);
assert.equal(connected.status.dataset.state, 'ready');
assert.equal(JSON.parse(connected.storage.get(CONFIG_KEY)).accessToken, TOKEN);
assert.equal(connected.input.value, '', 'hide saved credentials before an error screenshot');
assert.equal(connected.input.type, 'password');
assert.equal(connected.calls[0].url, ENDPOINT + '/v1/status');
assert.equal(connected.calls[0].options.headers.authorization, 'Bearer ' + TOKEN);
assert.equal(connected.calls[0].options.cache, 'no-store');
assert.match(await connected.save(''), /接続成功/, 'retry must reuse the saved token without retyping');
assert.equal(connected.events.filter(event => event.type === 'aa:ai-reading-connection').length, 2);

for (const [code, httpStatus, message] of [
  ['unauthorized', 401, /認証を拒否/],
  ['forbidden_origin', 403, /URLからの接続/],
  ['quota_exceeded', 429, /無料枠の上限/]
]) {
  const test = harness({ fetcher: () => Response.json({ error: { code } }, { status: httpStatus }) });
  const output = await test.save();
  assert.match(output, message);
  assert.ok(output.includes('種類: ' + code));
  assert.ok(output.includes('HTTP: ' + httpStatus));
  assert.equal(test.calls.length, 1, 'HTTP errors must not trigger a second authentication attempt');
  assert.doesNotMatch(output, /同じ文字列か確認/);
}

const unready = harness({ fetcher: () => Response.json({ ready: false }, { status: 503 }) });
assert.match(await unready.save(), /サーバー側の接続設定が完了していません/);
assert.match(unready.status.textContent, /種類: worker_not_ready/);

for (const reachable of [true, false]) {
  const test = harness({ fetcher: url => {
    if (url.endsWith('/health') && reachable) return health();
    throw new TypeError('Failed to fetch');
  } });
  const output = await test.save();
  assert.match(output, /種類: network_error/);
  assert.match(output, /認証結果は取得できていません/);
  assert.ok(output.includes('疎通確認: ' + (reachable ? 'reachable' : 'unreachable')));
  assert.equal(test.calls.length, 2);
  const probe = test.calls[1];
  assert.equal(probe.url, ENDPOINT + '/health');
  assert.equal(probe.options.method, 'GET');
  assert.equal(probe.options.credentials, 'omit');
  assert.equal(probe.options.headers, undefined);
  assert.equal(JSON.stringify(probe).includes(TOKEN), false, 'public health check must not send credentials');
  assert.doesNotMatch(output, /トークンが一致しません|同じ文字列か確認/);
}

const offline = harness({ online: false });
assert.match(await offline.save(), /種類: offline/);
assert.equal(offline.calls.length, 0);

const unsupported = harness({ abortAvailable: false });
assert.match(await unsupported.save(), /種類: client_unsupported/);
assert.equal(unsupported.calls.length, 0);

const fullStorage = harness({ storageFails: true });
assert.match(await fullStorage.save(), /種類: storage_unavailable/);
assert.doesNotMatch(fullStorage.status.textContent, /保存済み/);
assert.equal(fullStorage.calls.length, 0);

const blockedHtml = harness({ fetcher: () => new Response('<html>Blocked</html>', { status: 200 }) });
assert.match(await blockedHtml.save(), /種類: invalid_response/);
assert.notEqual(blockedHtml.status.dataset.state, 'ready');

const timeout = harness({ fastTimeout: true, fetcher: (url, options) => {
  if (url.endsWith('/health')) return health();
  return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError'))));
} });
assert.match(await timeout.save(), /接続確認が15秒で時間切れ/);
assert.match(timeout.status.textContent, /種類: connection_timeout/);
assert.doesNotMatch(timeout.status.textContent, /AI生成が時間内/);

let resolvePending;
const duplicate = harness({ fetcher: () => new Promise(resolve => { resolvePending = resolve; }) });
duplicate.input.value = TOKEN;
duplicate.click('ai-reading-config-save');
duplicate.click('ai-reading-config-save');
assert.equal(duplicate.calls.length, 1, 'double tap must not send duplicate requests');
resolvePending(success());
await duplicate.settle();
assert.equal(duplicate.status.dataset.state, 'ready');

console.log('AI connection checks passed: auth, origin, quota, readiness, network, health, offline, compatibility, storage, blocked HTML, timeout, retry, duplicate taps, and learner-data preservation');
