import assert from 'node:assert/strict';
import {
  READING_SCHEMA,
  VERIFIER_SCHEMA,
  auditGrammarLeak,
  buildAuthorPrompt,
  buildVerifierPrompt,
  constantTimeEqual,
  parseInteractionJson,
  sanitizeRequest,
  validateReading,
  verifyAgreement
} from '../worker/src/index.mjs';

const sentence = 'Students compared two plans and recorded clear evidence before they changed their final decision.';
const passage = Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => sentence).join(' ')).join('\n\n');

const request = sanitizeRequest({
  difficulty: 7,
  readingType: 'argument',
  assistMode: 'scaffold',
  allowedGrammar: ['basic', 'past', 'future', 'modal', 'infinitive', 'gerund', 'comparison', 'passive', 'presentPerfect', 'asMuchAs', 'asManyAs']
});

const reading = {
  title: 'Choosing a Better Meeting Room',
  passage,
  translationJa: '学校のクラブは集会室を改善しようとしました。生徒たちは二つの案を比べ、最終的な判断を変える前に明確な根拠を記録しました。第一案は安価でしたが、グループ活動のための空間が少なめでした。第二案は費用が高いものの、さまざまな使い方ができました。話し合いの後、クラブは第二案を選びました。将来の活動に役立つ広さを重視したためです。よい判断は最も安いものを選ぶことだけではなく、どのように使うかを丁寧に考えることでもあります。'.repeat(2),
  readingType: 'argument',
  topic: 'school club planning',
  difficulty: 7,
  lessonJa: '価格だけでなく、本文に示された利用目的と根拠を比較して判断します。',
  grammarTags: ['basic', 'past', 'comparison'],
  glossary: [
    { word: 'improve', meaningJa: '改善する' },
    { word: 'evidence', meaningJa: '根拠' },
    { word: 'decision', meaningJa: '判断' },
    { word: 'activity', meaningJa: '活動' }
  ],
  questions: [
    {
      type: 'detail',
      stemJa: '生徒たちは最終的な判断を変える前に何をしましたか。',
      choices: [
        { text: 'They recorded clear evidence about the two plans.', reasonJa: '本文に明記されています。' },
        { text: 'They asked another school to choose for them.', reasonJa: '本文にありません。' },
        { text: 'They refused to compare the two plans.', reasonJa: '本文と反対です。' },
        { text: 'They chose the cheapest plan immediately.', reasonJa: '本文と一致しません。' }
      ],
      answerIndex: 0,
      explanationJa: '本文では二つの案を比較し、明確な根拠を記録したとあります。',
      evidenceQuote: sentence
    },
    {
      type: 'inference',
      stemJa: 'クラブが第二案を選んだ理由として最も適切なものはどれですか。',
      choices: [
        { text: 'The extra space could support future club activities.', reasonJa: '将来の活動に役立つと判断しています。' },
        { text: 'The second plan was the cheapest possible choice.', reasonJa: '第二案の方が高価です。' },
        { text: 'The club wanted a room with less space.', reasonJa: '本文と反対です。' },
        { text: 'The members did not discuss either plan.', reasonJa: '話し合いをしています。' }
      ],
      answerIndex: 0,
      explanationJa: '追加の空間が将来の活動に役立つと考えたためです。',
      evidenceQuote: sentence
    },
    {
      type: 'cause',
      stemJa: '第一案の弱点は何でしたか。',
      choices: [
        { text: 'It offered less space for group work.', reasonJa: '本文に明記されています。' },
        { text: 'It was more expensive than the second plan.', reasonJa: '本文と反対です。' },
        { text: 'It could be used in more different ways.', reasonJa: 'これは第二案の特徴です。' },
        { text: 'It required the club to stop meeting.', reasonJa: '本文にありません。' }
      ],
      answerIndex: 0,
      explanationJa: '第一案は安い一方、グループ活動の空間が少ないことが弱点でした。',
      evidenceQuote: sentence
    },
    {
      type: 'mainIdea',
      stemJa: '本文の中心的な考えとして最も適切なものはどれですか。',
      choices: [
        { text: 'Good decisions should consider future use, not only price.', reasonJa: '最終段落の主張に一致します。' },
        { text: 'Schools should always choose the cheapest plan.', reasonJa: '本文の主張と反対です。' },
        { text: 'Club meetings are unnecessary for students.', reasonJa: '本文にありません。' },
        { text: 'Large rooms are always better in every situation.', reasonJa: '本文はそこまで断定していません。' }
      ],
      answerIndex: 0,
      explanationJa: '価格だけでなく利用のされ方まで考えることが本文の中心です。',
      evidenceQuote: sentence
    },
    {
      type: 'summary',
      stemJa: '本文の内容を最もよくまとめているものはどれですか。',
      choices: [
        { text: 'The club compared two plans and chose the more useful one for future activities.', reasonJa: '本文全体の流れに一致します。' },
        { text: 'The club chose a plan without comparing any evidence.', reasonJa: '本文と反対です。' },
        { text: 'The club rejected both plans because they were too expensive.', reasonJa: '本文にありません。' },
        { text: 'The club selected the smaller room because it cost more.', reasonJa: '本文と一致しません。' }
      ],
      answerIndex: 0,
      explanationJa: '二案を比較し、将来の活動に有用な案を選んだ話です。',
      evidenceQuote: sentence
    }
  ]
};

