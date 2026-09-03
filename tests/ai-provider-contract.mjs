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

const GROQ_COMPAT_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['answers'],
  properties: {
    answers: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['evidence', 'confidence'],
        properties: {
          evidence: { type: 'string', minLength: 12, maxLength: 360, pattern: '.+' },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        }
      }
    }
  }
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
    if (body.response_format?.json_schema?.name === 'groq_failed_generation_contract') {
      return new Response(JSON.stringify({
        error: {
          type: 'invalid_request_error',
          message: 'Failed to validate JSON. Please adjust your prompt.',
          failed_generation: '{\n  "ok": true,\u0000  "extra": "diagnostic only"\n}'
        }
      }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const content = body.response_format?.json_schema?.name === 'groq_compat_contract'
      ? '{"answers":[]}'
      : '{"ok":true}';
    return new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content } }]
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
  assert.equal(groq.mode, 'json_schema');
  assert.equal(groq.fallbackFrom, null);

  await assert.rejects(
    () => callStructuredProvider('groq', {
      GROQ_API_KEY: 'test-groq-secret',
      GROQ_MODEL: 'openai/gpt-oss-20b'
    }, {
      input: 'Return a structured answer list.',
      schema: GROQ_COMPAT_SCHEMA,
      schemaName: 'groq_compat_contract',
      maxOutputTokens: 512
    }),
    error => error instanceof GroqProviderError
      && error.code === 'groq_schema_mismatch'
      && error.diagnostic.includes('minItems')
  );

  const groqJsonObject = await callStructuredProvider('groq', {
    GROQ_API_KEY: 'test-groq-secret',
    GROQ_MODEL: 'openai/gpt-oss-120b'
  }, {
    input: 'Return one valid JSON object with ok=true.',
    schema: TEST_SCHEMA,
    schemaName: 'ignored_in_json_object_mode',
    responseMode: 'json_object',
    reasoningEffort: 'medium',
    systemInstruction: 'Return JSON only.',
    maxOutputTokens: 512
  });
  assert.deepEqual(groqJsonObject.output, { ok: true });
  assert.equal(groqJsonObject.model, 'openai/gpt-oss-120b');
  assert.equal(groqJsonObject.mode, 'json_object');

  const fallback = await callStructuredProvider('groq', {
    GROQ_API_KEY: 'test-groq-secret',
    GROQ_MODEL: 'openai/gpt-oss-20b'
  }, {
    input: 'Return ok=true.',
    schema: TEST_SCHEMA,
    schemaName: 'groq_failed_generation_contract',
    maxOutputTokens: 512
  });
  assert.deepEqual(fallback.output, { ok: true });
  assert.equal(fallback.mode, 'json_object_fallback');
  assert.equal(fallback.fallbackFrom, 'json_schema_failed_generation');

  assert.equal(requests.length, 6);
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
  assert.equal(groqRequest.body.reasoning_format, undefined);
  assert.equal(groqRequest.body.stream, false);
  assert.equal(groqRequest.body.messages.some(message => /answerIndex|author answer/i.test(message.content)), false);

  const compatibilityRequest = requests[2];
  const normalized = compatibilityRequest.body.response_format.json_schema.schema;
  assert.equal(normalized.properties.answers.minItems, undefined);
  assert.equal(normalized.properties.answers.maxItems, undefined);
  assert.equal(normalized.properties.answers.items.properties.evidence.minLength, undefined);
  assert.equal(normalized.properties.answers.items.properties.evidence.maxLength, undefined);
  assert.equal(normalized.properties.answers.items.properties.evidence.pattern, undefined);
  assert.equal(normalized.properties.answers.items.properties.confidence.minimum, 0);
  assert.equal(normalized.properties.answers.items.properties.confidence.maximum, 1);
  assert.deepEqual(normalized.required, ['answers']);
  assert.equal(normalized.additionalProperties, false);

  const jsonObjectRequest = requests[3];
  assert.equal(jsonObjectRequest.body.response_format.type, 'json_object');
  assert.equal(jsonObjectRequest.body.response_format.json_schema, undefined);
  assert.equal(jsonObjectRequest.body.reasoning_format, undefined);
  assert.equal(jsonObjectRequest.body.include_reasoning, false);
  assert.equal(jsonObjectRequest.body.reasoning_effort, 'medium');
  assert.equal(jsonObjectRequest.body.messages.length, 1);
  assert.equal(jsonObjectRequest.body.messages[0].role, 'user');
  assert.match(jsonObjectRequest.body.messages[0].content, /Return JSON only/);
  assert.match(jsonObjectRequest.body.messages[0].content, /matching this schema/);

  const failedSchemaRequest = requests[4];
  assert.equal(failedSchemaRequest.body.response_format.type, 'json_schema');
  const fallbackRequest = requests[5];
  assert.equal(fallbackRequest.body.response_format.type, 'json_object');
  assert.equal(fallbackRequest.body.messages.length, 1);
  assert.match(fallbackRequest.body.messages[0].content, /matching this schema/);
  assert.equal(fallbackRequest.headers.authorization, 'Bearer test-groq-secret');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI provider contract OK: Gemini/Groq adapters, secret isolation, strict-schema primary mode, validated JSON-object fallback, and provider selection passed');
