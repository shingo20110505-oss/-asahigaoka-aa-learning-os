(()=>{'use strict';
const VERSION='2026-09-05.1';
const EXCLUDE=new Set(['coherent','constitute','criterion','deduce','derive','equivalent','framework','notion']);
function install(){
 if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab)||!window.__AA_ENGLISH_VOCAB_SUPPLEMENT__)return false;
 const removed=[];
 for(let i=DATA.vocab.length-1;i>=0;i--){
  const row=DATA.vocab[i],word=String(row?.word||'').trim().toLowerCase();
  if(row?.source==='rise-curated-supplement-v1'&&EXCLUDE.has(word)){
   removed.push({id:row.id,word:row.word,srsId:row.srsId});DATA.vocab.splice(i,1);
  }
 }
 removed.reverse();
 window.__AA_ENGLISH_VOCAB_PRIORITY_V1__={version:VERSION,policy:'aichi-jhs-high-yield-before-b2-meta-vocabulary',excluded:[...EXCLUDE],removed,totalAfterPriority:DATA.vocab.length,historyImpact:'localized-removed-items-not-active-existing-storage-untouched'};
 try{document.dispatchEvent(new CustomEvent('aa:vocab-priority-ready',{detail:window.__AA_ENGLISH_VOCAB_PRIORITY_V1__}))}catch(_){}
 if(removed.length!==EXCLUDE.size)console.warn('[AA vocab priority] expected removals:',EXCLUDE.size,'actual:',removed.length);
 return true;
}
if(!install()){let tries=0;const timer=setInterval(()=>{if(install()||++tries>400)clearInterval(timer)},10)}
})();
