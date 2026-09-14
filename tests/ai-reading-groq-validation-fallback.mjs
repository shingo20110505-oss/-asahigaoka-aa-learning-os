import assert from 'node:assert/strict';
import { callGroqJson } from '../worker/src/providers/groq.mjs';
import { VERIFIER_SCHEMA } from '../worker/src/index.mjs';

const sentence = 'Students compared two plans and recorded clear evidence before they changed their final decision.';
const valid = {
  overallPass: true,
  answers: [0,1,2,3,4].map(questionIndex => ({questionIndex, answerIndex: questionIndex % 4, evidenceQuote: sentence, confidence: 0.9}))
};
const malformedButJson = { overallPass: true, answers: [valid.answers[0]] };
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const body = JSON.parse(options.body || '{}');
  calls.push(body);
  const output = calls.length === 1 ? malformedButJson : valid;
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)}}]}), {status:200, headers:{'content-type':'application/json'}});
};
try {
  const result = await callGroqJson({GROQ_API_KEY:'test-key', GROQ_MODEL:'openai/gpt-oss-20b'}, {
    input:'Blindly solve five questions.',
    schema:VERIFIER_SCHEMA,
    schemaName:'rise_english_blind_verification',
    maxOutputTokens:2500,
    temperature:0,
    reasoningEffort:'low'
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].response_format?.type, 'json_schema');
  assert.equal(calls[1].response_format?.type, 'json_object');
  assert.equal(result.mode, 'json_object_validation_fallback');
  assert.equal(result.fallbackFrom, 'json_schema_local_validation');
  assert.deepEqual(result.output, valid);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Groq reading validation fallback OK: schema-shape drift retries once with JSON object and remains locally validated.');
