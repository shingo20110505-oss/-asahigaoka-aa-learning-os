import assert from 'node:assert/strict';
import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import {
  JAPANESE_GROQ_SCHEMA,
  buildJapaneseBlindChunk,
  buildJapaneseVerifierPrompt,
  validateJapaneseVerifierShape,
  verifyJapaneseChunkAgreement,
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
  check(chunk.questions.every(q => q.choices.every(choice => typeof choice === 'string')), `major ${major} choices are text only`);
  check(chunk.questions.every(q => q.marks.every(mark => typeof mark === 'string')), `major ${major} marks expose labels only`);
  const serialized = JSON.stringify(chunk);
  for (const forbidden of ['"answers"', '"answer"', '"relation"', '"explanation"', '"errorSpan"', '"proposition"', '"scoring"', '"evidence"']) {
    check(!serialized.includes(forbidden), `major ${major} blind input excludes ${forbidden}`);
  }
  const prompt = buildJapaneseVerifierPrompt(chunk);
  check(prompt.endsWith(serialized), `major ${major} prompt contains exact blind payload`);
  check(prompt.includes('Return one valid JSON object'), `major ${major} explicitly requests JSON object`);
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
    const fakeQuote = structuredClone(fixture);
    fakeQuote.answers[0].evidence = [{ passageIndex: 0, paragraph: 1, quote: '本文に存在しない検証用引用' }];
    check(!verifyJapaneseChunkAgreement(pack, major, fakeQuote).ok, `major ${major} rejects fabricated evidence`);

    const noEvidence = structuredClone(fixture);
    noEvidence.answers[0].evidence = [];
    check(!verifyJapaneseChunkAgreement(pack, major, noEvidence).ok, `major ${major} rejects missing evidence`);
  }
}

check(JAPANESE_GROQ_SCHEMA.additionalProperties === false, 'reference schema keeps strict root');
check(JAPANESE_GROQ_SCHEMA.properties.answers.items.additionalProperties === false, 'reference schema keeps strict answer object');
check(!('choiceRelations' in JAPANESE_GROQ_SCHEMA.properties.answers.items.properties), 'compact schema omits distractor classifications');
check(!('reasonCode' in JAPANESE_GROQ_SCHEMA.properties.answers.items.properties), 'compact schema omits free-form reason field');

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  requests.push({ init, body });
  const userPrompt = body.messages.find(message => message.role === 'user').content;
  const payload = JSON.parse(userPrompt.slice(userPrompt.lastIndexOf('\n') + 1));
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(fixtureForMajor(payload.major)) } }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const env = { GROQ_API_KEY: 'test-groq-key', GROQ_MODEL: 'openai/gpt-oss-20b' };
  const result = await verifyJapanesePackWithGroq(env, pack, { cooldownMs: 0 });
  check(result.verified === true, 'pack verified');
  check(result.provider === 'groq', 'provider is Groq');
  check(result.model === 'openai/gpt-oss-20b', 'model propagated');
  check(result.questionCount === pack.questions.length, 'all questions verified');
  check(JSON.stringify(result.majors) === JSON.stringify([1,2,3,4]), 'all majors verified');
  check(requests.length === 4, 'one Groq request per major');
  for (const { init, body } of requests) {
    check(init.headers.authorization === 'Bearer test-groq-key', 'server-side Groq secret used');
    check(body.model === 'openai/gpt-oss-20b', 'caller-selected verifier model preserved');
    check(body.response_format?.type === 'json_object', 'Japanese verifier uses Groq JSON object mode');
    check(body.response_format?.json_schema === undefined, 'Japanese verifier does not request strict Groq schema generation');
    check(body.reasoning_format === 'hidden' && body.include_reasoning === undefined, 'JSON mode uses hidden reasoning format');
    check(body.messages.length === 1 && body.messages[0].role === 'user', 'JSON mode keeps GPT-OSS instructions in one user message');
    const prompt = body.messages.find(message => message.role === 'user').content;
    const blind = JSON.parse(prompt.slice(prompt.lastIndexOf('\n') + 1));
    const expectedEffort = blind.major === 1 || blind.major === 3 ? 'medium' : 'low';
    check(body.temperature === 0 && body.reasoning_effort === expectedEffort, 'deterministic subject-appropriate verifier settings');
    check(!JSON.stringify(blind).includes('"answers"'), 'request does not reveal answer key');
    check(!JSON.stringify(blind).includes('"explanation"'), 'request does not reveal explanations');
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({ ok: true, checks, provider: 'groq', apiCalls: 4, outputContract: 'json-object-plus-local-strict-validation' }));
