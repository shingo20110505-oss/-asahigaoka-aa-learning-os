// Aichi social application pack: validation/scoring/legacy adapter. No storage writes.
export const VERSION='1.0.0';
export const PROFILE=Object.freeze({
  id:'aichi_social_application_2026_mock',version:VERSION,markSheetOnly:true,
  questionCount:10,totalPoints:34,
  domains:{geography:4,history:3,civics:3},
  sourceWindow:'user-provided 2016-2025 Aichi analysis',
  purpose:'application-training-not-official-exam-reproduction'
});
const arr=Array.isArray;
const txt=x=>typeof x==='string'&&x.trim().length>0;
const uniq=xs=>new Set(xs).size===xs.length;
export function validatePack(pack){
  const errors=[],add=(ok,msg)=>{if(!ok)errors.push(msg)};
  if(!pack||typeof pack!=='object')return{ok:false,errors:['pack']};
  add(pack.schemaVersion===1&&txt(pack.id)&&txt(pack.title),'identity');
  add(pack.profileId===PROFILE.id&&pack.nonOfficial===true,'profile');
  const qs=arr(pack.questions)?pack.questions:[];
  add(qs.length===PROFILE.questionCount&&uniq(qs.map(q=>q.id)),'question_count_ids');
  let total=0;const counts={geography:0,history:0,civics:0};
  for(const q of qs){
    const p='q:'+String(q.id||'?')+':';
    add(txt(q.id)&&txt(q.title)&&txt(q.stem)&&txt(q.intent)&&txt(q.explanation),p+'text');
    add(Object.hasOwn(counts,q.domain),p+'domain');if(Object.hasOwn(counts,q.domain))counts[q.domain]++;
    add(q.format==='single_choice',p+'format');
    add(Number.isInteger(q.points)&&[3,4].includes(q.points),p+'points');total+=Number.isFinite(q.points)?q.points:0;
    add(arr(q.stimuli)&&q.stimuli.length>=2&&q.stimuli.every(s=>txt(s.label)&&txt(s.kind)&&txt(s.content)),p+'stimuli');
    const cs=arr(q.choices)?q.choices:[],ids=cs.map(c=>c.id),texts=cs.map(c=>c.text?.trim());
    add(cs.length===4&&uniq(ids)&&uniq(texts)&&cs.every(c=>txt(c.id)&&txt(c.text)&&txt(c.explanation)),p+'choices');
    add(txt(q.answer)&&ids.includes(q.answer),p+'answer');
    add(cs.filter(c=>c.id===q.answer).length===1,p+'one_answer');
    add(arr(q.reasoningSteps)&&q.reasoningSteps.length>=2&&q.reasoningSteps.every(txt),p+'reasoning');
    const m=q.metadata||{};
    add(arr(m.tags)&&m.tags.length>=2&&m.tags.every(txt),p+'tags');
    add(m.difficulty==='application'&&arr(m.keywords)&&m.keywords.length>=2,p+'difficulty');
    add(Number.isFinite(m.expectedCorrectRate)&&m.expectedCorrectRate>0&&m.expectedCorrectRate<1,p+'rate');
    add(Number.isInteger(m.expectedSeconds)&&m.expectedSeconds>=60&&m.expectedSeconds<=300,p+'time');
    add(m.originalConstructedDetails===true&&txt(m.sourceBasis),p+'provenance');
  }
  add(total===PROFILE.totalPoints,'total_points');
  for(const [d,n] of Object.entries(PROFILE.domains))add(counts[d]===n,'domain_count:'+d);
  return{ok:errors.length===0,errors,total,counts};
}
export function assertPack(pack){const r=validatePack(pack);if(!r.ok)throw new Error('Invalid social application pack: '+r.errors.join(', '));return pack}
export function scoreQuestion(q,choiceId){const valid=q.choices.some(c=>c.id===choiceId);return{earned:valid&&choiceId===q.answer?q.points:0,max:q.points,correct:valid&&choiceId===q.answer,valid}}
export function scorePack(pack,responses={}){const details=pack.questions.map(q=>({id:q.id,domain:q.domain,...scoreQuestion(q,responses[q.id])}));return{earned:details.reduce((s,x)=>s+x.earned,0),max:details.reduce((s,x)=>s+x.max,0),details}}
export function renderStimuliText(q){return q.stimuli.map(s=>`【${s.label}】\n${s.content}`).join('\n\n')}
function shuffle(xs,random=Math.random){const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function toLegacyQuestion(q,{random=Math.random}={}){
  const choices=shuffle(q.choices,random).map(c=>({text:c.text,ok:c.id===q.answer,reason:c.explanation,error:c.id===q.answer?null:(c.distractorType||'reasoning')}));
  return{id:'social-app:'+q.id+':'+Date.now().toString(36)+Math.random().toString(36).slice(2),reviewKey:q.id,type:'social',subject:'social',
    stem:renderStimuliText(q)+'\n\n'+q.stem,choices,answerIndex:choices.findIndex(c=>c.ok),explanation:q.explanation+'\n考え方：'+q.reasoningSteps.join(' → '),
    points:1,selectCount:1,skills:[{id:'soc.aichi.integration',role:'primary'}],expectedMs:q.metadata.expectedSeconds*1000,
    context:'aichi-social-application-v1',format:'source-integration-single-choice',source:{area:q.domain,difficulty:q.metadata.expectedCorrectRate<=.35?9:q.metadata.expectedCorrectRate<=.45?8:7,meta:{origin:'user-report-blueprint-original-stimuli',nonOfficial:true,sourceBasis:q.metadata.sourceBasis}},nonOfficial:true};
}
