(()=>{
 'use strict';
 if(window.__AA_SOCIAL_EXAM_BRIDGE__)return;window.__AA_SOCIAL_EXAM_BRIDGE__=true;
 const base=new URL('./',document.currentScript?.src||new URL('./social-exam/bridge.js',location.href));
 let installed=false;
 async function install(){
  if(installed)return;installed=true;
  try{
   const [{applicationPack},{assertPack,toLegacyQuestion,validatePack,scoreQuestion,scorePack,VERSION}]=await Promise.all([
    import(new URL('./application-pack.mjs',base)),import(new URL('./core.mjs',base))
   ]);
   const pack=assertPack(applicationPack),byDomain=Object.groupBy?Object.groupBy(pack.questions,q=>q.domain):pack.questions.reduce((m,q)=>((m[q.domain]||=[]).push(q),m),{});
   const cursor={geography:0,history:0,civics:0};
   const domains=['geography','history','civics'];
   const next=(domain)=>{const d=byDomain[domain]?.length?domain:domains[Math.floor(Math.random()*domains.length)],pool=byDomain[d];const q=pool[cursor[d]++%pool.length];return toLegacyQuestion(q)};
   const original=typeof makeSocialQ==='function'?makeSocialQ:null;
   if(original){makeSocialQ=function(diff=7){const d=domains[Math.floor(Math.random()*domains.length)];const p=Number(diff)>=6?.82:.45;return Math.random()<p?next(d):original(diff)}}
   if(window.AA_V23_GENERATORS)window.AA_V23_GENERATORS.social=()=>next(domains[Math.floor(Math.random()*domains.length)]);
   window.AASocialExam={version:VERSION,profileId:pack.profileId,pack,validatePack,scoreQuestion,scorePack,nextQuestion:next,source:'user-provided-analysis-plus-original-constructed-stimuli'};
   document.dispatchEvent(new CustomEvent('aa:social-exam-ready',{detail:{version:VERSION,questions:pack.questions.length,totalPoints:pack.questions.reduce((s,q)=>s+q.points,0)}}));
  }catch(error){installed=false;console.error('Social application pack unavailable',error?.message||error)}
 }
 document.addEventListener('aa:v23ready',install,{once:true});
 if(window.AA_V23_STATS)install();
})();
