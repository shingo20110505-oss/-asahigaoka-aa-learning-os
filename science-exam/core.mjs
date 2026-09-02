// Aichi-style science mark-sheet engine. Pure validation/scoring/legacy conversion; no storage writes.
export const VERSION='1.0.0';
export const PROFILE=Object.freeze({
  id:'aichi_public_hs_science_current_mock',version:VERSION,nonOfficial:true,markSheetOnly:true,
  questionCount:20,totalPoints:22,onePointCount:18,twoPointCount:2,
  domains:['biology','chemistry','physics','earth'],
  targetWeights:{biology:.28,earth:.25,physics:.24,chemistry:.23},
  formats:['single_choice','multi_select'],applicationMinPoints:15,
  sourceBasis:'user-provided 2016-2025 Aichi analysis; original generated questions only',
  purpose:'Aichi-style application training, not reproduction of official questions'
});
export const DISTRACTOR_TYPES=Object.freeze([
  'condition_omission','data_misread','unit_conversion','proportion_error','inverse_relation',
  'intermediate_value','concept_confusion','cause_effect_reverse','control_variable_error',
  'scope_overreach','sign_direction','formula_substitution','rounding_error','sequence_error'
]);
const arr=Array.isArray;
const txt=x=>typeof x==='string'&&x.trim().length>0;
const uniq=xs=>new Set(xs).size===xs.length;
const norm=x=>String(x??'').trim().replace(/\s+/g,' ');
export function hashSeed(seed='science'){
  let h=2166136261>>>0;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
}
export function seededRandom(seed='science'){
  let x=hashSeed(seed)||0x9e3779b9;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
export function shuffle(xs,random=Math.random){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function validateQuestion(q){
  const errors=[],add=(ok,msg)=>{if(!ok)errors.push(msg)},p='q:'+String(q?.id||'?')+':';
  if(!q||typeof q!=='object')return{ok:false,errors:[p+'object']};
  add(txt(q.id)&&txt(q.templateKey)&&txt(q.title)&&txt(q.stem)&&txt(q.intent)&&txt(q.explanation),p+'text');
  add(PROFILE.domains.includes(q.domain),p+'domain');
  add(PROFILE.formats.includes(q.format),p+'format');
  add(Number.isInteger(q.points)&&[1,2].includes(q.points),p+'points');
  add(['standard','application'].includes(q.level),p+'level');
  add(Number.isInteger(q.expectedSeconds)&&q.expectedSeconds>=35&&q.expectedSeconds<=240,p+'time');
  add(arr(q.stimuli)&&q.stimuli.length>=1&&q.stimuli.every(s=>txt(s.label)&&txt(s.kind)&&txt(s.content)),p+'stimuli');
  const cs=arr(q.choices)?q.choices:[],ids=cs.map(c=>c.id),texts=cs.map(c=>norm(c.text));
  add(cs.length>=4&&cs.length<=6&&uniq(ids)&&uniq(texts)&&cs.every(c=>txt(c.id)&&txt(c.text)&&txt(c.explanation)),p+'choices');
  const answers=arr(q.answers)?q.answers:[];
  add(answers.length>=1&&answers.length<cs.length&&uniq(answers)&&answers.every(id=>ids.includes(id)),p+'answers');
  add(q.format==='single_choice'?answers.length===1:answers.length>=2,p+'answer_count');
  for(const c of cs)if(!answers.includes(c.id))add(DISTRACTOR_TYPES.includes(c.distractorType),p+'distractor:'+String(c.id));
  const audit=q.audit||{};
  add(audit.method==='deterministic-recompute'&&audit.verified===true&&txt(audit.recomputedAnswer),p+'audit');
  if(answers.length===1){const a=cs.find(c=>c.id===answers[0]);add(!!a&&norm(a.text)===norm(audit.recomputedAnswer),p+'independent_answer_match')}
  add(arr(q.reasoningSteps)&&q.reasoningSteps.length>=2&&q.reasoningSteps.every(txt),p+'reasoning');
  add(arr(q.skills)&&q.skills.length>=1&&q.skills.every(txt),p+'skills');
  return{ok:errors.length===0,errors};
}
export function validateExam(exam){
  const errors=[],add=(ok,msg)=>{if(!ok)errors.push(msg)};
  if(!exam||typeof exam!=='object')return{ok:false,errors:['exam']};
  add(exam.schemaVersion===1&&txt(exam.id)&&txt(exam.title),'identity');
  add(exam.profileId===PROFILE.id&&exam.nonOfficial===true,'profile');
  const qs=arr(exam.questions)?exam.questions:[];add(qs.length===PROFILE.questionCount&&uniq(qs.map(q=>q.id)),'question_count_ids');
  const counts=Object.fromEntries(PROFILE.domains.map(d=>[d,0]));let total=0,ones=0,twos=0,applicationPoints=0;
  for(const q of qs){const r=validateQuestion(q);if(!r.ok)errors.push(...r.errors);if(Object.hasOwn(counts,q.domain))counts[q.domain]++;total+=q.points||0;if(q.points===1)ones++;if(q.points===2)twos++;if(q.level==='application')applicationPoints+=q.points||0}
  add(total===PROFILE.totalPoints,'total_points');add(ones===PROFILE.onePointCount&&twos===PROFILE.twoPointCount,'point_distribution');
  add(Object.values(counts).every(n=>n>=4&&n<=6),'domain_balance');add(applicationPoints>=PROFILE.applicationMinPoints,'application_points');
  return{ok:errors.length===0,errors,total,counts,applicationPoints};
}
export function assertExam(exam){const r=validateExam(exam);if(!r.ok)throw new Error('Invalid science exam: '+r.errors.join(', '));return exam}
export function scoreQuestion(q,response){
  const ids=q.choices.map(c=>c.id),r=arr(response)?response:response?[response]:[];
  const valid=uniq(r)&&r.every(id=>ids.includes(id))&&r.length<=q.answers.length,complete=r.length===q.answers.length;
  const correct=valid&&complete&&q.answers.every(id=>r.includes(id))&&r.every(id=>q.answers.includes(id));
  return{earned:correct?q.points:0,max:q.points,correct,valid,complete};
}
export function scoreExam(exam,responses={}){const details=exam.questions.map(q=>({id:q.id,domain:q.domain,...scoreQuestion(q,responses[q.id])}));return{earned:details.reduce((s,x)=>s+x.earned,0),max:details.reduce((s,x)=>s+x.max,0),details}}
export function toLegacyQuestion(q,{random=Math.random}={}){
  // Main OS currently answers one choice at a time. Multi-select questions are expressed as combination choices by templates before this adapter.
  if(q.format!=='single_choice')throw new Error('Legacy adapter requires single_choice: '+q.id);
  const answer=q.answers[0],choices=shuffle(q.choices,random).map(c=>({text:c.text,ok:c.id===answer,reason:c.explanation,error:c.id===answer?null:c.distractorType}));
  return{id:'science-aichi:'+q.templateKey+':'+Date.now().toString(36)+Math.random().toString(36).slice(2),reviewKey:q.templateKey,type:'science',subject:'science',
    stem:q.stimuli.map(s=>`【${s.label}】\n${s.content}`).join('\n\n')+'\n\n'+q.stem,choices,answerIndex:choices.findIndex(c=>c.ok),
    explanation:q.explanation+'\n考え方：'+q.reasoningSteps.join(' → '),points:1,selectCount:1,
    skills:q.skills.map((id,i)=>({id,role:i===0?'primary':'support'})),expectedMs:q.expectedSeconds*1000,context:'aichi-science-exam-v1',format:'aichi-marksheet-single-choice',
    source:{area:q.domain,difficulty:q.level==='application'?9:7,meta:{origin:'science-exam-v1',nonOfficial:true,templateKey:q.templateKey,quality:'deterministic-recompute'}},nonOfficial:true};
}
