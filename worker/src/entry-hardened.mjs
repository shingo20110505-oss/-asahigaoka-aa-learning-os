import legacyWorker, { handleRequest as legacyHandleRequest } from './entry.mjs';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  GeminiProviderError,
  GroqProviderError,
  getProviderStatus
} from './providers/index.mjs';
import {
  HARDENED_EXAM_PLATFORM_VERSION,
  HARDENED_EXAM_SUBJECTS,
  HardenedExamError,
  generateHardenedVerifiedExamBatch
} from './exam-platform-hardened.mjs';
import {
  HARDENED_SUBJECT_VERIFIER_VERSION,
  HardenedSubjectVerificationError,
  verifyHardenedSubjectQuestion
} from './subject-verifier-hardened.mjs';
import { constantTimeEqual } from './index.mjs';

const WORKER_VERSION = '1.4.0';
const HARDENING_VERSION = '2.0.0';
const GEMINI_TRANSPORT_REVISION = 'dual-transport-v1';
const DEFAULT_ORIGIN = 'https://shingo20110505-oss.github.io';
const MAX_BODY_BYTES = 24000;
const WINDOW_MS = 60000;
const MAX_WEIGHT_PER_WINDOW = 28;
const MAX_INFLIGHT = 4;
const buckets = new Map();
let inflight = 0;

class ApiError extends Error {
  constructor(code, message, status = 400, diagnostic = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.diagnostic = cleanString(diagnostic, 800);
  }
}

function cleanString(value, maxLength = 300) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function configuredOrigins(env) {
  const raw = cleanString(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN, 1200);
  return new Set(raw.split(',').map(value => value.trim().replace(/\/+$/, '')).filter(value => /^https:\/\//.test(value)));
}

function isLocalOrigin(origin, env) {
  if (String(env.ALLOW_LOCALHOST || '').toLowerCase() !== 'true') return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch (_) {
    return false;
  }
}

function originAllowed(request, env, { allowMissing = false } = {}) {
  const origin = request.headers.get('origin');
  if (!origin) return allowMissing || String(env.ALLOW_NO_ORIGIN || '').toLowerCase() === 'true';
  const normalized = origin.replace(/\/+$/, '');
  return configuredOrigins(env).has(normalized) || isLocalOrigin(normalized, env);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const headers = {
    vary: 'Origin',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  };
  if (origin && originAllowed(request, env)) headers['access-control-allow-origin'] = origin;
  return headers;
}

function jsonResponse(request, env, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request, env),
      ...extraHeaders
    }
  });
}

async function authorized(request, env) {
  const header = request.headers.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return constantTimeEqual(supplied, env.AI_ACCESS_TOKEN || '');
}

function requestIdentity(request) {
  return cleanString(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anonymous', 128);
}

function cleanupBuckets(now) {
  if (buckets.size < 128) return;
  for (const [key, value] of buckets.entries()) {
    if (now - value.startedAt > WINDOW_MS * 2) buckets.delete(key);
  }
}

function rateCost(pathname) {
  if (pathname === '/v1/exam') return 5;
  if (pathname === '/v1/reading') return 4;
  if (pathname === '/v1/verify') return 2;
  return 1;
}

function consumeRate(request, pathname) {
  const now = Date.now();
  cleanupBuckets(now);
  const key = requestIdentity(request);
  const current = buckets.get(key);
  const bucket = !current || now - current.startedAt >= WINDOW_MS ? { startedAt: now, weight: 0 } : current;
  const cost = rateCost(pathname);
  if (bucket.weight + cost > MAX_WEIGHT_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1000));
    return { ok: false, retryAfter };
  }
  bucket.weight += cost;
  buckets.set(key, bucket);
  return { ok: true, retryAfter: 0 };
}

function requireJsonContentType(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new ApiError('unsupported_media_type', 'Content-Typeはapplication/jsonで送信してください。', 415);
  }
}

async function readJsonBody(request) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError('request_too_large', 'リクエストが大きすぎます。', 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new ApiError('request_too_large', 'リクエストが大きすぎます。', 413);
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw new ApiError('invalid_json', 'JSON形式が正しくありません。');
  }
}

function diagnosticsEnabled(env) {
  return String(env.EXPOSE_AI_DIAGNOSTICS || '').toLowerCase() === 'true';
}

function mapError(error) {
  if (error instanceof ApiError) return error;
  if (error instanceof HardenedExamError || error instanceof HardenedSubjectVerificationError) {
    return new ApiError(error.code, error.message, error.status, error.diagnostic);
  }
  if (error instanceof GeminiProviderError) {
    if (error.status === 429) return new ApiError('quota_exceeded', 'Gemini無料枠の上限に達しました。新規生成を停止し、検証済み問題を利用してください。', 429);
    if ([401, 403].includes(error.status)) return new ApiError('gemini_auth_failed', 'Gemini APIの認証を確認してください。', 502);
    if (error.code === 'provider_not_configured') return new ApiError('server_not_configured', 'Gemini APIがWorkerに設定されていません。', 503);
    return new ApiError(error.code || 'gemini_failed', 'Geminiで生成できませんでした。', error.status >= 500 ? 503 : 502);
  }
  if (error instanceof GroqProviderError) {
    const diagnostic = `groq:${Number(error.status) || 0}:${cleanString(error.code || 'unknown', 80)}`;
    if (error.status === 429) return new ApiError('groq_quota_exceeded', 'Groq無料枠の上限に達したため独立検証できません。新規問題は採用しません。', 429, diagnostic);
    if ([401, 403].includes(error.status)) return new ApiError('groq_auth_failed', 'Groq APIの認証を確認してください。', 502, diagnostic);
    if (error.code === 'provider_not_configured') return new ApiError('verification_unavailable', 'Groq独立検証が設定されていません。', 503, diagnostic);
    if (error.code === 'provider_refused') return new ApiError('verification_rejected', '独立検証モデルが検証を拒否しました。', 422, diagnostic);
    if (error.code === 'groq_failed_generation' || error.code === 'groq_request_rejected' || error.code === 'groq_schema_mismatch') {
      return new ApiError('verification_strict_schema_failed', '独立検証のStrict JSON Schemaを満たせなかったため問題を採用しません。', 502, diagnostic);
    }
    return new ApiError('verification_unavailable', 'Groq独立検証を利用できません。', error.status >= 500 ? 503 : 502, diagnostic);
  }
  return null;
}

