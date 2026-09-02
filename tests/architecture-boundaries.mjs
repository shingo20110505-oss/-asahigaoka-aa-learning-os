import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const order=['app/app-shell.js','app/state/state-manager.js','app/learning/learning-engine.js','app/subjects/subject-engines.js','app/ui/ui-runtime.js','app/pwa/pwa-runtime.js','app/qa/qa-runtime.js'];
let last=-1;for(const f of order){const p=index.indexOf(f);if(p<0||p<=last)throw new Error(`Architecture order invalid: ${f}`);last=p}
if(!index.includes('app/runtime-registry.js')||!index.includes('app/legacy/main-runtime.js'))throw new Error('Shell extraction missing');
for(const m of index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].length>12000)throw new Error('Large inline runtime remains');
for(const m of index.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))if(m[1].length>12000)throw new Error('Large inline CSS remains');
const loader=fs.readFileSync('v23-loader.js','utf8');
const mobile=fs.readFileSync('aa-companion-mobile-fix.js','utf8');
if(loader.includes('v23-pet-settings.js')||mobile.includes('v23-pet-settings.js')||fs.existsSync('v23-pet-settings.js'))throw new Error('Legacy pet naming still active');
if(!loader.includes('companion-media-settings-v1.js')||!mobile.includes('companion-media-settings-v1.js')||!fs.existsSync('companion-media-settings-v1.js'))throw new Error('Companion media settings migration missing');
const media=fs.readFileSync('companion-media-settings-v1.js','utf8');for(const n of ['data-login-image-add','data-login-voice-file','setLoginVoices','setExplosionVoice','AALoginCompanion'])if(!media.includes(n))throw new Error(`Companion media marker missing: ${n}`);
const sw=fs.readFileSync('sw.js','utf8');for(const f of ['app/ui/base.css','app/runtime-registry.js','app/legacy/main-runtime.js',...order,'companion-media-settings-v1.js'])if(!sw.includes(`url('${f}')`))throw new Error(`PWA core missing ${f}`);
for(const f of ['review-bank-v1.js','review/index.html','storage-resilience-v1.js','aa-companion-v2.js','aa-companion-mobile-fix.js','login-companion-v1.js','companion7-runtime.js','answer-feedback-audio-v1.js','science-exam/bridge.js','social-exam/bridge.js'])if(!fs.existsSync(f))throw new Error(`Protected asset missing: ${f}`);
const reg=fs.readFileSync('app/runtime-registry.js','utf8');if(!reg.includes('scienceExam:false')||!reg.includes('socialExam:false'))throw new Error('Completed subject state missing');
const subjects=fs.readFileSync('app/subjects/subject-engines.js','utf8');for(const n of ["science:'active'","social:'active'",'window.AAScienceExam','window.AASocialExam'])if(!subjects.includes(n))throw new Error(`Completed subject adapter missing: ${n}`);
const legacyV23=fs.readFileSync('learning-engine-v23.js','utf8');
if(!legacyV23.includes("typeof makeMathQ==='function'&&window.AAMathFullReplacement?.ok!==true"))throw new Error('Legacy V23 may override verified mathematics ownership');
console.log('architecture-boundaries: PASS');
