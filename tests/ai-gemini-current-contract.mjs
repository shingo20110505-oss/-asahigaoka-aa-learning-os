import assert from 'node:assert/strict';
import { callGeminiJson, normalizeGeminiSchema } from '../worker/src/providers/gemini.mjs';

const LOCAL_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['word', 'items', 'score'],
  properties: {
    word: { type: 'string', minLength: 2, maxLength: 40, pattern: '^[A-Za-z]+$' },
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: { type: 'string', minLength: 1, maxLength: 80 }
    },
    score: { type: 'number', minimum: 0, maximum: 1 }
  }
});

const normalized = normalizeGeminiSchema(LOCAL_SCHEMA);
assert.equal(normalized.type, 'object');
assert.equal(normalized.additionalProperties, false);
assert.deepEqual(normalized.required, ['word', 'items', 'score']);
assert.equal(normalized.properties.word.minLength, undefined);
assert.equal(normalized.properties.word.maxLength, undefined);
assert.equal(normalized.properties.word.pattern, undefined);
assert.equal(normalized.properties.items.minItems, 2);
assert.equal(normalized.properties.items.maxItems, 4);
assert.equal(normalized.properties.items.items.minLength, undefined);
assert.equal(normalized.properties.score.minimum, 0);
assert.equal(normalized.properties.score.maximum, 1);

const originalFetch = globalThis.fetch;
let captured = null;
globalThis.fetch = async (url, options) => {
  captured = { url: String(url), headers: options.headers, body: JSON.parse(options.body) };
  return new Response(JSON.stringify({
    steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"word":"evidence","items":["a","b"],"score":1}' }] }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

try {
  const result = await callGeminiJson({
    GEMINI_API_KEY: 'gemini-contract-secret',
    GEMINI_MODEL: 'gemini-3.5-flash'
  }, {
    input: 'Return the required JSON.',
    schema: LOCAL_SCHEMA,
    maxOutputTokens: 512,
    temperature: 0.1,
    thinkingLevel: 'medium'
  });

  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-3.5-flash');
  assert.equal(captured.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(captured.headers['x-goog-api-key'], 'gemini-contract-secret');
  assert.equal(captured.headers['Api-Revision'], undefined);
  assert.equal(captured.body.response_format.type, 'text');
  assert.equal(captured.body.response_format.mime_type, 'application/json');
  assert.equal(captured.body.response_format.schema.properties.word.minLength, undefined);
  assert.equal(captured.body.response_format.schema.properties.word.pattern, undefined);
  assert.equal(captured.body.response_format.schema.properties.items.minItems, 2);
  assert.equal(captured.body.generation_config.thinking_level, 'medium');
  assert.equal(captured.body.generation_config.temperature, undefined, 'Gemini 3.x sampling temperature must not be forced');
  assert.equal(captured.body.store, false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Gemini current Interactions contract OK: unsupported local validation keywords are stripped only at provider boundary, supported schema constraints remain, and Gemini 3.x sampling defaults are preserved');
