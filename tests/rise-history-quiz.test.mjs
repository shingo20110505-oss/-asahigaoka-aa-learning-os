import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHistoryQuiz, historyQuizDateBounds } from '../src/history-quiz.mjs';

const timeline = JSON.parse(await fs.readFile(new URL('../data/history.json', import.meta.url), 'utf8'));
const item = (id, date, event = `人物${id}の政策と社会の変化`, extra = {}) => ({ id, date, event, sort: id, area: '日本', period: '近世', ...extra });
const base = [item(1, '1000年', '新しい都を開く'), item(2, '1200年', '地方の統治制度を定める'), item(3, '1400年', '海外との航路を整備する'), item(4, '1600年', '全国を調査して地図を作る'), item(5, '1800年', '機械を使う大規模工場を建てる')];
function seeded(seed = 217) { let value = seed; return () => ((value = Math.imul(value, 1664525) + 1013904223 >>> 0) / 4294967296); }
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;
function validateQuestion(q) {
  assert.ok(['date', 'event'].includes(q.mode));
  assert.equal(q.choices.length, 4);
  assert.equal(new Set(q.choices.map(c => c.id)).size, 4);
  assert.equal(new Set(q.choices.map(c => c.label.normalize('NFKC').trim())).size, 4);
  assert.equal(q.choices.filter(c => c.id === q.answerId).length, 1);
  assert.equal(q.choices.find(c => c.id === q.answerId).label, q.row[q.mode]);
  for (const choice of q.choices) {
    assert.equal(choice.label, choice.row[q.mode], 'The original date/event is shown without rewriting');
    if (choice.id !== q.answerId) assert.notEqual(choice.row.event, q.row.event);
    for (const other of q.choices) if (other.id !== choice.id) assert.equal(overlaps(historyQuizDateBounds(choice.row), historyQuizDateBounds(other.row)), false);
  }
}

test('quiz dates keep BCE, centuries, ranges, approximate dates and uncertain labels separate', () => {
  assert.deepEqual(historyQuizDateBounds(item(1, '1945年8月15日')), { start: 1945, end: 1945 });
  assert.deepEqual(historyQuizDateBounds(item(1, '紀元前221年')), { start: -221, end: -221 });
  assert.deepEqual(historyQuizDateBounds(item(1, '紀元前4世紀')), { start: -400, end: -301 });
  assert.deepEqual(historyQuizDateBounds(item(1, '15〜16世紀')), { start: 1401, end: 1600 });
  assert.deepEqual(historyQuizDateBounds(item(1, '16世紀後半')), { start: 1501, end: 1600 });
  assert.deepEqual(historyQuizDateBounds(item(1, '735〜737年')), { start: 735, end: 737 });
  assert.deepEqual(historyQuizDateBounds(item(1, '1820年代')), { start: 1820, end: 1829 });
  const approximate = historyQuizDateBounds(item(1, '1955年ごろ'));
  assert.ok(approximate.start < 1955 && approximate.end > 1955);
  const explicit = historyQuizDateBounds(item(1, '紀元前4世紀ごろ（目安）', '', { dateRange: { start: -1000, end: -300 } }));
  assert.ok(explicit.start <= -1000 && explicit.end >= -300);
  const written = historyQuizDateBounds(item(1, '16世紀初め', '', { dateRange: { start: 1503, end: 1519 } }));
  assert.ok(written.start <= 1501 && written.end >= 1600);
  assert.equal(historyQuizDateBounds(item(1, '約1万6000年前')), null, 'Do not invent an anchor year from sort');
  assert.deepEqual(historyQuizDateBounds(item(1, '約3万5000〜2万5000年前', '', { dateRange: { start: -33000, end: -23000 } })), { start: -33000, end: -23000 });
  assert.equal(historyQuizDateBounds(item(1, '年代不詳')), null);
  assert.equal(historyQuizDateBounds(item(1, '0年')), null);
});

