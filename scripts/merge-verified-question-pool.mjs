import fs from 'node:fs';

const [,, poolPath, responsePath, subject] = process.argv;
if (!poolPath || !responsePath || !subject) throw new Error('usage: node scripts/merge-verified-question-pool.mjs <pool> <response> <subject>');
const allowed = new Set(['english','math','japanese','science','social']);
if (!allowed.has(subject)) throw new Error(`unsupported subject: ${subject}`);

const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const response = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
if (response?.quality?.verified !== true || response?.quality?.method !== 'gemini-authoring-subject-deterministic-groq-blind-agreement') {
  throw new Error('response is not fully verified');
}
if (!Array.isArray(response.items) || response.items.length === 0) throw new Error('no verified items returned');

pool.subjects ??= {};
pool.subjects[subject] ??= [];
const existing = new Map(pool.subjects[subject].map(item => [item.id, item]));
for (const item of response.items) {
  if (!item?.id || item?.subject !== subject || item?.quality?.verified !== true) continue;
  existing.set(item.id, item);
}
pool.subjects[subject] = [...existing.values()]
  .sort((a,b) => String(b?.quality?.checkedAt || '').localeCompare(String(a?.quality?.checkedAt || '')))
  .slice(0, 80);
pool.updatedAt = new Date().toISOString();
pool.schemaVersion = 1;
pool.source = 'rise-ai-platform';
pool.qualityMethod = 'gemini-authoring-subject-deterministic-groq-blind-agreement';
fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n');
console.log(JSON.stringify({subject, stored: pool.subjects[subject].length, addedFromResponse: response.items.length}));
