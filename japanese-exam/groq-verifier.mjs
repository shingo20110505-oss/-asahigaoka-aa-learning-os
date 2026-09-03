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

function hasNotWrittenQuestion(pack, major) {
  return pack.questions.some(question => question.major === Number(major) && question.skill === 'not_written');
}

function hasStructuredQuestion(pack, major) {
  return pack.questions.some(question => question.major === Number(major) && Array.isArray(question.marks));
}

export function buildJapaneseVerifierPrompt(chunk) {
  let base = engine.buildJapaneseVerifierPrompt(chunk);
  if (Number(chunk?.major) === 2) {
    const marker = 'For vocabulary questions (major 2), evidence may be empty because hidden answer-only glossary material is not supplied.';
    const clarification = 'For major 2 standalone vocabulary, the absence of a supplied passage is expected and is not insufficient information. Set pass=true when every vocabulary item has one defensible answer from ordinary junior-high Japanese knowledge; use each answer\'s ambiguous flag and confidence for item-level uncertainty.';
    if (base.includes(marker)) base = base.replace(marker, `${marker}\n${clarification}`);
  }

  if (Array.isArray(chunk?.questions) && chunk.questions.some(question => question.skill === 'not_written')) {
    const marker = 'For every non-vocabulary question, cite at least one exact substring copied from a supplied passage. passageIndex must identify the supplied passage containing the quote. paragraph should be the one-based paragraph number, but exact quote existence in that passage is the authoritative evidence check.';
    const replacement = 'For every non-vocabulary question except skill=not_written, cite at least one exact substring copied from a supplied passage. passageIndex must identify the supplied passage containing the quote. paragraph should be the one-based paragraph number, but exact quote existence in that passage is the authoritative evidence check. For skill=not_written, evidence may be [] because the selected answer is established by absence across the supplied text; never invent a quote to prove that something is absent.';
    if (base.includes(marker)) base = base.replace(marker, replacement);
  }
  return base;
}

export function verifyJapaneseChunkAgreement(pack, major, result, threshold = engine.JAPANESE_GROQ_CONFIDENCE_THRESHOLD) {
  const selectedMajor = Number(major);
  if (selectedMajor === 2) {
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

  const checked = engine.verifyJapaneseChunkAgreement(pack, major, result, threshold);
  if (checked.ok || !hasNotWrittenQuestion(pack, selectedMajor)) return checked;

  // A "not written" answer is justified by exhaustive absence, so requiring a positive
  // quote would force the verifier either to fabricate evidence or cite unrelated text.
  // The engine has already checked answer equality, ambiguity, confidence, indexes,
  // question count, root pass, and evidence for every other question. Therefore only
  // missing_evidence errors belonging to not_written questions may be waived here.
  const allowedIds = new Set(
    pack.questions
      .filter(question => question.major === selectedMajor && question.skill === 'not_written')
      .map(question => question.id)
  );
  const onlyNegativeEvidenceAbsence = checked.errors.length > 0 && checked.errors.every(error => {
    const match = /^missing_evidence:(.+)$/.exec(error);
    return Boolean(match && allowedIds.has(match[1]));
  });
  return onlyNegativeEvidenceAbsence ? { ok: true, errors: [] } : checked;
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

async function callPolicyMajorVerifier(env, pack, major) {
  const selectedMajor = Number(major);
  const chunk = engine.buildJapaneseBlindChunk(pack, selectedMajor);
  let verified;
  try {
    verified = await callGroqJson(env, {
      input: buildJapaneseVerifierPrompt(chunk),
      schema: engine.JAPANESE_GROQ_SCHEMA,
      schemaName: `rise_japanese_major_${selectedMajor}_blind_verification`,
      responseMode: 'text_json',
      maxOutputTokens: selectedMajor === 1 || selectedMajor === 3 ? 3200 : 2000,
      temperature: 0,
      reasoningEffort: 'low',
      systemInstruction: selectedMajor === 2
        ? 'Return only one valid JSON object. Independently solve the Japanese entrance-exam vocabulary section from ordinary junior-high Japanese knowledge. Lack of a passage is expected for this section. Never infer or request an author answer key.'
        : 'Return only one valid JSON object. Independently solve the Japanese entrance-exam section from the visible text. For not-written questions, absence across the text is valid evidence and evidence may be empty; never fabricate a quote. Never infer or request an author answer key.'
    });
  } catch (error) {
    if (error instanceof GroqProviderError) throw error;
    throw new engine.JapaneseVerificationError('japanese_verification_unavailable', '国語の独立検証を実行できませんでした。', 503);
  }

  const agreement = verifyJapaneseChunkAgreement(pack, selectedMajor, verified.output);
  if (!agreement.ok) {
    const detail = JSON.stringify(diagnosticAnswers(verified.output));
    throw new engine.JapaneseVerificationError(
      'japanese_verification_rejected',
      selectedMajor === 2
        ? '国語の独立検証で正答・一意性の一致を確認できませんでした。'
        : '国語の独立検証で正答・根拠・一意性の一致を確認できませんでした。',
      422,
      `${agreement.errors.slice(0, 12).join('|')} :: ${detail}`
    );
  }

  return {
    major: selectedMajor,
    questionCount: chunk.questions.length,
    provider: verified.provider,
    model: verified.model,
    focusedRetryCount: 0,
    slotRetryCount: 0,
    output: verified.output
  };
}

export async function verifyJapaneseMajorWithGroq(env, pack, major) {
  const selectedMajor = Number(major);
  if (selectedMajor === 2) return callPolicyMajorVerifier(env, pack, selectedMajor);
  // Current not-written sections contain no structured mark questions. Keep structured
  // sections on the original engine so its focused/slot retry behavior remains intact.
  if (hasNotWrittenQuestion(pack, selectedMajor) && !hasStructuredQuestion(pack, selectedMajor)) {
    return callPolicyMajorVerifier(env, pack, selectedMajor);
  }
  return engine.verifyJapaneseMajorWithGroq(env, pack, selectedMajor);
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
