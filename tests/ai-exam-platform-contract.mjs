import assert from 'node:assert/strict';
import {
  EXAM_SUBJECTS,
  buildExamBlindVerifierPrompt,
  generateVerifiedExamBatch,
  normalizeGeneratedExamItem,
  sanitizeExamGenerationRequest,
  stableExamItemId,
  validateGeneratedExamItem,
  verifyExamBatchAgreement
} from '../worker/src/exam-platform.mjs';

const validRaw = {
  english: {
    skill: 'en.exam.dialogue',
    context: 'Mika: I missed the bus this morning. Ken: Then you should leave home ten minutes earlier tomorrow.',
    question: 'What does Ken advise Mika to do?',
    choices: ['Leave home earlier.', 'Take a later bus.', 'Stay at home.', 'Walk ten minutes less.'],
    answerIndex: 0,
    explanation: 'Ken explicitly says she should leave home ten minutes earlier tomorrow.',
    evidence: 'you should leave home ten minutes earlier tomorrow',
    misconception: 'confusing the missed bus with advice to take a later bus',
    marks: 1
  },
  math: {
    skill: 'math.function',
    context: '',
    question: '関数 y＝2x² で、xが1から3まで増加するときの変化の割合を選びなさい。',
    choices: ['8', '4', '16', '6'],
    answerIndex: 0,
    explanation: 'yの増加量は18−2＝16、xの増加量は2なので、変化の割合は8である。',
    evidence: '16÷2＝8',
    misconception: 'yの増加量だけを答える',
    marks: 1
  },
  japanese: {
    skill: 'ja.exam.inference',
    context: '雨が上がると、校庭にはまだ小さな水たまりが残っていた。健太は傘を閉じ、雲の切れ間から差す光を見て歩き出した。',
    question: '健太の行動から最も適切に読み取れることを選びなさい。',
    choices: ['天気が回復してきたと判断した。', '雨が強くなると判断した。', '校庭を走ることを諦めた。', '傘をなくしたことに気づいた。'],
    answerIndex: 0,
    explanation: '雨が上がり、傘を閉じ、光を見て歩き出しているため、天気の回復を判断したと読める。',
    evidence: '健太は傘を閉じ、雲の切れ間から差す光を見て歩き出した',
    misconception: '水たまりだけに注目して雨が続くと判断する',
    marks: 1
  },
  science: {
    skill: 'sci.physics.current',
    context: '同じ電熱線に3.0 Vを加えると0.50 A、6.0 Vを加えると1.00 Aの電流が流れた。温度変化は無視できるものとする。',
    question: 'この電熱線の抵抗として正しいものを選びなさい。',
    choices: ['6.0 Ω', '3.0 Ω', '0.17 Ω', '12 Ω'],
    answerIndex: 0,
    explanation: 'オームの法則より3.0÷0.50＝6.0 Ωで、6.0÷1.00でも同じ値になる。',
    evidence: '3.0 Vを加えると0.50 A',
    misconception: '電流を電圧で割ってしまう',
    marks: 1
  },
  social: {
    skill: 'soc.history.timeline',
    context: '資料：①廃藩置県 ②大日本帝国憲法の発布 ③日清戦争 ④普通選挙法の成立',
    question: '最も早く起こった出来事を選びなさい。',
    choices: ['廃藩置県', '大日本帝国憲法の発布', '日清戦争', '普通選挙法の成立'],
    answerIndex: 0,
    explanation: '廃藩置県は1871年で、他の3つより前である。',
    evidence: '①廃藩置県',
    misconception: '明治期の出来事の年代順を混同する',
    marks: 1
  }
};

for (const subject of EXAM_SUBJECTS) {
  const request = sanitizeExamGenerationRequest({ subject, count: 1, difficulty: 8, skill: validRaw[subject].skill });
  assert.equal(request.subject, subject);
  assert.equal(request.count, 1);
  assert.equal(request.difficulty, 8);
  const item = normalizeGeneratedExamItem(validRaw[subject], request);
  assert.equal(validateGeneratedExamItem(item, request).ok, true, `${subject} deterministic validation should pass`);
  assert.equal(item.id, stableExamItemId(subject, item));
}

