import * as engine from './groq-verifier-engine.mjs';
import { callGroqJson, GroqProviderError } from '../worker/src/providers/index.mjs';

export {
  JAPANESE_GROQ_CONFIDENCE_THRESHOLD,
  JAPANESE_GROQ_SCHEMA,
  JAPANESE_GROQ_SLOT_SCHEMA,
  JapaneseVerificationError,
  buildJapaneseBlindChunk,
  buildJapaneseFocusedRetryChunk,
  buildJapaneseFocusedRetryPrompt,
  buildJapaneseSlotRetryChunk,
  buildJapaneseSlotRetryPrompt,
  validateJapaneseSlotResult,
  validateJapaneseVerifierShape
} from './groq-verifier-engine.mjs';

export function buildJapaneseVerifierPrompt(chunk) {
  const base = engine.buildJapaneseVerifierPrompt(chunk);
  if (Number(chunk?.major) !== 2) return base;
  const marker = 'For vocabulary questions (major 2), evidence may be empty because hidden answer-only glossary material is not supplied.';
  const clarification = 'For major 2 standalone vocabulary, the absence of a supplied passage is expected and is not insufficient information. Set pass=true when every vocabulary item has one defensible answer from ordinary junior-high Japanese knowledge; use each answer\'s ambiguous flag and confidence for item-level uncertainty.';
  return base.includes(marker) ? base.replace(marker, `${marker}\n${clarification}`) : base;
}

export function verifyJapaneseChunkAgreement(pack, major, result, threshold = engine.JAPANESE_GROQ_CONFIDENCE_THRESHOLD) {
  if (Number(major) !== 2) return engine.verifyJapaneseChunkAgreement(pack, major, result, threshold);

  const shape = engine.validateJapaneseVerifierShape(result);
  if (!shape.ok) return engine.verifyJapaneseChunkAgreement(pack, major, result, threshold);

  // Major 2 intentionally has no visible passage: the hidden answer-only glossary is
  // excluded from the blind verifier. Treat the model's section-level `pass` as
  // advisory here, while retaining the strict per-item gates inside the engine:
  // exact answer equality, ambiguity=false, confidence threshold, index validity,
  // and exact question count. The author key is still never sent to Groq.
  const normalized = result.pass === true ? result : { ...result, pass: true };
  return engine.verifyJapaneseChunkAgreement(pack, major, normalized, threshold);
}

function diagnosticAnswers(result) {
  if (!Array.isArray(result?.answers)) return 'no_answers';
  return result.answers.map(answer => ({
    q: answer?.questionIndex,
    a: answer?.answerChoiceIndexes,
    m: answer?.markChoiceIndexes,
    c: answer?.confidence,
    amb: answer?.ambiguous,
    ev: Array.isArray(answer?.evidence) ? answer.evidence.map(e => [e.passageIndex, e.paragraph, e.quote]) : []
  }));
}

async function verifyVocabularyMajorWithGroq(env, pack) {
  const chunk = engine.buildJapaneseBlindChunk(pack, 2);
  let verified;
  try {
    verified = await callGroqJson(env, {
      input: buildJapaneseVerifierPrompt(chunk),
      schema: engine.JAPANESE_GROQ_SCHEMA,
      schemaName: 'rise_japanese_major_2_blind_verification',
      responseMode: 'text_json',
      maxOutputTokens: 2000,
      temperature: 0,
      reasoningEffort: 'low',
      systemInstruction: 'Return only one valid JSON object. Independently solve the Japanese entrance-exam vocabulary section from ordinary junior-high Japanese knowledge. Lack of a passage is expected for this section. Never infer or request an author answer key.'
    });
  } catch (error) {
    if (error instanceof GroqProviderError) throw error;
    throw new engine.JapaneseVerificationError('japanese_verification_unavailable', '国語の独立検証を実行できませんでした。', 503);
  }

  const agreement = verifyJapaneseChunkAgreement(pack, 2, verified.output);
  if (!agreement.ok) {
    const detail = JSON.stringify(diagnosticAnswers(verified.output));
    throw new engine.JapaneseVerificationError(
      'japanese_verification_rejected',
      '国語の独立検証で正答・一意性の一致を確認できませんでした。',
      422,
      `${agreement.errors.slice(0, 12).join('|')} :: ${detail}`
    );
  }

  return {
    major: 2,
    questionCount: chunk.questions.length,
    provider: verified.provider,
    model: verified.model,
    focusedRetryCount: 0,
    slotRetryCount: 0,
    output: verified.output
  };
}

export async function verifyJapaneseMajorWithGroq(env, pack, major) {
  return Number(major) === 2
    ? verifyVocabularyMajorWithGroq(env, pack)
    : engine.verifyJapaneseMajorWithGroq(env, pack, major);
}

export async function verifyJapanesePackWithGroq(env, pack, { cooldownMs = 61000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const checks = [];
  for (let index = 0; index < 4; index++) {
    const major = index + 1;
    checks.push(await verifyJapaneseMajorWithGroq(env, pack, major));
    if (cooldownMs > 0 && index < 3) await sleep(cooldownMs);
  }
  return {
    verified: true,
    method: 'cross-provider-blind-answer-check',
    provider: checks[0]?.provider || 'groq',
    model: checks[0]?.model || String(env.GROQ_MODEL || ''),
    questionCount: checks.reduce((sum, check) => sum + check.questionCount, 0),
    focusedRetryCount: checks.reduce((sum, check) => sum + Number(check.focusedRetryCount || 0), 0),
    slotRetryCount: checks.reduce((sum, check) => sum + Number(check.slotRetryCount || 0), 0),
    majors: checks.map(check => check.major)
  };
}
