import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {replenish, validateLibrary, digest, nearDuplicate} from '../scripts/reading-library.mjs';
const root = path.resolve(import.meta.dirname, '..');
const sentence = 'Students compared two plans and recorded clear evidence before they changed their final decision.';
const passage = Array.from({length: 4}, () => Array.from({length: 6}, () => sentence).join(' ')).join('\n\n');
const fixture = request => ({schemaVersion: 1, quality: {verified: true, method: 'independent-blind-answer-check', model: 'test-only', checkedAt: new Date().toISOString()},
  reading: {title: 'Comparing Two Plans', passage, translationJa: '生徒たちは二つの計画を比較し、判断の前に根拠を記録しました。'.repeat(12),
    readingType: request.readingType, difficulty: request.difficulty, topic: 'planning', lessonJa: '本文にある比較と記録から根拠を考えます。', grammarTags: ['basic', 'past'],
    glossary: ['compare', 'record', 'evidence', 'decision'].map(word => ({word, meaningJa: '検査用の語義'})),
    questions: ['detail', 'inference', 'cause', 'mainIdea', 'summary'].map(type => ({type, stemJa: '本文から最も適切なものを選びなさい。',
      choices: ['A', 'B', 'C', 'D'].map(text => ({text: `The group selected plan ${text} after comparing the recorded evidence.`, reasonJa: '本文の根拠と比べて判断します。'})),
      answerIndex: 0, evidenceQuote: sentence, explanationJa: '本文の比較と記録を根拠として考えます。'}))}});
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aa-reading-library-'));
try {
  await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({schemaVersion: 1, entries: []}));
  await fs.writeFile(path.join(directory, 'generation-status.json'), JSON.stringify({schemaVersion: 1}));
  let calls = 0;
  const today = new Date('2026-09-02T10:00:00Z');
  const first = await replenish(directory, {date: today, limit: 2, generate: async (_, request) => {calls++; return fixture(request);}});
  assert.equal(calls, 2);
  assert.equal(first.total, 1, 'same passage cannot be re-added with different answers or genre');
  const manifest = await validateLibrary(directory), entry = manifest.entries[0];
  const acceptedRaw = await fs.readFile(path.join(directory, entry.path), 'utf8');
  const quota = await replenish(directory, {date: today, limit: 10, generate: async () => {throw Object.assign(new Error('private provider detail'), {code: 'quota_exceeded'});}});
  assert.equal(quota.total, 1); assert.equal(quota.attempted, 3); assert.equal(quota.state, 'quota');
  assert.doesNotMatch(await fs.readFile(path.join(directory, 'generation-status.json'), 'utf8'), /private provider detail/);
  await fs.writeFile(path.join(directory, 'generation-status.json'), JSON.stringify({...quota, attempted: 10}));
  const capped = await replenish(directory, {date: today, generate: () => {throw new Error('must not run');}});
  assert.equal(capped.attempted, 10); assert.equal(capped.state, 'daily_limit');
  assert.equal(nearDuplicate(passage, [passage.toUpperCase()]), true);
  assert.equal(nearDuplicate('A different narrative with another topic.', [passage]), false);
  const callsToBrowser = [], storage = new Map([['learner-progress', 'preserved']]);
  let offline = false;
  const context = vm.createContext({window: {}, URL, TextEncoder, Uint8Array, crypto: webcrypto, AbortController, setTimeout, clearTimeout,
    document: {currentScript: {src: 'https://site.test/app/ai-reading-library-v1.js'}}, location: {origin: 'https://site.test', href: 'https://site.test/app/'},
    localStorage: {getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v)},
    fetch: async (url, options) => {callsToBrowser.push({url, options}); if (offline) throw new TypeError('offline');
      const value = url.endsWith('manifest.json') ? JSON.stringify(manifest) : url.endsWith('generation-status.json') ? JSON.stringify(capped) : acceptedRaw;
      return new Response(value, {status: 200});}
  });
  vm.runInContext(await fs.readFile(path.join(root, 'ai-reading-library-v1.js'), 'utf8'), context);
  const api = context.window.AAReadingLibrary;
  const request = {difficulty: 7, readingType: 'mixed', allowedGrammar: entry.requiredGrammar};
  assert.equal((await api.select(request, {})).entry.id, entry.id);
  assert.equal(callsToBrowser.every(c => c.url.startsWith('https://site.test/app/ai-reading-library/') && c.options.credentials === 'omit' && !c.options.body && !c.options.headers?.authorization), true);
  const unseen = {...entry, id: 'b'.repeat(64), sha256: 'b'.repeat(64), path: `items/${'b'.repeat(64)}.json`};
  assert.equal(api.rank([entry, unseen], request, {[entry.id]: 1})[0].id, unseen.id);
  assert.equal(api.rank([entry], {...request, allowedGrammar: ['basic']}).length, 0);
  assert.equal(api.rank([entry], {...request, difficulty: 1}).length, 0);
  assert.equal(api.rank([entry], {...request, readingType: 'argument'}).length, 0);
  await assert.rejects(api.fetchEntry({...entry, path: 'https://worker.test/'}));
  offline = true; await api.load(true); assert.equal(api.snapshot().total, 1);
  assert.equal((await api.select(request, {})).entry.id, entry.id, 'cached accepted reading remains usable offline');
  assert.equal(storage.get('learner-progress'), 'preserved');
  const index = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  assert.equal(JSON.parse(index.match(/const DATA = (.*);\n/)[1]).readingScenarios.length, 0);
  const loader = await fs.readFile(path.join(root, 'v23-loader.js'), 'utf8');
  assert.doesNotMatch(loader, /reading-natural-v[23]\.js|english-reading-variation/);
  const vocab = await fs.readFile(path.join(root, 'vocab.html'), 'utf8');
  assert.match(vocab, /type:'vocab',source:v,skills:\[\{id:'en.vocab.recall'/);
  const progressFunction = vocab.match(/function prog\(v\)\{[\s\S]*?\}function progLabel/)[0].replace(/function progLabel$/, '');
  const progress = vm.runInNewContext('(' + progressFunction + ')');
  assert.equal(progress({progress:{seen:0,fromReading:true}}), 'weak');
  assert.equal(progress({progress:{seen:0,fromReading:false}}), 'new');
  assert.equal(progress({progress:{seen:3,correct:3,retention:.95,fromReading:false}}), 'mastered');
  await fs.writeFile(path.join(directory, entry.path), acceptedRaw + ' ');
  await assert.rejects(validateLibrary(directory), /digest_mismatch/);
  console.log('Reading library checks passed: daily budget, quota, duplicates, append-only content, hashes, same-origin fetch, offline fallback, grammar/difficulty matching, retired banks, vocabulary bridge.');
} finally {await fs.rm(directory, {recursive: true, force: true});}
