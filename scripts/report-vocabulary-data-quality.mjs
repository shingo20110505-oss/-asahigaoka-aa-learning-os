import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

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

function extractAssignedString(source, variableName) {
  const marker = `const ${variableName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`assignment not found: ${variableName}`);
  const equalsIndex = source.indexOf('=', markerIndex + marker.length);
  if (equalsIndex < 0) throw new Error(`assignment operator not found: ${variableName}`);
  let i = equalsIndex + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const quote = source[i];
  if (quote !== '"' && quote !== "'") throw new Error(`string assignment not found: ${variableName}`);
  const start = i;
  i += 1;
  let escaped = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === quote) {
      return vm.runInNewContext(source.slice(start, i + 1), Object.create(null), { timeout: 2000 });
    }
  }
  throw new Error(`unterminated string for ${variableName}`);
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
  const runtime = read('app/legacy/main-runtime.js');
  const data = extractAssignedLiteral(runtime, 'DATA');
  const rows = Array.isArray(data?.vocab) ? data.vocab : [];
  if (!rows.length) throw new Error('English DATA.vocab is empty or unavailable');

  const engine15 = read('learning-engine-v15.js');
  const collocations = extractAssignedLiteral(engine15, 'AA15_COLLOCATIONS');
  if (!Array.isArray(collocations) || !collocations.length) throw new Error('English AA15_COLLOCATIONS is empty or unavailable');

  return {
    sources: {
      baseWords: 'app/legacy/main-runtime.js::DATA.vocab',
      collocations: 'learning-engine-v15.js::AA15_COLLOCATIONS',
      learnerDynamicWords: 'state.profile.unknownWords (runtime only; excluded from static catalogue totals)'
    },
    staticRows: {
      baseWords: rows.length,
      collocations: collocations.length,
      totalSeparateAssets: rows.length + collocations.length
    },
    baseWords: {
      idDuplicates: duplicates(rows.map((r) => r.id)),
      wordDuplicates: duplicates(rows.map((r) => (r.en ?? r.w ?? r.word ?? r.term ?? '').toString().toLowerCase())),
      coverage: {
        id: coverage(rows, (r) => r.id),
        word: coverage(rows, (r) => r.en ?? r.w ?? r.word ?? r.term),
        meaningJa: coverage(rows, (r) => r.ja ?? r.m ?? r.meaningJa ?? r.meaning),
        partOfSpeech: coverage(rows, (r) => r.pos ?? r.partOfSpeech),
        level: coverage(rows, (r) => r.lv ?? r.level ?? r.difficulty),
        forms: coverage(rows, (r) => r.forms),
        exampleEn: coverage(rows, (r) => r.sentence ?? r.example ?? r.exampleEn),
        exampleJa: coverage(rows, (r) => r.jaSentence ?? r.exJa ?? r.exampleJa),
        category: coverage(rows, (r) => r.category),
        aichiAlignment: coverage(rows, (r) => r.aichiAlignment),
        tags: coverage(rows, (r) => r.tags),
        qualityChecked: coverage(rows, (r) => r.qualityChecked === true ? 'true' : '')
      },
      distribution: {
        partOfSpeech: distribution(rows, (r) => r.pos ?? r.partOfSpeech),
        level: distribution(rows, (r) => r.lv ?? r.level ?? r.difficulty)
      }
    },
    collocations: {
      idDuplicates: duplicates(collocations.map((r) => r.id)),
      phraseDuplicates: duplicates(collocations.map((r) => norm(r.phrase).toLowerCase())),
      coverage: {
        id: coverage(collocations, (r) => r.id),
        phrase: coverage(collocations, (r) => r.phrase),
        meaningJa: coverage(collocations, (r) => r.meaning),
        exampleEn: coverage(collocations, (r) => r.example),
        distractors: coverage(collocations, (r) => r.distractors)
      }
    },
    runtimeNote: 'Static catalogue reporting intentionally excludes learner-added unknownWords so one user profile cannot change repository QA counts.'
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

function cleanAssetPath(value) {
  return norm(value).split('?')[0].replace(/^\.\//, '');
}

function parseChronologiaJsPack(file) {
  const source = read(file);
  const sandbox = { window: { CHRONO_V7_PACKS: [] } };
  vm.runInNewContext(source, sandbox, { timeout: 3000, filename: file });
  return sandbox.window.CHRONO_V7_PACKS.flatMap((pack) => Array.isArray(pack?.items) ? pack.items : []);
}

function parseChronologiaCompressedPack(file) {
  const source = read(file);
  const b64 = extractAssignedString(source, 'b64');
  const text = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  const lines = text.split('\n').map((line) => line.replace(/\r$/, '')).filter(Boolean);
  return lines.map((line, i) => {
    const fields = line.split('\t');
    if (fields.length < 6) throw new Error(`${file}: malformed supplemental row ${i + 1}`);
    const [sort, date, event, areaCode, periodCode, level] = fields;
    return {
      id: 501 + i,
      sort: Number(sort),
      date,
      event,
      areaCode,
      periodCode,
      level,
      detail: `${event}。Chronologia 7の補充項目として、前後の出来事・同時代史・因果関係と結び付けて確認する。`,
      tags: []
    };
  });
}

function reportSocial() {
  const html = read('chronologia.html');
  const baseRows = extractAssignedLiteral(html, 'DATA');
  if (!Array.isArray(baseRows) || !baseRows.length) throw new Error('Chronologia base DATA is empty or unavailable');

  const boot = read('chronologia-force1000-v1.js');
  const targetMatch = boot.match(/current\s*>=\s*(\d+)/) || boot.match(/n\s*<\s*(\d+)/);
  if (!targetMatch) throw new Error('Chronologia runtime target not found in boot guards');
  const targetCount = Number(targetMatch[1]);
  const declaredPackRefs = extractAssignedLiteral(boot, 'PACKS').map(cleanAssetPath);
  const curatedRefs = extractAssignedLiteral(boot, 'CURATED').map(cleanAssetPath);
  const missingDeclaredFiles = [...declaredPackRefs, ...curatedRefs].filter((file) => !exists(file));

  const additivePackFiles = declaredPackRefs.filter((file) => /^chronologia-v7-data-(?:1|2a|2b|3|4)\.js$/.test(file));
  const packReports = [];
  const allRows = [{ file: 'chronologia.html::DATA', rows: baseRows }];
  for (const file of additivePackFiles) {
    const rows = file.endsWith('data-4.js') ? parseChronologiaCompressedPack(file) : parseChronologiaJsPack(file);
    packReports.push({
      file,
      rows: rows.length,
      minId: rows.length ? Math.min(...rows.map((r) => Number(r.id))) : null,
      maxId: rows.length ? Math.max(...rows.map((r) => Number(r.id))) : null
    });
    allRows.push({ file, rows });
  }

  const runtimeRows = allRows.flatMap(({ rows }) => rows);
  const runtimeIdDuplicates = duplicates(runtimeRows.map((r) => r.id));
  const byId = new Map();
  for (const row of runtimeRows) byId.set(norm(row.id), row);
  const effectiveRows = [...byId.values()];
  const dateOf = (r) => r.date ?? r.year;
  const exactYearCount = effectiveRows.filter((r) => isExactYearLabel(dateOf(r))).length;

  return {
    sources: {
      base: 'chronologia.html::DATA',
      boot: 'chronologia-force1000-v1.js',
      declaredPacks: declaredPackRefs,
      curatedPatches: curatedRefs
    },
    targetCount,
    baseRows: baseRows.length,
    additivePacks: packReports,
    additiveRows: packReports.reduce((sum, pack) => sum + pack.rows, 0),
    runtimeRowsBeforeIdDedup: runtimeRows.length,
    effectiveUniqueIds: effectiveRows.length,
    reachesTarget: effectiveRows.length === targetCount,
    missingDeclaredFiles,
    runtimeIdDuplicates,
    eventDateDuplicates: duplicates(effectiveRows.map((r) => `${norm(r.event)}|${norm(dateOf(r))}`)),
    coverage: {
      id: coverage(effectiveRows, (r) => r.id),
      sort: coverage(effectiveRows, (r) => r.sort),
      date: coverage(effectiveRows, dateOf),
      period: coverage(effectiveRows, (r) => r.period ?? r.periodCode),
      area: coverage(effectiveRows, (r) => r.area ?? r.areaCode),
      level: coverage(effectiveRows, (r) => r.level),
      event: coverage(effectiveRows, (r) => r.event),
      detail: coverage(effectiveRows, (r) => r.detail),
      tags: coverage(effectiveRows, (r) => r.tags)
    },
    distribution: {
      period: distribution(effectiveRows, (r) => r.period ?? r.periodCode),
      level: distribution(effectiveRows, (r) => r.level)
    },
    eventToYearEligible: {
      count: exactYearCount,
      total: effectiveRows.length,
      percent: pct(exactYearCount, effectiveRows.length)
    },
    note: 'Curated/override files patch the assembled runtime catalogue and are tracked as declared assets, not counted as new rows.'
  };
}

function isExactYearLabel(value) {
  const y = norm(value);
  if (!y.endsWith('年')) return false;
  let body = y.slice(0, -1);
  if (body.startsWith('紀元前')) body = body.slice(3);
  return body.length > 0 && [...body].every((ch) => ch >= '0' && ch <= '9');
}

const report = {
  version: '1.1.0',
  generatedAt: new Date().toISOString(),
  scope: ['english', 'japanese', 'social'],
  english: reportEnglish(),
  japanese: reportJapanese(),
  social: reportSocial(),
  vocabularyRelatedFiles: listVocabularyRelatedFiles()
};

const criticalFailures = [];
if (report.english.baseWords.idDuplicates.duplicateExtraRows > 0) criticalFailures.push(`English duplicate base IDs: ${report.english.baseWords.idDuplicates.duplicateExtraRows}`);
if (report.english.collocations.idDuplicates.duplicateExtraRows > 0) criticalFailures.push(`English duplicate collocation IDs: ${report.english.collocations.idDuplicates.duplicateExtraRows}`);
if (report.english.collocations.phraseDuplicates.duplicateExtraRows > 0) criticalFailures.push(`English duplicate collocation phrases: ${report.english.collocations.phraseDuplicates.duplicateExtraRows}`);
if (report.japanese.rows !== 15000) criticalFailures.push(`Japanese row count is ${report.japanese.rows}, expected 15000`);
if (report.japanese.parseErrors.length > 0) criticalFailures.push(`Japanese parse errors: ${report.japanese.parseErrors.length}`);
if (report.japanese.wordReadingDuplicates.duplicateExtraRows > 0) criticalFailures.push(`Japanese duplicate word/reading keys: ${report.japanese.wordReadingDuplicates.duplicateExtraRows}`);
if (report.social.missingDeclaredFiles.length > 0) criticalFailures.push(`Chronologia missing declared files: ${report.social.missingDeclaredFiles.join(', ')}`);
if (report.social.runtimeIdDuplicates.duplicateExtraRows > 0) criticalFailures.push(`Chronologia duplicate runtime IDs: ${report.social.runtimeIdDuplicates.duplicateExtraRows}`);
if (!report.social.reachesTarget) criticalFailures.push(`Chronologia runtime unique count is ${report.social.effectiveUniqueIds}, expected ${report.social.targetCount}`);
const compressedPack = report.social.additivePacks.find((pack) => pack.file.endsWith('chronologia-v7-data-4.js'));
if (!compressedPack || compressedPack.rows !== 500) criticalFailures.push(`Chronologia compressed supplemental count is ${compressedPack?.rows ?? 0}, expected 500`);

report.criticalFailures = criticalFailures;
console.log(JSON.stringify(report, null, 2));
if (criticalFailures.length) process.exit(1);
