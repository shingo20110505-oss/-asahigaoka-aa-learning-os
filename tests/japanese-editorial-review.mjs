import assert from 'node:assert/strict';
import { starterPacks } from '../japanese-exam/starter-packs.mjs';

const pack = starterPacks.find(item => item.id === 'aichi-ja-20260902-boundaries');
assert.ok(pack, 'reviewed starter pack exists');
assert.equal(pack.quality.checkedAt, '2026-09-03', 'editorial review date is current');

const logic = pack.passages.find(passage => passage.id === 'logic' && passage.major === 1);
assert.ok(logic, 'reviewed logic passage exists');
assert.match(logic.paragraphs[4], /^【X】分類とは、/, 'X begins an abstract restatement rather than an example');
assert.ok(logic.paragraphs[4].includes('【Y】目的に照らして情報を選び'), 'Y keeps the reframing relation');
assert.ok(logic.paragraphs[5].includes('必要なのは、まず、どの問いに答えるための線なのかを説明できることだ。【Z】'), 'Z follows an affirmed first requirement');
assert.ok(logic.paragraphs[5].includes('態度も必要なのだ'), 'Z adds a second required attitude');

const question = pack.questions.find(item => item.id === 'aichi-ja-20260902-boundaries-q1-5');
assert.ok(question, 'reviewed connective question exists');
assert.deepEqual(question.marks.map(mark => mark.answer), ['c1','c2','c3'], 'review preserves X/Y/Z answer key');
assert.deepEqual(question.choices.map(choice => choice.text), ['たとえば','つまり','むしろ','それに加えて','それとも'], 'review preserves choices');
assert.equal(question.evidence[1].quote, '必要なのは、まず、どの問いに答えるための線なのかを説明できることだ', 'reviewed Z evidence matches passage');
assert.ok(logic.paragraphs[5].includes(question.evidence[1].quote), 'reviewed Z evidence is exact passage text');
assert.match(question.explanation, /X＝つまり、Y＝むしろ、Z＝それに加えて/, 'reviewed explanation preserves intended relations');

console.log(JSON.stringify({ ok: true, pack: pack.id, question: question.id, editorialReview: 'connective-ambiguity-fixed' }));
