import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  HISTORY_RANKS,
  HISTORY_RANK_INFO,
  historyRankChanges,
  defaultHistoryRankInfo,
} from '../src/history-ranking.mjs';

const rows = JSON.parse((await readFile(new URL('../data/history.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const originalRows = rows.filter((row) => row.id >= 1 && row.id <= 1000);
const rowsById = new Map(rows.map((row) => [row.id, row]));
const counts = (items, pick) => items.reduce((result, item) => {
  result[pick(item)] += 1;
  return result;
}, { S: 0, A: 0, B: 0 });
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

test('rank descriptions communicate priorities, without an exam frequency claim', () => {
  assert.deepEqual(HISTORY_RANKS, ['S', 'A', 'B']);
  for (const rank of HISTORY_RANKS) {
    assert.ok(HISTORY_RANK_INFO[rank].label.length > 0);
    assert.ok(HISTORY_RANK_INFO[rank].description.length > 0);
    assert.doesNotMatch(HISTORY_RANK_INFO[rank].description, /頻出|出題率/);
  }
  assert.ok(Object.isFrozen(HISTORY_RANKS));
  assert.ok(Object.isFrozen(HISTORY_RANK_INFO.S));
});

test('every correction refers to an existing unique ID, exact event, original rank, and a reason', () => {
  const ids = new Set();
  assert.equal(historyRankChanges.length, 124);
  for (const change of historyRankChanges) {
    assert.ok(change.id >= 1 && change.id <= 1000);
    assert.equal(ids.has(change.id), false, `duplicate correction ${change.id}`);
    ids.add(change.id);
    const matches = rows.filter((row) => row.id === change.id);
    assert.equal(matches.length, 1, `missing or duplicate data ID ${change.id}`);
    const row = matches[0];
    assert.equal(row.event, change.event, `event changed: ${change.id}`);
    assert.equal(row.level, change.fromRank, `source rank changed: ${change.id}`);
    assert.notEqual(change.rank, change.fromRank);
    assert.ok(HISTORY_RANKS.includes(change.rank));
    assert.ok(change.reason.length >= 20, `reason missing: ${change.id}`);
    assert.deepEqual(defaultHistoryRankInfo(row), { rank: change.rank, reason: change.reason, reviewed: true });
    assert.ok(Object.isFrozen(change));
  }
});

test('the original 1000 levels stay intact while derived ranks use the documented distribution', () => {
  assert.equal(originalRows.length, 1000);
  assert.equal(new Set(originalRows.map((row) => row.id)).size, 1000);
  assert.deepEqual(counts(originalRows, (row) => row.level), { S: 214, A: 465, B: 321 });
  assert.deepEqual(counts(originalRows, (row) => defaultHistoryRankInfo(row).rank), { S: 252, A: 407, B: 341 });
});

test('representative culture, world foundations and specialist cases follow the rubric', () => {
  for (const id of [1, 2, 3, 4, 346, 351, 352, 386, 390, 394, 401, 407, 419, 432, 799]) {
    assert.equal(defaultHistoryRankInfo(rowsById.get(id)).rank, 'S', `core ${id}`);
  }
  for (const id of [349, 393, 395, 400, 404, 420, 424, 464]) {
    assert.equal(defaultHistoryRankInfo(rowsById.get(id)).rank, 'A', `connections ${id}`);
  }
  for (const id of [516, 525, 677, 711, 785, 788, 885]) {
    assert.equal(defaultHistoryRankInfo(rowsById.get(id)).rank, 'B', `detail ${id}`);
  }
});

test('reading rank information never mutates data, nested notes, tags or source levels', () => {
  const frozenRows = deepFreeze(structuredClone(rows));
  const before = JSON.stringify(frozenRows);
  for (const row of frozenRows) defaultHistoryRankInfo(row);
  assert.equal(JSON.stringify(frozenRows), before);
  const result = defaultHistoryRankInfo(frozenRows.find((row) => row.id === 1));
  result.rank = 'B';
  assert.equal(defaultHistoryRankInfo(rowsById.get(1)).rank, 'S');
});

test('unmodified rows keep their source rank without inventing a reviewed rationale', () => {
  const changedIds = new Set(historyRankChanges.map((change) => change.id));
  for (const row of rows.filter((row) => !changedIds.has(row.id))) {
    const info = defaultHistoryRankInfo(row);
    assert.equal(info.rank, row.level, `unchanged ${row.id}`);
    assert.equal(info.reviewed, false);
    assert.match(info.reason, /元データ/);
    assert.match(info.reason, /補正を適用していません/);
  }
});

test('ID, title and original rank all have to match to apply a correction', () => {
  const row = rowsById.get(1);
  assert.equal(defaultHistoryRankInfo({ ...row, id: String(row.id) }).reviewed, true);
  for (const replacement of [
    { event: '別の出来事' },
    { event: `${row.event} ` },
    { level: 'B' },
    { level: 'S' },
    { id: 1.5 },
    { id: -1 },
    { id: '01' },
    { id: '1.0' },
    { id: '1e0' },
    { id: ' 1 ' },
    { id: true },
    { id: null },
    { id: undefined },
  ]) {
    const info = defaultHistoryRankInfo({ ...row, ...replacement });
    assert.equal(info.reviewed, false, JSON.stringify(replacement));
    assert.equal(info.rank, replacement.level ?? row.level);
  }
});

test('new entries always respect their level even when a title repeats a reviewed event', () => {
  const row = rowsById.get(1);
  for (const id of [1001, '1001', 1100, 9007199254740991]) {
    for (const level of HISTORY_RANKS) {
      const info = defaultHistoryRankInfo({ ...row, id, level });
      assert.equal(info.rank, level);
      assert.equal(info.reviewed, false);
    }
  }
});

test('missing or invalid levels use an explicit unreviewed placeholder without throwing', () => {
  for (const row of [null, undefined, {}, { level: '' }, { level: 's' }, { level: 'C' }, { id: 1, event: rowsById.get(1).event }]) {
    const info = defaultHistoryRankInfo(row);
    assert.equal(info.rank, 'B');
    assert.equal(info.reviewed, false);
    assert.match(info.reason, /仮にB/);
    assert.match(info.reason, /未確認/);
  }
});
