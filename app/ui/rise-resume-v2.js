(()=>{
  'use strict';
  if(window.__RISE_RESUME_V2__) return;
  window.__RISE_RESUME_V2__={version:'2.0.0'};

  const app=document.getElementById('app');
  if(!app) return;

  const subjectNames={english:'英語',japanese:'国語',math:'数学',science:'理科',social:'社会',mixed:'5教科'};
  const kindNames={reading:'英語長文',vocab:'英単語',kanji:'国語',mixed:'5教科ミックス',subject:'教科演習',vocabDiagnostic:'語彙診断',wrongReview:'間違い直し',review:'間違い直し'};
  let pendingFrame=0;

  function currentState(){
    try{return window.AA_APP?.get?.('state')?.get?.()||null;}catch(_){return null;}
  }

  function resumable(session){
    return !!(session?.active&&Array.isArray(session.queue)&&session.queue.length&&Number.isFinite(session.index)&&session.index>=0&&session.index<session.queue.length);
  }

  function titleFor(session){
    return kindNames[session.kind]||subjectNames[session.subject]||'前回の学習';
  }

  function positionFor(session){
    const total=Math.max(1,session.queue.length);
    const current=Math.min(total,Math.max(1,Number(session.index||0)+1));
    const item=session.queue[session.index];
    if(item?.type==='readingSet'&&Array.isArray(item.questions)&&item.questions.length){
      const question=Math.min(item.questions.length,Math.max(1,Number(session.subIndex||0)+1));
      return `${current}/${total}セット・設問 ${question}/${item.questions.length}`;
    }
    return `${current}/${total}問目`;
  }

  function elapsedFor(session){
    const minutes=Math.floor(Math.max(0,Number(session.accumulatedMs||0))/60000);
    if(!minutes) return '';
    if(minutes<60) return `${minutes}分学習済み`;
    const hours=Math.floor(minutes/60);
    const rest=minutes%60;
    return `${hours}時間${rest?`${rest}分`:''}学習済み`;
  }

  function signatureFor(session){
    return [session.kind||'',session.subject||'',session.queue.length,Number(session.index||0),Number(session.subIndex||0),Math.floor(Math.max(0,Number(session.accumulatedMs||0))/60000)].join('|');
  }

  function addStyles(){
    if(document.getElementById('riseResumeV2Style')) return;
    const style=document.createElement('style');
    style.id='riseResumeV2Style';
    style.textContent=`
.rv4ResumeCard{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid color-mix(in srgb,#8c7cff 34%,transparent);background:linear-gradient(120deg,color-mix(in srgb,#7d8dff 12%,var(--card,#fff)),color-mix(in srgb,#ef9bd2 10%,var(--card,#fff)));box-shadow:0 12px 32px rgba(59,68,130,.10)}
.rv4ResumeCopy{min-width:0}.rv4ResumeBadge{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border-radius:999px;background:rgba(104,92,220,.10);color:#5b55b6;font-size:11px;font-weight:800;letter-spacing:.08em}.rv4ResumeCopy h3{margin:7px 0 3px;font-size:18px;line-height:1.35}.rv4ResumeCopy p{margin:0;color:var(--muted,#667085);font-size:13px;line-height:1.55}.rv4ResumeBtn{flex:0 0 auto;min-width:148px;min-height:46px}.riseSubjectsV4>.rv4ResumeCard{margin-bottom:16px}
@media(max-width:680px){.rv4ResumeCard{align-items:stretch;flex-direction:column;padding:16px}.rv4ResumeBtn{width:100%;min-width:0}.rv4ResumeCopy h3{font-size:17px}}
`;
    document.head.appendChild(style);
  }

  function cardMarkup(session){
    const detail=[titleFor(session),positionFor(session),elapsedFor(session)].filter(Boolean).join(' · ');
    const signature=signatureFor(session);
    return `<article class="rv4ResumeCard rv4Card" data-rise-resume="1" data-resume-signature="${signature}" aria-label="保存した学習の続き"><div class="rv4ResumeCopy"><span class="rv4ResumeBadge">保存済み</span><h3>前回の学習の続き</h3><p>${detail}</p></div><button type="button" class="btn primary rv4ResumeBtn" data-route="study">続きからやる</button></article>`;
  }

  function removeCards(){
    app.querySelectorAll('[data-rise-resume="1"]').forEach(card=>card.remove());
  }

  function sync(){
    pendingFrame=0;
    const state=currentState();
    const session=state?.session;
    if(!resumable(session)){
      removeCards();
      return;
    }

    addStyles();
    const signature=signatureFor(session);
    const home=app.querySelector('.riseHomeV4 .rv4Dashboard');
    const subjects=app.querySelector('.riseSubjectsV4');
    const placements=[];
    if(home) placements.push([home,home.querySelector('.rv4Metrics')||home.firstElementChild]);
    if(subjects) placements.push([subjects,subjects.querySelector('.rv4StudyHero')||subjects.firstElementChild]);

    placements.forEach(([host,before])=>{
      const oldCard=host.querySelector(':scope > [data-rise-resume="1"]');
      if(!oldCard){
        if(before) before.insertAdjacentHTML('beforebegin',cardMarkup(session));
        else host.insertAdjacentHTML('afterbegin',cardMarkup(session));
      }else if(oldCard.dataset.resumeSignature!==signature){
        oldCard.outerHTML=cardMarkup(session);
      }
    });

    app.querySelectorAll('[data-rise-resume="1"]').forEach(card=>{
      if(!home?.contains(card)&&!subjects?.contains(card)) card.remove();
    });
  }

  function scheduleSync(){
    if(pendingFrame) return;
    pendingFrame=requestAnimationFrame(sync);
  }

  new MutationObserver(scheduleSync).observe(app,{childList:true,subtree:true});
  document.addEventListener('aa:v23ready',scheduleSync);
  document.addEventListener('rise:navigation',scheduleSync);
  addEventListener('pageshow',scheduleSync);
  scheduleSync();
})();
