import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const checks = [];

function check(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) failures.push(name + (details ? `: ${details}` : ''));
}

function extractAssignedLiteral(source, variableName) {
  const marker = `const ${variableName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`assignment not found: ${variableName}`);
  const equalsIndex = source.indexOf('=', markerIndex + marker.length);
  if (equalsIndex < 0) throw new Error(`assignment operator not found: ${variableName}`);
  let i = equalsIndex + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const start = i;
  const first = source[start];
  if (first !== '{' && first !== '[') throw new Error(`unsupported literal start: ${variableName}`);
  const stack = [];
  let quote = null;
  let escaped = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{' || ch === '[') stack.push(ch);
    if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if ((open === '{' && ch !== '}') || (open === '[' && ch !== ']')) throw new Error(`unbalanced literal: ${variableName}`);
      if (!stack.length) return vm.runInNewContext(`(${source.slice(start, i + 1)})`, Object.create(null), { timeout: 3000 });
    }
  }
  throw new Error(`unterminated literal: ${variableName}`);
}

function extractAssignedString(source, variableName) {
  const marker = `const ${variableName}`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`assignment not found: ${variableName}`);
  const equalsIndex = source.indexOf('=', markerIndex + marker.length);
  let i = equalsIndex + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  const quote = source[i];
  if (quote !== '"' && quote !== "'") throw new Error(`string assignment not found: ${variableName}`);
  const start = i;
  i += 1;
  let escaped = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === quote) return vm.runInNewContext(source.slice(start, i + 1), Object.create(null), { timeout: 3000 });
  }
  throw new Error(`unterminated string: ${variableName}`);
}

function loadCore() {
  const sandbox = { module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('vocabulary-core/core-v1.js'), sandbox, { timeout: 3000, filename: 'vocabulary-core/core-v1.js' });
  return sandbox.module.exports;
}

function parseChronologiaJsPack(file) {
  const sandbox = { window: { CHRONO_V7_PACKS: [] } };
  vm.runInNewContext(read(file), sandbox, { timeout: 3000, filename: file });
  return sandbox.window.CHRONO_V7_PACKS.flatMap((pack) => Array.isArray(pack?.items) ? pack.items : []);
}

function parseChronologiaCompressedPack(file) {
  const source = read(file);
  const b64 = extractAssignedString(source, 'b64');
  const text = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  return text.split('\n').map((line) => line.replace(/\r$/, '')).filter(Boolean).map((line, i) => {
    const fields = line.split('\t');
    if (fields.length < 6) throw new Error(`${file}: malformed row ${i + 1}`);
    const [sort, date, event, areaCode, periodCode, level] = fields;
    return { id: 501 + i, sort: Number(sort), date, event, areaCode, periodCode, level, detail: event, tags: [] };
  });
}

function validAll(core, records) {
  const invalid = [];
  records.forEach((record, index) => {
    const result = core.validateRecord(record);
    if (!result.ok && invalid.length < 20) invalid.push({ index, id: record?.id, errors: result.errors });
  });
  return invalid;
}

function duplicateIdentityCount(core, records) {
  const seen = new Set();
  let duplicates = 0;
  for (const record of records) {
    const key = core.identityKey(record);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

const core = loadCore();
const schema = JSON.parse(read('vocabulary-core/schema-v1.json'));
check('Vocabulary Core version is normalization-ready v1.1+', /^1\.[1-9]\./.test(core.VERSION), core.VERSION);
check('Schema supports progress aliases', schema?.properties?.progressRef?.properties?.aliases?.type === 'array');
check('Identity key is stable across category changes', core.identityKey({ subject: 'english', category: 'word', id: 'x' }) === core.identityKey({ subject: 'english', category: 'phrase', id: 'x' }));

// English: native base words plus the separate collocation asset.
const runtime = extractAssignedLiteral(read('app/legacy/main-runtime.js'), 'DATA');
const englishBase = runtime.vocab || [];
const collocations = extractAssignedLiteral(read('learning-engine-v15.js'), 'AA15_COLLOCATIONS');
const englishBaseNormalized = englishBase.map((row) => core.normalizeEnglish(row));
const collocationNormalized = collocations.map((row) => core.normalizeEnglish(row));
const englishInvalid = validAll(core, [...englishBaseNormalized, ...collocationNormalized]);
check('English native assets normalize without invalid records', englishInvalid.length === 0, JSON.stringify(englishInvalid));
check('English base count remains 107', englishBaseNormalized.length === 107, `rows=${englishBaseNormalized.length}`);
check('English collocation count remains 10', collocationNormalized.length === 10, `rows=${collocationNormalized.length}`);
check('English normalized identities are unique', duplicateIdentityCount(core, [...englishBaseNormalized, ...collocationNormalized]) === 0);
check('English base records keep v: SRS IDs', englishBaseNormalized.every((x) => x.progressRef.nativeId === `v:${x.source.nativeId}`));
check('English collocations keep phrase: SRS IDs', collocationNormalized.every((x) => x.progressRef.nativeId === `phrase:${x.source.nativeId}`));
check('English collocations do not claim the catalog wrong queue', collocationNormalized.every((x) => x.progressRef.wrongStore === null));
check('English base native en/ja fields survive normalization', englishBaseNormalized.every((x) => x.term && x.meaning));

// Japanese: all 15,000 raw rows normalize to one canonical full-* identity while retaining both legacy progress IDs.
const japaneseRows = read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const japaneseNormalized = japaneseRows.map((row) => core.normalizeJapanese(row));
const japaneseInvalid = validAll(core, japaneseNormalized);
check('Japanese 15,000 rows normalize without invalid records', japaneseInvalid.length === 0, JSON.stringify(japaneseInvalid));
check('Japanese normalized count remains 15,000', japaneseNormalized.length === 15000, `rows=${japaneseNormalized.length}`);
check('Japanese normalized identities are unique', duplicateIdentityCount(core, japaneseNormalized) === 0);
check('Japanese full-data canonical IDs use full-*', japaneseNormalized.every((x) => /^full-/.test(x.id)));
check('Japanese list progress IDs are preserved', japaneseNormalized.every((x) => x.progressRef.nativeId === `j${x.source.nativeId}`));
check('Japanese quiz progress aliases are preserved', japaneseNormalized.every((x) => x.progressRef.aliases.includes(`quiz-full-${x.source.nativeId}`)));
check('Japanese runtime B/C rank derivation is preserved', japaneseNormalized.every((x) => x.examRank === (x.category === 'yoji' || x.category === 'idiom' ? 'B' : 'C')));
check('Japanese state/wrong/cycle stores are unchanged', japaneseNormalized.every((x) => x.progressRef.store === 'kokugoChronologiaStateV2' && x.progressRef.wrongStore === 'aa_kokugo_vocab_wrong_queue_v1' && x.progressRef.cycleStore === 'aa_kokugo_vocab_full15000_cycle_v1'));

// Social: reconstruct the same effective 1,000 IDs used by the force1000 boot path.
const socialBase = extractAssignedLiteral(read('chronologia.html'), 'DATA');
const socialPacks = [
  ...parseChronologiaJsPack('chronologia-v7-data-1.js'),
  ...parseChronologiaJsPack('chronologia-v7-data-2a.js'),
  ...parseChronologiaJsPack('chronologia-v7-data-2b.js'),
  ...parseChronologiaJsPack('chronologia-v7-data-3.js'),
  ...parseChronologiaCompressedPack('chronologia-v7-data-4.js')
];
const socialById = new Map([...socialBase, ...socialPacks].map((row) => [String(row.id), row]));
const socialRows = [...socialById.values()];
const socialNormalized = socialRows.map((row) => core.normalizeSocial(row));
const socialInvalid = validAll(core, socialNormalized);
check('Social effective catalogue normalizes without invalid records', socialInvalid.length === 0, JSON.stringify(socialInvalid));
check('Social effective count remains 1,000', socialNormalized.length === 1000, `rows=${socialNormalized.length}`);
check('Social normalized identities are unique', duplicateIdentityCount(core, socialNormalized) === 0);
check('Social Chronologia progress IDs are unchanged', socialNormalized.every((x) => x.progressRef.store === 'chronologia-aichi-v3' && x.progressRef.nativeId === x.source.nativeId));
check('Social period/periodCode survives normalization', socialNormalized.every((x) => x.extensions.period));

const report = {
  version: '1.0.0',
  checkedAt: new Date().toISOString(),
  coreVersion: core.VERSION,
  totals: {
    englishBase: englishBaseNormalized.length,
    englishCollocations: collocationNormalized.length,
    japanese: japaneseNormalized.length,
    social: socialNormalized.length
  },
  checks,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
