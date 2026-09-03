import assert from 'node:assert/strict';
import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import {
  buildJapaneseBlindChunk,
  buildJapaneseVerifierPrompt,
  verifyJapaneseChunkAgreement,
  verifyJapaneseMajorWithGroq
} from '../japanese-exam/groq-verifier.mjs';

const pack = starterPacks[0];
const major = 3;
const visible = pack.passages.filter(passage => passage.role !== 'answer_only' && passage.major === major);
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };

function fixture() {
  return {
    pass: true,
    answers: pack.questions
      .map((question, questionIndex) => ({ question, questionIndex }))
      .filter(({ question }) => question.major === major)
      .map(({ question, questionIndex }) => ({
        questionIndex,
        ambiguous: false,
        confidence: 0.97,
        answerChoiceIndexes: question.answers.map(id => question.choices.findIndex(choice => choice.id === id)),
        markChoiceIndexes: [],
        evidence: question.skill === 'not_written'
          ? []
          : question.evidence
              .filter(item => visible.some(passage => passage.id === item.sourceId))
              .slice(0, 1)
              .map(item => ({
                passageIndex: visible.findIndex(passage => passage.id === item.sourceId),
                paragraph: item.paragraph,
                quote: item.quote
              }))
      }))
  };
}

const notWritten = pack.questions
  .map((question, questionIndex) => ({ question, questionIndex }))
  .find(({ question }) => question.major === major && question.skill === 'not_written');
check(Boolean(notWritten), 'fixture contains a not-written question');

const chunk = buildJapaneseBlindChunk(pack, major);
const prompt = buildJapaneseVerifierPrompt(chunk);
check(prompt.includes('For skill=not_written, evidence may be []'), 'prompt explicitly allows absence-based evidence');
check(prompt.includes('never invent a quote to prove that something is absent'), 'prompt forbids fabricated negative evidence');

const correctWithoutQuote = fixture();
check(verifyJapaneseChunkAgreement(pack, major, correctWithoutQuote).ok, 'correct not-written answer may omit positive quote');

const wrong = structuredClone(correctWithoutQuote);
const targetWrong = wrong.answers.find(answer => answer.questionIndex === notWritten.questionIndex);
targetWrong.answerChoiceIndexes = [0, 2];
check(!verifyJapaneseChunkAgreement(pack, major, wrong).ok, 'not-written question still rejects wrong answer');

const ambiguous = structuredClone(correctWithoutQuote);
ambiguous.answers.find(answer => answer.questionIndex === notWritten.questionIndex).ambiguous = true;
check(!verifyJapaneseChunkAgreement(pack, major, ambiguous).ok, 'not-written question still rejects ambiguity');

const lowConfidence = structuredClone(correctWithoutQuote);
lowConfidence.answers.find(answer => answer.questionIndex === notWritten.questionIndex).confidence = 0.79;
check(!verifyJapaneseChunkAgreement(pack, major, lowConfidence).ok, 'not-written question still rejects low confidence');

const fakeEvidence = structuredClone(correctWithoutQuote);
fakeEvidence.answers.find(answer => answer.questionIndex === notWritten.questionIndex).evidence = [
  { passageIndex: 0, paragraph: 1, quote: '本文には存在しない架空の引用' }
];
check(!verifyJapaneseChunkAgreement(pack, major, fakeEvidence).ok, 'fabricated quote is rejected rather than waived');

const missingEvidenceOnPositiveQuestion = structuredClone(correctWithoutQuote);
const positive = pack.questions
  .map((question, questionIndex) => ({ question, questionIndex }))
  .find(({ question }) => question.major === major && question.skill !== 'not_written');
missingEvidenceOnPositiveQuestion.answers.find(answer => answer.questionIndex === positive.questionIndex).evidence = [];
check(!verifyJapaneseChunkAgreement(pack, major, missingEvidenceOnPositiveQuestion).ok, 'positive-reading question still requires exact passage evidence');

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  requests.push(body);
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(correctWithoutQuote) } }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const result = await verifyJapaneseMajorWithGroq(
    { GROQ_API_KEY: 'test-groq-key', GROQ_MODEL: 'openai/gpt-oss-20b' },
    pack,
    major
  );
  check(result.major === 3 && result.questionCount === pack.questions.filter(question => question.major === 3).length, 'major-3 policy path verifies all questions');
  check(result.provider === 'groq' && result.model === 'openai/gpt-oss-20b', 'major-3 policy path preserves Groq provider/model');
  check(requests.length === 1, 'major-3 not-written policy requires no redundant retry');
  check(requests[0].max_completion_tokens === 3200 && requests[0].reasoning_effort === 'low', 'major-3 request preserves normal budget');
  check(!requests[0].messages[0].content.includes('"answers"'), 'blind request does not expose author answers');
} finally {
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({ ok: true, checks, policy: 'not-written-allows-empty-evidence-with-strict-answer-gates' }));
