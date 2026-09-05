import assert from 'node:assert/strict';
import {
  GeminiProviderError,
  callGeminiJson
} from '../worker/src/providers/gemini.mjs';
import {
  GroqProviderError,
  callGroqJson
} from '../worker/src/providers/groq.mjs';
import {
  READING_REQUEST_BUDGET_MS,
  READING_SECOND_ATTEMPT_MIN_MS,
  readingLatencyPlan
} from '../worker/src/entry.mjs';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: { ok: { type: 'boolean' } }
};

function hangingFetch(_url, options = {}) {
  return new Promise((_resolve, reject) => {
    const abort = () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    };
    if (options.signal?.aborted) return abort();
    options.signal?.addEventListener?.('abort', abort, { once: true });
  });
}

const fullPlan = readingLatencyPlan(READING_REQUEST_BUDGET_MS);
assert.deepEqual(fullPlan, {
  interactionsTimeoutMs: 40000,
  generateTimeoutMs: 55000,
  groqTimeoutMs: 35000
});
assert.ok(fullPlan.interactionsTimeoutMs + fullPlan.generateTimeoutMs + fullPlan.groqTimeoutMs + 5000 <= READING_REQUEST_BUDGET_MS);

const retryPlan = readingLatencyPlan(READING_SECOND_ATTEMPT_MIN_MS);
assert.ok(retryPlan.interactionsTimeoutMs >= 10000);
assert.ok(retryPlan.generateTimeoutMs >= 10000);
assert.ok(retryPlan.groqTimeoutMs >= 8000);
assert.ok(retryPlan.interactionsTimeoutMs + retryPlan.generateTimeoutMs + retryPlan.groqTimeoutMs + 5000 <= READING_SECOND_ATTEMPT_MIN_MS);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = hangingFetch;
  const geminiStarted = Date.now();
  await assert.rejects(
    () => callGeminiJson(
      { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3.5-flash' },
      {
        input: 'Return JSON.',
        schema,
        interactionsTimeoutMs: 100,
        generateTimeoutMs: 100
      }
    ),
    error => error instanceof GeminiProviderError
      && error.code === 'provider_timeout'
      && error.status === 504
      && /generate_content/.test(error.diagnostic)
  );
  assert.ok(Date.now() - geminiStarted < 1000, 'Gemini primary + same-provider fallback must be bounded');

  const groqStarted = Date.now();
  await assert.rejects(
    () => callGroqJson(
      { GROQ_API_KEY: 'test-key', GROQ_MODEL: 'openai/gpt-oss-20b' },
      {
        input: 'Verify JSON.',
        schema,
        timeoutMs: 100,
        allowJsonObjectFallback: false
      }
    ),
    error => error instanceof GroqProviderError
      && error.code === 'provider_timeout'
      && error.status === 504
  );
  assert.ok(Date.now() - groqStarted < 700, 'Groq verification must be bounded');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('AI latency budget contract OK: Gemini transports and Groq verification abort on deadline, and English reading keeps enough budget for independent verification');