{
  const request = sanitizeExamGenerationRequest({ subject: 'math', count: 1, difficulty: 8 });
  const duplicate = normalizeGeneratedExamItem({ ...validRaw.math, choices: ['8', '8', '16', '6'] }, request);
  assert.equal(validateGeneratedExamItem(duplicate, request).ok, false);
}
{
  const request = sanitizeExamGenerationRequest({ subject: 'japanese', count: 1, difficulty: 8 });
  const badEvidence = normalizeGeneratedExamItem({ ...validRaw.japanese, evidence: '本文に存在しない根拠' }, request);
  assert.match(validateGeneratedExamItem(badEvidence, request).errors.join('|'), /language_evidence_not_exact/);
}
{
  const request = sanitizeExamGenerationRequest({ subject: 'social', count: 1, difficulty: 8 });
  const volatile = normalizeGeneratedExamItem({
    ...validRaw.social,
    question: '現在の首相について正しい説明を選びなさい。'
  }, request);
  assert.match(validateGeneratedExamItem(volatile, request).errors.join('|'), /social_volatile_fact/);
}

{
  const request = sanitizeExamGenerationRequest({ subject: 'science', count: 1, difficulty: 8, skill: validRaw.science.skill });
  const item = normalizeGeneratedExamItem(validRaw.science, request);
  const prompt = buildExamBlindVerifierPrompt('science', [item]);
  assert.doesNotMatch(prompt, /answerIndex/);
  assert.doesNotMatch(prompt, /オームの法則より/);
  assert.doesNotMatch(prompt, /電流を電圧で割ってしまう/);
  assert.deepEqual(verifyExamBatchAgreement([item], { results: [{ id: item.id, overallPass: true, answerIndex: 0, confidence: 0.95, ambiguity: false }] }).accepted.length, 1);
  assert.equal(verifyExamBatchAgreement([item], { results: [{ id: item.id, overallPass: true, answerIndex: 2, confidence: 0.95, ambiguity: false }] }).accepted.length, 0);
}

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
  const href = String(url);
  const body = JSON.parse(options.body);
  calls.push({ href, body, headers: options.headers });

  if (href.includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({ output_text: JSON.stringify({ items: [validRaw.science] }) }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (href === 'https://api.groq.com/openai/v1/chat/completions') {
    const user = body.messages.find(message => message.role === 'user')?.content || '';
    const match = user.match(/rise-science-[0-9a-f]{16}/);
    assert.ok(match, 'blind verifier request must contain generated stable id');
    assert.doesNotMatch(user, /answerIndex/);
    assert.doesNotMatch(user, /オームの法則より/);
    assert.doesNotMatch(user, /電流を電圧で割ってしまう/);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            results: [{ id: match[0], overallPass: true, answerIndex: 0, confidence: 0.96, ambiguity: false }]
          })
        }
      }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  throw new Error(`Unexpected provider URL: ${href}`);
};

try {
  const result = await generateVerifiedExamBatch({
    GEMINI_API_KEY: 'gemini-test-key',
    GEMINI_MODEL: 'gemini-3.5-flash',
    GROQ_API_KEY: 'groq-test-key',
    GROQ_MODEL: 'openai/gpt-oss-20b'
  }, {
    subject: 'science',
    count: 1,
    difficulty: 8,
    skill: 'sci.physics.current',
    focus: ['実験', '計算']
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.subject, 'science');
  assert.equal(result.requestedCount, 1);
  assert.equal(result.deliveredCount, 1);
  assert.equal(result.partial, false);
  assert.equal(result.items[0].subject, 'science');
  assert.equal(result.items[0].answerIndex, 0);
  assert.equal(result.items[0].answer, '6.0 Ω');
  assert.equal(result.items[0].quality.verified, true);
  assert.equal(result.items[0].quality.generationProvider, 'gemini');
  assert.equal(result.items[0].quality.generationModel, 'gemini-3.5-flash');
  assert.equal(result.items[0].quality.verificationProvider, 'groq');
  assert.equal(result.items[0].quality.verificationModel, 'openai/gpt-oss-20b');
  assert.equal(result.quality.method, 'gemini-authoring-subject-deterministic-groq-blind-agreement');
  assert.equal(calls.length, 2);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI exam platform contract OK: five-subject requests, deterministic gates, stable IDs, Gemini authoring and Groq blind agreement');
