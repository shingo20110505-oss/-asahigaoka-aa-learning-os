(()=>{'use strict';
const VERSION='2026-09-05.1';
const norm=value=>String(value??'').trim().toLowerCase();
const escapeRe=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const isPhrase=v=>String(v?.pos||'')==='phrase'||String(v?.level||'')==='phrase'||String(v?.word||'').includes(' ');
const kind=v=>String(v?.pos||'')==='form'||String(v?.level||'')==='form'?'form':isPhrase(v)?'phrase':'word';
function exactSurfaceInText(text,word){
 const target=String(word||'').trim();if(!target)return false;
 const re=new RegExp(`(^|[^A-Za-z0-9])${escapeRe(target)}(?=$|[^A-Za-z0-9])`,'i');
 return re.test(String(text||''));
}
function clozeEligible(v){
 const text=String(v?.cloze||v?.example||'');
 if(/_{3,}/.test(text))return true;
 return exactSurfaceInText(text,v?.word);
}
function shuffle(items){
 const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out;
}
function preferredCandidates(v,pool){
 const sameKind=pool.filter(x=>x!==v&&kind(x)===kind(v));
 if(kind(v)!=='word')return sameKind;
 const pos=String(v?.pos||'');
 const samePos=sameKind.filter(x=>String(x?.pos||'')===pos);
 const sameLevel=sameKind.filter(x=>String(x?.level||'')===String(v?.level||''));
 const out=[],seen=new Set();
 for(const x of [...samePos,...sameLevel,...sameKind,pool]){const key=norm(x?.word);if(!key||seen.has(key)||key===norm(v?.word))continue;seen.add(key);out.push(x)}
 return out;
}
function rebuildChoices(q){
 if(!q?.source||!Array.isArray(q.choices)||!['meaning','context','cloze'].includes(q.format))return q;
 if(typeof vocabPool!=='function')return q;
 const v=q.source,pool=preferredCandidates(v,vocabPool()),field=q.format==='cloze'?'word':'meaning',correct=String(v?.[field]||'');
 if(!correct)return q;
 const distractors=[],seen=new Set([norm(correct)]);
 for(const x of pool){const value=String(x?.[field]||'').trim(),key=norm(value);if(!value||seen.has(key))continue;seen.add(key);distractors.push({text:value,ok:false,reason:q.format==='cloze'?'品詞・語種または文脈が合いません。':'同じ語種の候補ですが、本文の意味には合いません。',error:q.format});if(distractors.length===3)break}
 if(distractors.length<3)return q;
 const correctChoice={text:correct,ok:true,reason:q.format==='cloze'?`文脈上 ${v.word} が最適です。`:`${v.word} = ${v.meaning}`};
 q.choices=shuffle([correctChoice,...distractors]);q.answerIndex=q.choices.findIndex(x=>x.ok);q.explanation=correctChoice.reason;
 return q;
}
function install(){
 if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab)||!window.__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__?.complete||typeof window.makeVocabQ!=='function')return false;
 const original=window.makeVocabQ;if(original.__aaEnglishQuizQualityV1)return true;
 const wrapped=function(forced=null,forcedFormat=null){
  let q=original(forced,forcedFormat);
  if(!q?.source||q.type!=='vocab')return q;
  if(q.format==='cloze'&&!clozeEligible(q.source)){
   q=original(q.source,'context');
   if(q){q.quizQualityFallback='unsafe-cloze-to-context';q.requestedFormat='cloze'}
  }
  if(q?.format==='context'&&q.source){q.stem=`次の例文を読んで、${q.source.word} の意味として文脈に最も適切なものを選びなさい。\n\n${q.source.example}`}
  return rebuildChoices(q);
 };
 wrapped.__aaEnglishQuizQualityV1=true;wrapped.__aaOriginal=original;window.makeVocabQ=wrapped;
 const total=DATA.vocab.length,eligible=DATA.vocab.filter(clozeEligible).length;
 window.__AA_ENGLISH_VOCAB_QUIZ_QUALITY_V1__={version:VERSION,total,clozeEligible:eligible,clozeFallback:total-eligible,distractors:'same-kind-and-pos-preferred',compatibility:'no-progress-key-migration'};
 try{document.dispatchEvent(new CustomEvent('aa:vocab-quiz-quality-ready',{detail:window.__AA_ENGLISH_VOCAB_QUIZ_QUALITY_V1__}))}catch(_){}
 return true;
}
if(!install()){let tries=0;const timer=setInterval(()=>{if(install()||++tries>1000)clearInterval(timer)},10)}
})();
