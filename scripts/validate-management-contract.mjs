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
  'tests/ai-provider-contract.mjs',
  'tests/ai-reading-groq-contract.mjs',
  '.github/workflows/deploy-pages.yml',
  '.github/workflows/deploy-ai-worker.yml',
  'worker/README.md',
  'worker/wrangler.toml',
  'worker/src/entry.mjs',
  'worker/src/providers/index.mjs',
  'worker/src/providers/gemini.mjs',
  'worker/src/providers/groq.mjs',
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
assert.match(aiPlatform, /openai\/gpt-oss-20b/);
assert.match(aiPlatform, /GEMINI_API_KEY/);
assert.match(aiPlatform, /GROQ_API_KEY/);
assert.match(aiPlatform, /共通provider interface:\s*実装済み/);
assert.match(aiPlatform, /英語Groq blind verification:\s*本番コードへ接続済み/);
assert.match(aiPlatform, /英語Worker本番入口:\s*`worker\/src\/entry\.mjs`/);
assert.match(aiPlatform, /数学・国語・理科・社会のGroq検証:\s*未接続/);
assert.match(aiPlatform, /5教科共通Groq検証:\s*英語のみ接続済み/);
assert.match(aiPlatform, /cross-provider-blind-answer-check/);
assert.match(aiPlatform, /tests\/ai-provider-contract\.mjs/);
assert.match(aiPlatform, /tests\/ai-reading-groq-contract\.mjs/);

const workerReadme = read('worker/README.md');
assert.match(workerReadme, /gemini-3\.5-flash/);
assert.match(workerReadme, /openai\/gpt-oss-20b/);
assert.match(workerReadme, /GROQ_API_KEY/);
assert.match(workerReadme, /本番Worker入口:\s*`src\/entry\.mjs`/);
assert.match(workerReadme, /英語の独立答え直し:\s*Groq/);
assert.match(workerReadme, /5教科共通Groq検証:\s*\*\*英語のみ本番稼働、数学・国語・理科・社会は未接続\*\*/);
assert.match(workerReadme, /cross-provider-blind-answer-check/);

const entry = read('worker/src/entry.mjs');
assert.match(entry, /WORKER_VERSION = '1\.2\.0'/);
assert.match(entry, /callGeminiJson/);
assert.match(entry, /callGroqJson/);
assert.match(entry, /buildVerifierPrompt/);
assert.match(entry, /cross-provider-blind-answer-check/);
assert.match(entry, /verificationProvider:\s*verified\.provider/);
assert.match(entry, /verificationProvider:\s*'groq'/);
assert.doesNotMatch(entry, /GROQ_API_KEY\s*=/);
assert.doesNotMatch(entry, /GEMINI_API_KEY\s*=/);

const providerIndex = read('worker/src/providers/index.mjs');
assert.match(providerIndex, /callStructuredProvider/);
assert.match(providerIndex, /getProviderStatus/);
assert.match(providerIndex, /gemini/);
assert.match(providerIndex, /groq/);

const geminiProvider = read('worker/src/providers/gemini.mjs');
assert.match(geminiProvider, /gemini-3\.5-flash/);
assert.match(geminiProvider, /GEMINI_API_KEY/);
assert.doesNotMatch(geminiProvider, /GROQ_API_KEY/);

const groqProvider = read('worker/src/providers/groq.mjs');
assert.match(groqProvider, /openai\/gpt-oss-20b/);
assert.match(groqProvider, /GROQ_API_KEY/);
assert.match(groqProvider, /api\.groq\.com\/openai\/v1\/chat\/completions/);
assert.match(groqProvider, /json_schema/);
assert.match(groqProvider, /include_reasoning:\s*false/);
assert.doesNotMatch(groqProvider, /GEMINI_API_KEY/);

const wrangler = read('worker/wrangler.toml');
assert.match(wrangler, /main\s*=\s*"src\/entry\.mjs"/);
assert.match(wrangler, /GEMINI_MODEL\s*=\s*"gemini-3\.5-flash"/);
assert.match(wrangler, /GROQ_MODEL\s*=\s*"openai\/gpt-oss-20b"/);

const aiDeploy = read('.github/workflows/deploy-ai-worker.yml');
assert.match(aiDeploy, /GEMINI_API_KEY:\s*\$\{\{\s*secrets\.GEMINI_API_KEY\s*\}\}/);
assert.match(aiDeploy, /GROQ_API_KEY:\s*\$\{\{\s*secrets\.GROQ_API_KEY\s*\}\}/);
assert.match(aiDeploy, /test -n "\$GROQ_API_KEY"/);
assert.match(aiDeploy, /tests\/ai-provider-contract\.mjs/);
assert.match(aiDeploy, /tests\/ai-reading-groq-contract\.mjs/);
assert.match(aiDeploy, /EXPECTED_WORKER_VERSION='1\.2\.0'/);
assert.match(aiDeploy, /cross-provider-blind-answer-check/);

const groqContract = read('tests/ai-reading-groq-contract.mjs');
assert.match(groqContract, /doesNotMatch\(blindInput, \/\\"answerIndex/);
assert.match(groqContract, /doesNotMatch\(blindInput, \/explanationJa/);
assert.match(groqContract, /doesNotMatch\(blindInput, \/reasonJa/);
assert.match(groqContract, /verificationProvider, 'groq'/);

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

console.log('Management contract OK: canonical docs, deployment path, storage ownership, protected assets, and cross-provider AI state are consistent');
