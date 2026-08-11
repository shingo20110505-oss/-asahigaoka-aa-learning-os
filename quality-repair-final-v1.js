(()=>{'use strict';
if(window.__AA_QUALITY_REPAIR_FINAL_V1__)return;
window.__AA_QUALITY_REPAIR_FINAL_V1__={version:'1.0.0'};
const FINAL=window.AA_QUALITY_REPAIR_FINAL={version:'1.0.0'};
const clean=s=>String(s??'').trim();

function canonicalMathRows(){
  const raw=Array.isArray(window.AA_V2_CURRICULUM?.math)?window.AA_V2_CURRICULUM.math:[];
  return raw.filter(r=>{const m=/^m(\d+)$/.exec(String(r?.[0]||''));return m&&Number(m[1])>=1&&Number(m[1])<=57});
}
function rowFromRaw(r){
  return {id:r[0],subject:'math',area:r[1],prompt:r[2],answer:r[3],explanation:r[4],difficulty:r[5],skillId:'math.formula.recall',impact:r[1]==='advanced'?.72:1};
}
function restoreMathFormulaBank(){
  const api=window.AA_V2_TEST_API,bank=api?.banks?.math;
  if(!Array.isArray(bank))return {ok:false,reason:'math bank unavailable'};
  const canonical=canonicalMathRows();
  if(canonical.length!==57)return {ok:false,reason:`canonical ${canonical.length}`};
  const canonicalIds=new Set(canonical.map(r=>r[0]));
  const firstById=new Map();
  let duplicateNo=0;
  for(const row of bank){
    const id=String(row?.id||'');
    if(canonicalIds.has(id)){
      if(!firstById.has(id))firstById.set(id,row);
      else{
        row.originalId=id;
        row.id=`${id}-extension-dup-${++duplicateNo}`;
        row.originalArea=row.area;
        row.area='extension';
      }
    }else{
      if(row&&row.area!=='extension')row.originalArea=row.originalArea||row.area;
      if(row)row.area='extension';
    }
  }
  for(const raw of canonical){
    const id=raw[0];let row=firstById.get(id);
    if(!row){row=rowFromRaw(raw);bank.push(row);firstById.set(id,row)}
    row.subject='math';row.area=raw[1];row.prompt=raw[2];row.answer=raw[3];row.explanation=raw[4];row.difficulty=raw[5];row.skillId='math.formula.recall';row.impact=raw[1]==='advanced'?.72:1;
  }
  const formula=api.subjectRows('math');
  const ids=formula.map(r=>r.id),unique=new Set(ids);
  const advanced=formula.filter(r=>r.area==='advanced');
  FINAL.mathFormulaIds=ids;
  FINAL.mathFormulaCount=formula.length;
  FINAL.mathAdvancedCount=advanced.length;
  return {ok:formula.length===57&&unique.size===57&&advanced.length===24,count:formula.length,unique:unique.size,advanced:advanced.length,missing:canonical.map(r=>r[0]).filter(id=>!unique.has(id))};
}

const STOP=new Set('the a an and or but so to of in on at for from with by as is are was were be been being this that these those it its they their them he his she her we our you your i my do does did have has had can could will would should may might not than then into about after before during over under more most some any other each all'.split(' '));
function words(s){return clean(s).toLowerCase().match(/[a-z][a-z'-]*/g)?.filter(w=>w.length>2&&!STOP.has(w))||[]}
function sentenceMap(passage){
  const paragraphs=clean(passage).split(/\n\s*\n+/).filter(Boolean),out=[];
  paragraphs.forEach((p,pi)=>{
    const chunks=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[p];
    chunks.map(x=>x.trim()).filter(Boolean).forEach((quote,si)=>out.push({paragraph:pi+1,sentence:si+1,quote}));
  });
  return out;
}
function evidenceScore(sentence,q){
  const correct=q?.choices?.find(c=>c?.ok)?.text||q?.choices?.[q?.answerIndex]?.text||'';
  const target=[q?.evidence,correct,q?.stem].filter(Boolean).join(' '),tw=new Set(words(target)),sw=new Set(words(sentence.quote));
  let overlap=0;for(const w of tw)if(sw.has(w))overlap++;
  let score=overlap*5;
  const ev=clean(q?.evidence).toLowerCase(),sq=sentence.quote.toLowerCase();
  if(ev&&sq.includes(ev))score+=100;
  for(const w of words(correct))if(sw.has(w))score+=3;
  return score;
}
function bestEvidenceRef(passage,q){
  const map=sentenceMap(passage);if(!map.length)return null;
  let best=map[0],bestScore=-1;
  for(const s of map){const score=evidenceScore(s,q);if(score>bestScore){best=s;bestScore=score}}
  if(bestScore<=0&&q?.type==='inference'&&map.length>1)best=map[map.length-1];
  return {paragraph:best.paragraph,sentence:best.sentence,quote:best.quote};
}
function repairReadingEvidence(reading){
  if(!reading||!Array.isArray(reading.questions))return reading;
  for(const q of reading.questions){
    if(!q||!Array.isArray(q.choices))continue;
    const correct=q.choices.filter(c=>c?.ok);
    q.answerIndex=q.choices.findIndex(c=>c?.ok);
    if(correct.length===1&&q.answerIndex>=0&&q.type!=='grammarTransfer'&&q.type!=='mainIdea'&&(!Array.isArray(q.evidenceRefs)||q.evidenceRefs.length===0)){
      const ref=bestEvidenceRef(reading.passage,q);if(ref)q.evidenceRefs=[ref];
    }
    for(const c of q.choices){if(!c?.ok&&!c.distractorType)c.distractorType=c.error||'content_mismatch';if(!c?.ok&&!c.error)c.error=c.distractorType}
  }
  return reading;
}

const baseGenerateReading=typeof generateReading==='function'?generateReading:null;
if(baseGenerateReading){
  generateReading=function(...args){return repairReadingEvidence(baseGenerateReading(...args))};
}
const baseGenerateReadingForLearner=typeof generateReadingForLearner==='function'?generateReadingForLearner:null;
if(baseGenerateReadingForLearner){
  generateReadingForLearner=function(...args){return repairReadingEvidence(baseGenerateReadingForLearner(...args))};
}

FINAL.math=restoreMathFormulaBank();
FINAL.audit=function(){
  const math=restoreMathFormulaBank();
  const out={math,reading:{generated:0,invalidChoices:0,missingEvidence:0,grammarBad:0,unmapped:0}};
  try{
    for(let i=0;i<36;i++){
      const r=generateReading(7,'standard');out.reading.generated++;
      if(!allowedGrammar(r.dna.grammarComposition.split('+'))||grammarLeakAudit(r.passage).length)out.reading.grammarBad++;
      out.reading.unmapped+=lexicalCoverageProfile(r.passage).unmapped.length;
      for(const q of r.questions){
        const unique=new Set(q.choices.map(c=>c.text)).size===q.choices.length;
        if(q.choices.length!==4||q.choices.filter(c=>c.ok).length!==1||q.answerIndex<0||!unique)out.reading.invalidChoices++;
        if(q.type!=='grammarTransfer'&&q.type!=='mainIdea'&&(!Array.isArray(q.evidenceRefs)||q.evidenceRefs.length===0))out.reading.missingEvidence++;
      }
    }
  }catch(e){out.error=String(e?.stack||e)}
  out.pass=math.ok&&out.reading.generated===36&&out.reading.invalidChoices===0&&out.reading.missingEvidence===0&&out.reading.grammarBad===0&&out.reading.unmapped===0&&!out.error;
  return out;
};
document.dispatchEvent(new CustomEvent('aa:quality-repair-final-ready',{detail:{version:FINAL.version,math:FINAL.math}}));
})();
