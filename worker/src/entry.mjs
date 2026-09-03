import {
  READING_SCHEMA,
  VERIFIER_SCHEMA,
  buildAuthorPrompt,
  buildVerifierPrompt,
  constantTimeEqual,
  sanitizeRequest,
  validateReading,
  verifyAgreement
} from './index.mjs';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  GeminiProviderError,
  GroqProviderError,
  callGeminiJson,
  callGroqJson,
  getProviderStatus
} from './providers/index.mjs';

const WORKER_VERSION = '1.2.0';
const DEFAULT_ORIGIN = 'https://shingo20110505-oss.github.io';
const MAX_BODY_BYTES = 24000;

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
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function configuredOrigins(env) {
  const raw = cleanString(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN, 1000);
  return new Set(raw.split(',').map(value => value.trim().replace(/\/+$/, '')).filter(value => /^https:\/\//.test(value)));
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (configuredOrigins(env).has(origin.replace(/\/+$/, ''))) return true;
  if (String(env.ALLOW_LOCALHOST || '').toLowerCase() === 'true') {
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    } catch (_) {
      return false;
    }
  }
  return false;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const headers = {
    vary: 'Origin',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400'
  };
  if (origin && isAllowedOrigin(request, env)) headers['access-control-allow-origin'] = origin;
  return headers;
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request, env)
    }
  });
}

async function authorized(request, env) {
  const header = request.headers.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return constantTimeEqual(supplied, env.AI_ACCESS_TOKEN || '');
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

function mapGeminiError(error) {
  if (!(error instanceof GeminiProviderError)) return null;
  if (error.status === 429) return new ApiError('quota_exceeded', 'Gemini無料枠の上限に達しました。', 429);
  if ([401, 403].includes(error.status)) return new ApiError('gemini_auth_failed', 'Gemini APIキーまたはプロジェクト権限を確認してください。', 502);
  if (error.code === 'provider_not_configured') return new ApiError('server_not_configured', 'Gemini APIキーがWorkerに設定されていません。', 503);
  return new ApiError(error.code || 'gemini_failed', 'Geminiで生成できませんでした。', error.status >= 500 ? 503 : 502);
}

function mapGroqError(error) {
  if (!(error instanceof GroqProviderError)) return null;
  if (error.status === 429) return new ApiError('groq_quota_exceeded', 'Groq無料枠の上限に達したため独立検証できません。', 429);
  if ([401, 403].includes(error.status)) return new ApiError('groq_auth_failed', 'Groq APIキーまたは権限を確認してください。', 502);
  if (error.code === 'provider_not_configured') return new ApiError('verification_unavailable', 'Groq独立検証が設定されていません。', 503);
  if (error.code === 'provider_refused') return new ApiError('verification_rejected', '独立検証モデルが検証を拒否しました。', 422);
  return new ApiError('verification_unavailable', 'Groq独立検証を利用できません。', error.status >= 500 ? 503 : 502);
}

export async function generateVerifiedReading(env, request) {
  const failures = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    let authored;
    try {
      authored = await callGeminiJson(env, {
        input: buildAuthorPrompt(request, attempt),
        schema: READING_SCHEMA,
        schemaName: 'rise_english_reading',
        maxOutputTokens: 10000,
        temperature: 0.55,
        thinkingLevel: 'low'
      });
    } catch (error) {
      throw mapGeminiError(error) || error;
    }

    const reading = authored.output;
    const structural = validateReading(reading, request);
    if (!structural.ok) {
      failures.push(`attempt${attempt}:structure:${structural.errors.slice(0, 8).join('|')}`);
      continue;
    }

    let verified;
    try {
      verified = await callGroqJson(env, {
        input: buildVerifierPrompt(reading),
        schema: VERIFIER_SCHEMA,
        schemaName: 'rise_english_blind_verification',
        maxOutputTokens: 2500,
        temperature: 0,
        reasoningEffort: 'low',
        systemInstruction: 'Independently solve the supplied entrance-exam questions. Return only the requested JSON. Never infer an author answer key, and reject ambiguous items.'
      });
    } catch (error) {
      throw mapGroqError(error) || error;
    }

    const agreement = verifyAgreement(reading, verified.output);
    if (!agreement.ok) {
      failures.push(`attempt${attempt}:agreement:${agreement.errors.slice(0, 8).join('|')}`);
      continue;
    }

    return {
      schemaVersion: 1,
      reading,
      quality: {
        verified: true,
        method: 'cross-provider-blind-answer-check',
        model: authored.model,
        generationProvider: authored.provider,
        generationModel: authored.model,
        verificationProvider: verified.provider,
        verificationModel: verified.model,
        attempt,
        questionCount: 5,
        checkedAt: new Date().toISOString()
      }
    };
  }

  throw new ApiError(
    'quality_rejected',
    '正答一意性または本文根拠の独立検査を通過できませんでした。',
    422,
    failures.join(';')
  );
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    if (!isAllowedOrigin(request, env)) return jsonResponse(request, env, { error: { code: 'forbidden_origin', message: 'Origin is not allowed.' } }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    return jsonResponse(request, env, { ok: true, service: 'aa-ai-reading', version: WORKER_VERSION });
  }

  if (request.method !== 'POST' || !['/v1/status', '/v1/reading'].includes(url.pathname)) {
    return jsonResponse(request, env, { error: { code: 'not_found', message: 'Not found.' } }, 404);
  }

  if (!isAllowedOrigin(request, env)) return jsonResponse(request, env, { error: { code: 'forbidden_origin', message: 'このOriginは許可されていません。' } }, 403);
  if (!(await authorized(request, env))) return jsonResponse(request, env, { error: { code: 'unauthorized', message: '接続用トークンが一致しません。' } }, 401);

  if (url.pathname === '/v1/status') {
    const providers = getProviderStatus(env);
    const ready = Boolean(env.AI_ACCESS_TOKEN && providers.gemini.configured && providers.groq.configured);
    return jsonResponse(request, env, {
      ready,
      model: cleanString(env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL, 80),
      verifierModel: cleanString(env.GROQ_MODEL || DEFAULT_GROQ_MODEL, 100),
      verificationProvider: 'groq',
      providers,
      version: WORKER_VERSION
    }, ready ? 200 : 503);
  }

  try {
    const input = await readJsonBody(request);
    const clean = sanitizeRequest(input);
    const result = await generateVerifiedReading(env, clean);
    return jsonResponse(request, env, result);
  } catch (error) {
    if (error instanceof ApiError) {
      const body = { code: error.code, message: error.message };
      if (error.diagnostic) body.diagnostic = error.diagnostic;
      return jsonResponse(request, env, { error: body }, error.status);
    }
    return jsonResponse(request, env, { error: { code: 'internal_error', message: 'AI長文を生成できませんでした。' } }, 500);
  }
}

export default { fetch: handleRequest };
