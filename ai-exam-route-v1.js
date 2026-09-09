(()=>{
  'use strict';
  if(window.__AA_AI_EXAM_ROUTE_V1__) return;

  const VERSION='1.3.0';
  const ENDPOINT_PATH='/v1/exam';
  const PUBLIC_POOL_PATH='./verified-question-pool-v1.json';
  const CACHE_KEY='aa_ai_exam_cache_v1';
  const SUBJECTS=new Set(['math','japanese','science','social']);
  const LABEL={math:'数学',japanese:'国語',science:'理科',social:'社会'};
  const POOL_TIMEOUT_MS=8000;
  let busy=false;
  let poolSnapshot=null,poolLoading=null,poolLoadedAt=0,poolLastAttempt=0;

  function appState(){
    try{return typeof state!=='undefined'?state:window.AA_APP?.get?.('state')?.get?.()||null}catch(_){return null}
  }
  function cacheRead(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{}}catch(_){return {}}}
  function cacheWrite(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value))}catch(_){}}
  function recentIds(subject){
    const s=appState();
    return (Array.isArray(s?.attempts)?s.attempts:[]).slice(-160).map(x=>String(x?.itemId||'')).filter(id=>id.startsWith(`rise-${subject}-`)).slice(-60);
  }
  function isUsableItem(item,subject){
    if(!item||item.subject!==subject||item.quality?.verified!==true)return false;
    const choices=Array.isArray(item.choices)?item.choices.map(String):[];
    const answerIndex=Number(item.answerIndex);
    return choices.length===4&&new Set(choices).size===4&&Number.isInteger(answerIndex)&&answerIndex>=0&&answerIndex<4&&String(item.question||'').trim().length>0;
  }
  function cacheItems(subject,items){
    const safe=(Array.isArray(items)?items:[]).filter(item=>isUsableItem(item,subject));
    if(!safe.length)return;
    const cache=cacheRead();
    const old=Array.isArray(cache[subject]?.items)?cache[subject].items:[];
    const byId=new Map([...safe,...old].filter(Boolean).map(item=>[String(item.id||''),item]));
    cache[subject]={updatedAt:Date.now(),items:[...byId.values()].filter(item=>item.id&&isUsableItem(item,subject)).slice(0,40)};
    cacheWrite(cache);
  }
  function chooseItems(subject,items,count){
    const safe=(Array.isArray(items)?items:[]).filter(item=>isUsableItem(item,subject));
    if(!safe.length)return [];
    const seen=new Set(recentIds(subject));
    const unseen=safe.filter(item=>!seen.has(String(item.id||'')));
    return (unseen.length?unseen:safe).slice(0,count);
  }
  function cachedVerified(subject,count){
    const items=Array.isArray(cacheRead()[subject]?.items)?cacheRead()[subject].items:[];
    return chooseItems(subject,items,count);
  }
  function applyInventory(scope=document){
    if(!poolSnapshot)return;
    const root=scope?.querySelector?scope:document;
    for(const button of root.querySelectorAll('[data-ai-exam-route="1"][data-subject]')){
      const subject=button.dataset.subject,count=poolSnapshot.subjects?.[subject]?.filter(item=>isUsableItem(item,subject)).length||0;
      const badge=button.closest('.r6Card')?.querySelector('.r6Badge');
      if(!badge)continue;
      const label=subject==='japanese'?`単問 ${count}問`:`${count}問`;
      if(badge.textContent!==label)badge.textContent=label;
      badge.title=`公開中の検証済み${LABEL[subject]}問題：${count}問`;
    }
  }
  async function loadVerifiedPool(force=false){
    if(navigator.onLine===false)return poolSnapshot;
    const time=Date.now();
    if(!force&&poolSnapshot&&time-poolLoadedAt<60000)return poolSnapshot;
    if(!force&&!poolSnapshot&&time-poolLastAttempt<30000)return null;
    if(poolLoading)return poolLoading;
    poolLastAttempt=time;
    poolLoading=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),POOL_TIMEOUT_MS);
      try{
        const url=new URL(PUBLIC_POOL_PATH,document.baseURI);
        url.searchParams.set('risePool',String(Date.now()));
        const response=await fetch(url.href,{method:'GET',signal:controller.signal,cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`検証済み問題の配信に失敗しました（HTTP ${response.status}）。`);
        const payload=await response.json();
        if(payload?.schemaVersion!==1||!payload.subjects||[...SUBJECTS].some(subject=>!Array.isArray(payload.subjects[subject])))throw new Error('検証済み問題プールの形式が正しくありません。');
        poolSnapshot=payload;poolLoadedAt=Date.now();
        for(const subject of SUBJECTS)cacheItems(subject,payload.subjects[subject]);
        applyInventory(document);
        return payload;
      }catch(error){
        if(error?.name==='AbortError')throw Object.assign(new Error('検証済み問題の読み込みが時間切れになりました。'),{code:'pool_timeout'});
        throw error;
      }finally{clearTimeout(timer)}
    })();
    try{return await poolLoading}finally{poolLoading=null}
  }
  async function fetchVerifiedPool(subject,count){
    const payload=await loadVerifiedPool(true);
    if(!payload)return [];
    const all=payload.subjects[subject].filter(item=>isUsableItem(item,subject));
    return chooseItems(subject,all,count);
  }
  function firstSubjectSkill(subject){
    try{
      const skills=typeof DATA!=='undefined'?DATA?.skills:null;
      if(!skills)return `${subject}.exam.application`;
      return Object.keys(skills).find(id=>skills[id]?.subject===subject)||`${subject}.exam.application`;
    }catch(_){return `${subject}.exam.application`}
  }
  function normalizeItem(item,subject){
    if(!isUsableItem(item,subject))throw new Error('検証済み問題の形式が正しくありません。');
    const choices=item.choices.map(String);
    const answerIndex=Number(item.answerIndex);
    const context=String(item.context||'').trim();
    const question=String(item.question||'').trim();
    const skillId=firstSubjectSkill(subject);
    const misconception=String(item.misconception||'条件や資料の読み取りを再確認します。').trim();
    const explanation=String(item.explanation||'根拠を確認します。').trim();
    const q={
      id:String(item.id),
      type:'aiEntranceExam',
      subject,
      stem:context?`${context}\n\n${question}`:question,
      choices:choices.map((text,index)=>({text,ok:index===answerIndex,reason:index===answerIndex?explanation:misconception,error:index===answerIndex?null:'ai_exam_distractor'})),
      answerIndex,
      explanation,
      evidence:String(item.evidence||'').trim(),
      skills:[{id:skillId,role:'primary'}],
      expectedMs:subject==='math'?90000:75000,
      context:`aichi-ai-exam:${String(item.skill||skillId)}`,
      aiGenerated:true,
      aiVerified:true,
      aiProvider:'Gemini+Groq',
      aiQuality:item.quality,
      reviewKey:`ai-exam:${subject}:${String(item.id)}`
    };
    try{return typeof prepareQuestionReview==='function'?prepareQuestionReview(q):q}catch(_){return q}
  }
  function showBusy(subject){
    let host=document.getElementById('aaAiExamBusy');
    if(!host){host=document.createElement('div');host.id='aaAiExamBusy';host.className='aaAiExamBusy';host.innerHTML='<div class="aaAiExamBusyCard" role="status" aria-live="polite"><div class="aaAiExamSpinner" aria-hidden="true"></div><strong data-ai-exam-title></strong><span>独立検証済みの問題を読み込んでいます。</span></div>';document.body.appendChild(host)}
    const title=host.querySelector('[data-ai-exam-title]');if(title)title.textContent=`${LABEL[subject]}の入試問題を準備中…`;host.hidden=false;
  }
  function hideBusy(){const host=document.getElementById('aaAiExamBusy');if(host)host.hidden=true}
  function startSessionFromItems(subject,items){
    const s=appState();
    if(!s)throw new Error('学習状態を読み込めませんでした。');
    const queue=items.map(item=>normalizeItem(item,subject));
    if(!queue.length)throw new Error('開始できる検証済み問題がありません。');
    const stamp=typeof now==='function'?now():Date.now();
    const sessionId=typeof uid==='function'?uid('ai-exam'):`ai-exam-${stamp}`;
    s.session={id:sessionId,active:true,mode:'deep',kind:'ai-exam',subject,queue,index:0,subIndex:0,answers:{},feedback:null,startedAt:stamp,accumulatedMs:0,lastActiveAt:stamp,itemStartedAt:stamp,scrollY:0,minimumDone:false,clockPaused:false,pausedAt:null,aiGenerated:true,aiExam:true,apiRoute:ENDPOINT_PATH,deliveryMode:'verified-pool'};
    if(s.stats)s.stats.sessions=Number(s.stats.sessions||0)+1;
    s.route='study';
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    window.scrollTo(0,0);
    if(typeof startTicker==='function')startTicker();
  }
  async function start(subject){
    if(busy||!SUBJECTS.has(subject))return;
    const s=appState();
    if(s?.session?.active&&!window.confirm('進行中のセットを終了して、AI入試問題を始めますか？'))return;
    busy=true;showBusy(subject);
    try{
      let items=[];
      let poolError=null;
      try{items=await fetchVerifiedPool(subject,8)}catch(error){poolError=error;console.warn('Verified pool fetch failed; trying local verified cache.',error?.code||error?.message||error)}
      if(!items.length)items=cachedVerified(subject,8);
      if(!items.length)throw poolError||new Error('現在、配信できる検証済み問題がありません。自動補充後にもう一度お試しください。');
      startSessionFromItems(subject,items);
    }catch(error){
      window.alert(error?.message||'入試問題を開始できませんでした。');
    }finally{busy=false;hideBusy()}
  }
  function decorate(root=document){
    const scope=root?.querySelector?root:document;
    for(const link of scope.querySelectorAll('.r6Actions a[href="./japanese-exam/"]')){
      const actions=link.closest('.r6Actions');
      if(!actions||actions.querySelector('[data-ai-exam-quick="1"]'))continue;
      const button=document.createElement('button');button.type='button';button.className='btn ghost';button.dataset.action='start-custom';button.dataset.kind='subject';button.dataset.subject='japanese';button.dataset.aiExamQuick='1';button.textContent='国語 AI単問';actions.appendChild(button);
    }
    for(const button of scope.querySelectorAll('[data-action="start-custom"][data-kind="subject"][data-subject]')){
      const subject=button.dataset.subject;
      if(!SUBJECTS.has(subject))continue;
      if(subject==='japanese'&&button.dataset.aiExamQuick!=='1')continue;
      button.dataset.aiExamRoute='1';
      button.setAttribute('aria-label',`${LABEL[subject]}のAI生成・独立検証済み入試問題を開始`);
      if(button.closest('.riseSubjectsV4'))button.textContent=subject==='japanese'?'国語 AI単問':`${LABEL[subject]} 入試問題`;
    }
    applyInventory(scope);
    void loadVerifiedPool(false).catch(error=>console.warn('Verified pool inventory unavailable.',error?.code||error?.message||error));
  }
  window.addEventListener('click',event=>{
    const action=event.target?.closest?.('[data-action]');
    if(!action)return;
    const isSubjectStart=action.matches?.('[data-action="start-custom"][data-kind="subject"][data-subject]')&&SUBJECTS.has(action.dataset.subject)&&(action.dataset.subject!=='japanese'||action.dataset.aiExamQuick==='1');
    const s=appState();
    const isAnotherAiSet=action.dataset.action==='another-set'&&s?.session?.kind==='ai-exam'&&SUBJECTS.has(s.session.subject);
    if(!isSubjectStart&&!isAnotherAiSet)return;
    event.preventDefault();event.stopImmediatePropagation();
    void start(isSubjectStart?action.dataset.subject:s.session.subject);
  },true);

  const style=document.createElement('style');
  style.id='aa-ai-exam-route-v1-style';
  style.textContent='.aaAiExamBusy{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(7,12,25,.62);backdrop-filter:blur(8px)}.aaAiExamBusy[hidden]{display:none}.aaAiExamBusyCard{width:min(92vw,420px);display:grid;justify-items:center;gap:12px;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:var(--card,#fff);color:var(--text,#152039);box-shadow:0 24px 70px rgba(0,0,0,.28);text-align:center}.aaAiExamBusyCard span{font-size:12px;line-height:1.6;color:var(--sub,#52617a)}.aaAiExamSpinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(100,120,180,.2);border-top-color:currentColor;animation:aaAiExamSpin .8s linear infinite}@keyframes aaAiExamSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate(document)})};
  const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  document.addEventListener('rise:navigation',schedule);document.addEventListener('aa:v23ready',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();

  window.__AA_AI_EXAM_ROUTE_V1__=Object.freeze({version:VERSION,subjects:[...SUBJECTS],endpointPath:ENDPOINT_PATH,poolPath:PUBLIC_POOL_PATH,start,decorate,requiresFrontendToken:false,usesLegacyFallback:false,liveGenerationOnUserAction:false,deliveryMode:'verified-pool-first',cacheFallback:'verified-ai-only'});
})();
