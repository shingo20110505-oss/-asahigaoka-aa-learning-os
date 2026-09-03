import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'OPERATIONS.md',
  'docs/README.md',
  'docs/SYSTEM_MANAGEMENT.md',
  'docs/AI_PLATFORM.md',
  'app/runtime-registry.js',
  'storage-resilience-v1.js',
  'tests/architecture-boundaries.mjs',
  '.github/workflows/deploy-pages.yml',
  '.github/workflows/deploy-ai-worker.yml',
  'worker/README.md',
  'worker/wrangler.toml',
  'review-bank-v1.js',
  'review/index.html',
  'DEPLOY_STATUS.txt',
  'PUBLIC_VERIFY_STATUS.txt'
];

for (const file of requiredFiles) {
  assert.equal(exists(file), true, `management contract missing required file: ${file}`);
}

const operations = read('OPERATIONS.md');
assert.match(operations, /# Rise/);
assert.match(operations, /docs\/SYSTEM_MANAGEMENT\.md/);
assert.match(operations, /docs\/AI_PLATFORM\.md/);
assert.match(operations, /\.github\/workflows\/deploy-pages\.yml/);
assert.match(operations, /review-bank-v1\.js/);
assert.match(operations, /review\/index\.html/);
assert.match(operations, /GROQ_API_KEY/);
assert.match(operations, /gemini-3\.5-flash/);
assert.match(operations, /aa-storage-best-v4/);
assert.match(operations, /asahigaoka-aa-os-storage/);
assert.doesNotMatch(operations, /asahi_learning_os_best_snapshot_v1/);
assert.doesNotMatch(operations, /aa-learning-resilience-v1/);
assert.doesNotMatch(operations, /site-publish\.yml/);
assert.match(operations, /main:gh-pages\s+--force[^\n]*禁止/);

const management = read('docs/SYSTEM_MANAGEMENT.md');
for (const token of [
  'app/runtime-registry.js',
  'storage-resilience-v1.js',
  'tests/architecture-boundaries.mjs',
  'scripts/validate-management-contract.mjs',
  '.github/workflows/management-contract.yml',
  'asahi_learning_os_v1',
  'aa-storage-best-v4',
  'asahigaoka-aa-os-storage',
  'asahi_review_progress_v1',
  'review-bank-v1.js',
  'review/index.html',
  '.github/workflows/deploy-pages.yml',
  'DEPLOY_STATUS.txt',
  'PUBLIC_VERIFY_STATUS.txt',
  'docs/AI_PLATFORM.md'
]) assert.match(management, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(management, /runtime[\s\S]*data[\s\S]*state[\s\S]*engines[\s\S]*ui/);
assert.match(management, /branch protection[\s\S]*現在無効/);
assert.doesNotMatch(management, /asahi_learning_os_best_snapshot_v1/);
assert.doesNotMatch(management, /aa-learning-resilience-v1/);

const aiPlatform = read('docs/AI_PLATFORM.md');
assert.match(aiPlatform, /gemini-3\.5-flash/);
assert.match(aiPlatform, /GEMINI_API_KEY/);
assert.match(aiPlatform, /GROQ_API_KEY/);
assert.match(aiPlatform, /Groq実呼び出し:\s*未実装/);
assert.match(aiPlatform, /5教科共通Groq検証:\s*未実装/);
assert.match(aiPlatform, /Gemini generation|Gemini生成/);
assert.match(aiPlatform, /deterministic validation|決定的検証/);
assert.match(aiPlatform, /blind independent verification|独立解答/);

const workerReadme = read('worker/README.md');
assert.match(workerReadme, /gemini-3\.5-flash/);
assert.match(workerReadme, /GROQ_API_KEY/);
assert.match(workerReadme, /Groq実呼び出し:\s*\*\*まだ未実装\*\*/);

const wrangler = read('worker/wrangler.toml');
assert.match(wrangler, /GEMINI_MODEL\s*=\s*"gemini-3\.5-flash"/);

const aiDeploy = read('.github/workflows/deploy-ai-worker.yml');
assert.match(aiDeploy, /GEMINI_API_KEY:\s*\$\{\{\s*secrets\.GEMINI_API_KEY\s*\}\}/);
assert.match(aiDeploy, /GROQ_API_KEY:\s*\$\{\{\s*secrets\.GROQ_API_KEY\s*\}\}/);
assert.match(aiDeploy, /test -n "\$GROQ_API_KEY"/);

const pages = read('.github/workflows/deploy-pages.yml');
assert.match(pages, /paths-ignore:[\s\S]*PUBLIC_VERIFY_STATUS\.txt[\s\S]*DEPLOY_STATUS\.txt/);
assert.match(pages, /Verify actual public site/);
assert.match(pages, /public_verify/);

const registry = read('app/runtime-registry.js');
for (const asset of [
  'review-bank-v1.js',
  'review/index.html',
  'storage-resilience-v1.js',
  'login-companion-v1.js',
  'companion7-runtime.js'
]) assert.match(registry, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const storage = read('storage-resilience-v1.js');
assert.match(storage, /MAIN_KEY='asahi_learning_os_v1'/);
assert.match(storage, /LOCAL_BEST_KEY='aa-storage-best-v4'/);
assert.match(storage, /DB_NAME='asahigaoka-aa-os-storage'/);
assert.match(storage, /DB_STORE='snapshots'/);

console.log('Management contract OK: canonical docs, deployment path, storage ownership, protected assets, and AI secret/model state are consistent');
