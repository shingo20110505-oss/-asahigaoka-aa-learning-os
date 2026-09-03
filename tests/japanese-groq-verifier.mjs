import assert from 'node:assert/strict';
import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import {
  JAPANESE_GROQ_SCHEMA,
  buildJapaneseBlindChunk,
  buildJapaneseFocusedRetryChunk,
  buildJapaneseFocusedRetryPrompt,
  buildJapaneseVerifierPrompt,
  validateJapaneseVerifierShape,
  verifyJapaneseChunkAgreement,
  verifyJapaneseMajorWithGroq,
  verifyJapanesePackWithGroq
} from '../japanese-exam/groq-verifier.mjs';

const pack = starterPacks[0];
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };

function fixtureForMajor(major) {
  const visible = pack.passages.filter(p => p.role !== 'answer_only' && p.major === major);
  return {
    pass: true,
    answers: pack.questions.map((question, questionIndex) => ({ question, questionIndex }))
      .filter(({ question }) => question.major === major)
      .map(({ question, questionIndex }) => {
        const structured = Array.isArray(question.marks);
        const evidence = major === 2 ? [] : question.evidence
          .filter(item => visible.some(p => p.id === item.sourceId))
          .slice(0, 2)
          .map(item => ({
            passageIndex: visible.findIndex(p => p.id === item.sourceId),
            paragraph: item.paragraph,
            quote: item.quote
          }));
        return {
          questionIndex,
          ambiguous: false,
          confidence: 0.97,
          answerChoiceIndexes: structured ? [] : question.answers.map(id => question.choices.findIndex(choice => choice.id === id)),
          markChoiceIndexes: structured ? question.marks.map(mark => question.choices.findIndex(choice => choice.id === mark.answer)) : [],
          evidence
        };
      })
  };
}

for (const major of [1, 2, 3, 4]) {
  const chunk = buildJapaneseBlindChunk(pack, major);
  check(chunk.major === major, `major ${major} chunk`);
  check(chunk.questions.length === pack.questions.filter(q => q.major === major).length, `major ${major} question count`);
  check(chunk.questions.every(q => typeof q.skill === 'string' && q.skill.length > 0), `major ${major} exposes skill without answer metadata`);
  check(chunk.questions.every(q => q.choices.every(choice => typeof choice === 'string')), `major ${major} choices are text only`);
  check(chunk.questions.every(q => q.marks.every(mark => typeof mark === 'string')), `major ${major} marks expose labels only`);
  const serialized = JSON.stringify(chunk);
  for (const forbidden of ['"answers"', '"answer"', '"relation"', '"explanation"', '"errorSpan"', '"proposition"', '"scoring"', '"evidence"']) {
    check(!serialized.includes(forbidden), `major ${major} blind input excludes ${forbidden}`);
  }
  const prompt = buildJapaneseVerifierPrompt(chunk);
  check(prompt.endsWith(serialized), `major ${major} prompt contains exact blind payload`);
  check(prompt.includes('Return one valid JSON object'), `major ${major} explicitly requests JSON object`);
  check(prompt.includes('marks are literal answer slots'), `major ${major} prompt explains structured mark semantics`);
  check(prompt.includes('skill=connective_relation'), `major ${major} prompt explains connective-relation solving`);
  const fixture = fixtureForMajor(major);
  check(validateJapaneseVerifierShape(fixture).ok, `major ${major} local output shape passes`);
  check(verifyJapaneseChunkAgreement(pack, major, fixture).ok, `major ${major} agreement passes`);

  const extraKey = structuredClone(fixture);
  extraKey.answers[0].extra = 'forbidden';
  check(!validateJapaneseVerifierShape(extraKey).ok, `major ${major} rejects extra output key`);
  check(!verifyJapaneseChunkAgreement(pack, major, extraKey).ok, `major ${major} shape gate runs before agreement`);

  const invalidType = structuredClone(fixture);
  invalidType.answers[0].confidence = '0.97';
  check(!validateJapaneseVerifierShape(invalidType).ok, `major ${major} rejects coerced confidence`);

  const lowConfidence = structuredClone(fixture);
  lowConfidence.answers[0].confidence = 0.79;
  check(!verifyJapaneseChunkAgreement(pack, major, lowConfidence).ok, `major ${major} rejects low confidence`);

  const ambiguous = structuredClone(fixture);
  ambiguous.answers[0].ambiguous = true;
  check(!verifyJapaneseChunkAgreement(pack, major, ambiguous).ok, `major ${major} rejects ambiguity`);

  const firstQuestion = pack.questions.find(q => q.major === major);
  const mismatch = structuredClone(fixture);
  if (firstQuestion.marks) mismatch.answers[0].markChoiceIndexes[0] = (mismatch.answers[0].markChoiceIndexes[0] + 1) % firstQuestion.choices.length;
  else mismatch.answers[0].answerChoiceIndexes = [(mismatch.answers[0].answerChoiceIndexes[0] + 1) % firstQuestion.choices.length];
  check(!verifyJapaneseChunkAgreement(pack, major, mismatch).ok, `major ${major} rejects wrong independent answer`);

  if (major !== 2) {
    const firstWithEvidence = fixture.answers.find(answer => answer.evidence.length > 0);
    if (firstWithEvidence) {
      const shiftedParagraph = structuredClone(fixture);
      const shifted = shiftedParagraph.answers.find(answer => answer.questionIndex === firstWithEvidence.questionIndex);
      shifted.evidence[0].paragraph = shifted.evidence[0].paragraph === 1 ? 2 : 1;
      check(verifyJapaneseChunkAgreement(pack, major, shiftedParagraph).ok, `major ${major} accepts exact quote when paragraph numbering is slightly wrong`);
    }

    const fakeQuote = structuredClone(fixture);
    fakeQuote.answers[0].evidence = [{ passageIndex: 0, paragraph: 1, quote: '本文に存在しない検証用引用' }];
    check(!verifyJapaneseChunkAgreement(pack, major, fakeQuote).ok, `major ${major} rejects fabricated evidence`);

    const noEvidence = structuredClone(fixture);
    noEvidence.answers[0].evidence = [];
    check(!verifyJapaneseChunkAgreement(pack, major, noEvidence).ok, `major ${major} rejects missing evidence`);
  }
}

