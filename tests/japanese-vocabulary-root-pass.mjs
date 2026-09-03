import assert from 'node:assert/strict';
import { starterPacks } from '../japanese-exam/starter-packs.mjs';
import {
  JAPANESE_GROQ_CONFIDENCE_THRESHOLD,
  buildJapaneseBlindChunk,
  buildJapaneseVerifierPrompt,
  verifyJapaneseChunkAgreement
} from '../japanese-exam/groq-verifier.mjs';

const pack = starterPacks[0];
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };

function fixtureForMajor(major) {
  const visible = pack.passages.filter(passage => passage.role !== 'answer_only' && passage.major === major);
  return {
    pass: true,
    answers: pack.questions
      .map((question, questionIndex) => ({ question, questionIndex }))
      .filter(({ question }) => question.major === major)
      .map(({ question, questionIndex }) => ({
        questionIndex,
        ambiguous: false,
        confidence: 0.97,
        answerChoiceIndexes: Array.isArray(question.marks)
          ? []
          : question.answers.map(id => question.choices.findIndex(choice => choice.id === id)),
        markChoiceIndexes: Array.isArray(question.marks)
          ? question.marks.map(mark => question.choices.findIndex(choice => choice.id === mark.answer))
          : [],
        evidence: major === 2
          ? []
          : question.evidence
              .filter(item => visible.some(passage => passage.id === item.sourceId))
              .slice(0, 1)
              .map(item => ({
                passageIndex: visible.findIndex(passage => passage.id === item.sourceId),
                paragraph: item.paragraph,
                quote: item.quote
              }))
      }))
  };
}

const vocabChunk = buildJapaneseBlindChunk(pack, 2);
const vocabPrompt = buildJapaneseVerifierPrompt(vocabChunk);
check(vocabChunk.passages.length === 0, 'major 2 intentionally exposes no answer-only glossary passage');
check(vocabPrompt.includes('absence of a supplied passage is expected and is not insufficient information'), 'major 2 prompt explains standalone vocabulary semantics');
check(vocabPrompt.includes('Set pass=true when every vocabulary item has one defensible answer'), 'major 2 prompt requests section pass when items are defensible');

const vocabRootFalse = fixtureForMajor(2);
vocabRootFalse.pass = false;
check(verifyJapaneseChunkAgreement(pack, 2, vocabRootFalse).ok, 'major 2 accepts correct nonambiguous high-confidence answers even if root pass is false');

const vocabWrong = structuredClone(vocabRootFalse);
const firstVocabQuestion = pack.questions.find(question => question.major === 2);
vocabWrong.answers[0].answerChoiceIndexes = [(vocabWrong.answers[0].answerChoiceIndexes[0] + 1) % firstVocabQuestion.choices.length];
check(!verifyJapaneseChunkAgreement(pack, 2, vocabWrong).ok, 'major 2 still rejects a wrong independent answer');

const vocabAmbiguous = structuredClone(vocabRootFalse);
vocabAmbiguous.answers[0].ambiguous = true;
check(!verifyJapaneseChunkAgreement(pack, 2, vocabAmbiguous).ok, 'major 2 still rejects ambiguity');

const vocabLowConfidence = structuredClone(vocabRootFalse);
vocabLowConfidence.answers[0].confidence = JAPANESE_GROQ_CONFIDENCE_THRESHOLD - 0.01;
check(!verifyJapaneseChunkAgreement(pack, 2, vocabLowConfidence).ok, 'major 2 still rejects low confidence');

const readingRootFalse = fixtureForMajor(1);
readingRootFalse.pass = false;
check(!verifyJapaneseChunkAgreement(pack, 1, readingRootFalse).ok, 'non-vocabulary majors still require root pass=true');

console.log(JSON.stringify({
  ok: true,
  checks,
  policy: 'major2-root-pass-advisory-per-item-gates-strict',
  threshold: JAPANESE_GROQ_CONFIDENCE_THRESHOLD
}));
