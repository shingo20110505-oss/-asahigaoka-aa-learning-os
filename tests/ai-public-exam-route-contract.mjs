import assert from 'node:assert/strict';
import fs from 'node:fs';
import { __test } from '../worker/src/entry-hardened.mjs';

assert.equal(__test.requiresAccessToken('/v1/exam'), false, 'Rise exam delivery must not require a frontend bearer token');
assert.equal(__test.requiresAccessToken('/v1/reading'), true, 'English reading route remains protected');
assert.equal(__test.requiresAccessToken('/v1/verify'), true, 'Verifier route remains protected');
assert.equal(__test.requiresAccessToken('/v1/status'), true, 'Status route remains protected');

const route = fs.readFileSync(new URL('../ai-exam-route-v1.js', import.meta.url), 'utf8');
assert.match(route, /const VERSION='1\.3\.0'/);
assert.match(route, /new Set\(\['math','japanese','science','social'\]\)/, 'verified Japanese single questions must be reachable');
assert.match(route, /data-ai-exam-quick/, 'Japanese full exam and verified single-question routes must remain distinct');
assert.match(route, /公開中の検証済み.*問題/, 'published pool counts must be visible on entrance-exam cards');

const refill = fs.readFileSync(new URL('../scripts/fill-verified-question-pool.mjs', import.meta.url), 'utf8');
assert.match(refill, /process\.exit\(75\)/, 'free-tier exhaustion must not report a successful refill');
const japaneseWorkflow = fs.readFileSync(new URL('../.github/workflows/replenish-japanese.yml', import.meta.url), 'utf8');
assert.match(japaneseWorkflow, /Require an accepted pack or an already-used daily slot/);

console.log('Rise public exam contract OK: tokenless verified delivery, four-subject inventory visibility and observable refill failures.');
