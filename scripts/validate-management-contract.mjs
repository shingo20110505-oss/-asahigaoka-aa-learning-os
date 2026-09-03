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
  'tests/ai-subject-verifier-contract.mjs',
  'tests/ai-exam-platform-contract.mjs',
  '.github/workflows/deploy-pages.yml',
  '.github/workflows/deploy-ai-worker.yml',
  'worker/README.md',
  'worker/wrangler.toml',
  'worker/src/entry.mjs',
  'worker/src/exam-platform.mjs',
  'worker/src/subject-verifier.mjs',
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
assert.match(aiPlatform, /共通subject validator interface:\s*5教科まで実装済み/);
assert.match(aiPlatform, /英語Groq blind verification:\s*本番コードへ接続済み/);
assert.match(aiPlatform, /Worker本番入口:\s*`worker\/src\/entry\.mjs`/);
assert.match(aiPlatform, /Workerソースversion:\s*`v1\.4\.0`/);
assert.match(aiPlatform, /数学Groq blind verification:\s*コード接続済み/);
assert.match(aiPlatform, /国語・理科・社会のGroq検証:\s*コード接続済み/);
assert.match(aiPlatform, /5教科共通Groq検証:\s*英語・数学・国語・理科・社会をコード接続済み/);
assert.match(aiPlatform, /POST \/v1\/exam/);
assert.match(aiPlatform, /Verified Question Pool永続保存:\s*未実装/);
assert.match(aiPlatform, /cross-provider-blind-answer-check/);
assert.match(aiPlatform, /deterministic-plus-cross-provider-blind-answer-check/);
assert.match(aiPlatform, /gemini-authoring-subject-deterministic-groq-blind-agreement/);
assert.match(aiPlatform, /tests\/ai-provider-contract\.mjs/);
assert.match(aiPlatform, /tests\/ai-reading-groq-contract\.mjs/);
assert.match(aiPlatform, /tests\/ai-subject-verifier-contract\.mjs/);
assert.match(aiPlatform, /tests\/ai-exam-platform-contract\.mjs/);

const workerReadme = read('worker/README.md');
assert.match(workerReadme, /gemini-3\.5-flash/);
assert.match(workerReadme, /openai\/gpt-oss-20b/);
assert.match(workerReadme, /GROQ_API_KEY/);
assert.match(workerReadme, /本番Worker入口:\s*`src\/entry\.mjs`/);
assert.match(workerReadme, /Workerソースversion:\s*`1\.4\.0`/);
assert.match(workerReadme, /英語の独立答え直し:\s*Groq/);
assert.match(workerReadme, /5教科共通Groq検証:\s*\*\*英語・数学・国語・理科・社会をコード接続済み\*\*/);
assert.match(workerReadme, /POST \/v1\/verify/);
assert.match(workerReadme, /POST \/v1\/exam/);
assert.match(workerReadme, /deterministic-plus-cross-provider-blind-answer-check/);
assert.match(workerReadme, /gemini-authoring-subject-deterministic-groq-blind-agreement/);
assert.match(workerReadme, /Verified Question Poolへの保存・再利用[^\n]*まだ/);

const entry = read('worker/src/entry.mjs');
assert.match(entry, /WORKER_VERSION = '1\.4\.0'/);
assert.match(entry, /callGeminiJson/);
assert.match(entry, /callGroqJson/);
assert.match(entry, /buildVerifierPrompt/);
assert.match(entry, /verifySubjectQuestion/);
assert.match(entry, /generateVerifiedExamBatch/);
assert.match(entry, /\/v1\/verify/);
assert.match(entry, /\/v1\/exam/);
assert.match(entry, /cross-provider-blind-answer-check/);
assert.match(entry, /verificationProvider:\s*verified\.provider/);
assert.match(entry, /verificationProvider:\s*'groq'/);
assert.match(entry, /production-audit/);
assert.match(entry, /paidFallback:\s*false/);
assert.match(entry, /quota429StopsGeneration:\s*true/);
assert.match(entry, /authorAnswerHiddenFromVerifier:\s*true/);
assert.match(entry, /groq_request_rejected/);
assert.doesNotMatch(entry, /GROQ_API_KEY\s*=/);
assert.doesNotMatch(entry, /GEMINI_API_KEY\s*=/);

