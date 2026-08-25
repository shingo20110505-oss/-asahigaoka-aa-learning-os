(()=>{'use strict';
if(window.__CHRONOLOGIA_FORCE1000_V1__)return;window.__CHRONOLOGIA_FORCE1000_V1__=true;
if(!/(?:^|\/)chronologia\.html$/.test(location.pathname))return;
const QUIZ_NAV_VERSION='2026-08-25.2';
/*
 * Base DATA ids 353-385 were expanded after an older curated 351-400 table was
 * created.  The old table still patches by numeric id, so e.g. current id 379
 * (自衛隊) was overwritten with the old id 379 (瀬戸焼) explanation.
 * Snapshot the authoritative base rows before any supplemental scripts run and
 * restore them after every supplemental merge.  This keeps the current base
 * event/date/detail/tags together as one canonical record.
 */
const BASE_CANONICAL_SNAPSHOT=new Map();
try{
 if(typeof DATA!=='undefined')for(const x of DATA){
  const id=Number(x?.id);if(id<353||id>385)continue;
  BASE_CANONICAL_SNAPSHOT.set(id,{id,sort:x.sort,date:x.date,event:x.event,area:x.area,period:x.period,level:x.level,detail:x.detail,tags:Array.isArray(x.tags)?[...x.tags]:[]});
 }
}catch(_){}
/* 1971 Nixon Shock: keep the existing id so saved progress/favorites survive,
   but replace the broken legacy wording before this base range is restored. */
const NIXON_1971_FIX={id:368,sort:1971,date:'1971年',event:'ニクソン・ショック',area:'欧米・世界',period:'現代',level:'A',detail:'アメリカがドルと金の交換停止を発表。固定相場制がくずれ、円高・変動相場制へつながった。',tags:['ニクソンショック','世界経済']};
try{
 const base=BASE_CANONICAL_SNAPSHOT.get(368);
 if(base&&base.date==='1971年'&&/ニクソン/.test(base.event||'')){
  Object.assign(base,NIXON_1971_FIX,{tags:[...NIXON_1971_FIX.tags]});
  const live=typeof byId!=='undefined'?byId.get(368):null;
  if(live&&live.date==='1971年'&&/ニクソン/.test(live.event||''))Object.assign(live,NIXON_1971_FIX,{tags:[...NIXON_1971_FIX.tags]});
 }
}catch(_){}
function restoreCanonicalBaseRows(){
 let restored=0;
 try{
  if(typeof byId==='undefined')return 0;
  for(const [id,base] of BASE_CANONICAL_SNAPSHOT){
   const current=byId.get(id);if(!current)continue;
   const changed=current.date!==base.date||current.event!==base.event||current.detail!==base.detail||String(current.tags||'')!==String(base.tags||'');
   Object.assign(current,base,{tags:[...base.tags]});
   if(changed)restored++;
  }
  document.documentElement.dataset.chronologiaBaseRowsRepair=restored?'restored':'clean';
  document.documentElement.dataset.chronologiaBaseRowsSnapshot=String(BASE_CANONICAL_SNAPSHOT.size);
 }catch(e){console.error('Chronologia base-row restore failed',e)}
 return restored;
}
function canonicalQuizItem(item){
 try{const id=Number(item?.id),live=Number.isFinite(id)&&typeof byId!=='undefined'?byId.get(id):null;return live||item}catch(_){return item}
}
function explanationAudit(){
 let ok=false,detail='';
 try{
  const item=typeof byId!=='undefined'?byId.get(379):null;detail=String(item?.detail||'');
  ok=!!item&&item.date==='1954年'&&item.event==='自衛隊が発足する'&&/(?:保安隊|陸上・海上・航空自衛隊|安全保障)/.test(detail)&&!/瀬戸|陶土|陶磁器|窯業/.test(detail);
 }catch(_){}
 document.documentElement.dataset.aaSocialQuizExplanation=ok?'PASS':'FAIL';
 let el=document.getElementById('aaSocialQuizExplanationAudit');if(!el){el=document.createElement('pre');el.id='aaSocialQuizExplanationAudit';el.hidden=true;document.body.appendChild(el)}
 el.textContent=`AA_SOCIAL_QUIZ_EXPLANATION=${ok?'PASS':'FAIL'} ${JSON.stringify({id:379,event:'自衛隊が発足する',detail})}`;
 return ok;
}
function installQuizExplanationFix(){
 restoreCanonicalBaseRows();
 if(typeof showQuiz==='function'&&!showQuiz.__aaCanonicalQuizItem){
  const base=showQuiz;
  const fixed=function(...args){
   try{const q=state?.quiz,stale=q?.items?.[q.index],live=canonicalQuizItem(stale);if(q&&stale&&live)q.items[q.index]=live}catch(_){}
   return base.apply(this,args);
  };
  fixed.__aaCanonicalQuizItem=true;showQuiz=fixed;
 }
 if(typeof finishAnswer==='function'&&!finishAnswer.__aaCanonicalQuizItem){
  const base=finishAnswer;
  const fixed=function(item,correct){return base.call(this,canonicalQuizItem(item),correct)};
  fixed.__aaCanonicalQuizItem=true;finishAnswer=fixed;
 }
 explanationAudit();
}
const PACKS=[
 './chronologia-v7-data-1.js?force1000=20260811a',
 './chronologia-v7-data-2a.js?force1000=20260811a',
 './chronologia-v7-data-2b.js?force1000=20260811a',
 './chronologia-v7-data-3.js?force1000=20260811a',
 './chronologia-v7-data-4.js?force1000=20260811a',
 './chronologia-v7-overrides.js?force1000=20260811a'
];
const CURATED=[
 './chronologia-curated-001-050.js?force1000=20260811a','./chronologia-curated-051-100.js?force1000=20260811a','./chronologia-curated-101-149.js?force1000=20260811a','./chronologia-curated-150.js?force1000=20260811a','./chronologia-curated-151-200.js?force1000=20260811a','./chronologia-curated-201-250.js?force1000=20260811a','./chronologia-curated-251-300.js?force1000=20260811a','./chronologia-curated-301-350.js?force1000=20260811a','./chronologia-curated-351-400.js?force1000=20260811a','./chronologia-curated-401-450.js?force1000=20260811a','./chronologia-curated-451-500.js?force1000=20260811a','./chronologia-curated-501-600.js?force1000=20260811a','./chronologia-curated-601-700.js?force1000=20260811a','./chronologia-curated-701-800.js?force1000=20260811a','./chronologia-curated-801-900.js?force1000=20260811a','./chronologia-curated-901-1000.js?force1000=20260811a','./chronologia-curated-final-fixes.js?force1000=20260811a'
];
function load(src){return new Promise(resolve=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>resolve(true);s.onerror=()=>{console.error('Chronologia recovery load failed',src);resolve(false)};document.head.appendChild(s)})}
function loadOrdered(list){return Promise.all(list.map(load))}
function updateVisibleCount(n){
 document.querySelectorAll('.stat').forEach(card=>{const label=card.querySelector('.stat-label');const value=card.querySelector('.stat-value');if(label&&value&&/収録データ/.test(label.textContent||''))value.textContent=`${n}件`});
 document.querySelectorAll('.chrono-v7-badge').forEach(el=>el.textContent=`多角史 ${n}件`);
 document.documentElement.dataset.chronologiaItems=String(n);
}
function announceReady(n,source){
 restoreCanonicalBaseRows();installQuizExplanationFix();
 updateVisibleCount(n);
 if(n>=1000)document.documentElement.dataset.chronologiaReady='1';
 document.dispatchEvent(new CustomEvent('chronologia:content-updated',{detail:{items:n,source}}));
}
function mergePacks(){
 try{
  if(typeof DATA==='undefined'||typeof byId==='undefined'||typeof state==='undefined')return 0;
  for(const pack of window.CHRONO_V7_PACKS||[]){
   for(const item of pack.items||[]){
    const id=Number(item?.id);if(!Number.isFinite(id))continue;
    const current=byId.get(id);
    if(current){Object.assign(current,item)}else{DATA.push(item);byId.set(id,item);if(typeof exactYearItems!=='undefined'&&/^(紀元前)?\d+年$/.test(item.date||''))exactYearItems.push(item)}
   }
   if(typeof RICH_NOTES!=='undefined')for(const [key,note] of Object.entries(pack.notes||{}))RICH_NOTES[key]={...note,__chronoV7:true};
  }
  restoreCanonicalBaseRows();
  const unique=new Map(DATA.map(x=>[Number(x.id),x]));
  if(unique.size!==DATA.length){DATA.splice(0,DATA.length,...[...unique.values()])}
  state.order=[...DATA].sort((a,b)=>(a.sort||0)-(b.sort||0)||(a.id||0)-(b.id||0)).map(x=>x.id);
  if(typeof rebuildSyncSelect==='function')rebuildSyncSelect();
  if(typeof updateStats==='function')updateStats();
  if(typeof renderTimeline==='function')renderTimeline();
  if(typeof renderSync==='function')renderSync();
  if(typeof renderWeak==='function')renderWeak();
  if(typeof updateResumeButton==='function')updateResumeButton();
  announceReady(DATA.length,'force1000-v1');
  return DATA.length;
 }catch(e){console.error('Chronologia recovery merge failed',e);return 0}
}
async function boot(){
 restoreCanonicalBaseRows();installQuizExplanationFix();
 let current=0;try{current=typeof DATA!=='undefined'?DATA.length:0}catch(_){}
 if(current>=1000){announceReady(current,'force1000-v1-existing');return}
 window.CHRONO_V7_PACKS=window.CHRONO_V7_PACKS||[];
 await loadOrdered(PACKS);
 try{if(window.CHRONO_V7_EXTRA_READY)await window.CHRONO_V7_EXTRA_READY}catch(e){console.error('Chronologia supplemental decode failed',e)}
 await loadOrdered(CURATED);
 restoreCanonicalBaseRows();installQuizExplanationFix();
 const n=mergePacks();
 if(n<1000){setTimeout(()=>{const retry=mergePacks();if(retry<1000)console.error(`Chronologia recovery incomplete: ${retry}/1000`)},1200)}
}
function answeredQuizDom(){
 const play=document.getElementById('quizPlay');if(!play||play.hidden)return false;
 if(document.querySelector('#quizAnswerArea .choice.correct,#quizAnswerArea .choice.wrong'))return true;
 if(document.querySelector('#quizAnswerArea .choice:disabled'))return true;
 if(document.getElementById('yearAnswer')?.disabled)return true;
 return !!document.getElementById('quizFeedback')?.textContent?.trim();
}
function revealQuizNext(scroll=false){
 if(!answeredQuizDom())return false;
 const next=document.getElementById('nextQuizBtn');if(!next)return false;
 next.hidden=false;next.removeAttribute('hidden');next.disabled=false;next.textContent='次の問題へ';
 next.style.setProperty('display','inline-flex','important');next.style.alignItems='center';next.style.justifyContent='center';
 if(matchMedia('(max-width:720px)').matches)next.style.width='100%';
 document.documentElement.dataset.chronologiaQuizNavFix=QUIZ_NAV_VERSION;
 if(scroll){setTimeout(()=>next.scrollIntoView({behavior:'smooth',block:'nearest'}),30)}
 return true;
}
function markQuizAudit(ok,detail){
 document.documentElement.dataset.aaSocialQuizUi=ok?'PASS':'FAIL';
 let el=document.getElementById('aaSocialQuizUiAudit');if(!el){el=document.createElement('pre');el.id='aaSocialQuizUiAudit';el.hidden=true;document.body.appendChild(el)}
 el.textContent=`AA_SOCIAL_QUIZ_UI=${ok?'PASS':'FAIL'} ${JSON.stringify(detail)}`;
}
function waitFor(test,timeout=30000){return new Promise((resolve,reject)=>{const start=Date.now(),tick=()=>{let value;try{value=test()}catch(_){}if(value)return resolve(value);if(Date.now()-start>timeout)return reject(new Error('timeout'));setTimeout(tick,80)};tick()})}
async function runQuizAudit(){
 if(!new URLSearchParams(location.search).has('aa_quiz_ui_ci'))return;
 try{
  restoreCanonicalBaseRows();installQuizExplanationFix();
  if(!explanationAudit())throw new Error('self-defense explanation mismatch');
  const tab=await waitFor(()=>document.querySelector('.tab[data-view="quizView"]'));
  tab.click();
  const direction=await waitFor(()=>document.getElementById('quizDirection'));direction.value='yearToEvent';
  const count=document.getElementById('quizCount');if(count)count.value='10';
  document.getElementById('startQuizBtn').click();
  const first=await waitFor(()=>document.querySelector('#quizAnswerArea .choice'));
  const before=document.getElementById('quizIndex')?.textContent?.trim();
  first.click();
  await waitFor(()=>answeredQuizDom());revealQuizNext(false);
  const next=await waitFor(()=>{const b=document.getElementById('nextQuizBtn');return b&&!b.hidden&&getComputedStyle(b).display!=='none'?b:null});
  next.click();
  const after=await waitFor(()=>{const t=document.getElementById('quizIndex')?.textContent?.trim();return t&&t!==before?t:null});
  if(!/^2\s*\/\s*10$/.test(after))throw new Error(`index ${before} -> ${after}`);
  markQuizAudit(true,{before,after,nextVisible:true,explanation:true,version:QUIZ_NAV_VERSION});
 }catch(err){markQuizAudit(false,{error:String(err?.message||err),version:QUIZ_NAV_VERSION})}
}
function installQuizNavFix(){
 installQuizExplanationFix();
 const feedback=document.getElementById('quizFeedback'),answer=document.getElementById('quizAnswerArea');
 if(!feedback||!answer){setTimeout(installQuizNavFix,80);return}
 const mo=new MutationObserver(()=>revealQuizNext(false));mo.observe(feedback,{childList:true,subtree:true,characterData:true});mo.observe(answer,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});
 document.addEventListener('click',e=>{if(e.target?.closest?.('#quizAnswerArea .choice,#submitYear'))setTimeout(()=>{restoreCanonicalBaseRows();revealQuizNext(true)},20)},true);
 document.documentElement.dataset.chronologiaQuizNavFix=QUIZ_NAV_VERSION;
 runQuizAudit();
}
document.addEventListener('chronologia:content-updated',()=>{restoreCanonicalBaseRows();installQuizExplanationFix();explanationAudit()});
setTimeout(()=>{restoreCanonicalBaseRows();installQuizExplanationFix();explanationAudit()},500);
setTimeout(()=>{restoreCanonicalBaseRows();installQuizExplanationFix();explanationAudit()},1800);
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot,{once:true});document.addEventListener('DOMContentLoaded',installQuizNavFix,{once:true})}else{boot();installQuizNavFix()}
})();
