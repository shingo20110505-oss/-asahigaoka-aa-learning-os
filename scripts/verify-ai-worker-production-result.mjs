import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const health = readJson('/tmp/ai-health.json');
const status = readJson('/tmp/ai-status.json');
const reading = readJson('/tmp/ai-reading.json');
const math = readJson('/tmp/math-verify.json');
const exam = readJson('/tmp/ai-exam.json');

const geminiQuota = process.env.GEMINI_QUOTA_EXHAUSTED === 'true';
const groqQuota = process.env.GROQ_QUOTA_EXHAUSTED === 'true';
const readingVerified = process.env.READING_VERIFIED === 'true';
const mathVerified = process.env.MATH_VERIFIED === 'true';
const scienceVerified = process.env.SCIENCE_VERIFIED === 'true';
const subjects = ['english', 'math', 'japanese', 'science', 'social'];

if (health.ok !== true || health.version !== '1.4.0' || health.hardeningVersion !== '2.0.0' || health.geminiTransportRevision !== 'dual-transport-v4' || health.service !== 'rise-ai-platform') {
  throw new Error('Worker health verification failed');
}
if (status.ready !== true || status.version !== '1.4.0' || status.hardeningVersion !== '2.0.0' || status.geminiTransportRevision !== 'dual-transport-v4' || status.examPlatformVersion !== '2.0.0' || status.service !== 'rise-ai-platform') {
  throw new Error('Worker status verification failed');
}
if (status.model !== 'gemini-3.5-flash') throw new Error(`Unexpected Gemini model: ${status.model}`);
if (status.verificationProvider !== 'groq' || status.verifierModel !== 'openai/gpt-oss-20b') throw new Error('Groq verifier status mismatch');
for (const subject of subjects) {
  if (!String(status.examGeneration?.[subject] || '').startsWith('production')) throw new Error(`Exam generation status missing: ${subject}`);
  if (status.subjectVerification?.[subject] !== 'production-audit') throw new Error(`Subject verification status missing: ${subject}`);
}
if (
  status.safeguards?.paidFallback !== false ||
  status.safeguards?.quota429StopsGeneration !== true ||
  status.safeguards?.authorAnswerHiddenFromVerifier !== true ||
  status.safeguards?.strictVerifierFallbackDisabled !== true ||
  status.safeguards?.geminiSameProviderTransportFallback !== true ||
  status.safeguards?.providerDeadlines !== true ||
  status.safeguards?.originRequiredForApi !== true ||
  status.safeguards?.jsonContentTypeRequired !== true
) {
  throw new Error('AI safeguards status mismatch');
}

if (readingVerified) {
  if (reading.schemaVersion !== 1 || reading.quality?.verified !== true || reading.quality?.generationProvider !== 'gemini' || reading.quality?.verificationProvider !== 'groq' || !Array.isArray(reading.reading?.questions) || reading.reading.questions.length !== 5) {
    throw new Error('English AI quality verification failed');
  }
} else if (!geminiQuota && !groqQuota) {
  throw new Error('English reading was neither verified nor stopped by an expected free-provider quota');
}

if (mathVerified) {
  if (math.schemaVersion !== 1 || math.subject !== 'math' || math.accepted !== true || math.quality?.verified !== true || math.quality?.verificationProvider !== 'groq' || math.quality?.verifierMode !== 'json_schema') {
    throw new Error('Math strict Groq audit failed');
  }
} else if (!groqQuota) {
  throw new Error('Math verification was neither verified nor stopped by Groq quota');
}

if (scienceVerified) {
  if (exam.schemaVersion !== 1 || exam.subject !== 'science' || exam.deliveredCount < 1 || !Array.isArray(exam.items)) throw new Error('Science /v1/exam generation failed');
  const item = exam.items[0];
  if (item.subject !== 'science' || item.quality?.verified !== true) throw new Error('Science item was not quality verified');
  if (!/^rise-science-[0-9a-f]{16}$/.test(item.id) || !/^[0-9a-f]{16}$/.test(item.fingerprint || '')) throw new Error('Science stable identity missing');
  if (item.quality?.generationProvider !== 'gemini' || item.quality?.verificationProvider !== 'groq' || item.quality?.verifierMode !== 'json_schema' || item.quality?.strictStructuredOutput !== true) {
    throw new Error('Science strict provider provenance mismatch');
  }
  if (exam.quality?.method !== 'gemini-authoring-subject-deterministic-groq-blind-agreement' || !String(exam.quality?.hardening || '').includes('strict-groq-schema-no-fallback')) {
    throw new Error('Science agreement hardening marker missing');
  }
} else if (!geminiQuota && !groqQuota) {
  throw new Error('Science generation was neither verified nor stopped by an expected provider quota');
}

const geminiLine = geminiQuota ? 'quota exhausted -> generation stopped, pool fallback required (PASS)' : 'available';
const groqLine = groqQuota ? 'quota exhausted -> new items rejected (PASS)' : mathVerified ? 'strict live audit PASS' : 'available';
const summary = `## Rise AI Platform production gate\n\n- URL: ${process.env.DEPLOYMENT_URL || ''}\n- Worker: ${health.version} / hardening ${health.hardeningVersion}\n- Gemini transport revision: ${health.geminiTransportRevision}\n- Provider deadlines: enabled\n- Gemini: ${geminiLine}\n- Groq: ${groqLine}\n- English live end-to-end: ${readingVerified ? 'PASS' : 'skipped after expected quota'}\n- Math strict Groq audit: ${mathVerified ? 'PASS' : 'skipped after expected quota'}\n- Science live end-to-end: ${scienceVerified ? 'PASS' : 'skipped after expected quota'}\n- Paid fallback: disabled\n- Strict verifier downgrade: disabled\n- Quota handling: fail closed and stop further generation\n`;
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log('Rise AI production verification PASS');
