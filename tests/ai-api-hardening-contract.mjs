import assert from 'node:assert/strict';
import {
  HARDENED_EXAM_SUBJECTS,
  buildHardenedBlindVerifierPrompt,
  generateHardenedVerifiedExamBatch,
  normalizeHardenedGeneratedItem,
  sanitizeHardenedExamRequest,
  semanticSimilarity,
  stableHardenedExamItemId,
  validateHardenedGeneratedItem,
  verifyHardenedAgreement
} from '../worker/src/exam-platform-hardened.mjs';
import {
  buildHardenedSubjectVerifierPrompt,
  sanitizeHardenedSubjectVerificationRequest,
  verifyHardenedSubjectQuestion
} from '../worker/src/subject-verifier-hardened.mjs';
import { handleHardenedRequest } from '../worker/src/entry-hardened.mjs';
import { GroqProviderError } from '../worker/src/providers/index.mjs';

const ORIGIN = 'https://shingo20110505-oss.github.io';
const TOKEN = 'test-access-token-1234567890-abcdef';
const ENV = Object.freeze({
  AI_ACCESS_TOKEN: TOKEN,
  GEMINI_API_KEY: 'gemini-test-key',
  GEMINI_MODEL: 'gemini-3.5-flash',
  GROQ_API_KEY: 'groq-test-key',
  GROQ_MODEL: 'openai/gpt-oss-20b',
  ALLOWED_ORIGINS: ORIGIN,
  ALLOW_LOCALHOST: 'false',
  ALLOW_NO_ORIGIN: 'false',
  EXPOSE_AI_DIAGNOSTICS: 'false'
});

const MATH = Object.freeze({
  skill: 'math.function',
  context: '',
  question: '関数 y＝2x² で、xが1から3まで増加するときの変化の割合を選びなさい。',
  choices: ['8', '4', '16', '6'],
  answerIndex: 0,
  explanation: 'yの増加量は18−2＝16、xの増加量は3−1＝2なので、16÷2＝8となる。',
  evidence: '16÷2＝8',
  misconception: 'yの増加量16だけを最終答案としてしまう',
  marks: 1
});

const SCIENCE = Object.freeze({
  skill: 'sci.physics.current',
  context: '実験では、同じ電熱線に3.0 Vを加えると0.50 A、6.0 Vを加えると1.00 Aの電流が流れた。温度変化は無視できるものとする。',
  question: 'この電熱線の抵抗として正しいものを選びなさい。',
  choices: ['6.0 Ω', '3.0 Ω', '0.17 Ω', '12 Ω'],
  answerIndex: 0,
  explanation: 'オームの法則より抵抗は電圧÷電流なので、3.0÷0.50＝6.0 Ωであり、6.0÷1.00でも6.0 Ωとなる。',
  evidence: '同じ電熱線に3.0 Vを加えると0.50 A',
  misconception: '電流を電圧で割ってしまう',
  marks: 1
});

const JAPANESE = Object.freeze({
  skill: 'ja.exam.inference',
  context: '雨が上がると、校庭にはまだ小さな水たまりが残っていた。健太は傘を閉じ、雲の切れ間から差す光を見て歩き出した。',
  question: '健太の行動から最も適切に読み取れることを選びなさい。',
  choices: ['天気が回復してきたと判断した。', '雨が強くなると判断した。', '校庭を走ることを諦めた。', '傘をなくしたことに気づいた。'],
  answerIndex: 0,
  explanation: '雨が上がり、傘を閉じて光を見て歩き出す一連の行動から、天気が回復してきたと判断したと読める。',
  evidence: '健太は傘を閉じ、雲の切れ間から差す光を見て歩き出した',
  misconception: '水たまりだけに注目し、雨が続くと誤読する',
  marks: 1
});

const SOCIAL = Object.freeze({
  skill: 'soc.history.timeline',
  context: '年表資料：①1871年 廃藩置県、②1889年 大日本帝国憲法の発布、③1894年 日清戦争、④1925年 普通選挙法の成立。',
  question: '年表資料から、最も早く起こった出来事を選びなさい。',
  choices: ['廃藩置県', '大日本帝国憲法の発布', '日清戦争', '普通選挙法の成立'],
  answerIndex: 0,
  explanation: '資料では廃藩置県が1871年で、1889年、1894年、1925年の出来事より早い。',
  evidence: '①1871年 廃藩置県',
  misconception: '明治期の出来事の年代順を混同する',
  marks: 1
});

