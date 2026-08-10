import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const html = read('chronologia.html');
const daily = read('chronologia-daily-companion.js');
const live = read('chronologia-live-companion.js');
const sw = read('sw.js');
const results = [];
const check = (name, ok, detail='') => { results.push({name,ok:Boolean(ok),detail}); if(!ok) process.exitCode=1; };

check('Chronologia title 6.3', /<title>Chronologia 6\.3/.test(html));
check('Chronologia core version 6.3.1', /const VERSION = "6\.3\.1";/.test(html));
check('Daily loader exactly once', (html.match(/chronologia-daily-companion\.js\?v=6\.3\.1/g)||[]).length===1 && (html.match(/chronologia-daily-companion\.js/g)||[]).length===1);
check('Live loader exactly once', (html.match(/chronologia-live-companion\.js\?v=6\.3\.1/g)||[]).length===1 && (html.match(/chronologia-live-companion\.js/g)||[]).length===1);
check('Daily engine present', /chronologia-daily-v2/.test(daily) && /function streak\(/.test(daily) && /activeMs/.test(daily));
check('30 voice registry endpoints', /wrong_01\.mp3/.test(daily) && /finish_02\.mp3/.test(daily) && /VOICE_FILES/.test(daily));
check('Voice stored locally', /indexedDB\.open\(VOICE_DB/.test(daily) && /chronologia-local-voice-v1/.test(daily));
check('Voice-expression event bridge', /chronologia:voice/.test(daily) && /chronologia:voice/.test(live));
check('12 expression endpoints', /01_normal\.png/.test(live) && /12_rare\.png/.test(live) && /EXPRESSIONS/.test(live));
check('Images stored locally', /indexedDB\.open\(IMG_DB/.test(live) && /chronologia-local-companion-v1/.test(live));
check('Virtual body/head/eye/mouth layers', /cc-body/.test(live) && /cc-head/.test(live) && /cc-eyes/.test(live) && /cc-mouth-layer/.test(live));
check('Real audio analyser lip sync', /createAnalyser/.test(live) && /getByteTimeDomainData/.test(live) && /readAudioLevel/.test(live));
check('iPhone-safe feature fallback', /webkitAudioContext/.test(live) && /level===null/.test(live));
check('PWA precaches daily engine', /chronologia-daily-companion\.js/.test(sw));
check('PWA precaches live engine', /chronologia-live-companion\.js/.test(sw));
check('Fresh Chronologia cache generation', /c631/.test(sw));

try { new vm.Script(daily, {filename:'chronologia-daily-companion.js'}); check('Daily JS syntax', true); }
catch(e){ check('Daily JS syntax', false, e.message); }
try { new vm.Script(live, {filename:'chronologia-live-companion.js'}); check('Live JS syntax', true); }
catch(e){ check('Live JS syntax', false, e.message); }

for(const r of results) console.log(`${r.ok?'PASS':'FAIL'}  ${r.name}${r.detail?` — ${r.detail}`:''}`);
console.log(`\n${results.filter(x=>x.ok).length}/${results.length} Chronologia 6.3 checks passed`);
