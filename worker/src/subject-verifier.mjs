import { callGroqJson, GroqProviderError } from './providers/index.mjs';

const SAFE_ID = /^[a-z0-9._:-]{1,96}$/i;
const SUBJECTS = Object.freeze(['math']);
const confidenceThreshold = 0.8;

export const SUBJECT_VERIFICATION_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['overallPass', 'answerIndex', 'confidence', 'ambiguity'],
  properties: {
    overallPass: { type: 'boolean' },
    answerIndex: { type: 'integer', minimum: 0, maximum: 3 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    ambiguity: { type: 'boolean' }
  }
});

export class SubjectVerificationError extends Error {
  constructor(code, message, status = 400, diagnostic = '') {
    super(message);
    this.name = 'SubjectVerificationError';
    this.code = code;
    this.status = status;
    this.diagnostic = cleanString(diagnostic, 600);
  }
}

function cleanString(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeFigure(value, depth = 0) {
  if (depth > 5 || value == null) return null;
  if (typeof value === 'string') return cleanString(value, 240);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return finiteNumber(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(item => sanitizeFigure(item, depth + 1));
  if (typeof value !== 'object') return null;

  const allowed = new Set(['type', 'counts', 'width', 'start', 'rows', 'name', 'values', 'points', 'edges', 'parabola', 'side', 'note']);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (!allowed.has(key)) continue;
    out[key] = sanitizeFigure(child, depth + 1);
  }
  return out;
}

export function sanitizeSubjectVerificationRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SubjectVerificationError('invalid_subject_request', '検証リクエスト形式が正しくありません。');
  }

  const subject = cleanString(input.subject, 24).toLowerCase();
  if (!SUBJECTS.includes(subject)) {
    throw new SubjectVerificationError('subject_not_supported', 'この教科はまだ共通AI検証へ接続されていません。', 400);
  }

  const item = input.item;
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new SubjectVerificationError('invalid_subject_item', '検証する問題データがありません。');
  }

  const id = cleanString(item.id || 'math-item', 96);
  if (!SAFE_ID.test(id)) throw new SubjectVerificationError('invalid_subject_item_id', '問題IDが正しくありません。');

  const stem = cleanString(item.stem, 2400);
  if (stem.length < 8) throw new SubjectVerificationError('invalid_subject_stem', '問題文が短すぎます。');

  const rawChoices = Array.isArray(item.choices) ? item.choices : [];
  const choices = rawChoices.slice(0, 4).map(choice => cleanString(typeof choice === 'string' ? choice : choice?.text, 600));
  if (choices.length !== 4 || choices.some(choice => choice.length < 1) || new Set(choices).size !== 4) {
    throw new SubjectVerificationError('invalid_subject_choices', '選択肢は重複のない4択である必要があります。');
  }

  const expectedAnswerIndex = Number(item.expectedAnswerIndex);
  if (!Number.isInteger(expectedAnswerIndex) || expectedAnswerIndex < 0 || expectedAnswerIndex > 3) {
    throw new SubjectVerificationError('invalid_expected_answer', '照合用の正答位置が正しくありません。');
  }

  const figure = sanitizeFigure(item.figure);
  const figureBytes = new TextEncoder().encode(JSON.stringify(figure || null)).length;
  if (figureBytes > 6000) throw new SubjectVerificationError('subject_figure_too_large', '図表データが大きすぎます。', 413);

  return Object.freeze({
    schemaVersion: 1,
    subject,
    item: Object.freeze({ id, stem, choices: Object.freeze(choices), expectedAnswerIndex, figure })
  });
}

export function buildSubjectVerifierPrompt(request) {
  const { subject, item } = request;
  const figure = item.figure && Object.keys(item.figure).length
    ? JSON.stringify(item.figure)
    : 'none';
  const choices = item.choices.map((text, index) => `${index}: ${text}`).join('\n');

  if (subject === 'math') {
    return [
      'You are an independent verifier for a Japanese junior-high-school entrance-exam mathematics item.',
      'Solve the problem yourself from the problem statement, choices, and supplied figure/data only.',
      'Do not assume, infer, or search for an author answer key.',
      'Set overallPass=true only when exactly one option is mathematically correct and the supplied conditions are sufficient.',
      'Set ambiguity=true when multiple options could be correct, no option is correct, or information is insufficient.',
      'Return the zero-based answerIndex and a confidence from 0 to 1.',
      '',
      `Problem ID: ${item.id}`,
      `Problem: ${item.stem}`,
      `Figure/data: ${figure}`,
      'Choices:',
      choices
    ].join('\n');
  }

  throw new SubjectVerificationError('subject_not_supported', 'この教科はまだ共通AI検証へ接続されていません。');
}

export function verifySubjectAgreement(request, verification, threshold = confidenceThreshold) {
  const errors = [];
  if (!verification || typeof verification !== 'object') errors.push('verification_not_object');
  if (verification?.overallPass !== true) errors.push('verifier_overall_reject');
  if (verification?.ambiguity !== false) errors.push('verifier_ambiguous');
  if (!Number.isInteger(verification?.answerIndex) || verification.answerIndex < 0 || verification.answerIndex > 3) errors.push('verifier_answer_index');
  if (verification?.answerIndex !== request.item.expectedAnswerIndex) errors.push('answer_disagreement');
  if (!Number.isFinite(Number(verification?.confidence)) || Number(verification.confidence) < threshold) errors.push('low_confidence');
  return { ok: errors.length === 0, errors };
}

export async function verifySubjectQuestion(env, input) {
  const request = sanitizeSubjectVerificationRequest(input);
  let verified;
  try {
    verified = await callGroqJson(env, {
      input: buildSubjectVerifierPrompt(request),
      schema: SUBJECT_VERIFICATION_SCHEMA,
      schemaName: `rise_${request.subject}_blind_verification`,
      maxOutputTokens: 1200,
      temperature: 0,
      reasoningEffort: 'low',
      systemInstruction: 'Independently solve the supplied exam item. Return only the requested JSON. Never infer an author answer key or trust hidden metadata.'
    });
  } catch (error) {
    if (error instanceof GroqProviderError) throw error;
    throw new SubjectVerificationError('subject_verification_unavailable', '独立検証を実行できませんでした。', 503);
  }

  const agreement = verifySubjectAgreement(request, verified.output);
  if (!agreement.ok) {
    throw new SubjectVerificationError(
      'subject_verification_rejected',
      '独立検証で正答一致または一意性を確認できませんでした。',
      422,
      agreement.errors.join('|')
    );
  }

  return {
    schemaVersion: 1,
    subject: request.subject,
    itemId: request.item.id,
    accepted: true,
    quality: {
      verified: true,
      method: 'deterministic-plus-cross-provider-blind-answer-check',
      verificationProvider: verified.provider,
      verificationModel: verified.model,
      confidence: Number(verified.output.confidence),
      checkedAt: new Date().toISOString()
    }
  };
}