const structuredQuestion = pack.questions.find(question => question.major === 1 && Array.isArray(question.marks));
const focusedChunk = buildJapaneseFocusedRetryChunk(pack, 1, structuredQuestion.id);
check(focusedChunk.focused === true, 'focused retry chunk is explicitly marked');
check(focusedChunk.questions.length === 1, 'focused retry contains exactly one question');
check(focusedChunk.questions[0].questionIndex === pack.questions.indexOf(structuredQuestion), 'focused retry preserves original question index');
check(!JSON.stringify(focusedChunk).includes('"answers"'), 'focused retry remains blind to answer key');
check(!JSON.stringify(focusedChunk).includes('"explanation"'), 'focused retry remains blind to explanations');
check(focusedChunk.passages.some(passage => passage.paragraphs.some(paragraph => paragraph.includes('【X】'))), 'focused retry retains marked passage context');
const focusedPrompt = buildJapaneseFocusedRetryPrompt(focusedChunk);
check(focusedPrompt.includes('focused second-pass audit'), 'focused retry prompt identifies second-pass audit');
check(focusedPrompt.includes('treat every blank separately'), 'focused retry prompt requires per-slot connective reasoning');

check(JAPANESE_GROQ_SCHEMA.additionalProperties === false, 'reference schema keeps strict root');
check(JAPANESE_GROQ_SCHEMA.properties.answers.items.additionalProperties === false, 'reference schema keeps strict answer object');
check(!('choiceRelations' in JAPANESE_GROQ_SCHEMA.properties.answers.items.properties), 'compact schema omits distractor classifications');
check(!('reasonCode' in JAPANESE_GROQ_SCHEMA.properties.answers.items.properties), 'compact schema omits free-form reason field');

