import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const failures = [];
const checks = [];

function check(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) failures.push(name + (details ? `: ${details}` : ''));
}

const schemaPath = 'vocabulary-core/schema-v1.json';
const inventoryPath = 'vocabulary-core/inventory-v1.json';
const corePath = 'vocabulary-core/core-v1.js';

for (const p of [schemaPath, inventoryPath, corePath]) check(`foundation file exists: ${p}`, exists(p));

const schema = JSON.parse(read(schemaPath));
const inventory = JSON.parse(read(inventoryPath));
const subjectEnum = schema?.properties?.subject?.enum || [];
check('schema subject scope is exactly English/Japanese/Social', JSON.stringify(subjectEnum) === JSON.stringify(['english', 'japanese', 'social']), JSON.stringify(subjectEnum));
check('inventory excludes science and math', inventory?.scope?.excludedSubjects?.includes('science') && inventory?.scope?.excludedSubjects?.includes('math'));
check('quiz UI is deferred', inventory?.scope?.quizUiPhase === 'deferred');

const requiredSources = [
  'vocab.html',
  'vocab-wrong-quiz-v1.js',
  'ai-reading-v1.js',
  'kokugo-chronologia/index.html',
  'kokugo-chronologia/data.jsonl',
  'kokugo-chronologia/quiz-rank-select-v1.js',
  'kokugo-chronologia/quiz-interaction-fix.js',
  'chronologia.html'
];
for (const p of requiredSources) check(`native source exists: ${p}`, exists(p));

const english = read('vocab.html');
const englishWrong = read('vocab-wrong-quiz-v1.js');
const reading = read('ai-reading-v1.js');
check('English native catalog API preserved', english.includes('AA_VOCAB_CATALOG_API'));
check('English wrong queue preserved', englishWrong.includes('aa_vocab_quiz_wrong_v1'));
check('English reading sees vocabulary weakness', reading.includes('weakWords') && reading.includes('vocabPool'));
check('English reading sees known words', reading.includes('knownWords'));

const jaQuiz = read('kokugo-chronologia/quiz-rank-select-v1.js');
check('Japanese quiz expects 15,000 rows', /FULL_COUNT\s*=\s*15000/.test(jaQuiz));
check('Japanese progress store preserved', jaQuiz.includes('kokugoChronologiaStateV2'));
check('Japanese wrong queue preserved', jaQuiz.includes('aa_kokugo_vocab_wrong_queue_v1'));
check('Japanese no-repeat cycle preserved', jaQuiz.includes('aa_kokugo_vocab_full15000_cycle_v1') && jaQuiz.includes('makeNoRepeatSet'));

const jsonl = read('kokugo-chronologia/data.jsonl').split(/\r?\n/).filter(Boolean);
check('Japanese full data has exactly 15,000 rows', jsonl.length === 15000, `rows=${jsonl.length}`);
let parsed = 0;
let duplicateKeys = 0;
const seen = new Set();
for (let i = 0; i < jsonl.length; i += 1) {
  try {
    const row = JSON.parse(jsonl[i]);
    parsed += 1;
    const word = String(row.word ?? row.term ?? '').trim();
    const readingValue = String(row.reading ?? row.yomi ?? row.kana ?? '').trim();
    if (word) {
      const key = `${word}|${readingValue}`;
      if (seen.has(key)) duplicateKeys += 1;
      seen.add(key);
    }
  } catch (error) {
    failures.push(`Japanese JSONL parse line ${i + 1}: ${error.message}`);
  }
}
check('Japanese JSONL all rows parse', parsed === jsonl.length, `parsed=${parsed}/${jsonl.length}`);
check('Japanese word/reading keys are unique when present', duplicateKeys === 0, `duplicates=${duplicateKeys}`);

const social = read('chronologia.html');
check('Chronologia native progress store preserved', social.includes('chronologia-aichi-v3'));
check('Chronologia event/year directions preserved', social.includes('eventToYear') && social.includes('yearToEvent'));
check('Chronologia answer recording preserved', social.includes('recordAnswer'));

const report = {
  version: inventory.version,
  checkedAt: new Date().toISOString(),
  scope: inventory.scope.includedSubjects,
  checks,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