for (const subject of HARDENED_EXAM_SUBJECTS) {
  const request = sanitizeHardenedExamRequest({ subject, count: 10, difficulty: 8, skill: `${subject}.aichi.application` });
  assert.equal(request.subject, subject);
  assert.equal(request.count, 10);
  assert.equal(request.difficulty, 8);
}

{
  const request = sanitizeHardenedExamRequest({ subject: 'math', count: 1, difficulty: 8, skill: MATH.skill });
  const original = normalizeHardenedGeneratedItem(MATH, request);
  assert.equal(original.answer, '8', 'choice rotation must preserve the semantic answer');
  assert.equal(validateHardenedGeneratedItem(original, request).ok, true);
  const reordered = normalizeHardenedGeneratedItem({ ...MATH, choices: ['16', '8', '6', '4'], answerIndex: 1 }, request);
  assert.equal(stableHardenedExamItemId('math', original), stableHardenedExamItemId('math', reordered), 'stable id must ignore choice order');
}

assert.equal(semanticSimilarity('同じ問題文です。', '同じ問題文です。'), 1);
assert.ok(semanticSimilarity('二次関数と図形の面積を求める。', '鎌倉幕府の成立について考える。') < 0.4);

{
  const request = sanitizeHardenedExamRequest({ subject: 'japanese', count: 1, difficulty: 8, skill: JAPANESE.skill });
  const invalid = normalizeHardenedGeneratedItem({ ...JAPANESE, evidence: '本文に存在しない根拠' }, request);
  assert.match(validateHardenedGeneratedItem(invalid, request).errors.join('|'), /evidence_not_exact_context_quote/);
}

{
  const request = sanitizeHardenedExamRequest({ subject: 'social', count: 1, difficulty: 8, skill: SOCIAL.skill });
  const volatile = normalizeHardenedGeneratedItem({ ...SOCIAL, question: '現在の首相について資料から正しいものを選びなさい。' }, request);
  assert.match(validateHardenedGeneratedItem(volatile, request).errors.join('|'), /social_volatile_fact/);
}

{
  const request = sanitizeHardenedExamRequest({ subject: 'science', count: 1, difficulty: 9, skill: SCIENCE.skill });
  const item = normalizeHardenedGeneratedItem(SCIENCE, request);
  assert.equal(validateHardenedGeneratedItem(item, request).ok, true);
  const blind = buildHardenedBlindVerifierPrompt('science', [item]);
  assert.doesNotMatch(blind, /answerIndex/);
  assert.doesNotMatch(blind, /オームの法則より抵抗/);
  assert.doesNotMatch(blind, /電流を電圧で割ってしまう/);
  assert.equal(verifyHardenedAgreement([item], { results: [{ id: item.id, overallPass: true, answerIndex: item.answerIndex, confidence: 0.96, ambiguity: false }] }, 'science').accepted.length, 1);
  assert.equal(verifyHardenedAgreement([item], { results: [{ id: item.id, overallPass: true, answerIndex: item.answerIndex, confidence: 0.89, ambiguity: false }] }, 'science').accepted.length, 0, 'science confidence below 0.90 must fail closed');
}

{
  const request = sanitizeHardenedSubjectVerificationRequest({
    subject: 'math',
    item: { id: 'math-contract', stem: MATH.question, choices: MATH.choices, expectedAnswerIndex: 0 }
  });
  const blind = buildHardenedSubjectVerifierPrompt(request);
  assert.doesNotMatch(blind, /expectedAnswerIndex/);
  assert.doesNotMatch(blind, /"answerIndex"\s*:\s*0/);
}

