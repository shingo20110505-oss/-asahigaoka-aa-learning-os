import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function extractAssignedLiteral(source, variableName) {
  const marker = `const ${variableName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`assignment not found: ${variableName}`);
  const equalsIndex = source.indexOf('=', markerIndex + marker.length);
  if (equalsIndex < 0) throw new Error(`assignment operator not found: ${variableName}`);
  let i = equalsIndex + 1;
  while (i < source.length && [' ', '\n', '\r', '\t'].includes(source[i])) i += 1;
  const start = i;
  const first = source[start];
  if (first !== '{' && first !== '[') throw new Error(`unsupported literal start for ${variableName}: ${JSON.stringify(first)}`);

  const stack = [];
  let quote = null;
  let escaped = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[') stack.push(ch);
    if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if ((open === '{' && ch !== '}') || (open === '[' && ch !== ']')) throw new Error(`unbalanced literal for ${variableName}`);
      if (stack.length === 0) {
        const literal = source.slice(start, i + 1);
        return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 2000 });
      }
    }
  }
  throw new Error(`unterminated literal for ${variableName}`);
}

const norm = (v) => String(v ?? '').trim();
const pct = (count, total) => total ? Number((count * 100 / total).toFixed(2)) : 0;

function duplicates(values) {
  const counts = new Map();
  for (const value of values.map(norm).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  const repeated = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    duplicateKeyCount: repeated.length,
    duplicateExtraRows: repeated.reduce((sum, [, n]) => sum + n - 1, 0),
    samples: repeated.slice(0, 20).map(([value, count]) => ({ value, count }))
  };
}

function distribution(rows, pick) {
  const map = new Map();
  for (const row of rows) {
    const value = norm(pick(row)) || '(missing)';
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function coverage(rows, pick) {
  const count = rows.filter((row) => {
    const v = pick(row);
    return Array.isArray(v) ? v.length > 0 : norm(v).length > 0;
  }).length;
  return { count, total: rows.length, percent: pct(count, rows.length) };
}

function listVocabularyRelatedFiles() {
  const out = [];
  const ignore = new Set(['.git', 'node_modules']);
  function walk(dir, prefix = '') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignore.has(ent.name)) continue;
      const absolute = path.join(dir, ent.name);
      const relative = path.join(prefix, ent.name).replaceAll('\\', '/');
      if (ent.isDirectory()) {
        walk(absolute, relative);
        continue;
      }
      const lower = relative.toLowerCase();
      if (['vocab', 'vocabulary', 'jukugo', 'idiom', 'kokugo'].some((token) => lower.includes(token))) out.push(relative);
    }
  }
  walk(root);
  return out.sort();
}

function reportEnglish() {
  const source = read('app/legacy/main-runtime.js');
  const data = extractAssignedLiteral(source, 'DATA');
  const rows = Array.isArray(data?.vocab) ? data.vocab : [];
  if (!rows.length) throw new Error('English DATA.vocab is empty or unavailable');
  const engine15 = read('learning-engine-v15.js');

  return {
    source: 'app/legacy/main-runtime.js::DATA.vocab',
    baseRows: rows.length,
    idDuplicates: duplicates(rows.map((r) => r.id)),
    wordDuplicates: duplicates(rows.map((r) => (r.w ?? r.word ?? r.term ?? '').toString().toLowerCase())),
    coverage: {
      id: coverage(rows, (r) => r.id),
      word: coverage(rows, (r) => r.w ?? r.word ?? r.term),
      meaningJa: coverage(rows, (r) => r.m ?? r.meaningJa ?? r.meaning),
      partOfSpeech: coverage(rows, (r) => r.pos ?? r.partOfSpeech),
      level: coverage(rows, (r) => r.lv ?? r.level ?? r.difficulty),
      forms: coverage(rows, (r) => r.forms),
      exampleEn: coverage(rows, (r) => r.example ?? r.exampleEn),
      exampleJa: coverage(rows, (r) => r.exJa ?? r.exampleJa),
      category: coverage(rows, (r) => r.category),
      aichiAlignment: coverage(rows, (r) => r.aichiAlignment),
      tags: coverage(rows, (r) => r.tags),
      qualityChecked: coverage(rows, (r) => r.qualityChecked === true ? 'true' : '')
    },
    distribution: {
      partOfSpeech: distribution(rows, (r) => r.pos ?? r.partOfSpeech),
      level: distribution(rows, (r) => r.lv ?? r.level ?? r.difficulty)
    },
    runtimeExtensions: {
      learningEngineV15CollocationsPresent: engine15.includes('AA15_COLLOCATIONS'),
      note: 'Base DATA.vocab is measured separately because runtime vocabPool may append extension entries.'
    }
  };
}

function reportJapanese() {
  const lines = read('kokugo-chronologia/data.jsonl')
    .split('\n')
    .map((line) => line.endsWith('\r') ? line.slice(0, -1) : line)
    .filter((line) => line.trim());
  const rows = [];
  const parseErrors = [];
  const keyCounts = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    try {
      const row = JSON.parse(lines[i]);
      rows.push(row);
      for (const key of Object.keys(row)) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    } catch (error) {
      parseErrors.push({ line: i + 1, message: error.message });
    }
  }
  const word = (r) => r.word ?? r.term ?? r.expression ?? r.idiom ?? '';
  const reading = (r) => r.reading ?? r.yomi ?? r.kana ?? '';
  const meaning = (r) => r.meaning ?? r.meaningJa ?? r.definition ?? r.gloss ?? '';
  const type = (r) => r.type ?? r.category ?? r.kind ?? '';
  const rank = (r) => r.rank ?? r.examRank ?? r.importance ?? '';
  const compoundKey = rows.map((r) => `${norm(word(r))}|${norm(reading(r))}`);

  return {
    source: 'kokugo-chronologia/data.jsonl',
    rows: lines.length,
    parsedRows: rows.length,
    parseErrors: parseErrors.slice(0, 20),
    keyCoverage: Object.fromEntries([...keyCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    wordReadingDuplicates: duplicates(compoundKey),
    coverage: {
      word: coverage(rows, word),
      reading: coverage(rows, reading),
      rawMeaningInJsonl: coverage(rows, meaning),
      type: coverage(rows, type),
      rank: coverage(rows, rank)
    },
    distribution: {
      type: distribution(rows, type),
      rank: distribution(rows, rank)
    },
    note: 'Japanese runtime may resolve verified meanings through meaning-ja-overrides/KOKUGO_DIRECT_MEANINGS; raw JSONL meaning coverage is reported separately and is not treated as a failure.'
  };
}

function isExactYearLabel(value) {
  const y = norm(value);
  if (!y.endsWith('年')) return false;
  let body = y.slice(0, -1);
  if (body.startsWith('紀元前')) body = body.slice(3);
  return body.length > 0 && [...body].every((ch) => ch >= '0' && ch <= '9');
}

function reportSocial() {
  const source = read('chronologia.html');
  const rows = extractAssignedLiteral(source, 'DATA');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Chronologia DATA is empty or unavailable');
  return {
    source: 'chronologia.html::DATA',
    rows: rows.length,
    idDuplicates: duplicates(rows.map((r) => r.id)),
    eventYearDuplicates: duplicates(rows.map((r) => `${norm(r.event)}|${norm(r.year)}`)),
    coverage: {
      id: coverage(rows, (r) => r.id),
      sort: coverage(rows, (r) => r.sort),
      year: coverage(rows, (r) => r.year),
      period: coverage(rows, (r) => r.period),
      category: coverage(rows, (r) => r.cat ?? r.category),
      level: coverage(rows, (r) => r.level),
      event: coverage(rows, (r) => r.event),
      detail: coverage(rows, (r) => r.detail),
      aichi: coverage(rows, (r) => r.aichi)
    },
    distribution: {
      period: distribution(rows, (r) => r.period),
      category: distribution(rows, (r) => r.cat ?? r.category),
      level: distribution(rows, (r) => r.level)
    },
    eventToYearEligible: {
      count: rows.filter((r) => isExactYearLabel(r.year)).length,
      total: rows.length,
      percent: pct(rows.filter((r) => isExactYearLabel(r.year)).length, rows.length)
    }
  };
}

const report = {
  version: '1.0.1',
  generatedAt: new Date().toISOString(),
  scope: ['english', 'japanese', 'social'],
  english: reportEnglish(),
  japanese: reportJapanese(),
  social: reportSocial(),
  vocabularyRelatedFiles: listVocabularyRelatedFiles()
};

const criticalFailures = [];
if (report.english.idDuplicates.duplicateExtraRows > 0) criticalFailures.push(`English duplicate IDs: ${report.english.idDuplicates.duplicateExtraRows}`);
if (report.japanese.rows !== 15000) criticalFailures.push(`Japanese row count is ${report.japanese.rows}, expected 15000`);
if (report.japanese.parseErrors.length > 0) criticalFailures.push(`Japanese parse errors: ${report.japanese.parseErrors.length}`);
if (report.japanese.wordReadingDuplicates.duplicateExtraRows > 0) criticalFailures.push(`Japanese duplicate word/reading keys: ${report.japanese.wordReadingDuplicates.duplicateExtraRows}`);
if (report.social.idDuplicates.duplicateExtraRows > 0) criticalFailures.push(`Social duplicate IDs: ${report.social.idDuplicates.duplicateExtraRows}`);

report.criticalFailures = criticalFailures;
console.log(JSON.stringify(report, null, 2));
if (criticalFailures.length) process.exit(1);