const validation = validateReading(reading, request);
assert.equal(validation.ok, true, validation.errors.join(','));
assert.ok(READING_SCHEMA.properties.questions);
assert.ok(VERIFIER_SCHEMA.properties.answers);

const authorPrompt = buildAuthorPrompt(request, 1);
assert.match(authorPrompt, /exactly five/i);
assert.match(authorPrompt, /evidenceQuote/i);

const verifierPrompt = buildVerifierPrompt(reading);
assert.match(verifierPrompt, /independent entrance-exam answer-key verifier/i);
assert.doesNotMatch(verifierPrompt, /answerIndex\":0.*explanationJa/s);

const verification = {
  overallPass: true,
  answers: reading.questions.map((question, questionIndex) => ({
    questionIndex,
    answerIndex: question.answerIndex,
    evidenceQuote: question.evidenceQuote,
    confidence: 0.9
  }))
};
assert.deepEqual(verifyAgreement(reading, verification), { ok: true, errors: [] });

const disagreement = structuredClone(verification);
disagreement.answers[2].answerIndex = 1;
assert.equal(verifyAgreement(reading, disagreement).ok, false);

const badEvidence = structuredClone(reading);
badEvidence.questions[0].evidenceQuote = 'This sentence is not in the passage.';
assert.equal(validateReading(badEvidence, request).ok, false);

// Relaxed gate: a relative clause must still be rejected, but an unrelated wh-word is no longer
// enough to label the whole sentence as an indirect question.
assert.deepEqual(auditGrammarLeak('The student who measured it returned.', ['basic']), ['relativePronoun']);
assert.deepEqual(auditGrammarLeak('They teach us how to plan.', ['basic']), []);
assert.deepEqual(auditGrammarLeak('They asked the teacher how the plan worked.', ['basic']), ['indirectQuestion']);
assert.deepEqual(auditGrammarLeak('The people we love gather here.', ['basic']), ['relativePronoun']);
assert.equal(await constantTimeEqual('a-secure-token', 'a-secure-token'), true);
assert.equal(await constantTimeEqual('a-secure-token', 'a-different-token'), false);

const parsed = parseInteractionJson({
  steps: [{ type: 'model_output', content: [{ type: 'text', text: '{"ok":true}' }] }]
});
assert.deepEqual(parsed, { ok: true });

console.log('AI reading contract checks passed.');
