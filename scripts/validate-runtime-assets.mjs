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
const aiReading = read('ai-reading-v1.js');
const riseUI = read('app/ui/rise-ui-v4.js');
const riseCSS = read('app/ui/rise-ui-v4.css');
const riseStructure = read('app/ui/rise-structure-v4.css');
const riseStable = read('app/ui/rise-stable-root-v4.js');
const pwaRuntime = read('app/pwa/pwa-runtime.js');
const reviewUI = read('review/index.html');
const sw = read('sw.js');

new Function(riseUI);
new Function(riseStable);
new Function(pwaRuntime);
requireText(index, './aa-companion-v2.js', 'index entry');
requireText(index, './aa-companion-mobile-fix.js', 'index mobile entry');
requireText(index, './app/ui/rise-ui-v4.js?v=4.2.0', 'complete Rise UI entry');
requireText(index, './app/ui/rise-stable-root-v4.js?v=2.3.0', 'Rise stable root entry');
requireText(index, './app/pwa/pwa-runtime.js?v=4.2.1', 'Rise PWA runtime generation');
requireText(index, './app/ui/rise-structure-v4.css?v=4.2.0', 'complete Rise structure stylesheet');
requireText(index, 'data-rise-structure="optimized-4"', 'Rise boot marker');
requireText(entry, "a.href='./review/'", 'review route');
requireText(entry, "register('./sw.js'", 'service worker refresh');

for(const asset of [
  'mobile-layout-guard-v1.js','login-companion-v1.js','login-production-test-v1.js','companion7-runtime.js',
  'settings-improvements-v1.js','header-menu-v1.js','app/ui/rise-ui-v4.js','app/ui/rise-ui-v4.css',
  'app/ui/rise-structure-v4.css','app/ui/rise-stable-root-v4.js','app/pwa/pwa-runtime.js',
  'v23-loader.js','quality-repair-v1.js','quality-repair-final-v1.js',
  'quality-ci-runner-v1.js','ai-reading-v1.js','english-vocab-examples-basic1-v1.js',
  'english-vocab-examples-basic2-v1.js','english-vocab-examples-basic3-v1.js','english-vocab-examples-phrases-v1.js',
  'english-vocab-examples-apply-v1.js','english-vocab-example-ui-v1.js','vocab-mobile-card-fix-v1.js',
  'vocab-row-toggle-v1.js','vocab-sort-v1.js','diagnostics.html','review/index.html'
]){
  if(!fs.existsSync(asset)) throw new Error(`missing managed runtime asset: ${asset}`);
}

