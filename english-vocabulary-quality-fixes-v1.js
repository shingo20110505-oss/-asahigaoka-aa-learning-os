(()=>{'use strict';
const VERSION='2026-09-05.1';
const FIXES={
 charge:{meaning:'料金、請求する、責任、充電する'},
 earn:{example:'The program helps young people earn money while learning new skills.',cloze:'The program helps young people earn money while learning new skills.'},
 'by the time':{example:'By the time we arrived, the meeting was already in progress.',cloze:'By the time we arrived, the meeting was already in progress.'}
};
function install(){
 if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab)||!window.__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__?.complete)return false;
 let fixed=0,missing=[];
 for(const [word,patch] of Object.entries(FIXES)){
  const row=DATA.vocab.find(x=>String(x?.word||'').trim().toLowerCase()===word);
  if(!row){missing.push(word);continue}
  Object.assign(row,patch);fixed++;
 }
 window.__AA_ENGLISH_VOCAB_QUALITY_FIXES_V1__={version:VERSION,fixed,missing,total:DATA.vocab.length,compatibility:'field-only-id-and-srs-preserved'};
 try{document.dispatchEvent(new CustomEvent('aa:vocab-quality-fixes-ready',{detail:window.__AA_ENGLISH_VOCAB_QUALITY_FIXES_V1__}))}catch(_){}
 if(missing.length)console.warn('[AA vocab quality fixes] missing:',missing.join(', '));
 return true;
}
if(!install()){let tries=0;const timer=setInterval(()=>{if(install()||++tries>800)clearInterval(timer)},10)}
})();