const originalFetch = globalThis.fetch;
let providerCalls = [];
let strictFailure = false;
globalThis.fetch = async (url, options) => {
  const href = String(url);
  const body = JSON.parse(options.body || '{}');
  providerCalls.push({ href, body });

  if (href.includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({ output_text: JSON.stringify({ items: [SCIENCE] }) }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (href === 'https://api.groq.com/openai/v1/chat/completions') {
    assert.equal(body.response_format?.type, 'json_schema');
    assert.equal(body.response_format?.json_schema?.strict, true);
    if (strictFailure) {
      return new Response(JSON.stringify({ error: { type: 'invalid_request_error', message: 'Failed to validate JSON.', failed_generation: '{"invalid":true}' } }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const user = body.messages.find(message => message.role === 'user')?.content || '';
    const name = body.response_format?.json_schema?.name || '';
    if (name.includes('exam_blind_hardened')) {
      const publicItems = JSON.parse(user.slice(user.lastIndexOf('[{')));
      const item = publicItems[0];
      const answerIndex = item.choices.indexOf('6.0 Ω');
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ results: [{ id: item.id, overallPass: true, answerIndex, confidence: 0.97, ambiguity: false }] }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (name.includes('math_blind_verification_hardened')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ overallPass: true, answerIndex: 0, confidence: 0.96, ambiguity: false }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }
  throw new Error(`Unexpected provider URL: ${href}`);
};

try {
  providerCalls = [];
  const batch = await generateHardenedVerifiedExamBatch(ENV, { subject: 'science', count: 1, difficulty: 9, skill: SCIENCE.skill, focus: ['実験', '計算'] });
  assert.equal(batch.deliveredCount, 1);
  assert.equal(batch.items[0].quality.verified, true);
  assert.equal(batch.items[0].quality.verifierMode, 'json_schema');
  assert.equal(batch.items[0].quality.strictStructuredOutput, true);
  assert.match(batch.quality.hardening, /strict-groq-schema-no-fallback/);
  assert.equal(providerCalls.filter(call => call.href.includes('api.groq.com')).length, 1);

  providerCalls = [];
  const verified = await verifyHardenedSubjectQuestion(ENV, {
    subject: 'math', item: { id: 'math-live-contract', stem: MATH.question, choices: MATH.choices, expectedAnswerIndex: 0 }
  });
  assert.equal(verified.accepted, true);
  assert.equal(verified.quality.verifierMode, 'json_schema');
  const verifierRequest = providerCalls.find(call => call.href.includes('api.groq.com')).body;
  assert.equal(verifierRequest.reasoning_effort, 'medium');
  assert.equal(verifierRequest.response_format.type, 'json_schema');
  assert.doesNotMatch(verifierRequest.messages.map(message => message.content).join('\n'), /expectedAnswerIndex/);

  providerCalls = [];
  strictFailure = true;
  await assert.rejects(
    () => verifyHardenedSubjectQuestion(ENV, {
      subject: 'math', item: { id: 'math-strict-failure', stem: MATH.question, choices: MATH.choices, expectedAnswerIndex: 0 }
    }),
    error => error instanceof GroqProviderError && error.code === 'groq_failed_generation'
  );
  assert.equal(providerCalls.filter(call => call.href.includes('api.groq.com')).length, 1, 'strict verifier must not downgrade to json_object');
  strictFailure = false;
} finally {
  globalThis.fetch = originalFetch;
}

{
  const health = await handleHardenedRequest(new Request('https://worker.test/health'), ENV);
  const body = await health.json();
  assert.equal(health.status, 200);
  assert.equal(body.version, '1.4.0');
  assert.equal(body.hardeningVersion, '2.0.0');
}

{
  const response = await handleHardenedRequest(new Request('https://worker.test/v1/status', {
    method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: '{}'
  }), ENV);
  assert.equal(response.status, 403, 'origin must be required for API routes');
}

{
  const response = await handleHardenedRequest(new Request('https://worker.test/v1/status', {
    method: 'POST', headers: { origin: ORIGIN, authorization: `Bearer ${TOKEN}`, 'content-type': 'text/plain' }, body: '{}'
  }), ENV);
  assert.equal(response.status, 415, 'application/json must be required');
}

{
  const response = await handleHardenedRequest(new Request('https://worker.test/v1/status', {
    method: 'POST', headers: { origin: ORIGIN, authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: '{}'
  }), ENV);
  const status = await response.json();
  assert.equal(response.status, 200);
  assert.equal(status.ready, true);
  assert.equal(status.version, '1.4.0');
  assert.equal(status.hardeningVersion, '2.0.0');
  assert.equal(status.examPlatformVersion, '2.0.0');
  assert.equal(status.safeguards.paidFallback, false);
  assert.equal(status.safeguards.quota429StopsGeneration, true);
  assert.equal(status.safeguards.authorAnswerHiddenFromVerifier, true);
  assert.equal(status.safeguards.strictVerifierFallbackDisabled, true);
  for (const subject of HARDENED_EXAM_SUBJECTS) {
    assert.match(status.examGeneration[subject], /^production/);
    assert.equal(status.subjectVerification[subject], 'production-audit');
  }
}

console.log('Rise AI hardening contract OK: strict five-subject verification, stable identities, choice rotation, semantic dedupe, origin/application/json security gates and legacy-compatible status passed');