requireText(riseUI, "version:'4.2.0'", 'Rise UI version');
requireText(riseUI, "structure:'complete'", 'Rise complete structure marker');
requireText(riseUI, "root.dataset.riseStructure='optimized-4'", 'Rise DOM marker');
requireText(riseUI, 'function homeHTML', 'Rise dashboard');
requireText(riseUI, 'function subjectsHTML', 'Rise study hub');
requireText(riseUI, 'function analyticsHTML', 'Rise record dashboard');
requireText(riseUI, 'function settingsHTML', 'Rise minimal settings');
requireText(riseUI, '今日の学習', 'Rise today learning plan');
requireText(riseUI, '教科別の達成度', 'Rise subject progress');
requireText(riseUI, '5教科ミックス', 'Rise mixed study entry');
requireText(riseUI, 'start-reading-simulator', 'Rise Aichi English simulator entry');
requireText(riseUI, '<span>ホーム</span>', 'Rise home nav');
requireText(riseUI, '<span>学習</span>', 'Rise study nav');
requireText(riseUI, '<span>復習</span>', 'Rise review nav');
requireText(riseUI, '<span>記録</span>', 'Rise record nav');
requireText(riseStable, "version:'2.3.0'", 'Rise stable root version');
requireText(riseStable, "firstLoad:'immediate-capture'", 'Rise first-load capture marker');
requireText(riseStable, "prewarm:'none-on-demand'", 'Rise on-demand route generation');
if(riseStable.includes('warmPrimary')||riseStable.includes('clickUnderlying')) throw new Error('Rise stable root must not perform hidden route prewarm clicks');
requireText(riseStable, "reviewNavigation:'canonical-page'", 'Rise canonical Review navigation');
requireText(riseStable, 'goReview', 'Rise Review page navigation function');
requireText(riseStable, 'stopImmediatePropagation', 'Rise Review legacy interception guard');
requireText(riseStable, 'captureAdded', 'Rise immediate panel capture');
requireText(pwaRuntime, "const RISE_BOOT='4.2.1'", 'Rise PWA runtime version');
requireText(pwaRuntime, 'rise:sw-updated', 'Rise SW soft-update signal');
requireText(riseCSS, '.rv4Dashboard', 'Rise dashboard styling');
requireText(riseCSS, '.rv4StudyHero', 'Rise study hub styling');
requireText(riseCSS, '.rv4RecordHero', 'Rise record styling');
requireText(riseCSS, '@media(max-width:800px)', 'Rise tablet/mobile reflow');
requireText(riseStructure, 'main>:not(.riseSubjectsV4)', 'legacy subjects hidden under Rise');
requireText(riseStructure, 'main>:not(.riseAnalyticsV4)', 'legacy analytics hidden under Rise');
requireText(riseStructure, 'grid-template-columns:repeat(4', 'Rise four-item navigation layout');
requireText(reviewUI, 'Rise / 復習', 'Rise review branding');
requireText(reviewUI, 'Review v2', 'Review v2 contract retained');
requireText(reviewUI, "fetch('../review-bank-v1.js'", 'Review canonical bank retained');

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
requireText(visual, "version:'1.3.0'", 'decode-safe image runtime version');
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
requireText(loader, "'ai-reading-v1.js'", 'AI reading load order');
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
requireText(qualityCI, 'Rise・最適化ナビ', 'browser optimized Rise gate');
requireText(qualityCI, 'Gemini教材一覧・文法ゲート', 'runtime long-reading gate');
requireText(qualityCI, '愛知県型数学・応用検算', 'runtime Aichi applied mathematics gate');
requireText(qualityCI, "dataset.aaQualityCi=result.pass?'PASS':'FAIL'", 'browser quality PASS marker');
requireText(aiReading, 'window.__AA_AI_READING_V1__', 'AI reading runtime marker');
requireText(aiReading, 'aa_ai_reading_config_v1', 'isolated AI connection storage');
requireText(aiReading, 'Gemini生成・正答二重検査済み', 'AI verification badge');
requireText(aiReading, 'translationJa', 'AI translation handoff');
if(/GEMINI_API_KEY\s*=/.test(aiReading)) throw new Error('Gemini API key must not be present in browser code');

if(!/const VERSION='[^']+'/.test(sw)) throw new Error('managed service worker version missing');
requireText(sw, 'quality2-chronologia1000', 'shared PWA generation');
requireText(sw, "const RISE_BOOT='4.2.1'", 'complete Rise PWA generation');
requireText(sw, 'stable-2.3.0', 'Rise stable-route PWA generation');
requireText(sw, "url('app/ui/rise-structure-v4.css')", 'offline Rise structure');
requireText(sw, "url('app/ui/rise-ui-v4.js?v=4.2.0')", 'offline complete Rise UI');
requireText(sw, "url('app/ui/rise-stable-root-v4.js?v=2.3.0')", 'offline stable root');
requireText(sw, "url('app/pwa/pwa-runtime.js?v=4.2.1')", 'offline PWA runtime generation');
requireText(sw, 'async function networkFirst', 'network-first runtime');
requireText(sw, "ext==='js'", 'generic JS freshness');
requireText(sw, "ext==='css'", 'generic CSS freshness');
requireText(sw, "ext==='json'", 'generic JSON freshness');
requireText(sw, "url('review/')", 'offline review shell');
requireText(sw, "url('mobile-layout-guard-v1.js')", 'offline mobile layout guard');
requireText(sw, "url('quality-repair-v1.js')", 'offline quality repair');
requireText(sw, "url('quality-repair-final-v1.js')", 'offline final quality repair');
requireText(sw, "url('quality-ci-runner-v1.js')", 'offline browser quality runner');
requireText(sw, "url('ai-reading-v1.js')", 'offline AI reading UI');
requireText(sw, "u.pathname.endsWith('review-bank-v1.js')", 'review bank forced freshness');
if(sw.includes('client.navigate')) throw new Error('service worker must not auto-navigate the main UI');
if(sw.includes('refreshMainClients')) throw new Error('legacy service-worker auto-refresh path must stay removed');

const referenced=[...mobile.matchAll(/['"]\.\/([^'"?]+\.js)/g)].map(m=>m[1]);
for(const file of new Set(referenced)){
  if(!fs.existsSync(file)) throw new Error(`mobile loader points to missing file: ${file}`);
}

console.log(`runtime assets OK: referenced=${new Set(referenced).size}, Rise 4.2.1 on-demand stable home/study/record/settings + canonical Review + quality/Chronologia/layout/login/PWA checks passed`);
