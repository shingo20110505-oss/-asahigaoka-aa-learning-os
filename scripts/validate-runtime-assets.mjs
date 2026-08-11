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
  'diagnostics.html',
  'review/index.html'
]){
  if(!fs.existsSync(asset)) throw new Error(`missing managed runtime asset: ${asset}`);
}

requireText(mobile, "./mobile-layout-guard-v1.js", 'mobile layout loader');
requireText(mobile, "./login-companion-v1.js", 'login visual loader');
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
requireText(visual, 'URL.createObjectURL(item.blob)', 'image object URL');
requireText(visual, 'object-fit:contain', 'image containment');
requireText(visual, 'async function importZip', 'ZIP image import');
requireText(visual, 'MAX_ZIP_IMAGES=300', 'ZIP safety limit');
requireText(visual, 'window.AALoginCompanion=', 'login visual API');

requireText(prod, 'new Audio(currentAudioURL)', 'production voice playback');
requireText(prod, "h.addEventListener('pointerdown',retry", 'production iPhone audio fallback');
requireText(prod, 'window.AALoginProductionTest=', 'production test API');

if(!/const VERSION='[^']+'/.test(sw)) throw new Error('managed service worker version missing');
requireText(sw, 'async function networkFirst', 'network-first runtime');
requireText(sw, "ext==='js'", 'generic JS freshness');
requireText(sw, "ext==='css'", 'generic CSS freshness');
requireText(sw, "ext==='json'", 'generic JSON freshness');
requireText(sw, "url('review/')", 'offline review shell');
requireText(sw, "url('mobile-layout-guard-v1.js')", 'offline mobile layout guard');
requireText(sw, "u.pathname.endsWith('review-bank-v1.js')", 'review bank forced freshness');

const referenced=[...mobile.matchAll(/['"]\.\/([^'"?]+\.js)/g)].map(m=>m[1]);
for(const file of new Set(referenced)){
  if(!fs.existsSync(file)) throw new Error(`mobile loader points to missing file: ${file}`);
}

console.log(`runtime assets OK: referenced=${new Set(referenced).size}, layout/login voice/image checks passed, managed SW passed`);
