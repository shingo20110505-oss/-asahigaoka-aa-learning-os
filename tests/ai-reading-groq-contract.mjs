import assert from 'node:assert/strict';
import { handleRequest } from '../worker/src/entry.mjs';
import { sanitizeRequest } from '../worker/src/index.mjs';

const request = sanitizeRequest({
  difficulty: 7,
  readingType: 'argument',
  assistMode: 'scaffold',
  allowedGrammar: ['basic', 'past', 'future', 'modal', 'infinitive', 'gerund', 'comparison', 'passive', 'presentPerfect', 'asMuchAs', 'asManyAs', 'participle', 'relativePronoun', 'indirectQuestion', 'presentPerfectProgressive', 'subjunctive'],
  weakSkills: [{ id: 'en.read.inference', label: '推論' }],
  weakWords: [{ word: 'evidence', meaningJa: '根拠' }],
  knownWords: ['student', 'evidence'],
  recentTopics: [],
  recentErrorTypes: []
});

const sentence = 'Students compared two plans and recorded clear evidence before they changed their final decision.';
const paragraph = Array.from({ length: 6 }, () => sentence).join(' ');
const passage = Array.from({ length: 4 }, () => paragraph).join('\n\n');
const types = ['detail', 'inference', 'cause', 'mainIdea', 'summary'];
const correct = [0, 1, 2, 3, 0];
const questions = types.map((type, index) => ({
  type,
  stemJa: `本文の内容に基づいて最も適切な選択肢を選びなさい。設問${index + 1}`,
  choices: [0, 1, 2, 3].map(choiceIndex => ({
    text: `The group selected plan ${String.fromCharCode(65 + choiceIndex)} after comparing the recorded evidence.`,
    reasonJa: choiceIndex === correct[index] ? '本文の根拠と一致するため正しいです。' : '本文の条件または因果関係と一致しません。'
  })),
  answerIndex: correct[index],
  explanationJa: '本文中の比較と記録された根拠を結び付けて判断します。',
  evidenceQuote: sentence
}));

const reading = {
  title: 'Comparing Two Community Plans',
  passage,
  translationJa: '生徒たちは二つの計画を比較し、最終的な判断を変える前に明確な根拠を記録しました。'.repeat(12),
  readingType: 'argument',
  topic: 'community planning',
  difficulty: 7,
  lessonJa: '最初の判断ではなく、比較して得た根拠に基づいて結論を更新することが重要です。',
  grammarTags: ['basic', 'past'],
  glossary: [
    { word: 'compare', meaningJa: '比較する' },
    { word: 'record', meaningJa: '記録する' },
    { word: 'evidence', meaningJa: '根拠' },
    { word: 'decision', meaningJa: '判断' }
  ],
  questions
};

const verification = {
  overallPass: true,
  answers: correct.map((answerIndex, questionIndex) => ({
    questionIndex,
    answerIndex,
    evidenceQuote: sentence,
    confidence: 0.91
  }))
};

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const body = JSON.parse(options.body || '{}');
  calls.push({ target, body, headers: options.headers || {} });

  if (target.includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({
      steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(reading) }] }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (target === 'https://api.groq.com/openai/v1/chat/completions') {
    return new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: JSON.stringify(verification) } }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  throw new Error(`Unexpected fetch target: ${target}`);
};

try {
  const statusRequest = new Request('https://worker.example/v1/status', {
    method: 'POST',
    headers: {
      origin: 'https://shingo20110505-oss.github.io',
      authorization: 'Bearer test-access-token-that-is-long-enough',
      'content-type': 'application/json'
    },
    body: '{}'
  });
  const env = {
    GEMINI_API_KEY: 'test-gemini-key',
    GROQ_API_KEY: 'test-groq-key',
    AI_ACCESS_TOKEN: 'test-access-token-that-is-long-enough',
    GEMINI_MODEL: 'gemini-3.5-flash',
    GROQ_MODEL: 'openai/gpt-oss-20b',
    ALLOWED_ORIGINS: 'https://shingo20110505-oss.github.io'
  };
  const statusResponse = await handleRequest(statusRequest, env);
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.ready, true);
  assert.equal(status.model, 'gemini-3.5-flash');
  assert.equal(status.verificationProvider, 'groq');
  assert.equal(status.verifierModel, 'openai/gpt-oss-20b');

  const workerRequest = new Request('https://worker.example/v1/reading', {
    method: 'POST',
    headers: {
      origin: 'https://shingo20110505-oss.github.io',
      authorization: 'Bearer test-access-token-that-is-long-enough',
      'content-type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  const response = await handleRequest(workerRequest, env);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.quality.verified, true);
  assert.equal(payload.quality.method, 'cross-provider-blind-answer-check');
  assert.equal(payload.quality.generationProvider, 'gemini');
  assert.equal(payload.quality.generationModel, 'gemini-3.5-flash');
  assert.equal(payload.quality.verificationProvider, 'groq');
  assert.equal(payload.quality.verificationModel, 'openai/gpt-oss-20b');

  assert.equal(calls.length, 2);
  assert.match(calls[0].target, /generativelanguage\.googleapis\.com/);
  assert.equal(calls[1].target, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[1].body.model, 'openai/gpt-oss-20b');
  assert.equal(calls[1].body.response_format?.type, 'json_schema');
  assert.equal(calls[1].body.response_format?.json_schema?.strict, true);
  assert.equal(calls[1].body.reasoning_effort, 'low');
  assert.equal(calls[1].body.include_reasoning, false);

  const blindInput = calls[1].body.messages?.find(item => item.role === 'user')?.content || '';
  assert.doesNotMatch(blindInput, /"answerIndex"\s*:/, 'Groq must not receive the author answer key');
  assert.doesNotMatch(blindInput, /explanationJa/, 'Groq must not receive author explanations');
  assert.doesNotMatch(blindInput, /reasonJa/, 'Groq must not receive author distractor reasons');
  assert.match(blindInput, /"passage"/);
  assert.match(blindInput, /"choices"/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI reading Groq contract OK: Gemini authors, Groq blindly verifies, answer keys remain hidden, and cross-provider metadata is returned');
