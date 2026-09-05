import assert from 'node:assert/strict';
import {
  GEMINI_GENERATE_CONTENT_BASE,
  GEMINI_INTERACTIONS_URL,
  GeminiProviderError,
  callGeminiJson,
  normalizeGeminiSchema
} from '../worker/src/providers/gemini.mjs';

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

const ENV = Object.freeze({
  GEMINI_API_KEY: 'gemini-contract-secret',
  GEMINI_MODEL: 'gemini-3.5-flash'
});

const REQUEST = Object.freeze({
  input: 'Return the required JSON.',
  schema: LOCAL_SCHEMA,
  maxOutputTokens: 512,
  temperature: 0.1,
  thinkingLevel: 'medium'
});

const JSON_TEXT = '{"word":"evidence","items":["a","b"],"score":1}';
const originalFetch = globalThis.fetch;

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

function generateSuccess() {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON_TEXT }] } }]
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

try {
  {
    let captured = null;
    globalThis.fetch = async (url, options) => {
      captured = { url: String(url), headers: options.headers, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON_TEXT }] }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await callGeminiJson(ENV, REQUEST);
    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, 'gemini-3.5-flash');
    assert.equal(result.mode, 'interactions');
    assert.equal(result.fallbackFrom, null);
    assert.equal(captured.url, GEMINI_INTERACTIONS_URL);
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
  }

  {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      const call = { url: String(url), headers: options.headers, body: JSON.parse(options.body) };
      calls.push(call);
      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: { message: 'temporary upstream failure' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' }
        });
      }
      return generateSuccess();
    };

    const result = await callGeminiJson(ENV, REQUEST);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, GEMINI_INTERACTIONS_URL);
    assert.equal(calls[1].url, `${GEMINI_GENERATE_CONTENT_BASE}/gemini-3.5-flash:generateContent`);
    assert.equal(calls[1].headers['x-goog-api-key'], 'gemini-contract-secret');
    assert.equal(calls[1].body.contents[0].parts[0].text, REQUEST.input);
    assert.equal(calls[1].body.systemInstruction.parts[0].text.length > 0, true);
    assert.equal(calls[1].body.generationConfig.responseFormat.text.mimeType, 'application/json');
    assert.equal(calls[1].body.generationConfig.responseFormat.text.schema.properties.word.minLength, undefined);
    assert.equal(calls[1].body.generationConfig.responseFormat.text.schema.properties.items.minItems, 2);
    assert.equal(calls[1].body.generationConfig.thinkingConfig.thinkingLevel, 'medium');
    assert.equal(calls[1].body.generationConfig.temperature, undefined);
    assert.equal(result.mode, 'generate_content_fallback');
    assert.equal(result.fallbackFrom, 'interactions_5xx');
    assert.deepEqual(result.output, { word: 'evidence', items: ['a', 'b'], score: 1 });
  }

  {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      if (calls.length === 1) throw new TypeError('network down');
      return generateSuccess();
    };

    const result = await callGeminiJson(ENV, REQUEST);
    assert.equal(calls.length, 2);
    assert.equal(result.mode, 'generate_content_fallback');
    assert.equal(result.fallbackFrom, 'interactions_unreachable');
  }

  {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: { message: 'Interactions rejected this structured request' } }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
      }
      return generateSuccess();
    };

    const result = await callGeminiJson(ENV, REQUEST);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, `${GEMINI_GENERATE_CONTENT_BASE}/gemini-3.5-flash:generateContent`);
    assert.equal(result.mode, 'generate_content_fallback');
    assert.equal(result.fallbackFrom, 'interactions_400');
    assert.deepEqual(result.output, { word: 'evidence', items: ['a', 'b'], score: 1 });
  }

  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: 'quota reached' } }), {
        status: 429,
        headers: { 'content-type': 'application/json' }
      });
    };

    await assert.rejects(
      () => callGeminiJson(ENV, REQUEST),
      error => error instanceof GeminiProviderError && error.code === 'quota_exceeded' && error.status === 429
    );
    assert.equal(calls, 1, 'quota exhaustion must stop generation instead of trying another transport');
  }

  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: calls === 1 ? 'Interactions schema rejection' : 'GenerateContent schema rejection' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    };

    await assert.rejects(
      () => callGeminiJson(ENV, REQUEST),
      error => error instanceof GeminiProviderError && error.code === 'gemini_request_rejected' && error.status === 400 && error.diagnostic === 'generate_content'
    );
    assert.equal(calls, 2, 'a structured request rejected by both official transports must fail closed');
  }

  {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: 'auth failed' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' }
      });
    };

    await assert.rejects(
      () => callGeminiJson(ENV, REQUEST),
      error => error instanceof GeminiProviderError && error.status === 403
    );
    assert.equal(calls, 1, 'authentication failures must never be retried through another transport');
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Gemini current contract OK: Interactions stays primary, GenerateContent retries only Interactions compatibility/transport failures, quota and auth stop immediately, and both official transports preserve the same structured-output constraints');
