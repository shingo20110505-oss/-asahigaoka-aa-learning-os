(()=>{'use strict';
function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
function resetTodayLoginTest(){
 const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 if(today!=='2026-08-12')return false;
 const once='aa-login-av-test-reset-once-20260812-v3';
 try{
  if(localStorage.getItem(once)==='1')return false;
  for(const key of ['aa-login-visual-seen-v1','aa-login-visual-pick-v1','aa-companion-voice-daily-seen-v1','aa-companion-voice-daily-pending-v1','aa-companion-voice-daily-pick-v2'])localStorage.removeItem(key);
  localStorage.setItem(once,'1');
  sessionStorage.setItem('aa-login-av-reset-reload-20260812-v3','1');
  setTimeout(()=>location.reload(),40);
  return true;
 }catch(_){return false}
}
function loadLayoutGuard(){loadScript('aa-mobile-layout-guard-loader','./mobile-layout-guard-v1.js?v=1.0.1')}
function loadReadingGloss(){loadScript('aa-reading-gloss-tap-loader','./reading-gloss-tap-v1.js?v=1.0.0')}
function loadReadingJapaneseFix(){loadScript('aa-reading-v23-ja-fix-loader','./reading-v23-ja-fix-v1.js?v=1.0.0')}
function loadCompanionMediaSettings(){loadScript('aa-companion-media-settings-loader','./companion-media-settings-v1.js?compat=phase1')}
function loadV23(){loadScript('aa-v23-loader','./v23-loader.js?compat=229-question-quality1')}
function loadLogin(){loadScript('aa-login-companion-loader','./login-companion-v1.js?v=1.2.0')}
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
function installVocabOnlyPageLink(){
 if(window.__AA_VOCAB_ONLY_LINK__)return;
 window.__AA_VOCAB_ONLY_LINK__=true;
 const apply=()=>{
  const btn=document.querySelector('button[data-action="start-custom"][data-kind="vocab"][data-subject="english"]');
  if(!btn||btn.dataset.vocabOnlyLinked==='1')return;
  btn.dataset.vocabOnlyLinked='1';btn.textContent='英単語 Chronologia';
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();location.href='./vocab.html'},true);
 };
 apply();
 const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});
}
function installVocabularyHubLink(){
 const apply=()=>{
  const a=document.getElementById('kokugoChronologiaQuickLink');if(!a)return;
  if(a.dataset.vocabularyHubLinked==='1')return;
  a.dataset.vocabularyHubLinked='1';a.href='./vocabulary.html';a.textContent='語彙';a.setAttribute('aria-label','語彙ページを開く');
 };
 apply();
 const mo=new MutationObserver(apply);mo.observe(document.body,{childList:true,subtree:true});
}
function installVocabMobileLayout(){
 try{
  if(window.parent===window)return;
  const p=window.parent,d=p.document;
  if(!/\/vocab\.html$/.test(p.location.pathname)||d.getElementById('aa-vocab-mobile-no-horizontal'))return;
  const s=d.createElement('style');s.id='aa-vocab-mobile-no-horizontal';s.textContent=`
  @media(max-width:700px){
   html,body{max-width:100%!important;overflow-x:hidden!important}
   .app{width:100%!important;max-width:100%!important;padding-left:10px!important;padding-right:10px!important}
   .tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;overflow:visible!important}
   .tabs .btn{width:100%!important;min-width:0!important;white-space:normal!important;text-align:center!important;padding:10px 6px!important;line-height:1.25!important}
   .tabs .btn:last-child{grid-column:1/-1!important}
   .tableWrap{overflow:visible!important;width:100%!important}
   .vtable{display:block!important;width:100%!important;min-width:0!important;border-collapse:separate!important;border-spacing:0!important}
   .vtable thead{display:none!important}
   .vtable tbody{display:block!important;width:100%!important}
   .vtable tr{display:block!important;position:relative!important;width:100%!important;margin:0 0 9px!important;padding:12px 46px 12px 12px!important;background:#fff!important;border:1px solid var(--line)!important;border-radius:14px!important;box-shadow:0 3px 12px rgba(16,24,40,.045)!important}
   .vtable td{display:block!important;width:auto!important;background:transparent!important;border:0!important;padding:2px 0!important;font-size:12px!important;min-width:0!important;overflow-wrap:anywhere!important}
   .vtable td:first-child{position:absolute!important;right:12px!important;top:10px!important;color:#98a2b3!important;font-size:10px!important;padding:0!important}
   .vtable td:nth-child(2){padding-right:20px!important}
   .vtable td:nth-child(2) .word{font-size:20px!important;line-height:1.25!important}
   .vtable td:nth-child(3){font-size:11px!important;margin-top:3px!important}
   .vtable td:nth-child(4){font-size:15px!important;line-height:1.5!important;margin-top:5px!important;color:var(--ink)!important}
   .vtable td:nth-child(5),.vtable td:nth-child(6){display:inline-block!important;width:auto!important;margin:8px 5px 0 0!important;vertical-align:middle!important}
   .vtable td:nth-child(7){position:absolute!important;right:8px!important;bottom:8px!important;width:36px!important;text-align:center!important;padding:0!important}
   .vtable td:nth-child(7) .speak{font-size:20px!important;padding:5px!important}
  }
  @media(max-width:480px){
   .panel{padding:10px!important}
   .tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
   .tabs .btn{font-size:13px!important;min-height:46px!important}
  }`;
  d.head.appendChild(s);
  d.body?.setAttribute('data-aa-vocab-mobile-layout','vertical-v1');
 }catch(_){ }
}
function installVocabRecallToggles(retry=0){
 try{
  if(window.parent===window)return;
  const p=window.parent,d=p.document;
  if(!/\/vocab\.html$/.test(p.location.pathname))return;
  const filters=d.querySelector('#listView .filters');
  if(!filters){if(retry<80)setTimeout(()=>installVocabRecallToggles(retry+1),100);return}
  if(d.getElementById('aa-vocab-recall-controls'))return;
  const style=d.createElement('style');style.id='aa-vocab-recall-style';style.textContent=`
   #aa-vocab-recall-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:9px 0 2px}
   #aa-vocab-recall-controls button{min-height:44px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font-weight:900;font-size:13px;padding:8px 10px;cursor:pointer}
   #aa-vocab-recall-controls button[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}
   body.aa-vocab-hide-word .vtable td:nth-child(2) .word{color:transparent!important;background:#e8edf4!important;border-radius:7px!important;box-shadow:inset 0 0 0 1px #d7dee8!important;user-select:none!important;text-shadow:none!important;min-width:7.5em!important;display:inline-block!important}
   body.aa-vocab-hide-meaning .vtable td:nth-child(4){color:transparent!important;user-select:none!important;text-shadow:none!important}
   body.aa-vocab-hide-meaning .vtable td:nth-child(4)::after{content:'訳を隠しています';display:inline-block!important;color:#98a2b3!important;background:#f2f4f7!important;border-radius:7px!important;padding:3px 8px!important;font-size:11px!important;font-weight:800!important}
   @media(max-width:480px){#aa-vocab-recall-controls{grid-template-columns:1fr 1fr}#aa-vocab-recall-controls button{font-size:12px;min-height:42px;padding:7px 5px}}
  `;d.head.appendChild(style);
  const wrap=d.createElement('div');wrap.id='aa-vocab-recall-controls';wrap.setAttribute('aria-label','暗記表示切替');
  const wordBtn=d.createElement('button'),meaningBtn=d.createElement('button');wordBtn.type=meaningBtn.type='button';
  wordBtn.dataset.target='word';meaningBtn.dataset.target='meaning';wrap.append(wordBtn,meaningBtn);filters.insertAdjacentElement('afterend',wrap);
  const KEY='aa-vocab-recall-visibility-v1';let state={word:false,meaning:false};
  try{state=Object.assign(state,JSON.parse(p.localStorage.getItem(KEY)||'{}'))}catch(_){ }
  const apply=()=>{
   d.body.classList.toggle('aa-vocab-hide-word',!!state.word);d.body.classList.toggle('aa-vocab-hide-meaning',!!state.meaning);
   wordBtn.textContent=state.word?'英単語を戻す':'英単語を隠す';meaningBtn.textContent=state.meaning?'日本語訳を戻す':'日本語訳を隠す';
   wordBtn.setAttribute('aria-pressed',String(!!state.word));meaningBtn.setAttribute('aria-pressed',String(!!state.meaning));
   try{p.localStorage.setItem(KEY,JSON.stringify(state))}catch(_){ }
  };
  wordBtn.addEventListener('click',()=>{state.word=!state.word;apply()});meaningBtn.addEventListener('click',()=>{state.meaning=!state.meaning;apply()});apply();
  d.body?.setAttribute('data-aa-vocab-recall-toggle','v1');
 }catch(_){if(retry<80)setTimeout(()=>installVocabRecallToggles(retry+1),100)}
}
function wire(){if(!window.Companion7){setTimeout(wire,80);return}if(window.__AA_COMPANION_LOGIN_WIRED__)return;window.__AA_COMPANION_LOGIN_WIRED__=true;killLegacy();
 document.addEventListener('aa:missionComplete',()=>{try{Companion7.recordStudyComplete?.()}catch(_){}});
 const mo=new MutationObserver(killLegacy);mo.observe(document.body,{childList:true,subtree:true});
}
if(resetTodayLoginTest())return;
loadLayoutGuard();
loadReadingGloss();
document.addEventListener('aa:v23ready',loadReadingJapaneseFix,{once:true});
installEnglishClozeDedup();
installEnglishPhraseQuestionFix();
installVocabMobileLayout();
installVocabRecallToggles();
loadCompanionMediaSettings();loadV23();loadLogin();loadExplosionAnalytics();loadDailyAnalytics();loadProductionLoginTest();loadSettingsImprovements();
setTimeout(()=>{if(window.AA_V23_STATS)loadReadingJapaneseFix()},1800);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installVocabOnlyPageLink();installVocabularyHubLink();installVocabMobileLayout();installVocabRecallToggles();wire()},{once:true});else{installVocabOnlyPageLink();installVocabularyHubLink();installVocabMobileLayout();installVocabRecallToggles();wire()}
})();