test('correct answers strictly follow the filtered scope while distractors may use the full timeline', () => {
  for (const mode of ['date', 'event', 'mixed']) {
    const questions = createHistoryQuiz([base[2]], { mode, pool: base, random: seeded() });
    assert.equal(questions.length, 1);
    assert.equal(questions[0].row.id, 3);
    assert.ok(questions[0].choices.some(c => c.row.id !== 3));
    validateQuestion(questions[0]);
  }
  assert.deepEqual(createHistoryQuiz([], { pool: timeline }), []);
});

test('same years, overlapping intervals and repeated events never become competing answers', () => {
  const target = item(50, '1748年', 'モンテスキューが『法の精神』を著す', { relatedIds: [54] });
  const ambiguous = [
    item(51, '1748年', '別の国で議会が開かれる'),
    item(52, '18世紀', '都市をつなぐ道路が整う'),
    item(53, '1750年ごろ', '新しい学校が設立される'),
    item(54, '1790年', '関連する同じ著作の説明'),
    item(55, '1450年', target.event),
    item(56, '1550年', 'モンテスキューが『法の精神』を刊行する'),
    item(57, '1700〜1760年', '記録に幅のある出来事'),
  ];
  for (const mode of ['date', 'event']) {
    const [q] = createHistoryQuiz([target], { mode, pool: [...base, target, ...ambiguous], random: seeded() });
    assert.ok(q);
    validateQuestion(q);
    assert.ok(q.choices.every(c => c.row.id === 50 || c.row.id < 50));
  }
});

test('short pools, duplicate IDs, empty selections and unsupported dates are handled safely', () => {
  assert.deepEqual(createHistoryQuiz(base.slice(0, 3)), []);
  assert.deepEqual(createHistoryQuiz([base[0]], { pool: [base[0], base[0], base[0]] }), []);
  assert.deepEqual(createHistoryQuiz([item(1, '年代不詳')], { pool: timeline }), []);
  assert.deepEqual(createHistoryQuiz(null), []);
  const questions = createHistoryQuiz([...base, base[0], { ...base[0], id: '1' }], { count: 50, random: seeded() });
  assert.equal(new Set(questions.map(q => String(q.row.id))).size, questions.length);
  assert.equal(questions.length, 5);
  assert.deepEqual(createHistoryQuiz(base, { count: 0 }), []);
  assert.deepEqual(createHistoryQuiz(base, { count: -1 }), []);
  assert.equal(createHistoryQuiz(timeline, { count: 500, random: seeded() }).length, 50);
});

test('source objects stay untouched and mixed mode includes both directions', () => {
  const source = freeze(structuredClone(base));
  const before = JSON.stringify(source);
  const quiz = createHistoryQuiz(source, { random: seeded() });
  assert.equal(JSON.stringify(source), before);
  assert.equal(quiz.length, 5);
  assert.deepEqual(new Set(quiz.map(q => q.mode)), new Set(['date', 'event']));
  for (const q of quiz) validateQuestion(q);
});

test('answer positions vary and the same filtered event is not repeated in a session', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const questions = createHistoryQuiz(base, { count: 5, random: seeded(seed) });
    assert.equal(new Set(questions.map(q => q.row.id)).size, questions.length);
    for (const q of questions) positions.add(q.choices.findIndex(c => c.id === q.answerId));
  }
  assert.deepEqual(positions, new Set([0, 1, 2, 3]));
});

test('all 1006 canonical entries are checked in both quiz directions without altering content', () => {
  const before = JSON.stringify(timeline);
  const skipped = [];
  let checked = 0;
  for (const row of timeline) {
    for (const mode of ['date', 'event']) {
      const questions = createHistoryQuiz([row], { mode, pool: timeline, random: seeded(row.id) });
      if (!questions.length) { skipped.push(`${mode}:${row.id}`); continue; }
      assert.equal(questions.length, 1);
      assert.equal(questions[0].row.id, row.id);
      validateQuestion(questions[0]);
      checked++;
    }
  }
  assert.equal(timeline.length, 1006);
  assert.ok(checked > 1900, `${checked} usable questions`);
  assert.ok(skipped.every(id => id === 'date:380' || id === 'event:380'), `Unexpected unsafe dates: ${skipped.join(', ')}`);
  assert.equal(JSON.stringify(timeline), before);
});
