(()=>{
  'use strict';
  if(window.__AA_AI_EXAM_ROUTE_V1__) return;

  const VERSION='1.0.0';
  const CONFIG_KEY='aa_ai_reading_config_v1';
  const DEFAULT_ENDPOINT='https://asahigaoka-aa-ai-reading.shingo-20110505.workers.dev';
  const ENDPOINT_PATH='/v1/exam';
  const CACHE_KEY='aa_ai_exam_cache_v1';
  const SUBJECTS=new Set(['math','science','social']);
  const LABEL={math:'数学',science:'理科',social:'社会'};
  const REQUEST_TIMEOUT_MS=180000;
  let busy=false;

  function appState(){
    try{return typeof state!=='undefined'?state:window.AA_APP?.get?.('state')?.get?.()||null}catch(_){return null}
  }
  function readConfig(){
    try{
      const raw=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
      return {endpoint:normalizeEndpoint(raw.endpoint)||DEFAULT_ENDPOINT,accessToken:typeof raw.accessToken==='string'?raw.accessToken:''};
    }catch(_){return {endpoint:DEFAULT_ENDPOINT,accessToken:''}}
  }
  function normalizeEndpoint(value){
    const text=String(value||'').trim().replace(/\/+$/,'');
    if(!text)return '';
    try{
      const url=new URL(text);
      const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';
      if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))return '';
      if(url.username||url.password||url.search||url.hash)return '';
      return url.origin+url.pathname.replace(/\/+$/,'');
    }catch(_){return ''}
  }
  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function cacheRead(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')||{}}catch(_){return {}}}
  function cacheWrite(value){try{localStorage.setItem(CACHE_KEY,JSON.stringify(value))}catch(_){}}
  function recentIds(subject){
    const s=appState();
    return (Array.isArray(s?.attempts)?s.attempts:[]).slice(-160).map(x=>String(x?.itemId||'')).filter(id=>id.startsWith(`rise-${subject}-`)).slice(-60);
  }
  function cacheItems(subject,items){
    const cache=cacheRead();
    const old=Array.isArray(cache[subject]?.items)?cache[subject].items:[];
    const byId=new Map([...items,...old].filter(Boolean).map(item=>[String(item.id||''),item]));
    cache[subject]={updatedAt:Date.now(),items:[...byId.values()].filter(item=>item.id).slice(0,40)};
    cacheWrite(cache);
  }
  function cachedUnseen(subject,count){
    const seen=new Set(recentIds(subject));
    const items=Array.isArray(cacheRead()[subject]?.items)?cacheRead()[subject].items:[];
    return items.filter(item=>item?.quality?.verified===true&&!seen.has(String(item.id||''))).slice(0,count);
  }
  function firstSubjectSkill(subject){
    try{
      const skills=typeof DATA!=='undefined'?DATA?.skills:null;
      if(!skills)return `${subject}.exam.application`;
      return Object.keys(skills).find(id=>skills[id]?.subject===subject)||`${subject}.exam.application`;
    }catch(_){return `${subject}.exam.application`}
  }
  function normalizeItem(item,subject){
    if(!item||item.subject!==subject||item.quality?.verified!==true)throw new Error('検証済み問題の形式が正しくありません。');
    const choices=Array.isArray(item.choices)?item.choices.map(String):[];
    const answerIndex=Number(item.answerIndex);
    if(choices.length!==4||new Set(choices).size!==4||!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>3)throw new Error('選択肢の検査に失敗しました。');
    const context=String(item.context||'').trim();
    const question=String(item.question||'').trim();
    if(!question)throw new Error('問題文を受け取れませんでした。');
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
  function buildRequest(subject,count){
    const s=appState();
    const difficulty=clamp(Math.round(Number(s?.ui?.subjectDifficulty)||8),1,10);
    const weak=[];
    try{
      if(typeof weakSkills==='function')for(const row of weakSkills(12)){
        if(typeof DATA!=='undefined'&&DATA?.skills?.[row.id]?.subject===subject)weak.push(String(row.label||row.id).slice(0,80));
        if(weak.length>=5)break;
      }
    }catch(_){}
    return {schemaVersion:2,subject,count,difficulty,skill:'aichi.exam.application',focus:weak,recentQuestionIds:recentIds(subject)};
  }
  async function postExam(subject,count){
    const config=readConfig();
    if(!config.accessToken||config.accessToken.length<24)throw Object.assign(new Error('AI接続設定が未設定です。英語AI長文と同じ接続用トークンを設定してください。'),{code:'not_configured'});
    if(navigator.onLine===false)throw Object.assign(new Error('オフラインです。保存済みのAI問題がない場合は生成できません。'),{code:'offline'});
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(config.endpoint+ENDPOINT_PATH,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+config.accessToken},body:JSON.stringify(buildRequest(subject,count)),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      let payload=null;try{payload=await response.json()}catch(_){}
      if(!response.ok){const err=new Error(String(payload?.error?.message||`AIサーバーエラー（HTTP ${response.status}）`));err.code=String(payload?.error?.code||'request_failed');throw err}
      if(payload?.schemaVersion!==1||payload?.quality?.verified!==true||payload?.subject!==subject||!Array.isArray(payload.items)||!payload.items.length)throw Object.assign(new Error('検証済み問題を受け取れませんでした。'),{code:'invalid_response'});
      cacheItems(subject,payload.items);
      return payload.items.slice(0,count);
    }catch(error){
      if(error?.name==='AbortError')throw Object.assign(new Error('AI問題生成が時間切れになりました。もう一度お試しください。'),{code:'timeout'});
      throw error;
    }finally{clearTimeout(timer)}
  }
  function showBusy(subject){
    let host=document.getElementById('aaAiExamBusy');
    if(!host){host=document.createElement('div');host.id='aaAiExamBusy';host.className='aaAiExamBusy';host.innerHTML='<div class="aaAiExamBusyCard" role="status" aria-live="polite"><div class="aaAiExamSpinner" aria-hidden="true"></div><strong data-ai-exam-title></strong><span>Geminiで作成後、別モデルが正答を独立検証しています。</span></div>';document.body.appendChild(host)}
    const title=host.querySelector('[data-ai-exam-title]');if(title)title.textContent=`${LABEL[subject]}の入試問題を生成中…`;host.hidden=false;
  }
  function hideBusy(){const host=document.getElementById('aaAiExamBusy');if(host)host.hidden=true}
  function startSessionFromItems(subject,items){
    const s=appState();
    if(!s)throw new Error('学習状態を読み込めませんでした。');
    const queue=items.map(item=>normalizeItem(item,subject));
    if(!queue.length)throw new Error('開始できる検証済み問題がありません。');
    const stamp=typeof now==='function'?now():Date.now();
    const sessionId=typeof uid==='function'?uid('ai-exam'):`ai-exam-${stamp}`;
    s.session={id:sessionId,active:true,mode:'deep',kind:'ai-exam',subject,queue,index:0,subIndex:0,answers:{},feedback:null,startedAt:stamp,accumulatedMs:0,lastActiveAt:stamp,itemStartedAt:stamp,scrollY:0,minimumDone:false,clockPaused:false,pausedAt:null,aiGenerated:true,aiExam:true,apiRoute:ENDPOINT_PATH};
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
      try{items=await postExam(subject,8)}catch(error){
        items=cachedUnseen(subject,8);
        if(!items.length)throw error;
        console.warn('AI exam generation unavailable; using verified AI cache only.',error?.code||error?.message||error);
      }
      startSessionFromItems(subject,items);
    }catch(error){
      window.alert(error?.message||'AI入試問題を開始できませんでした。');
    }finally{busy=false;hideBusy()}
  }
  function decorate(root=document){
    const scope=root?.querySelector?root:document;
    for(const button of scope.querySelectorAll('[data-action="start-custom"][data-kind="subject"][data-subject]')){
      const subject=button.dataset.subject;
      if(!SUBJECTS.has(subject))continue;
      button.dataset.aiExamRoute='1';
      button.setAttribute('aria-label',`${LABEL[subject]}のAI生成・独立検証済み入試問題を開始`);
      if(button.closest('.riseSubjectsV4'))button.textContent=`${LABEL[subject]} 入試問題`;
    }
  }
  window.addEventListener('click',event=>{
    const action=event.target?.closest?.('[data-action]');
    if(!action)return;
    const isSubjectStart=action.matches?.('[data-action="start-custom"][data-kind="subject"][data-subject]')&&SUBJECTS.has(action.dataset.subject);
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

  window.__AA_AI_EXAM_ROUTE_V1__=Object.freeze({version:VERSION,subjects:[...SUBJECTS],endpointPath:ENDPOINT_PATH,start,decorate,usesLegacyFallback:false,cacheFallback:'verified-ai-only'});
})();
