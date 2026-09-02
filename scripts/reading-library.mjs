import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { generateVerifiedReading, sanitizeRequest, validateReading, auditGrammarLeak } from '../worker/src/index.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
const normal = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const basic = ['basic', 'past', 'future', 'modal', 'infinitive', 'gerund', 'comparison'];
const standard = [...basic, 'passive', 'presentPerfect', 'asMuchAs', 'asManyAs'];
const levels = [7, 6, 8, 5, 9, 4, 3, 10, 2, 11, 1];
const profiles = levels.flatMap(difficulty => ['narrative', 'argument'].map(readingType => ({
  difficulty, readingType, allowedGrammar: difficulty <= 3 ? basic : standard
})));
export function nextRequest(entries, offset = 0) {
  const ranked = profiles.map((profile, index) => ({profile, index,
    count: entries.filter(e => e.difficulty === profile.difficulty && e.readingType === profile.readingType).length
  })).sort((a, b) => a.count - b.count || a.index - b.index);
  return sanitizeRequest({...ranked[offset % ranked.length].profile,
    recentTopics: entries.slice(-8).map(e => e.topic), assistMode: 'scaffold',
    weakSkills: [{id: 'en.read.inference', label: '根拠に基づく推論'}]
  });
}
export function nearDuplicate(passage, previous) {
  const words = normal(passage).split(' ');
  const grams = new Set(words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(' ')));
  return previous.some(text => {
    if (normal(text) === normal(passage)) return true;
    const w = normal(text).split(' ');
    const other = new Set(w.slice(0, -4).map((_, i) => w.slice(i, i + 5).join(' ')));
    const common = [...grams].filter(g => other.has(g)).length;
    return common / Math.max(1, Math.min(grams.size, other.size)) > .62;
  });
}
export function checkPayload(payload) {
  if (payload?.schemaVersion !== 1 || payload?.quality?.verified !== true ||
      payload?.quality?.method !== 'independent-blind-answer-check') throw new Error('unverified');
  const request = sanitizeRequest(payload.curriculum);
  const check = validateReading(payload.reading, request);
  if (!check.ok) throw new Error('invalid_structure:' + check.errors.join('|'));
  const english = [payload.reading.passage, ...payload.reading.questions.flatMap(q => q.choices.map(c => c.text))].join('\n');
  if (auditGrammarLeak(english, request.allowedGrammar).length) throw new Error('grammar_rejected');
  return request;
}
export async function validateLibrary(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new Error('invalid_manifest');
  const ids = new Set(), passages = new Set();
  for (const entry of manifest.entries) {
    if (!/^[a-f0-9]{64}$/.test(entry.id) || entry.sha256 !== entry.id || entry.path !== `items/${entry.id}.json` || ids.has(entry.id)) throw new Error('invalid_entry');
    ids.add(entry.id);
    const raw = await fs.readFile(path.join(directory, entry.path), 'utf8');
    if (digest(raw) !== entry.sha256) throw new Error('digest_mismatch');
    const payload = JSON.parse(raw), request = checkPayload(payload), reading = payload.reading;
    const fingerprint = digest(normal(reading.passage));
    if (passages.has(fingerprint)) throw new Error('duplicate_passage');
    passages.add(fingerprint);
    if (entry.difficulty !== reading.difficulty || entry.readingType !== reading.readingType ||
        entry.questionCount !== 5 || JSON.stringify(entry.requiredGrammar) !== JSON.stringify(request.allowedGrammar)) throw new Error('metadata_mismatch');
  }
  return manifest;
}
async function writeJson(file, data) {
  await fs.writeFile(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
  await fs.rename(file + '.tmp', file);
}
export async function replenish(directory, {env = process.env, generate = generateVerifiedReading, limit = 10, date = new Date()} = {}) {
  const manifest = await validateLibrary(directory);
  const statusFile = path.join(directory, 'generation-status.json');
  const previousStatus = JSON.parse(await fs.readFile(statusFile, 'utf8'));
  const day = new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const status = previousStatus.day === day ? previousStatus : {schemaVersion: 1, day, attempted: 0, added: 0};
  Object.assign(status, {dailyLimit: 10, lastRunAt: date.toISOString(), state: 'running'});
  const passages = await Promise.all(manifest.entries.map(async entry => JSON.parse(await fs.readFile(path.join(directory, entry.path), 'utf8')).reading.passage));
  await fs.mkdir(path.join(directory, 'items'), {recursive: true});
  let failures = 0;
  const count = Math.max(0, Math.min(10 - status.attempted, Math.floor(limit)));
  for (let i = 0; i < count; i++) {
    status.attempted++;
    await writeJson(statusFile, status);
    try {
      const curriculum = nextRequest(manifest.entries, failures);
      const payload = {...await generate(env, curriculum), curriculum};
      checkPayload(payload);
      if (nearDuplicate(payload.reading.passage, passages)) throw new Error('duplicate_passage');
      const raw = JSON.stringify(payload, null, 2) + '\n', id = digest(raw), r = payload.reading;
      await fs.writeFile(path.join(directory, 'items', `${id}.json`), raw, {flag: 'wx'});
      manifest.entries.push({id, sha256: id, path: `items/${id}.json`, title: r.title, topic: r.topic,
        difficulty: r.difficulty, readingType: r.readingType, questionCount: 5,
        requiredGrammar: curriculum.allowedGrammar, skills: r.questions.map(q => `en.read.${q.type}`),
        words: r.glossary.map(g => g.word), wordCount: (r.passage.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length,
        createdAt: payload.quality.checkedAt});
      passages.push(r.passage);
      status.added++;
      status.state = 'ready';
      manifest.updatedAt = new Date().toISOString();
      await writeJson(path.join(directory, 'manifest.json'), manifest);
      console.log(`Accepted ${manifest.entries.length}: level ${r.difficulty}, ${r.readingType}, 5 verified questions`);
    } catch (error) {
      failures++;
      // Deliberately keep provider messages, prompts and credentials out of published status.
      status.state = error.code === 'quota_exceeded' || error.status === 429 ? 'quota' : 'retry_later';
      console.log(`Candidate rejected: ${error.code || 'validation_or_provider_error'}`);
      if (error.diagnostic) console.log(`Validation: ${error.diagnostic}`);
      if (status.state === 'quota' || error.code === 'gemini_auth_failed') break;
    } finally { await writeJson(statusFile, status); }
  }
  if (!count) status.state = 'daily_limit';
  await writeJson(statusFile, status);
  await validateLibrary(directory);
  return {total: manifest.entries.length, ...status};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const directory = path.resolve(import.meta.dirname, '../ai-reading-library');
  if (process.argv.includes('--validate')) console.log(`Reading library OK: ${(await validateLibrary(directory)).entries.length} passages`);
  else {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    // Bound individual upstream calls as well as the number of candidates per day.
    const upstreamFetch = globalThis.fetch;
    globalThis.fetch = (url, options = {}) => upstreamFetch(url, {...options, signal: AbortSignal.timeout(90000)});
    console.log(JSON.stringify(await replenish(directory, {limit: Number(process.env.READING_LIMIT || 10)})));
  }
}
