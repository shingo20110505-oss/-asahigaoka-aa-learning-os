import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({name, ok: Boolean(condition), detail});
  if (!condition) process.exitCode = 1;
};

const index = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('sw.js');
const engine = read('learning-engine-v15.js');
const curriculum = read('curriculum-v2-data.js');
const engineV2 = read('learning-engine-v2.js');
const engineV22 = read('learning-engine-v22.js');
const vocab10000 = read('japanese-vocabulary-10000.js');
const chronologia = read('chronologia.html');
const scripts = [...index.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
const chronologiaScripts = [...chronologia.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
const chronologiaDataStart = chronologia.indexOf('const DATA = [');
const chronologiaDataEnd = chronologia.indexOf('];', chronologiaDataStart);
const chronologiaDataSource = chronologia.slice(chronologiaDataStart, chronologiaDataEnd + 2);
const chronologiaIds = [...chronologiaDataSource.matchAll(/"id":(\d+)/g)].map(match => Number(match[1]));

check('index.html exists', index.startsWith('<!DOCTYPE html>'));
check('Japanese language metadata', /<html[^>]+lang="ja"/.test(index));
check('iPhone viewport safe area', /viewport-fit=cover/.test(index));
check('Manifest link', /rel="manifest" href="\.\/manifest\.webmanifest"/.test(index));
check('Apple touch icon', /rel="apple-touch-icon"/.test(index));
check('Standalone iOS metadata', /apple-mobile-web-app-capable" content="yes"/.test(index));
check('Service worker registration', /serviceWorker\.register\('\.\/sw\.js'/.test(index));
check('Stable localStorage key', /STORE_KEY='asahi_learning_os_v1'/.test(index));
check('JSON export and import', /function exportJSON/.test(index) && /function importJSON/.test(index));
check('Update prompt', /SKIP_WAITING/.test(index) && /PWA\.waiting/.test(index));
check('No root-relative app-shell URLs', !/(?:src|href)="\/(?!\/)/.test(index));
check('One inline application script', scripts.length === 1, `found ${scripts.length}`);
check('v1.5 engine linked', /src="\.\/learning-engine-v15\.js"/.test(index));
check('v2 curriculum and engine linked', /src="\.\/curriculum-v2-data\.js"/.test(index) && /src="\.\/learning-engine-v2\.js"/.test(index));
check('v2.2 exam engine and vocabulary linked', /src="\.\/learning-engine-v22\.js"/.test(index) && /src="\.\/japanese-vocabulary-10000\.js"/.test(index));
check('Chronologia standalone route linked', /href="\.\/chronologia\.html"/.test(engineV22));

try {
  new vm.Script(scripts[0], {filename: 'index-inline.js'});
  check('Application JavaScript syntax', true);
} catch (error) {
  check('Application JavaScript syntax', false, error.message);
}

try {
  new vm.Script(engine, {filename: 'learning-engine-v15.js'});
  check('v1.5 engine JavaScript syntax', true);
} catch (error) {
  check('v1.5 engine JavaScript syntax', false, error.message);
}

try {
  new vm.Script(curriculum, {filename: 'curriculum-v2-data.js'});
  new vm.Script(engineV2, {filename: 'learning-engine-v2.js'});
  new vm.Script(vocab10000, {filename: 'japanese-vocabulary-10000.js'});
  new vm.Script(engineV22, {filename: 'learning-engine-v22.js'});
  check('v2 JavaScript syntax', true);
} catch (error) {
  check('v2 JavaScript syntax', false, error.message);
}

try {
  new vm.Script(sw, {filename: 'sw.js'});
  check('Service worker syntax', true);
} catch (error) {
  check('Service worker syntax', false, error.message);
}

try {
  chronologiaScripts.forEach((script, index) => new vm.Script(script, {filename: `chronologia-inline-${index + 1}.js`}));
  check('Chronologia JavaScript syntax', chronologiaScripts.length === 2, `scripts ${chronologiaScripts.length}`);
} catch (error) {
  check('Chronologia JavaScript syntax', false, error.message);
}

check('Manifest identity', manifest.id === './' && manifest.start_url === './' && manifest.scope === './');
check('Standalone display', manifest.display === 'standalone');
check('Manifest icons', Array.isArray(manifest.icons) && manifest.icons.length >= 3);
check('Maskable icon', manifest.icons.some(icon => icon.purpose === 'maskable'));

for (const icon of manifest.icons) {
  const iconPath = path.join(root, icon.src.replace(/^\.\//, ''));
  check(`Icon exists: ${icon.src}`, fs.existsSync(iconPath));
  if (!fs.existsSync(iconPath)) continue;
  const png = fs.readFileSync(iconPath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const expected = Number(icon.sizes.split('x')[0]);
  check(`Icon size: ${icon.src}`, width === expected && height === expected, `${width}x${height}`);
}

check('Offline fallback included', fs.existsSync(path.join(root, 'offline.html')) && sw.includes('offline.html'));
check('Cache version matches app version', /APP_VERSION='2\.2\.0'/.test(index) && /VERSION = '2\.2\.0'/.test(sw));
check('Indirect-question full-output gate', /hasIndirectQuestion/.test(index) && /generateReadingBeforeFullGrammarGate/.test(index) && /repairSavedReadingGrammarGate/.test(index));
check('Reading-opening anti-repeat gate', /READING_OPENINGS/.test(index) && /openingSignature/.test(index) && /selectReadingOpening/.test(index) && /openingFirstToken/.test(index));
check('Reading gloss verb forms', /verbFormsFor/.test(index) && /過去分詞形/.test(index));
check('Reading full translation and grammar review', /fullReadingTranslation/.test(index) && /importantGrammarNotes/.test(index) && /全文和訳/.test(index));
check('English-only reading choices', /readingQuestionSetBeforeEnglishChoices/.test(index) && /englishReadingChoice/.test(index));
check('Bayesian unknown-word evidence', /lexicalEvidenceState/.test(index) && /lexicalPosterior/.test(index) && /gloss-unknown/.test(index));
check('v1.5 engine precached', sw.includes("learning-engine-v15.js"));
check('v2 files precached', sw.includes("curriculum-v2-data.js") && sw.includes("learning-engine-v2.js"));
check('v2.2 files precached', sw.includes("learning-engine-v22.js") && sw.includes("japanese-vocabulary-10000.js") && sw.includes("learning-engine-v22.css"));
check('Chronologia precached', sw.includes("chronologia.html") && /cache\.put\(request, response\.clone\(\)\)/.test(sw));
check('Chronologia 6.1 identity', /<title>Chronologia 6\.1/.test(chronologia) && /const VERSION = "6\.1\.0"/.test(chronologia));
check('Chronologia 385 records intact', chronologiaIds.length === 385 && new Set(chronologiaIds).size === 385 && Math.min(...chronologiaIds) === 1 && Math.max(...chronologiaIds) === 385, `${chronologiaIds.length}/${Math.max(...chronologiaIds)}`);
check('Chronologia storage key preserved', /const STORE_KEY = "chronologia-aichi-v3"/.test(chronologia) && !/const STORE_KEY = "asahi_learning_os_v1"/.test(chronologia));
check('Chronologia deep explanations intact', /const DEEP_NOTES_V61 = \{/.test(chronologia) && /Chronologia deep explanation patch 6\.1 loaded/.test(chronologia));
check('Chronologia compatibility-only bridge', /id="aaos-chronologia-compat"/.test(chronologia) && /class="aaos-back" href="\.\/index\.html"/.test(chronologia));
check('Stable storage key preserved', /STORE_KEY='asahi_learning_os_v1'/.test(index) && /_pre_v15/.test(engine));
check('Transactional history protection', /before-import/.test(engine) && /before-reset/.test(engine) && /session-complete/.test(engine));
check('Adaptive vocabulary diagnosis', /AA15_MIN_DIAG = 18/.test(engine) && /AA15_MAX_DIAG = 32/.test(engine));
check('Lexical uncertainty interval', /standardError/.test(engine) && /assistedLower/.test(engine));
check('Evidence IDs', /E-\$\{passageId\}-P/.test(engine));
check('Scenario-specific distractors', /aa15ScenarioDistractors/.test(engine) && /distractorType/.test(engine));
check('Collocations included', /take part in/.test(engine) && /en\.vocab\.collocation/.test(engine));
check('Aichi English 40-minute simulator', /AA15_MOCK_LIMIT_MS = 40 \* 60 \* 1000/.test(engine) && /start-reading-simulator/.test(index));
check('Knowledge tracing uncertainty', /aa15SkillInterval/.test(engine) && /alpha/.test(engine) && /beta/.test(engine));
check('Shared learning profile', /aa-learning-profile\/1/.test(engine));
check('Chronologia retrieval', /start-timeline-recall/.test(engine) && /soc\.history\.network/.test(engine));
check('Practice and exam test separated', /trackType: 'practice'/.test(engineV2) && /trackType: 'test'/.test(engineV2) && /test-next/.test(engineV2));
check('Three Aichi exam levels', /公立標準/.test(engineV2) && /難関公立/.test(engineV2) && /旭丘レベル/.test(engineV2));
check('Independent exam route', /state\.route !== 'exam'/.test(engineV22) && /function examHTML/.test(engineV22));
check('R8 Japanese exact macrostructure', /R8国語4大問・22点/.test(engineV22) && /大問二/.test(engineV22) && /部分点/.test(engineV22));
check('10,000-word index literal count', /count:10000/.test(vocab10000) && /CC BY 4\.0/.test(vocab10000));
check('Forgetting model disclosure', /Ebbinghaus-inspired/.test(engineV2) && /exp\(-t\/S\)/.test(engineV2));
check('v2 migration original preserved', /_pre_v2/.test(index) && /AA2_PRE_KEY/.test(engineV2));
check('README included', fs.existsSync(path.join(root, 'README.md')));

for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}
console.log(`\n${checks.filter(x => x.ok).length}/${checks.length} checks passed`);
