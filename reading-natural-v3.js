(()=>{'use strict';
if(window.__AA_READING_NATURAL_V3__)return;
if(!window.__AA_READING_NATURAL_V2__||typeof DATA==='undefined'||!Array.isArray(DATA.readingScenarios)||typeof makeReadingPassage!=='function')return;
window.__AA_READING_NATURAL_V3__=true;

// Fix the one semantic contradiction found by the 1000-passage audit.
const seating=DATA.readingScenarios.find(sc=>sc.id==='nat-core-01');
if(seating){
  seating.naturalExtra=[
    'The class did not decide that one part of the library was best for every kind of work. Students doing quiet individual work usually preferred the window seats, while short group work fit the entrance seats better.',
    'The result led to a simple change: the library marked some seats for quiet individual work and others for short group tasks.'
  ];
}

const baseMakeReadingPassage=makeReadingPassage;
const FORMAT_GENRES=new Set(['email','conversation','notice']);
function sentenceList(paragraph){
  const s=String(paragraph||'').trim();
  if(!s)return[];
  return (s.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[s]).map(x=>x.trim()).filter(Boolean);
}
function paragraphPlan(base,variant){
  const paras=String(base||'').split(/\n\n+/).map(x=>x.trim()).filter(Boolean);
  if(paras.length<2)return base;
  const sentences=paras.flatMap(sentenceList);
  if(sentences.length<5)return base;
  const original=[];let pos=0;
  for(let i=0;i<paras.length-1;i++){pos+=sentenceList(paras[i]).length;original.push(pos)}
  const last=sentences.length;
  let cuts=[...original];
  const k=variant%12;
  if(k===0)return base;
  if(k>=1&&k<=4&&cuts.length){
    const j=(k-1)%cuts.length;
    const dir=k%2?1:-1;
    const next=cuts[j]+dir;
    const lo=j===0?1:cuts[j-1]+1,hi=j===cuts.length-1?last-1:cuts[j+1]-1;
    if(next>=lo&&next<=hi)cuts[j]=next;
  }else if(k>=5&&k<=8&&cuts.length>=2){
    const j=(k-5)%(cuts.length-1);
    cuts.splice(j+1,1);
  }else if(k>=9){
    // Add one paragraph break at a safe sentence boundary while keeping every sentence in order.
    const occupied=new Set(cuts);const options=[];
    for(let n=2;n<=last-2;n++)if(!occupied.has(n)&&!occupied.has(n-1)&&!occupied.has(n+1))options.push(n);
    if(options.length)cuts.push(options[(k-9)%options.length]);
  }
  cuts=[...new Set(cuts)].filter(n=>n>0&&n<last).sort((a,b)=>a-b);
  const out=[];let start=0;
  for(const cut of [...cuts,last]){const chunk=sentences.slice(start,cut).join(' ');if(chunk)out.push(chunk);start=cut}
  return out.join('\n\n');
}
function chooseVariant(sc,base){
  if(FORMAT_GENRES.has(sc?.genre))return base;
  // Math.random only changes paragraph boundaries. Words, facts and evidence remain exactly unchanged.
  return paragraphPlan(base,Math.floor(Math.random()*12));
}
makeReadingPassage=function(sc,diff=7,mode='standard'){
  const base=baseMakeReadingPassage(sc,diff,mode);
  return chooseVariant(sc,base);
};

// Prevent the live app from falling back into long runs of reports/experiments.
if(typeof generateReading==='function'){
  const baseGenerateReading=generateReading;
  generateReading=function(diff=7,mode='standard'){
    const recent=(state?.historyFingerprints||[]).slice(-18);
    const counts={};for(const h of recent){const g=h?.dna?.genre;if(g)counts[g]=(counts[g]||0)+1}
    const last=recent.at(-1)?.dna?.genre||'';
    let best=null,bestScore=Infinity;
    for(let i=0;i<8;i++){
      const r=baseGenerateReading(diff,mode);const g=r?.dna?.genre||DATA.readingScenarios.find(x=>x.id===r?.scenarioId)?.genre||'';
      const score=(counts[g]||0)*3+(g===last?5:0)+(g==='report'?1.5:0)+(g==='experiment'?1:0)+(g==='expository'?.5:0);
      if(score<bestScore){best=r;bestScore=score}
      if(score<=1)break;
    }
    return best||baseGenerateReading(diff,mode);
  };
}

function auditV3(){
  const seatingText=seating?baseMakeReadingPassage(seating,7,'standard'):'';
  const contradiction=/entrance seats worked well for short group work/i.test(seatingText)&&/quiet work still preferred the seats near the entrance/i.test(seatingText);
  const prose=DATA.readingScenarios.filter(sc=>!FORMAT_GENRES.has(sc.genre));
  return {version:'3.0.0',scenarioCount:DATA.readingScenarios.length,proseScenarioCount:prose.length,contradictionFixed:!contradiction,paragraphVariation:true,genreBalancing:true,pass:!contradiction&&prose.length>=40};
}
window.AA_READING_NATURALNESS_V3=auditV3();
document.dispatchEvent(new CustomEvent('aa:reading-naturalness-v3',{detail:window.AA_READING_NATURALNESS_V3}));
})();