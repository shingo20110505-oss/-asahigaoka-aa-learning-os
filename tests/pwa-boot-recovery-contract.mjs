import fs from 'node:fs';

const main=fs.readFileSync('app/legacy/main-runtime.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function must(ok,message){if(!ok)throw new Error(message)}

must(main.includes('function normalizeStandaloneBootState()'),'standalone boot-state normalizer missing');
must(main.includes("const transient=new Set(['mission','exam','timeline','study','result'])"),'transient route normalization missing');
must(main.includes("state.route='home'"),'safe home route missing');
must(main.includes('function safeInitialRender()'),'safe initial render missing');
must(main.includes("STORE_KEY+'_boot_session_recovery'"),'failed session quarantine missing');
must(main.includes("document.documentElement.dataset.riseBootRecovery='session'"),'session recovery diagnostic missing');
must(index.includes('./app/legacy/main-runtime.js?v=20260918-bootstate-1'),'index is not pinned to repaired runtime');
must(index.includes('Riseの起動状態を修復しています'),'boot screen still blames the network');
must(sw.includes("url('app/legacy/main-runtime.js?v=20260918-bootstate-1')"),'service worker does not precache repaired runtime');
must(sw.includes('pwa-resilience-1.2.0-state-boot-recovery-1.0.0'),'service worker generation not bumped for state recovery');

console.log('PWA_BOOT_RECOVERY_CONTRACT=PASS');
