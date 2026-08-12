import './validate-vocab-examples.mjs';
import fs from 'node:fs';

function read(path){
  if(!fs.existsSync(path)) throw new Error(`missing runtime file: ${path}`);
  return fs.readFileSync(path,'utf8');
}
function requireText(source, needle, label){
  if(!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

const index = read('index.html');
const entry = read('aa-companion-v2.js');
const mobile = read('aa-companion-mobile-fix.js');
const layout = read('mobile-layout-guard-v1.js');
const voice = read('companion7-runtime.js');
const visual = read('login-companion-v1.js');
const prod = read('login-production-test-v1.js');
const loader = read('v23-loader.js');
const vocabMobile = read('vocab-mobile-card-fix-v1.js');
const quality = read('quality-repair-v1.js');
const qualityFinal = read('quality-repair-final-v1.js');
const qualityCI = read('quality-ci-runner-v1.js');
const sw = read('sw.js');

requireText(index, './aa-companion-v2.js', 'index entry');
requireText(index, './aa-companion-mobile-fix.js', 'index mobile entry');
requireText(entry, "a.href='./review/'", 'review route');
requireText(entry, "register('./sw.js'", 'service worker refresh');

for(const asset of [
  'mobile-layout-guard-v1.js',
  'login-companion-v1.js',
  'login-production-test-v1.js',
  'companion7-runtime.js',
  'settings-improvements-v1.js',
  'v23-loader.js',
  'quality-repair-v1.js',
  'quality-repair-final-v1.js',
  'quality-ci-runner-v1.js',
  'english-vocab-examples-basic1-v1.js',
  'english-vocab-examples-basic2-v1.js',
  'english-vocab-examples-basic3-v1.js',
  'english-vocab-examples-phrases-v1.js',
  'english-vocab-examples-apply-v1.js',
  'english-vocab-example-ui-v1.js',
  'vocab-mobile-card-fix-v1.js',
  'vocab-row-toggle-v1.js',
  'vocab-sort-v1.js',
  'diagnostics.html',
  'review/index.html'
]){
  if(!fs.existsSync(asset)) throw new Error(`missing managed runtime asset: ${asset}`);
}

requireText(mobile, "./mobile-layout-guard-v1.js", 'mobile layout loader');
requireText(mobile, "./login-companion-v1.js?v=1.2.0", 'decode-safe login visual loader');
requireText(mobile, "./login-production-test-v1.js", 'login production test loader');
requireText(mobile, "./settings-improvements-v1.js", 'settings loader');

requireText(layout, "window.__AA_MOBILE_LAYOUT_GUARD_V1__", 'layout guard marker');
requireText(layout, 'body>.nav', 'body-level fixed nav');
requireText(layout, 'document.body.appendChild(fresh)', 'nav portal to body');
requireText(layout, "fresh.style.setProperty('bottom','0','important')", 'forced bottom anchor');
requireText(layout, "#app{transform:none!important", 'fixed containing-block protection');
requireText(layout, "backdrop-filter:none!important", 'iPhone backdrop filter protection');

requireText(voice, "const DB_NAME='aa-companion-voice-v1'", 'voice IndexedDB');
requireText(voice, 'async function setLoginVoices', 'login voice pool');
requireText(voice, 'async function setExplosionVoice', 'explosion voice');
requireText(voice, 'a.playsInline=true', 'iPhone inline audio');
requireText(voice, "document.addEventListener('pointerdown',onUserGesture,true)", 'audio gesture retry');
requireText(voice, "document.addEventListener('touchstart',onUserGesture,true)", 'touch audio retry');
requireText(voice, 'window.Companion7=', 'Companion7 public API');

requireText(visual, "const DB_NAME='aa-login-companion-v1'", 'image IndexedDB');
requireText(visual, "version:'1.2.0'", 'decode-safe image runtime version');
requireText(visual, 'function decodeURL(blob)', 'image decode preflight');
requireText(visual, 'async function pickDecodableImage', 'broken image fallback');
requireText(visual, "reason:'decode-failed'", 'decode failure skip marker');
requireText(visual, "main.addEventListener('error'", 'render-time image fallback');
requireText(visual, 'object-fit:contain', 'image containment');
requireText(visual, 'async function importZip', 'ZIP image import');
requireText(visual, 'MAX_ZIP_IMAGES=300', 'ZIP safety limit');
requireText(visual, 'window.AALoginCompanion=', 'login visual API');

requireText(prod, 'new Audio(currentAudioURL)', 'production voice playback');
requireText(prod, "h.addEventListener('pointerdown',retry", 'production iPhone audio fallback');
requireText(prod, 'window.AALoginProductionTest=', 'production test API');

requireText(loader, "'quality-repair-v1.js'", 'quality repair load order');
requireText(loader, "'quality-repair-final-v1.js'", 'final quality repair load order');
requireText(loader, "'quality-ci-runner-v1.js'", 'browser quality runner load order');
requireText(loader, "'english-vocab-examples-apply-v1.js'", 'vocab example audit load order');
requireText(loader, "'english-vocab-example-ui-v1.js'", 'vocab example UI load order');
requireText(loader, "'vocab-mobile-card-fix-v1.js'", 'compact vocab mobile card load order');
requireText(vocabMobile, 'window.__AA_VOCAB_MOBILE_CARD_FIX_V1__', 'compact vocab mobile card marker');
requireText(vocabMobile, 'display:flex!important', 'compact vocab flex card layout');
requireText(vocabMobile, 'flex-wrap:wrap!important', 'compact vocab card wrapping');
requireText(vocabMobile, 'data-aa-vocab-mobile-card-fix', 'compact vocab runtime marker');
requireText(quality, 'window.__AA_QUALITY_REPAIR_V1__', 'quality repair marker');
requireText(quality, 'function buildCloze', 'cloze answer exposure repair');
requireText(quality, 'planVocabQueue=function', 'six vocab plus two collocation repair');
requireText(quality, 'context-fallback', 'reading glossary fallback');
requireText(quality, 'distractorType', 'distractor classification repair');
requireText(quality, '筆者の中心的な主張', 'argument reading type repair');
requireText(quality, 'REPAIR.audit=function', 'quality repair self-audit');
requireText(qualityFinal, "version:'1.0.1'", 'final repair version');
requireText(qualityFinal, 'FORMULA_AREAS', 'formula-only area whitelist');
requireText(qualityFinal, "excludedStrategy:['m39','m40']", 'strategy rows excluded from formula bank');
requireText(qualityFinal, "includedAdvancedTail:['m58','m59']", 'advanced tail retained in formula bank');
requireText(qualityFinal, 'repairReadingEvidence', 'reading evidence repair');
requireText(qualityFinal, 'missingEvidence', 'reading evidence audit');
requireText(qualityCI, "params.get('aa_quality_ci')!=='1'", 'browser quality runner opt-in');
requireText(qualityCI, 'AA_QUALITY_REPAIR_FINAL', 'browser waits for final repair');
requireText(qualityCI, '長文生成・文法ゲート 36本', 'runtime long-reading gate');
requireText(qualityCI, '数学公式暗記限定', 'runtime math formula gate');
requireText(qualityCI, "dataset.aaQualityCi=result.pass?'PASS':'FAIL'", 'browser quality PASS marker');

if(!/const VERSION='[^']+'/.test(sw)) throw new Error('managed service worker version missing');
requireText(sw, 'quality2-chronologia1000', 'shared PWA generation');
requireText(sw, 'async function networkFirst', 'network-first runtime');
requireText(sw, "ext==='js'", 'generic JS freshness');
requireText(sw, "ext==='css'", 'generic CSS freshness');
requireText(sw, "ext==='json'", 'generic JSON freshness');
requireText(sw, "url('review/')", 'offline review shell');
requireText(sw, "url('mobile-layout-guard-v1.js')", 'offline mobile layout guard');
requireText(sw, "url('quality-repair-v1.js')", 'offline quality repair');
requireText(sw, "url('quality-repair-final-v1.js')", 'offline final quality repair');
requireText(sw, "url('quality-ci-runner-v1.js')", 'offline browser quality runner');
requireText(sw, "u.pathname.endsWith('review-bank-v1.js')", 'review bank forced freshness');

const referenced=[...mobile.matchAll(/['"]\.\/([^'"?]+\.js)/g)].map(m=>m[1]);
for(const file of new Set(referenced)){
  if(!fs.existsSync(file)) throw new Error(`mobile loader points to missing file: ${file}`);
}

console.log(`runtime assets OK: referenced=${new Set(referenced).size}, final quality/Chronologia/layout/login/PWA/vocab-example/mobile-card checks passed`);
