(()=>{
  'use strict';

  const PATCH_VERSION='2.0.0';
  const clone=value=>{try{return JSON.parse(JSON.stringify(value))}catch(_){return value}};
  const attemptKey=a=>String(a?.reviewKey||a?.itemId||a?.attemptId||'');
  const idFamily=id=>{const p=String(id||'').split(':');return p.length>=2?`${p[0]}:${p[1]}`:String(id||'')};
  const prefixSubject=id=>{id=String(id||'');if(id.startsWith('math:'))return'math';if(id.startsWith('sci:'))return'science';if(id.startsWith('soc:'))return'social';if(id.startsWith('kanji:'))return'japanese';if(id.startsWith('vocab:')||id.startsWith('read:')||id.startsWith('reading:'))return'english';return''};

  function subjectOf(a){
    const skill=a?.skills?.[0]?.id||'';
    return DATA?.skills?.[skill]?.subject||prefixSubject(a?.itemId);
  }

  function rebuildLegacyVocab(a){
    const p=String(a?.itemId||'').split(':');
    if(p[0]!=='vocab'||p.length<3)return null;
    const v=vocabPool().find(x=>String(x.id)===p[1]);
    if(!v)return null;
    return makeVocabQ(v,p[2]);
  }

  function rebuildLegacyKanji(a){
    const p=String(a?.itemId||'').split(':');
    if(p[0]!=='kanji'||p.length<3)return null;
    const k=(DATA.kanji||[]).find(x=>String(x.id)===p[1]);
    if(!k)return null;
    return makeKanjiQ(k,p[2]);
  }

  function matchingSubjectQuestion(a,subject){
    const target=idFamily(a?.itemId);
    if(!target)return null;
    const current=Number(state?.ui?.subjectDifficulty||7);
    const diffs=[...new Set([current,5,7,9,11])];
    for(const diff of diffs){
      for(let i=0;i<64;i++){
        const q=makeSubjectQ(subject,diff);
        if(q&&idFamily(q.id)===target)return q;
      }
    }
    return null;
  }

  function matchingLegacyReading(a){
    const target=idFamily(a?.itemId);
    const current=Number(state?.ui?.subjectDifficulty||7);
    for(let i=0;i<24;i++){
      const r=generateReading(current,'micro');
      if(!r)continue;
      if(!target){registerReading(r);return r}
      const qs=Array.isArray(r.questions)?r.questions:[];
      const match=qs.find(q=>idFamily(q?.id)===target);
      if(match){r.questions=[match];registerReading(r);return r}
    }
    return null;
  }

  function rebuildLegacyAttempt(a){
    const id=String(a?.itemId||'');
    if(id.startsWith('vocab:'))return rebuildLegacyVocab(a);
    if(id.startsWith('kanji:'))return rebuildLegacyKanji(a);
    const subject=subjectOf(a);
    if(!subject)return null;
    if(subject==='english')return matchingLegacyReading(a);
    return matchingSubjectQuestion(a,subject);
  }

  function pinLegacyReplay(a,q){
    if(!a||!q||a.replayQuestion)return false;
    a.replayQuestion=clone(q);
    a.replayMigratedBy=`wrong-review-fidelity-v${PATCH_VERSION}`;
    return true;
  }

  function install(){
    if(window.__RISE_WRONG_REVIEW_FIDELITY_V2__)return true;
    if(typeof startWrongReview!=='function'||typeof state==='undefined'||typeof DATA==='undefined'||typeof makeSubjectQ!=='function')return false;

    startWrongReview=function startWrongReviewFidelityV2(){
      const wrong=state.attempts.filter(a=>!a.correct).slice(-30).reverse();
      const queue=[];
      const used=new Set();
      let migrated=false;

      for(const a of wrong){
        const key=attemptKey(a);
        if(key&&used.has(key))continue;

        let q=null;
        if(a.replayQuestion&&typeof a.replayQuestion==='object')q=clone(a.replayQuestion);
        else{
          q=rebuildLegacyAttempt(a);
          if(q)migrated=pinLegacyReplay(a,q)||migrated;
        }
        if(!q)continue;

        if(key)used.add(key);
        queue.push(clone(q));
        if(queue.length>=8)break;
      }

      if(migrated)save();
      if(!queue.length){
        alert('古い誤答履歴に元の問題形式が残っていないため、安全に復元できる問題がありませんでした。新しく間違えた問題は同じ形式で保存されます。');
        return;
      }

      state.session={id:uid('review'),active:true,mode:'review',kind:'review',subject:'mixed',queue,index:0,subIndex:0,answers:{},feedback:null,startedAt:now(),accumulatedMs:0,lastActiveAt:now(),itemStartedAt:now(),scrollY:0,minimumDone:false,clockPaused:false,pausedAt:null};
      state.stats.sessions++;
      state.route='study';
      save();
      render();
      window.scrollTo(0,0);
      startTicker();
    };

    window.__RISE_WRONG_REVIEW_FIDELITY_V2__={version:PATCH_VERSION,installedAt:Date.now()};
    console.info(`[Rise] wrong review fidelity v${PATCH_VERSION} active`);
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>=80)clearInterval(timer)},25);
  }
})();
