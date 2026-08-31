import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  READING_SCHEMA,
  VERIFIER_SCHEMA,
  auditGrammarLeak,
  constantTimeEqual,
  handleRequest,
  parseInteractionJson,
  sanitizeRequest,
  validateReading,
  verifyAgreement,
  wordRangeForDifficulty
} from '../worker/src/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const frontend = fs.readFileSync(path.join(root, 'ai-reading-v1.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'v23-loader.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.match(frontend, /aa_ai_reading_config_v1/);
assert.match(frontend, /Gemini生成・正答二重検査済み/);
assert.match(frontend, /translationJa/);
assert.doesNotMatch(frontend, /GEMINI_API_KEY\s*=/);
assert.match(loader, /'ai-reading-v1\.js'/);
assert.match(serviceWorker, /url\('ai-reading-v1\.js'\)/);

const request = sanitizeRequest({
  difficulty: 7,
  readingType: 'argument',
  assistMode: 'scaffold',
  allowedGrammar: ['basic', 'past', 'future', 'modal', 'infinitive', 'gerund', 'comparison', 'passive', 'presentPerfect', 'asMuchAs', 'asManyAs', 'participle', 'relativePronoun', 'indirectQuestion', 'presentPerfectProgressive', 'subjunctive'],
  weakSkills: [{ id: 'en.read.inference', label: '推論' }, { id: '../../bad', label: 'bad' }],
  weakWords: [{ word: 'evidence', meaningJa: '根拠' }, { word: '<script>', meaningJa: 'bad' }],
  knownWords: ['student', 'evidence', '<script>'],
  recentTopics: ['school garden'],
  recentErrorTypes: ['scope', '../bad']
});

assert.equal(request.difficulty, 7);
assert.equal(request.readingType, 'argument');
assert.deepEqual(request.weakSkills.map(item => item.id), ['en.read.inference']);
assert.deepEqual(request.weakWords.map(item => item.word), ['evidence']);
assert.deepEqual(request.knownWords, ['student', 'evidence']);
assert.deepEqual(wordRangeForDifficulty(7), { min: 300, max: 420 });

const sentence = 'Students compared two plans and recorded clear evidence before they changed their final decision.';
const paragraph = Array.from({ length: 6 }, () => sentence).join(' ');
const passage = Array.from({ length: 4 }, () => paragraph).join('\n\n');
assert.ok((passage.match(/[A-Za-z]+/g) || []).length >= 300);

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

const structural = validateReading(reading, request);
assert.equal(structural.ok, true, structural.errors.join(', '));
assert.equal(structural.wordCount, 336);

const verification = {
  overallPass: true,
  answers: correct.map((answerIndex, questionIndex) => ({
    questionIndex,
    answerIndex,
    evidenceQuote: sentence,
    confidence: 0.9
  }))
};
assert.deepEqual(verifyAgreement(reading, verification), { ok: true, errors: [] });

const disagreement = structuredClone(verification);
disagreement.answers[2].answerIndex = 1;
assert.equal(verifyAgreement(reading, disagreement).ok, false);

const badEvidence = structuredClone(reading);
badEvidence.questions[0].evidenceQuote = 'This sentence is not in the passage.';
assert.equal(validateReading(badEvidence, request).ok, false);

assert.deepEqual(auditGrammarLeak('The student who measured it returned.', ['basic']), ['relativePronoun']);
assert.equal(await constantTimeEqual('a-secure-token', 'a-secure-token'), true);
assert.equal(await constantTimeEqual('a-secure-token', 'a-different-token'), false);

const parsed = parseInteractionJson({
  steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"ok":true}' }] }]
});
assert.deepEqual(parsed, { ok: true });
assert.equal(READING_SCHEMA.properties.questions.minItems, 5);
assert.equal(VERIFIER_SCHEMA.properties.answers.maxItems, 5);

const originalFetch = globalThis.fetch;
const interactionRequests = [];
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  interactionRequests.push(body);
  const output = interactionRequests.length === 1 ? reading : verification;
  return new Response(JSON.stringify({
    steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(output) }] }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};
try {
  const workerRequest = new Request('https://worker.example/v1/reading', {
    method: 'POST',
    headers: {
      origin: 'https://shingo20110505-oss.github.io',
      authorization: 'Bearer test-access-token-that-is-long-enough',
      'content-type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  const response = await handleRequest(workerRequest, {
    GEMINI_API_KEY: 'test-gemini-key',
    AI_ACCESS_TOKEN: 'test-access-token-that-is-long-enough',
    GEMINI_MODEL: 'gemini-test',
    ALLOWED_ORIGINS: 'https://shingo20110505-oss.github.io'
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.quality.verified, true);
  assert.equal(payload.quality.method, 'independent-blind-answer-check');
  assert.equal(interactionRequests.length, 2);
  assert.equal(interactionRequests.every(item => item.response_format?.type === 'text'), true);
  assert.equal(interactionRequests.every(item => item.response_format?.mime_type === 'application/json'), true);
  assert.doesNotMatch(interactionRequests[1].input, /"answerIndex":\d/);
  assert.equal(interactionRequests.every(item => item.store === false), true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI reading contract OK: frontend isolation, Worker validation, exact evidence, blind-answer agreement, and constant-time token checks passed');
