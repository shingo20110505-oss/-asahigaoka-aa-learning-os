import { callGeminiJson, DEFAULT_GEMINI_MODEL, GeminiProviderError } from './gemini.mjs';
import { callGroqJson, DEFAULT_GROQ_MODEL, GroqProviderError } from './groq.mjs';

export const AI_PROVIDER_IDS = Object.freeze(['gemini', 'groq']);

export class AIProviderSelectionError extends Error {
  constructor(provider) {
    super(`Unsupported AI provider: ${provider}`);
    this.name = 'AIProviderSelectionError';
    this.code = 'provider_not_supported';
    this.status = 400;
  }
}

export function getProviderStatus(env = {}) {
  return Object.freeze({
    gemini: Object.freeze({
      configured: Boolean(env.GEMINI_API_KEY),
      model: String(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL),
      role: 'generation'
    }),
    groq: Object.freeze({
      configured: Boolean(env.GROQ_API_KEY),
      model: String(env.GROQ_MODEL || DEFAULT_GROQ_MODEL),
      role: 'independent_verification'
    })
  });
}

export async function callStructuredProvider(provider, env, request) {
  if (provider === 'gemini') return callGeminiJson(env, request);
  if (provider === 'groq') return callGroqJson(env, request);
  throw new AIProviderSelectionError(provider);
}

export {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  GeminiProviderError,
  GroqProviderError,
  callGeminiJson,
  callGroqJson
};