function compatibleStatus(env) {
  const providers = getProviderStatus(env);
  const ready = Boolean(env.AI_ACCESS_TOKEN && providers.gemini.configured && providers.groq.configured);
  const subjectVerification = Object.fromEntries(HARDENED_EXAM_SUBJECTS.map(subject => [subject, 'production-audit']));
  const examGeneration = Object.fromEntries(HARDENED_EXAM_SUBJECTS.map(subject => [subject, subject === 'english' ? 'production-small-item' : 'production']));
  return {
    ready,
    service: 'rise-ai-platform',
    model: cleanString(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL, 80),
    verifierModel: cleanString(env.GROQ_MODEL || DEFAULT_GROQ_MODEL, 100),
    verificationProvider: 'groq',
    readingGeneration: { english: 'production' },
    examGeneration,
    subjectVerification,
    safeguards: {
      paidFallback: false,
      quota429StopsGeneration: true,
      authorAnswerHiddenFromVerifier: true,
      strictVerifierFallbackDisabled: true,
      geminiSameProviderTransportFallback: true,
      maxExamBatch: 10,
      originRequiredForApi: String(env.ALLOW_NO_ORIGIN || '').toLowerCase() !== 'true',
      jsonContentTypeRequired: true,
      serverBurstProtection: true
    },
    providers,
    version: WORKER_VERSION,
    hardeningVersion: HARDENING_VERSION,
    geminiTransportRevision: GEMINI_TRANSPORT_REVISION,
    examPlatformVersion: HARDENED_EXAM_PLATFORM_VERSION,
    subjectVerifierVersion: HARDENED_SUBJECT_VERIFIER_VERSION
  };
}

async function processApiRequest(request, env, pathname) {
  if (!originAllowed(request, env)) throw new ApiError('forbidden_origin', 'このOriginは許可されていません。', 403);
  if (!(await authorized(request, env))) throw new ApiError('unauthorized', '接続用トークンが一致しません。', 401);
  requireJsonContentType(request);
  const rate = consumeRate(request, pathname);
  if (!rate.ok) throw new ApiError('rate_limited', '短時間のAIリクエストが多すぎます。少し間を空けてください。', 429, `retry-after:${rate.retryAfter}`);
  if (inflight >= MAX_INFLIGHT) throw new ApiError('server_busy', 'AI処理が混雑しています。少し間を空けてください。', 503);

  inflight++;
  try {
    if (pathname === '/v1/status') return jsonResponse(request, env, compatibleStatus(env), compatibleStatus(env).ready ? 200 : 503);
    if (pathname === '/v1/reading') {
      return legacyHandleRequest(request, env);
    }
    const input = await readJsonBody(request);
    if (pathname === '/v1/verify') return jsonResponse(request, env, await verifyHardenedSubjectQuestion(env, input));
    if (pathname === '/v1/exam') return jsonResponse(request, env, await generateHardenedVerifiedExamBatch(env, input));
    throw new ApiError('not_found', 'Not found.', 404);
  } finally {
    inflight = Math.max(0, inflight - 1);
  }
}

export async function handleHardenedRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    if (!originAllowed(request, env)) return jsonResponse(request, env, { error: { code: 'forbidden_origin', message: 'Origin is not allowed.' } }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    return jsonResponse(request, env, {
      ok: true,
      service: 'rise-ai-platform',
      legacyService: 'aa-ai-reading',
      version: WORKER_VERSION,
      hardeningVersion: HARDENING_VERSION,
      geminiTransportRevision: GEMINI_TRANSPORT_REVISION,
      examPlatformVersion: HARDENED_EXAM_PLATFORM_VERSION,
      subjectVerifierVersion: HARDENED_SUBJECT_VERIFIER_VERSION
    });
  }
  const routes = new Set(['/v1/status', '/v1/reading', '/v1/verify', '/v1/exam']);
  if (request.method !== 'POST' || !routes.has(url.pathname)) {
    return jsonResponse(request, env, { error: { code: 'not_found', message: 'Not found.' } }, 404);
  }

  try {
    return await processApiRequest(request, env, url.pathname);
  } catch (error) {
    const mapped = mapError(error);
    if (!mapped) return jsonResponse(request, env, { error: { code: 'internal_error', message: 'AI処理を完了できませんでした。' } }, 500);
    const body = { code: mapped.code, message: mapped.message };
    if (mapped.code === 'rate_limited' && /^retry-after:(\d+)/.test(mapped.diagnostic)) {
      const seconds = mapped.diagnostic.match(/^retry-after:(\d+)/)?.[1] || '1';
      return jsonResponse(request, env, { error: body }, mapped.status, { 'retry-after': seconds });
    }
    if (mapped.diagnostic && diagnosticsEnabled(env)) body.diagnostic = mapped.diagnostic;
    return jsonResponse(request, env, { error: body }, mapped.status);
  }
}

export { compatibleStatus };
export const __test = Object.freeze({ originAllowed, rateCost, requireJsonContentType });

export default { fetch: handleHardenedRequest };
