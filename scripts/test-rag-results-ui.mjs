import assert from 'node:assert/strict';
import http from 'node:http';

// A deterministic worker double tests stream boundaries, not model accuracy/speed.
export async function testResultPresentation(browser, base) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const fixture = window.streamFixture = { auto: false, turn: 0, release: null };
    window.Worker = class {
      postMessage({ id, op }) {
        const send = (type, value) => this.onmessage?.({ data: { id, type, value } });
        if (op !== 'generate') {
          if (op === 'load') fixture.turn = 0;
          setTimeout(() => send('done', { ms: 3 }), 0); return;
        }
        const n = fixture.turn++;
        const answer = n === 0 ? '2' : `fixture-${n}: <img src=x onerror=alert(1)>`;
        setTimeout(() => {
          send('delta', answer);
          fixture.release = () => send('done', { answer, totalMs: 20, firstVisibleMs: 5 });
          if (fixture.auto) fixture.release();
        }, 0);
      }
      terminate() {}
    };
  });
  try {
    await page.goto(base);
    await page.waitForFunction(() => !!window.lab);
    await page.locator('#device').selectOption('iPad A16 / user confirmed');
    // Explicitly simulate the known Windows declaration mismatch on every CI OS.
    await page.evaluate(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }));
    await page.locator('#smoke').click();
    assert.match(await page.locator('#status').innerText(), /iPadではありません/);
    assert.equal(await page.evaluate(() => window.lab.report.runs.length), 0);
    await page.locator('#device').selectOption('Windows PC reference only');
    await page.locator('#smoke').click();
    await page.waitForFunction(() => window.streamFixture.turn === 1 && !!window.streamFixture.release);
    assert.equal(await page.locator('#generation').isVisible(), false, 'warmup is never an answer');
    await page.evaluate(() => window.streamFixture.release());
    await page.waitForFunction(() => document.querySelector('#answer').textContent.startsWith('fixture-1'));
    assert.match(await page.locator('#generation-label').innerText(), /g2 · 検索なし/);
    assert.equal(await page.locator('#answer img').count(), 0, 'model text cannot become HTML');
    await page.evaluate(() => window.streamFixture.release());
    await page.waitForFunction(() => document.querySelector('#answer').textContent.startsWith('fixture-2'));
    assert.match(await page.locator('#generation-label').innerText(), /g2 · 検索＋LLM/);
    assert.ok(!(await page.locator('#answer').innerText()).includes('fixture-1'), 'previous arm is cleared');
    await page.evaluate(() => { window.streamFixture.auto = true; window.streamFixture.release(); });
    await page.waitForFunction(() => !window.lab.busy);
    assert.equal(await page.evaluate(() => window.lab.report.runs.at(-1).status), 'completed');
    assert.equal(await page.locator('#answers .question-result').count(), 3);
    assert.equal(await page.locator('#answers .answer-card').count(), 12);
    assert.equal(await page.locator('#answers img').count(), 0);
    assert.equal(await page.locator('#generation').isVisible(), false);
    const firstRun = await page.locator('#run-history').inputValue();
    await page.locator('#answers').screenshot({ path: 'test-results/rag/comparison-fixture.png' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#smoke').click();
    await page.waitForFunction(() => !window.lab.busy && window.lab.report.runs.length === 2);
    assert.equal(await page.locator('#answers .question-result').count(), 3, 'another run is not appended to the current answers');
    await page.locator('#run-history').selectOption(firstRun);
    assert.equal(await page.locator('#run-history').inputValue(), firstRun);
    assert.equal(await page.locator('#answers .answer-card').count(), 12);
    // Stop an in-flight answer and preserve its text as incomplete, never as a completed arm.
    await page.evaluate(() => { window.streamFixture.auto = false; window.streamFixture.release = null; });
    await page.locator('#smoke').click();
    await page.waitForFunction(() => window.streamFixture.turn === 1 && !!window.streamFixture.release);
    await page.evaluate(() => window.streamFixture.release());
    await page.waitForFunction(() => document.querySelector('#answer').textContent.startsWith('fixture-1'));
    await page.locator('#stop').click();
    await page.waitForFunction(() => !window.lab.busy);
    assert.match(await page.locator('#answers').innerText(), /中断した回答/);
    assert.equal(await page.evaluate(() => window.lab.report.runs.at(-1).questions[0].arms.none), undefined);
    await page.evaluate(() => window.streamFixture.release()); // a late, terminated worker response
    assert.equal(await page.locator('#generation').isVisible(), false);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.lab);
    assert.equal(await page.locator('#run-history option').count(), 3);
    await page.locator('#run-history').selectOption(firstRun);
    assert.equal(await page.locator('#answers .answer-card').count(), 12, 'completed answers restored offline');
    assert.match(await page.locator('#answers [data-arm="none"] .answer-text').first().innerText(), /^fixture-1/);
    const saved = await page.evaluate(() => localStorage.getItem('rise-rag-lab-v1'));
    await testLegacyUpdate(browser, base, saved);
    console.log('RAG presentation: isolated streams, warmup hidden, history, cancellation, text safety and offline restoration passed (synthetic worker).');
  } finally { await context.close(); }
}

