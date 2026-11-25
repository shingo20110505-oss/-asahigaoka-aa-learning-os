import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const source = (await fs.readFile(new URL('../src/english-data.mjs', import.meta.url), 'utf8'))
  .replace(/^export /gm, '');
const words = [{id:'en-first', word:'first'}, {id:'en-second', word:'second'}];
const body = JSON.stringify(words);
const sha256 = createHash('sha256').update(body).digest('hex');
const version = {version:'unchanged-version', words:{entries:words.length, sha256}};

function fixture(cached, fetcher) {
  const state = {cached, writes:0, calls:[]};
  const indexedDB = {open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {transaction() {
        const tx = {objectStore() { return {
          get() {
            const get = {};
            queueMicrotask(() => { get.result = state.cached; get.onsuccess(); });
            return get;
          },
          put(value) {
            state.cached = structuredClone(value); state.writes++;
            queueMicrotask(() => tx.oncomplete());
          }
        }; }};
        return tx;
      }};
      request.onsuccess();
    });
    return request;
  }};
  const fetch = async (url, options) => { state.calls.push(url); return fetcher(url, options); };
  const load = new Function('fetch', 'indexedDB', source + '\nreturn loadEnglishWords;')(fetch, indexedDB);
  return {load, state};
}

test('same-version old dictionary is replaced and verified cached data avoids another large download', async () => {
  const {load, state} = fixture({version:version.version, words:words.slice(0, 1), sha256},
    async url => new Response(url.includes('version.json') ? JSON.stringify(version) : body));
  assert.deepEqual(await load(), words);
  assert.equal(state.writes, 1);
  assert.equal(state.cached.sha256, sha256);
  assert.deepEqual(await load(), words);
  assert.deepEqual(state.calls, ['./data/english/version.json', './data/english/words.json', './data/english/version.json']);
});

test('offline version failure uses the saved dictionary without requesting the large file', async () => {
  const cached = {version:'last-working-version', words};
  const {load, state} = fixture(cached, async () => { throw new TypeError('offline'); });
  assert.deepEqual(await load(), words);
  assert.deepEqual(state.calls, ['./data/english/version.json']);
  assert.equal(state.writes, 0);
  assert.deepEqual(state.cached, cached);
});

test('same-count corrupted public data is rejected without overwriting the saved dictionary', async () => {
  const cached = {version:'previous-version', words:words.slice(0, 1)};
  const corrupted = JSON.stringify([{id:'en-wrong', word:'wrong'}, words[1]]);
  const {load, state} = fixture(cached,
    async url => new Response(url.includes('version.json') ? JSON.stringify(version) : corrupted));
  await assert.rejects(load(), /更新情報と一致しません/);
  assert.equal(state.writes, 0);
  assert.deepEqual(state.cached, cached);
});
