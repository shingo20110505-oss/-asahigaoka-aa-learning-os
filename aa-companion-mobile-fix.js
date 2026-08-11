(()=>{'use strict';
function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
function loadSettings(){loadScript('aa-pet-settings-loader','./v23-pet-settings.js?compat=229-loginzip1')}
function loadV23(){loadScript('aa-v23-loader','./v23-loader.js?compat=229-question-quality1')}
function loadLogin(){loadScript('aa-login-companion-loader','./login-companion-v1.js?v=1.1.0')}
function loadExplosionAnalytics(){loadScript('aa-explosion-analytics-loader','./analytics-explosion-v1.js?v=2.0.0')}
function loadDailyAnalytics(){loadScript('aa-daily-analytics-loader','./analytics-daily-v1.js?v=1.0.0')}
function loadProductionLoginTest(){loadScript('aa-login-production-test-loader','./login-production-test-v1.js?v=1.0.0')}
function loadSettingsImprovements(){loadScript('aa-settings-improvements-loader','./settings-improvements-v1.js?v=1.0.0')}
function killLegacy(){for(const id of ['aaPet','aaPetSheet','companion7','aaPetSettingCard','petSettingWrap','petSettingCard'])document.getElementById(id)?.remove();document.querySelectorAll('#companion7-css,[data-companion-visual]').forEach(x=>x.remove())}
function installEnglishClozeDedup(retry=0){
 if(window.__AA_ENGLISH_CLOZE_DEDUP__)return;
 try{
  if(typeof chooseVocabSet!=='function'||typeof nextVocabFormat!=='function'||typeof vocabPool!=='function'||typeof itemState!=='function'||typeof dueScore!=='function'||typeof recentCorrectPenaltyForKey!=='function'||typeof state==='undefined')throw new Error('vocab engine not ready');
  const originalNextVocabFormat=nextVocabFormat;
  const recentCloze=(v)=>{
   const id=String(v?.id||'');if(!id)return null;const prefix='vocab:'+id+':cloze:';let scanned=0;
   for(let i=state.attempts.length-1;i>=0&&scanned<240;i--,scanned++){
    const a=state.attempts[i];if(String(a?.itemId||'').startsWith(prefix))return{distance:scanned,ageMs:Math.max(0,Date.now()-Number(a?.timestamp||0))};
   }
   return null;
  };
  const clozePenalty=(v)=>{
   const r=recentCloze(v);if(!r)return 0;const hours=r.ageMs/3600000;
   if(r.distance<12||hours<6)return 10;
   if(r.distance<30||hours<24)return 7;
   if(r.distance<60||hours<72)return 3.5;
   return 0;
  };
  chooseVocabSet=function(n=4){
   let candidates=vocabPool().map(x=>{let sid=x.srsId||('v:'+x.id),it=itemState(sid);return{x,it,due:dueScore(it)+(x.origin==='readingUnknown'?.22:0)-recentCorrectPenaltyForKey(sid)-clozePenalty(x)}});
   candidates.sort((a,b)=>b.due-a.due);let pool=candidates.slice(0,Math.min(Math.max(n*5,28),candidates.length)),out=[];
   while(pool.length&&out.length<n){let max=Math.min(pool.length,Math.max(6,n*2)),idx=Math.floor(Math.random()*max);out.push(pool.splice(idx,1)[0].x)}
   return out;
  };
  nextVocabFormat=function(v,preferred=null){
   if(preferred)return preferred;
   let r=recentCloze(v);if(r&&(r.distance<45||r.ageMs<24*3600000)){
    let it=itemState(v.srsId||('v:'+v.id)),recent=it.recentFormats||[],formats=v.syn?['meaning','context','synonym']:['meaning','context'];
    let fresh=formats.find(f=>!recent.includes(f));if(fresh)return fresh;
    return formats.slice().sort((a,b)=>recent.indexOf(b)-recent.indexOf(a))[0]||'meaning';
   }
   return originalNextVocabFormat(v,null);
  };
  window.__AA_ENGLISH_CLOZE_DEDUP__={version:'1.0.1',recentWindowAttempts:60,recentWindowHours:72};
 }catch(_){if(retry<40)setTimeout(()=>installEnglishClozeDedup(retry+1),100)}
}
function installEnglishPhraseQuestionFix(retry=0){
 if(window.__AA_ENGLISH_PHRASE_QFIX__)return;
 try{
  if(typeof makeVocabQ!=='function')throw new Error('vocab question engine not ready');
  const originalMakeVocabQ=makeVocabQ;
  makeVocabQ=function(v,format){
   const q=originalMakeVocabQ(v,format);
   if(v?.pos==='phrase'&&format==='cloze'&&q){
    const meaning=String(v.meaning||'').trim();
    q.stem=`「${meaning}」を表す最も適切な英語表現を選びなさい。`;
    q.explanation=`${v.word} = ${meaning}`;
    if(Array.isArray(q.choices)){
     q.choices=q.choices.map(c=>Object.assign({},c,{reason:c.ok?`${v.word} = ${meaning}`:`「${meaning}」の意味には合いません。`}));
     q.answerIndex=q.choices.findIndex(c=>c.ok);
    }
   }
   return q;
  };
  window.__AA_ENGLISH_PHRASE_QFIX__={version:'1.0.0'};
 }catch(_){if(retry<40)setTimeout(()=>installEnglishPhraseQuestionFix(retry+1),100)}
}
function installGrammarComparisonReview(retry=0){
 if(window.__AA_GRAMMAR_REVIEW_ANY_OTHER__)return;
 try{
  if(typeof GRAMMAR_REVIEW==='undefined'||!Array.isArray(GRAMMAR_REVIEW.comparison))throw new Error('grammar review not ready');
  const rule='比較級 + than any other + 単数名詞で「ほかのどの〜よりも…」となり、最上級とほぼ同じ意味を表します。any other の後ろは単数名詞にします。例：Mt. Fuji is higher than any other mountain in Japan. ＝ Mt. Fuji is the highest mountain in Japan.';
  const current=String(GRAMMAR_REVIEW.comparison[1]||'');
  if(!current.includes('than any other'))GRAMMAR_REVIEW.comparison[1]=`${current} ${rule}`.trim();
  window.__AA_GRAMMAR_REVIEW_ANY_OTHER__={version:'1.0.0',rule:'comparative + than any other + singular noun'};
 }catch(_){if(retry<40)setTimeout(()=>installGrammarComparisonReview(retry+1),100)}
}
function installVocabOnlyPageLink(){
 if(window.__AA_VOCAB_ONLY_LINK__)return;
 window.__AA_VOCAB_ONLY_LINK__=true;
 const apply=()=>{
  const btn=document.querySelector('button[data-action="start-custom"][data-kind="vocab"][data-subject="english"]');
  if(!btn||btn.dataset.vocabOnlyLinked==='1')return;
  btn.dataset.vocabOnlyLinked='1';btn.textContent='英単語のみ';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();location.href='./vocab.html'},true);
 };
 apply();
 const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});
}
function wire(){if(!window.Companion7){setTimeout(wire,80);return}if(window.__AA_COMPANION_LOGIN_WIRED__)return;window.__AA_COMPANION_LOGIN_WIRED__=true;killLegacy();
 document.addEventListener('aa:missionComplete',()=>{try{Companion7.recordStudyComplete?.()}catch(_){}});
 const mo=new MutationObserver(killLegacy);mo.observe(document.body,{childList:true,subtree:true});
}
installEnglishClozeDedup();
installEnglishPhraseQuestionFix();
installGrammarComparisonReview();
loadSettings();loadV23();loadLogin();loadExplosionAnalytics();loadDailyAnalytics();loadProductionLoginTest();loadSettingsImprovements();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installVocabOnlyPageLink();wire()},{once:true});else{installVocabOnlyPageLink();wire()}
})();