const examPlatform = read('worker/src/exam-platform.mjs');
assert.match(examPlatform, /EXAM_PLATFORM_VERSION = '1\.0\.0'/);
assert.match(examPlatform, /EXAM_SUBJECTS = Object\.freeze\(\['english', 'math', 'japanese', 'science', 'social'\]\)/);
assert.match(examPlatform, /callGeminiJson/);
assert.match(examPlatform, /callGroqJson/);
assert.match(examPlatform, /stableExamItemId/);
assert.match(examPlatform, /recentQuestionIds/);
assert.match(examPlatform, /answer_disagreement/);
assert.match(examPlatform, /low_confidence/);
assert.match(examPlatform, /social_volatile_fact/);
assert.match(examPlatform, /language_evidence_not_exact/);
assert.match(examPlatform, /gemini-authoring-subject-deterministic-groq-blind-agreement/);
assert.doesNotMatch(examPlatform, /GROQ_API_KEY\s*=/);
assert.doesNotMatch(examPlatform, /GEMINI_API_KEY\s*=/);

const subjectVerifier = read('worker/src/subject-verifier.mjs');
assert.match(subjectVerifier, /SUBJECTS = Object\.freeze\(\['english', 'math', 'japanese', 'science', 'social'\]\)/);
assert.match(subjectVerifier, /callGroqJson/);
assert.match(subjectVerifier, /expectedAnswerIndex/);
assert.match(subjectVerifier, /deterministic-plus-cross-provider-blind-answer-check/);
assert.match(subjectVerifier, /confidenceThreshold\s*=\s*0\.8/);
assert.doesNotMatch(subjectVerifier, /GROQ_API_KEY\s*=/);
assert.doesNotMatch(subjectVerifier, /GEMINI_API_KEY\s*=/);

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
assert.match(groqProvider, /normalizeGroqSchema/);
assert.match(groqProvider, /minItems/);
assert.match(groqProvider, /minLength/);
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
assert.match(aiDeploy, /tests\/ai-subject-verifier-contract\.mjs/);
assert.match(aiDeploy, /tests\/ai-exam-platform-contract\.mjs/);
assert.match(aiDeploy, /EXPECTED_WORKER_VERSION='1\.4\.0'/);
assert.match(aiDeploy, /\/v1\/verify/);
assert.match(aiDeploy, /\/v1\/exam/);
assert.match(aiDeploy, /gemini-authoring-subject-deterministic-groq-blind-agreement/);

const groqContract = read('tests/ai-reading-groq-contract.mjs');
assert.match(groqContract, /Groq must not receive the author answer key/);
assert.match(groqContract, /Groq must not receive author explanations/);
assert.match(groqContract, /Groq must not receive author distractor reasons/);
assert.match(groqContract, /payload\.quality\.verificationProvider/);
assert.match(groqContract, /compatible strict schema/);
assert.match(groqContract, /cross-provider-blind-answer-check/);

const subjectContract = read('tests/ai-subject-verifier-contract.mjs');
assert.match(subjectContract, /expectedAnswerIndex/);
assert.match(subjectContract, /author-explanation-secret/);
assert.match(subjectContract, /author-choice-reason-secret/);
assert.match(subjectContract, /doesNotMatch\(blindInput/);
assert.match(subjectContract, /rise_\(english\|math\|japanese\|science\|social\)_blind_verification/);
assert.match(subjectContract, /deterministic-plus-cross-provider-blind-answer-check/);

const examContract = read('tests/ai-exam-platform-contract.mjs');
assert.match(examContract, /EXAM_SUBJECTS/);
assert.match(examContract, /stableExamItemId/);
assert.match(examContract, /language_evidence_not_exact/);
assert.match(examContract, /social_volatile_fact/);
assert.match(examContract, /Gemini authoring and Groq blind agreement/);
assert.match(examContract, /gemini-authoring-subject-deterministic-groq-blind-agreement/);

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

console.log('Management contract OK: canonical docs, deployment path, storage ownership, protected assets, and five-subject Phase 3 AI platform state are consistent');
