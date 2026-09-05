import fs from 'node:fs/promises';
import path from 'node:path';

const SUBJECTS = new Set(['english', 'math', 'japanese', 'science', 'social']);
const subject = String(process.env.RISE_SUBJECT || process.argv[2] || '').trim().toLowerCase();
const workerUrl = String(process.env.RISE_AI_WORKER_URL || 'https://asahigaoka-aa-ai-reading.enjoyprog1222.workers.dev').replace(/\/+$/, '');
const token = String(process.env.AI_ACCESS_TOKEN || '').trim();
const origin = 'https://shingo20110505-oss.github.io';
const poolPath = path.resolve(process.env.RISE_POOL_PATH || 'verified-question-pool-v1.json');
const maxPerRun = Math.max(1, Math.min(5, Number(process.env.RISE_MAX_PER_RUN || 3) || 3));

if (!SUBJECTS.has(subject)) throw new Error(`Unsupported RISE_SUBJECT: ${subject || '(empty)'}`);
if (token.length < 24) throw new Error('AI_ACCESS_TOKEN is missing or too short.');

const raw = await fs.readFile(poolPath, 'utf8');
const pool = JSON.parse(raw);
if (!pool || pool.schemaVersion !== 1 || !pool.subjects || !Array.isArray(pool.subjects[subject])) {
  throw new Error('Verified Question Pool schema is invalid.');
}

const allItems = Object.values(pool.subjects).flatMap(items => Array.isArray(items) ? items : []);
const existingIds = new Set(allItems.map(item => String(item?.id || '')).filter(Boolean));
const existingFingerprints = new Set(allItems.map(item => String(item?.fingerprint || '')).filter(Boolean));
const target = Math.max(1, Number(pool.targetPerSubject || 24) || 24);
const gap = Math.max(0, target - pool.subjects[subject].length);

if (!gap) {
  console.log(`[rise-pool] ${subject}: target already satisfied (${target}). No API call.`);
  process.exit(0);
}

const count = Math.min(maxPerRun, gap);
const requestBody = {
  schemaVersion: 2,
  subject,
  count,
  difficulty: 8,
  skill: 'aichi.exam.application',
  focus: ['愛知県公立高校入試型', '応用', '資料読解', '思考力'],
  recentQuestionIds: [...existingIds].slice(-60),
  recentFingerprints: [...existingFingerprints].slice(-40)
};

const response = await fetch(`${workerUrl}/v1/exam`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
    origin
  },
  body: JSON.stringify(requestBody),
  signal: AbortSignal.timeout(170000)
});

let payload = null;
try { payload = await response.json(); } catch { /* fail below */ }

if (!response.ok) {
  const code = String(payload?.error?.code || 'request_failed');
  const message = String(payload?.error?.message || `HTTP ${response.status}`);
  if (response.status === 429 || ['quota_exceeded', 'groq_quota_exceeded', 'rate_limited'].includes(code)) {
    console.log(`[rise-pool] ${subject}: generation safely skipped (${code}). ${message}`);
    process.exit(0);
  }
  throw new Error(`[rise-pool] ${subject}: ${code}: ${message}`);
}

if (payload?.subject !== subject || payload?.quality?.verified !== true || !Array.isArray(payload?.items)) {
  throw new Error(`[rise-pool] ${subject}: unverified or malformed batch rejected.`);
}

const accepted = [];
for (const item of payload.items) {
  if (!item || item.subject !== subject) continue;
  if (item.quality?.verified !== true) continue;
  if (!String(item.quality?.method || '').includes('cross-provider-blind-answer-check')) continue;
  if (!item.id || !item.fingerprint || existingIds.has(item.id) || existingFingerprints.has(item.fingerprint)) continue;
  if (!Array.isArray(item.choices) || item.choices.length !== 4) continue;
  if (!Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) continue;
  existingIds.add(item.id);
  existingFingerprints.add(item.fingerprint);
  accepted.push(item);
}

if (!accepted.length) {
  throw new Error(`[rise-pool] ${subject}: API returned no new independently verified items.`);
}

pool.subjects[subject].push(...accepted);
pool.subjects[subject] = pool.subjects[subject].slice(0, target);
pool.updatedAt = new Date().toISOString();
pool.poolVersion = pool.updatedAt.replace(/[:T]/g, '-').replace(/\.\d{3}Z$/, 'Z');

await fs.writeFile(poolPath, `${JSON.stringify(pool, null, 2)}\n`, 'utf8');
console.log(`[rise-pool] ${subject}: added ${accepted.length}; now ${pool.subjects[subject].length}/${target}.`);
