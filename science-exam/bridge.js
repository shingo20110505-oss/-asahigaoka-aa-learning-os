(()=>{
 'use strict';
 if(window.__AA_SCIENCE_EXAM_BRIDGE__)return;window.__AA_SCIENCE_EXAM_BRIDGE__=true;
 const base=new URL('./',document.currentScript?.src||new URL('./science-exam/bridge.js',location.href));
 let installed=false;
 async function install(){
  if(installed)return;installed=true;
  try{
   const [{buildExam,generateQuestion,templateCounts},{PROFILE,VERSION,validateExam,scoreQuestion,scoreExam,toLegacyQuestion}]=await Promise.all([
    import(new URL('./generator.mjs',base)),import(new URL('./core.mjs',base))
   ]);
   const smoke=buildExam('production-smoke-'+VERSION),domains=PROFILE.domains,cursor={biology:0,chemistry:0,physics:0,earth:0};
   const next=(domain=null,diff=7)=>{
    let d=domains.includes(domain)?domain:null;
    const seed='live:'+Date.now()+':'+Math.random()+':'+String(d||'weighted')+':'+String(cursor[d]??0);
    if(d)cursor[d]++;
    const q=generateQuestion({seed,domain:d});
    const legacy=toLegacyQuestion(q);
    legacy.source.difficulty=Number(diff)>=9?10:Number(diff)>=7?9:7;
    return legacy;
   };
   // Legacy generic science is intentionally not used as fallback.
   if(typeof makeScienceQ==='function')makeScienceQ=function(diff=7){return next(null,diff)};
   window.AA_V23_GENERATORS=window.AA_V23_GENERATORS||{};
   window.AA_V23_GENERATORS.science=()=>next(null,7);
   if(window.AA_V23?.generators)window.AA_V23.generators.science=window.AA_V23_GENERATORS.science;
   window.AAScienceExam={version:VERSION,profile:PROFILE,buildExam,generateQuestion,nextQuestion:next,validateExam,scoreQuestion,scoreExam,templateCounts:templateCounts(),
    legacyGenericFallback:false,smoke:{questions:smoke.questions.length,points:smoke.questions.reduce((s,q)=>s+q.points,0)}};
   document.dispatchEvent(new CustomEvent('aa:science-exam-ready',{detail:{version:VERSION,questions:smoke.questions.length,totalPoints:PROFILE.totalPoints,legacyGenericFallback:false}}));
  }catch(error){installed=false;console.error('Aichi science engine unavailable',error?.stack||error?.message||error)}
 }
 document.addEventListener('aa:v23ready',install,{once:true});
 if(window.AA_V23_STATS)install();
})();