const originalFetch = globalThis.fetch;
const requests = [];
let injectStructuredMismatch = false;
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  requests.push({ init, body });
  const userPrompt = body.messages.find(message => message.role === 'user').content;
  const payload = JSON.parse(userPrompt.slice(userPrompt.lastIndexOf('\n') + 1));
  let responseFixture = fixtureForMajor(payload.major);

  if (payload.focused === true) {
    const targetIndex = payload.questions[0].questionIndex;
    responseFixture = {
      pass: true,
      answers: responseFixture.answers.filter(answer => answer.questionIndex === targetIndex)
    };
  } else if (injectStructuredMismatch && payload.major === 1) {
    const structured = responseFixture.answers.find(answer => Array.isArray(pack.questions[answer.questionIndex].marks));
    structured.markChoiceIndexes[0] = (structured.markChoiceIndexes[0] + 1) % pack.questions[structured.questionIndex].choices.length;
    injectStructuredMismatch = false;
  }

  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(responseFixture) } }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const env = { GROQ_API_KEY: 'test-groq-key', GROQ_MODEL: 'openai/gpt-oss-20b' };
  const result = await verifyJapanesePackWithGroq(env, pack, { cooldownMs: 0 });
  check(result.verified === true, 'pack verified');
  check(result.provider === 'groq', 'provider is Groq');
  check(result.model === 'openai/gpt-oss-20b', 'model propagated');
  check(result.questionCount === pack.questions.length, 'all questions verified');
  check(result.focusedRetryCount === 0, 'clean pack needs no focused retry');
  check(JSON.stringify(result.majors) === JSON.stringify([1,2,3,4]), 'all majors verified');
  check(requests.length === 4, 'one Groq request per major when all answers agree');
  for (const { init, body } of requests.slice(0, 4)) {
    check(init.headers.authorization === 'Bearer test-groq-key', 'server-side Groq secret used');
    check(body.model === 'openai/gpt-oss-20b', 'caller-selected verifier model preserved');
    check(body.response_format === undefined, 'Japanese verifier leaves Groq response format unforced');
    check(body.reasoning_format === undefined && body.include_reasoning === false, 'GPT-OSS text mode excludes reasoning with include_reasoning');
    check(body.messages.length === 1 && body.messages[0].role === 'user', 'text JSON mode keeps GPT-OSS instructions in one user message');
    check(body.temperature === 0 && body.reasoning_effort === 'low', 'normal Japanese verification uses low reasoning for final-answer budget');
    const prompt = body.messages.find(message => message.role === 'user').content;
    const blind = JSON.parse(prompt.slice(prompt.lastIndexOf('\n') + 1));
    const expectedBudget = blind.major === 1 || blind.major === 3 ? 3200 : 2000;
    check(body.max_completion_tokens === expectedBudget, 'major-specific completion budget preserved');
    check(!JSON.stringify(blind).includes('"answers"'), 'request does not reveal answer key');
    check(!JSON.stringify(blind).includes('"explanation"'), 'request does not reveal explanations');
  }

  const beforeFocused = requests.length;
  injectStructuredMismatch = true;
  const recovered = await verifyJapaneseMajorWithGroq(env, pack, 1);
  check(recovered.focusedRetryCount === 1, 'structured disagreement triggers exactly one focused retry');
  check(requests.length === beforeFocused + 2, 'focused recovery uses one initial request plus one retry');
  const retryBody = requests.at(-1).body;
  const retryPromptText = retryBody.messages[0].content;
  const retryPayload = JSON.parse(retryPromptText.slice(retryPromptText.lastIndexOf('\n') + 1));
  check(retryPayload.focused === true && retryPayload.questions.length === 1, 'retry request is narrowly focused');
  check(retryBody.reasoning_effort === 'medium', 'focused structured retry receives extra reasoning budget');
  check(retryBody.max_completion_tokens === 1400, 'focused structured retry keeps output budget small');
  check(!JSON.stringify(retryPayload).includes('"answers"'), 'focused retry does not reveal answer key');
  check(!JSON.stringify(retryPayload).includes('"explanation"'), 'focused retry does not reveal explanations');

  const waits = [];
  await verifyJapanesePackWithGroq(env, pack, { cooldownMs: 7, sleep: async ms => { waits.push(ms); } });
  check(JSON.stringify(waits) === JSON.stringify([7,7,7]), 'free-tier pacing waits between every major');
  check(requests.length === beforeFocused + 6, 'paced verification adds exactly four normal requests after focused recovery test');
} finally {
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({ ok: true, checks, provider: 'groq', baseApiCallsPerPack: 4, focusedRetry: 'blind-on-structured-disagreement', cooldownsPerPack: 3, outputContract: 'unforced-text-json-plus-local-strict-validation' }));
