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
assert.match(japaneseWorkflow, /\/tmp\/japanese-generation\.json/, 'daily-limit result must be read from the current invocation');

const publicWorkflow = fs.readFileSync(new URL('../.github/workflows/ai-exam-route-public-verify.yml', import.meta.url), 'utf8');
assert.match(publicWorkflow, /ai-exam-route-v1\.js\?v=1\.3\.0/);
assert.match(publicWorkflow, /\['math','japanese','science','social'\]/);

const smokeWorkflow = fs.readFileSync(new URL('../.github/workflows/ai-exam-live-smoke.yml', import.meta.url), 'utf8');
assert.match(smokeWorkflow, /workflow_run:/, 'live smoke must wait for Worker deployment');
assert.match(smokeWorkflow, /for subject in math japanese science social/);
assert.match(smokeWorkflow, /count\\\":1/, 'live smoke must minimize free-tier consumption');
assert.match(smokeWorkflow, /SAFE_QUALITY_REJECTION/, 'quality rejection is a safe fail-closed outcome');

const productionGate = fs.readFileSync(new URL('../scripts/verify-ai-worker-production-result.mjs', import.meta.url), 'utf8');
assert.match(productionGate, /readingSafeRejected/);
assert.match(productionGate, /mathSafeRejected/);
assert.match(productionGate, /scienceSafeRejected/);
assert.match(productionGate, /safe quality rejection \(PASS\)/);

console.log('Rise public exam contract OK: tokenless verified delivery, four-subject inventory visibility and observable refill failures.');
