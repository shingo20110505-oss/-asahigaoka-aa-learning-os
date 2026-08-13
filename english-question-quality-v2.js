// english-question-quality-v2.js
// Prevent contextless English cloze questions and repair already-saved questions without clearing progress.
(()=>{
  'use strict';

  const VERSION='2.0.0';
  const KNOWN_MEANINGS={
    'would like to':'〜したい',
    'by comparing':'比較することによって',
    'give up':'あきらめる',
    'be good at':'〜が得意だ',
    'look forward to':'〜を楽しみにする',
    'be interested in':'〜に興味がある'
  };

  const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLowerCase();
  const answerText=q=>{
    if(!q||!Array.isArray(q.choices)||!Number.isInteger(q.answerIndex))return '';
    const c=q.choices[q.answerIndex];
    return String(c?.text??c??'').trim();
  };
  const sourceMeaning=(q,forced)=>{
    const raw=String(forced?.meaning??q?.source?.meaning??'').trim();
    return raw||KNOWN_MEANINGS[norm(answerText(q))]||'';
  };
  const answerLeaks=(stem,answer)=>{
    const a=norm(answer);if(!a)return false;
    return norm(String(stem||'').replace(/_{3,}/g,' ')).includes(a);
  };
  function isMalformedCloze(q){
    if(!q||q.type!=='vocab'||q.format!=='cloze')return false;
    const stem=String(q.stem||'');
    const answer=answerText(q);
    if(/choose\s+the\s+expression\s*:\s*_{3,}\s*[.!?。]?/i.test(stem))return true;
    if(/_{3,}\s+means\s+[「『][^」』]+[」』]\s+in\s+this\s+exercise/i.test(stem))return true;
    if(answerLeaks(stem,answer))return true;
    const body=stem
      .replace(/^\s*空所に最も適切な(?:英語の)?(?:語|語句|表現)を選びなさい。?\s*/,'')
      .trim();
    return /^_{3,}\s*[.!?。]?$/.test(body);
  }
  function repairQuestion(q,forced){
    if(!isMalformedCloze(q))return false;
    const meaning=sourceMeaning(q,forced);
    const answer=answerText(q);
    if(!meaning||!answer)return false;
    q.stem=`「${meaning}」を表す最も適切な英語を選びなさい。`;
    q.format='meaning';
    q.context='meaning';
    const correctReason=`${answer} = ${meaning}`;
    q.explanation=correctReason;
    if(Array.isArray(q.choices)){
      q.choices=q.choices.map((c,i)=>{
        if(c&&typeof c==='object')return {...c,reason:i===q.answerIndex?correctReason:'この意味には合いません。',error:i===q.answerIndex?c.error:'meaning'};
        return c;
      });
    }
    return true;
  }

  function installGeneratorGuard(){
    const base=window.makeVocabQ;
    if(typeof base!=='function')return false;
    if(base.__aaEnglishQuestionQualityV2)return true;
    function guardedMakeVocabQ(forced,forcedFormat){
      const q=base.apply(this,arguments);
      repairQuestion(q,forced);
      return q;
    }
    guardedMakeVocabQ.__aaEnglishQuestionQualityV2=true;
    guardedMakeVocabQ.__aaEnglishQuestionQualityBase=base;
    window.makeVocabQ=guardedMakeVocabQ;
    return true;
  }

  function installSavedSessionGuard(){
    const base=window.currentQ;
    if(typeof base!=='function')return false;
    if(base.__aaEnglishQuestionQualityV2)return true;
    function guardedCurrentQ(){
      const q=base.apply(this,arguments);
      if(repairQuestion(q,q?.source)){
        queueMicrotask(()=>{try{if(typeof window.save==='function')window.save()}catch(_){}});
      }
      return q;
    }
    guardedCurrentQ.__aaEnglishQuestionQualityV2=true;
    guardedCurrentQ.__aaEnglishQuestionQualityBase=base;
    window.currentQ=guardedCurrentQ;
    return true;
  }

  function refreshCurrentQuestion(){
    try{
      if(typeof window.currentQ!=='function')return;
      const q=window.currentQ();
      if(!q)return;
      if(typeof window.render==='function')window.render();
    }catch(_){}
  }

  function boot(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const a=installGeneratorGuard();
      const b=installSavedSessionGuard();
      if(a&&b){
        clearInterval(timer);
        refreshCurrentQuestion();
      }else if(tries>=60){
        clearInterval(timer);
      }
    },100);
    installGeneratorGuard();
    installSavedSessionGuard();
    setTimeout(refreshCurrentQuestion,0);
  }

  window.__AA_ENGLISH_QUESTION_QUALITY_V2__={
    version:VERSION,
    isMalformedCloze,
    repairQuestion,
    selfTest(){
      const q={type:'vocab',format:'cloze',stem:'空所に最も適切な語句を選びなさい。\nChoose the expression: _____.',choices:[{text:'would like to'},{text:'by comparing'},{text:'give up'},{text:'be good at'}],answerIndex:0,source:{meaning:'〜したい'}};
      const repaired=repairQuestion(q,q.source);
      return repaired&&q.format==='meaning'&&q.stem.includes('〜したい')&&!q.stem.includes('_____')&&q.choices[0].reason.includes('would like to');
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
