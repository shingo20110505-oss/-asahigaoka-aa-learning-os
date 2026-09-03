import assert from 'node:assert/strict';
import {
  buildSubjectVerifierPrompt,
  sanitizeSubjectVerificationRequest,
  verifySubjectAgreement,
  verifySubjectQuestion
} from '../worker/src/subject-verifier.mjs';

const samples = {
  math: {
    stem: '1から4までのカードから2枚を続けて取り出し、戻さない。2数の積が偶数となる確率を選びなさい。',
    choices: ['5/6', '1/2', '2/3', '1'], expectedAnswerIndex: 0
  },
  science: {
    context: '同じ電熱線に3.0 Vを加えると0.50 Aの電流が流れた。温度変化は無視できる。',
    stem: 'この電熱線の抵抗を選びなさい。',
    choices: ['6.0 Ω', '3.0 Ω', '1.5 Ω', '0.17 Ω'], expectedAnswerIndex: 0
  },
  social: {
    context: '資料：1871年 廃藩置県、1889年 大日本帝国憲法発布、1894年 日清戦争。',
    stem: '資料の中で最も早い出来事を選びなさい。',
    choices: ['廃藩置県', '大日本帝国憲法発布', '日清戦争', '普通選挙法'], expectedAnswerIndex: 0
  },
  japanese: {
    context: '雨が上がると、健太は傘を閉じ、雲の切れ間から差す光を見て歩き出した。',
    stem: '健太の行動から最も適切に読み取れることを選びなさい。',
    choices: ['天気が回復してきたと判断した。', '雨が強くなると判断した。', '傘をなくした。', '帰宅を諦めた。'], expectedAnswerIndex: 0
  },
  english: {
    context: 'Ken: You missed the bus again. You should leave home earlier tomorrow.',
    stem: 'What does Ken advise?',
    choices: ['Leave home earlier.', 'Take a later bus.', 'Stay home.', 'Run less.'], expectedAnswerIndex: 0
  }
};

for (const [subject, item] of Object.entries(samples)) {
  const request = {
    schemaVersion: 1,
    subject,
    item: {
      id: `${subject}-contract-1`,
      ...item,
      explanation: 'author-explanation-secret',
      solutionSteps: ['author-step-secret'],
      choices: item.choices.map((text, index) => ({
        text,
        ok: index === item.expectedAnswerIndex,
        reason: `author-choice-reason-secret-${index}`
      }))
    }
  };
  const sanitized = sanitizeSubjectVerificationRequest(request);
  assert.equal(sanitized.subject, subject);
  assert.equal(sanitized.item.expectedAnswerIndex, 0);
  assert.equal('explanation' in sanitized.item, false);
  assert.equal('solutionSteps' in sanitized.item, false);
  assert.deepEqual(sanitized.item.choices, item.choices);

  const prompt = buildSubjectVerifierPrompt(sanitized);
  assert.doesNotMatch(prompt, /expectedAnswerIndex/);
  assert.doesNotMatch(prompt, /author-explanation-secret/);
  assert.doesNotMatch(prompt, /author-step-secret/);
  assert.doesNotMatch(prompt, /author-choice-reason-secret/);

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
}

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
  for (const subject of Object.keys(samples)) {
    const result = await verifySubjectQuestion({
      GROQ_API_KEY: 'test-groq-secret',
      GROQ_MODEL: 'openai/gpt-oss-20b'
    }, {
      subject,
      item: { id: `${subject}-live-contract`, ...samples[subject] }
    });
    assert.equal(result.subject, subject);
    assert.equal(result.accepted, true);
    assert.equal(result.quality.verified, true);
    assert.equal(result.quality.method, 'deterministic-plus-cross-provider-blind-answer-check');
    assert.equal(result.quality.verificationProvider, 'groq');
    assert.equal(result.quality.verificationModel, 'openai/gpt-oss-20b');
  }

  assert.equal(calls.length, 5);
  for (const call of calls) {
    assert.equal(call.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(call.headers.authorization, 'Bearer test-groq-secret');
    assert.equal(call.body.response_format.type, 'json_schema');
    assert.equal(call.body.response_format.json_schema.strict, true);
    assert.match(call.body.response_format.json_schema.name, /^rise_(english|math|japanese|science|social)_blind_verification$/);
    const blindInput = call.body.messages.find(message => message.role === 'user')?.content || '';
    assert.doesNotMatch(blindInput, /expectedAnswerIndex/);
    assert.doesNotMatch(blindInput, /author-explanation-secret/);
    assert.doesNotMatch(blindInput, /author-choice-reason-secret/);
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI subject verifier contract OK: English/math/Japanese/science/social use Groq blind solving without author answer leakage');
