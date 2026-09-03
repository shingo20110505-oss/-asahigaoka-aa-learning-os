import assert from 'node:assert/strict';
import {
  AI_PROVIDER_IDS,
  AIProviderSelectionError,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  GeminiProviderError,
  GroqProviderError,
  callStructuredProvider,
  getProviderStatus
} from '../worker/src/providers/index.mjs';

const TEST_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: { ok: { type: 'boolean' } }
});

assert.deepEqual(AI_PROVIDER_IDS, ['gemini', 'groq']);
assert.equal(DEFAULT_GEMINI_MODEL, 'gemini-3.5-flash');
assert.equal(DEFAULT_GROQ_MODEL, 'openai/gpt-oss-20b');

const status = getProviderStatus({
  GEMINI_API_KEY: 'hidden-gemini',
  GROQ_API_KEY: 'hidden-groq',
  GEMINI_MODEL: 'gemini-test',
  GROQ_MODEL: 'groq-test'
});
assert.deepEqual(status, {
  gemini: { configured: true, model: 'gemini-test', role: 'generation' },
  groq: { configured: true, model: 'groq-test', role: 'independent_verification' }
});
assert.equal(JSON.stringify(status).includes('hidden-gemini'), false);
assert.equal(JSON.stringify(status).includes('hidden-groq'), false);

await assert.rejects(
  () => callStructuredProvider('unknown', {}, { input: 'x', schema: TEST_SCHEMA }),
  error => error instanceof AIProviderSelectionError && error.code === 'provider_not_supported'
);
await assert.rejects(
  () => callStructuredProvider('gemini', {}, { input: 'x', schema: TEST_SCHEMA }),
  error => error instanceof GeminiProviderError && error.code === 'provider_not_configured'
);
await assert.rejects(
  () => callStructuredProvider('groq', {}, { input: 'x', schema: TEST_SCHEMA }),
  error => error instanceof GroqProviderError && error.code === 'provider_not_configured'
);

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  requests.push({ url: String(url), headers: options.headers, body });
  if (String(url).includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({
      steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"ok":true}' }] }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (String(url).includes('api.groq.com')) {
    return new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  throw new Error(`unexpected URL: ${url}`);
};

try {
  const gemini = await callStructuredProvider('gemini', {
    GEMINI_API_KEY: 'test-gemini-secret',
    GEMINI_MODEL: 'gemini-test'
  }, {
    input: 'Return ok=true.',
    schema: TEST_SCHEMA,
    schemaName: 'provider_contract',
    maxOutputTokens: 512
  });
  assert.deepEqual(gemini.output, { ok: true });
  assert.equal(gemini.provider, 'gemini');
  assert.equal(gemini.model, 'gemini-test');

  const groq = await callStructuredProvider('groq', {
    GROQ_API_KEY: 'test-groq-secret',
    GROQ_MODEL: 'openai/gpt-oss-20b'
  }, {
    input: 'Return ok=true.',
    schema: TEST_SCHEMA,
    schemaName: 'provider_contract',
    maxOutputTokens: 512
  });
  assert.deepEqual(groq.output, { ok: true });
  assert.equal(groq.provider, 'groq');
  assert.equal(groq.model, 'openai/gpt-oss-20b');

  assert.equal(requests.length, 2);
  const geminiRequest = requests[0];
  assert.match(geminiRequest.url, /generativelanguage\.googleapis\.com/);
  assert.equal(geminiRequest.headers['x-goog-api-key'], 'test-gemini-secret');
  assert.equal(geminiRequest.body.response_format.mime_type, 'application/json');
  assert.deepEqual(geminiRequest.body.response_format.schema, TEST_SCHEMA);
  assert.equal(geminiRequest.body.store, false);

  const groqRequest = requests[1];
  assert.equal(groqRequest.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(groqRequest.headers.authorization, 'Bearer test-groq-secret');
  assert.equal(groqRequest.body.response_format.type, 'json_schema');
  assert.equal(groqRequest.body.response_format.json_schema.strict, true);
  assert.deepEqual(groqRequest.body.response_format.json_schema.schema, TEST_SCHEMA);
  assert.equal(groqRequest.body.include_reasoning, false);
  assert.equal(groqRequest.body.stream, false);
  assert.equal(groqRequest.body.messages.some(message => /answerIndex|author answer/i.test(message.content)), false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI provider contract OK: Gemini/Groq adapters, secret isolation, structured JSON, and provider selection passed');
