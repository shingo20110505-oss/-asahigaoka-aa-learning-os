import assert from 'node:assert/strict';
import {
  SubjectVerificationError,
  buildSubjectVerifierPrompt,
  sanitizeSubjectVerificationRequest,
  verifySubjectAgreement,
  verifySubjectQuestion
} from '../worker/src/subject-verifier.mjs';

const request = {
  schemaVersion: 1,
  subject: 'math',
  item: {
    id: 'math-contract-1',
    stem: '1から4までのカードから2枚を続けて取り出し、戻さない。2数の積が偶数となる確率を選びなさい。',
    choices: [
      { text: '5/6', ok: true, reason: 'author-correct-reason-secret' },
      { text: '1/2', ok: false, reason: 'author-wrong-reason-secret-1' },
      { text: '2/3', ok: false, reason: 'author-wrong-reason-secret-2' },
      { text: '1', ok: false, reason: 'author-wrong-reason-secret-3' }
    ],
    expectedAnswerIndex: 0,
    explanation: 'author-explanation-secret',
    solutionSteps: ['author-step-secret'],
    figure: null
  }
};

const sanitized = sanitizeSubjectVerificationRequest(request);
assert.equal(sanitized.subject, 'math');
assert.equal(sanitized.item.expectedAnswerIndex, 0);
assert.deepEqual(sanitized.item.choices, ['5/6', '1/2', '2/3', '1']);
assert.equal('explanation' in sanitized.item, false);
assert.equal('solutionSteps' in sanitized.item, false);

const prompt = buildSubjectVerifierPrompt(sanitized);
assert.match(prompt, /Japanese junior-high-school entrance-exam mathematics item/);
assert.doesNotMatch(prompt, /expectedAnswerIndex/);
assert.doesNotMatch(prompt, /author-explanation-secret/);
assert.doesNotMatch(prompt, /author-correct-reason-secret/);
assert.doesNotMatch(prompt, /author-wrong-reason-secret/);

assert.deepEqual(verifySubjectAgreement(sanitized, {
  overallPass: true,
  answerIndex: 0,
  confidence: 0.94,
  ambiguity: false
}), { ok: true, errors: [] });

assert.equal(verifySubjectAgreement(sanitized, {
  overallPass: true,
  answerIndex: 2,
  confidence: 0.94,
  ambiguity: false
}).ok, false);

assert.equal(verifySubjectAgreement(sanitized, {
  overallPass: true,
  answerIndex: 0,
  confidence: 0.4,
  ambiguity: false
}).ok, false);

await assert.rejects(
  () => verifySubjectQuestion({ GROQ_API_KEY: 'x' }, { subject: 'science', item: request.item }),
  error => error instanceof SubjectVerificationError && error.code === 'subject_not_supported'
);

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  calls.push({ url: String(url), body, headers: options.headers });
  return new Response(JSON.stringify({
    choices: [{
      message: {
        role: 'assistant',
        content: JSON.stringify({ overallPass: true, answerIndex: 0, confidence: 0.93, ambiguity: false })
      }
    }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const result = await verifySubjectQuestion({
    GROQ_API_KEY: 'test-groq-secret',
    GROQ_MODEL: 'openai/gpt-oss-20b'
  }, request);

  assert.equal(result.subject, 'math');
  assert.equal(result.accepted, true);
  assert.equal(result.quality.verified, true);
  assert.equal(result.quality.method, 'deterministic-plus-cross-provider-blind-answer-check');
  assert.equal(result.quality.verificationProvider, 'groq');
  assert.equal(result.quality.verificationModel, 'openai/gpt-oss-20b');
  assert.equal(calls.length, 1);

  const groq = calls[0];
  assert.equal(groq.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(groq.headers.authorization, 'Bearer test-groq-secret');
  assert.equal(groq.body.response_format.type, 'json_schema');
  assert.equal(groq.body.response_format.json_schema.strict, true);
  assert.equal(groq.body.response_format.json_schema.name, 'rise_math_blind_verification');
  assert.equal(groq.body.include_reasoning, false);
  assert.equal(groq.body.reasoning_effort, 'low');

  const blindInput = groq.body.messages.find(message => message.role === 'user')?.content || '';
  assert.doesNotMatch(blindInput, /expectedAnswerIndex/);
  assert.doesNotMatch(blindInput, /author-explanation-secret/);
  assert.doesNotMatch(blindInput, /author-correct-reason-secret/);
  assert.doesNotMatch(blindInput, /author-wrong-reason-secret/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI subject verifier contract OK: math uses deterministic-first metadata plus Groq blind solving without author answer leakage');