async function testLegacyUpdate(browser, base, saved) {
  // Service-worker script fetches do not use page.route, so serve the legacy
  // worker from a separate loopback HTTP fixture instead of mocking the browser.
  let legacy = true;
  const legacyWorker = `
    self.addEventListener('install',e=>e.waitUntil((async()=>{await(await caches.open('rise-rag-lab-legacy')).put('./index.html',new Response('<p id="legacy">旧画面</p>',{headers:{'Content-Type':'text/html;charset=utf-8'}}));await self.skipWaiting();})()));
    self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.endsWith('/labs/rag/'))e.respondWith(caches.match('./index.html'));});
  `;
  const server = http.createServer(async (req, res) => {
    try {
      if (legacy && req.url === '/labs/rag/sw.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(legacyWorker); return; }
      const upstream = await fetch(new URL(req.url, base));
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.statusCode = 500; res.end('Fixture failed'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const fixtureBase = `http://127.0.0.1:${server.address().port}/labs/rag/`;
  const context = await browser.newContext(), page = await context.newPage();
  try {
    const previous = JSON.parse(saved);
    previous.runs[0].environment.label = 'iPad A16 / user confirmed';
    delete previous.currentViewVersion;
    await page.goto(fixtureBase);
    await page.waitForFunction(() => !!window.lab);
    await page.evaluate(async report => {
      localStorage.setItem('rise-rag-lab-v1', JSON.stringify(report));
      await (await caches.open('fixture-model-cache')).put('./saved-model', new Response('unchanged model bytes'));
    }, previous);
    await page.evaluate(async () => { await navigator.serviceWorker.register('./sw.js', { scope: './' }); await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.reload();
    assert.equal(await page.locator('#legacy').innerText(), '旧画面');
    legacy = false;
    await page.goto(fixtureBase + 'update.html');
    await page.waitForURL(fixtureBase, { timeout: 90000 });
    await page.waitForFunction(() => !!window.lab);
    assert.equal(await page.evaluate(() => window.lab.report.currentViewVersion), '2026-10-28.9');
    assert.equal(await page.evaluate(() => window.lab.report.runs.length), 3);
    await page.locator('#run-history').selectOption(previous.runs[0].id);
    assert.equal(await page.locator('#answers .answer-card').count(), 12);
    assert.match(await page.locator('#run-device').innerText(), /ブラウザ情報と一致しません/);
    assert.equal(await page.evaluate(() => window.lab.report.runs[0].environment.label), 'iPad A16 / user confirmed', 'historical declaration stays unchanged');
    assert.equal(await page.evaluate(async () => (await caches.match('./saved-model')).text()), 'unchanged model bytes');
    console.log('RAG update: old cache replaced; saved raw answers, declared device and unrelated model cache preserved.');
  } finally { await context.close(); await new Promise(resolve => server.close(resolve)); }
}
