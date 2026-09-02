// Aichi-style Japanese: pure validation, mark-unit scoring and study selection.
export const VERSION = '1.0.0';
export const PROFILE = Object.freeze({
  id: 'aichi_public_hs_japanese_current', version: VERSION, totalPoints: 22,
  majorCount: 4, modernTotal: 15, vocabularyTotal: 3, classicalTotal: 4,
  pointPairs: [[7, 8], [8, 7], [9, 6]], markSheetOnly: true,
  formats: ['single_choice', 'multi_select', 'ordered_choice', 'multi_slot_choice'],
  difficultyAxes: ['passage_abstraction', 'passage_length', 'vocabulary_difficulty',
    'choice_length', 'distractor_similarity', 'inference_distance', 'cross_text_load',
    'multi_select_load', 'discourse_structure_load'],
  operators: ['scope_expand', 'scope_narrow', 'subject_shift', 'object_shift',
    'cause_effect_reverse', 'cause_replace', 'purpose_add', 'modality_strengthen',
    'modality_weaken', 'time_shift', 'comparison_swap', 'partial_match_false_tail',
    'connective_swap', 'evaluation_flip', 'unsupported_addition', 'polarity_trap',
    'order_near_miss', 'multi_select_decoy', 'lexical_confusion']
});
export const OPERATOR_LABELS = Object.freeze({scope_expand:'一部を全体に広げた',scope_narrow:'範囲を狭めた',subject_shift:'主語の取り違え',object_shift:'対象の取り違え',cause_effect_reverse:'原因と結果の逆転',cause_replace:'理由の取り違え',purpose_add:'目的の付け足し',modality_strengthen:'断定・義務への強めすぎ',modality_weaken:'断定の弱めすぎ',time_shift:'時点の取り違え',comparison_swap:'本文と参考文の混同',partial_match_false_tail:'前半一致・後半のずれ',connective_swap:'接続関係の取り違え',evaluation_flip:'評価の逆転',unsupported_addition:'本文にない情報',polarity_trap:'設問条件の取り違え',order_near_miss:'順序・つながり',multi_select_decoy:'複数選択の照合不足',lexical_confusion:'語の意味・使い分け'});
const array = Array.isArray;
const text = x => typeof x === 'string' && x.trim().length > 0;
const unique = xs => new Set(xs).size === xs.length;
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function validatePack(pack) {
  const errors = [], add = (test, message) => { if (!test) errors.push(message); };
  if (!pack || typeof pack !== 'object') return {ok:false, errors:['pack']};
  add(pack.schemaVersion === 1 && text(pack.id) && text(pack.title), 'pack_identity');
  add(pack.profileId === PROFILE.id && pack.nonOfficial === true, 'profile');
  add(['editorial-evidence-check','independent-blind-answer-check'].includes(pack.quality?.method), 'quality_method');
  const passages = array(pack.passages) ? pack.passages : [];
  add(passages.length >= 3 && unique(passages.map(p => p.id)), 'passages');
  for (const p of passages) {
    add(text(p.id) && text(p.title) && array(p.paragraphs) && p.paragraphs.every(text), 'passage:' + p.id);
    add(['original','licensed','public-domain'].includes(p.rights?.kind) && text(p.rights?.label), 'rights:' + p.id);
    if (p.rights?.kind !== 'original') add(text(p.rights?.url) && text(p.rights?.permission), 'permission:' + p.id);
  }
  const qs = array(pack.questions) ? pack.questions : [];
  add(qs.length >= 15 && qs.length <= 24 && unique(qs.map(q => q.id)), 'question_ids_count');
  const totals = [0,0,0,0];
  for (const q of qs) {
    const id = q.id || '?', choices = array(q.choices) ? q.choices : [], ids = choices.map(c => c.id);
    add(text(q.id) && text(q.stem) && text(q.skill) && text(q.explanation), 'question:' + id);
    add([1,2,3,4].includes(q.major), 'major:' + id);
    add(q.domain === ['', 'modern_logical','kanji_vocabulary','literary_or_essay_reading','classical'][q.major], 'domain:' + id);
    add(text(q.displayNumber), 'display_number:' + id);
    add(Number.isInteger(q.points) && q.points >= 1 && q.points <= 3, 'points:' + id);
    if ([1,2,3,4].includes(q.major)) totals[q.major-1] += q.points;
    add(PROFILE.formats.includes(q.format), 'format:' + id);
    add(choices.length >= 4 && choices.length <= 6 && unique(ids) && ids.every(text) &&
      choices.every(c => text(c.text) && text(c.explanation)) && unique(choices.map(c => c.text.trim())), 'choices:' + id);
    const structured = ['ordered_choice','multi_slot_choice'].includes(q.format);
    if (structured) {
      add(array(q.answers), 'structured_answers:' + id);
      const marks = array(q.marks) ? q.marks : [];
      add(marks.length >= 2 && marks.length <= 6 && unique(marks.map(m => m.id)) &&
        marks.every(m => text(m.id) && text(m.label) && ids.includes(m.answer)), 'marks:' + id);
      if (q.format === 'ordered_choice') add(marks.length === choices.length && unique(marks.map(m => m.answer)), 'order:' + id);
      add(['all_or_nothing','additive_partial','structured_partial'].includes(q.scoring?.rule), 'scoring:' + id);
      if (q.scoring?.rule === 'additive_partial') add(marks.every(m => Number.isInteger(m.points) && m.points > 0) && marks.reduce((s,m)=>s+m.points,0) === q.points, 'mark_points:' + id);
      if (q.scoring?.rule === 'structured_partial') {
        const groups = array(q.scoring.groups) ? q.scoring.groups : [];
        const used = groups.flatMap(g => g.marks || []);
        add(groups.length > 0 && unique(used) && used.length === marks.length &&
          used.every(m => marks.some(x => x.id === m)) && groups.every(g => Number.isInteger(g.points) && g.points > 0) &&
          groups.reduce((s,g)=>s+g.points,0) === q.points, 'score_groups:' + id);
      }
    } else {
      const answers = array(q.answers) ? q.answers : [];
      add(answers.length === q.requiredCount && unique(answers) && answers.every(a=>ids.includes(a)), 'answer_count:' + id);
      add(q.format === 'single_choice' ? answers.length === 1 : answers.length >= 2 && answers.length < choices.length, 'selection:' + id);
      add(['supported','not_stated'].includes(q.polarity), 'polarity:' + id);
      add(equal(choices.filter(c => c.relation === q.polarity).map(c=>c.id).sort(), [...answers].sort()), 'independent_truth:' + id);
      add(['single_point','all_or_nothing','additive_partial'].includes(q.scoring?.rule), 'scoring:' + id);
      if (q.scoring?.rule === 'single_point') add(q.points === 1 && answers.length === 1, 'single_point:' + id);
      if (q.scoring?.rule === 'additive_partial') add(Number.isInteger(q.points / answers.length), 'partial_points:' + id);
      for (const c of choices) {
        add(['supported','contradicted','not_stated'].includes(c.relation), 'relation:' + id);
        if (!answers.includes(c.id)) add(PROFILE.operators.includes(c.operator) && text(c.errorSpan) && c.text.includes(c.errorSpan), 'error_span:' + id + ':' + c.id);
      }
    }
    const ev = array(q.evidence) ? q.evidence : [];
    add(ev.length > 0, 'evidence:' + id);
    for (const e of ev) {
      const p = passages.find(x=>x.id === e.sourceId);
      add(!!p && Number.isInteger(e.paragraph) && text(e.quote) && p.paragraphs?.[e.paragraph-1]?.includes(e.quote), 'evidence_quote:' + id);
      if(q.major!==2)add(p?.role!=='answer_only','hidden_reading_evidence:'+id);
    }
    const prop = q.proposition || {};
    add(['subject','predicate','scope','causality','modality','paraphrase'].every(k=>text(prop[k])), 'proposition:' + id);
    add(PROFILE.difficultyAxes.every(k=>Number.isFinite(q.difficulty?.[k]) && q.difficulty[k]>=0 && q.difficulty[k]<=1), 'difficulty:' + id);
    if (q.skill === 'reference_comparison') add(new Set(ev.map(e=>e.sourceId)).size>=2, 'cross_text:' + id);
    if (q.skill === 'emotion_inference' || q.skill === 'emotion_change') add(ev.length>=2, 'emotion_evidence:' + id);
  }
  add(PROFILE.pointPairs.some(([a,b]) => totals[0] === a && totals[2] === b) && totals[1] === 3 && totals[3] === 4 && totals.reduce((a,b)=>a+b,0) === 22, 'point_invariants');
  add(qs.filter(q=>q.major===2).length===3 && qs.filter(q=>q.major===4).length===4, 'vocabulary_classical_count');
  add(qs.filter(q=>[1,3].includes(q.major) && q.polarity==='not_stated').length<=2, 'negative_limit');
  return {ok:errors.length===0, errors, totals};
}
export function assertPack(pack) { const r=validatePack(pack); if (!r.ok) throw new Error('Invalid Japanese pack: '+r.errors.join(', ')); return pack; }
export function scoreQuestion(q, response) {
  const ids = q.choices.map(c=>c.id), structured=['ordered_choice','multi_slot_choice'].includes(q.format);
  let valid = true, complete = false, earned = 0, matched = [];
  if (structured) {
    const r = response && typeof response === 'object' && !array(response) ? response : {};
    valid = Object.keys(r).every(k=>q.marks.some(m=>m.id===k)) && Object.values(r).every(v=>v==='' || ids.includes(v));
    const values=q.marks.map(m=>r[m.id]).filter(Boolean);
    if (q.format === 'ordered_choice' && !unique(values)) valid=false;
    complete=valid && q.marks.every(m=>ids.includes(r[m.id]));
    matched=q.marks.filter(m=>r[m.id]===m.answer).map(m=>m.id);
    if (valid) {
      if (q.scoring.rule==='all_or_nothing') earned=complete && matched.length===q.marks.length ? q.points : 0;
      if (q.scoring.rule==='additive_partial') earned=q.marks.filter(m=>matched.includes(m.id)).reduce((s,m)=>s+m.points,0);
      if (q.scoring.rule==='structured_partial') earned=q.scoring.groups.filter(g=>g.marks.every(m=>matched.includes(m))).reduce((s,g)=>s+g.points,0);
    }
  } else {
    const r=array(response) ? response : [];
    valid=unique(r) && r.length<=q.requiredCount && r.every(x=>ids.includes(x));
    complete=valid && r.length===q.requiredCount;
    matched=r.filter(x=>q.answers.includes(x));
    // An over-selected or incomplete multi-select never earns partial points.
    if (complete) earned=q.scoring.rule==='additive_partial' ? matched.length*q.points/q.requiredCount : matched.length===q.answers.length ? q.points : 0;
  }
  return {earned:valid?earned:0, max:q.points, correct:valid && earned===q.points, complete, valid, matched};
}
export function scoreExam(questions, responses={}) {
  const details=questions.map(q=>({id:q.id,major:q.major,...scoreQuestion(q,responses[q.id])}));
  return {earned:details.reduce((s,r)=>s+r.earned,0),max:details.reduce((s,r)=>s+r.max,0),details,
    majors:[1,2,3,4].map(major=>({major,earned:details.filter(r=>r.major===major).reduce((s,r)=>s+r.earned,0),max:details.filter(r=>r.major===major).reduce((s,r)=>s+r.max,0)}))};
}
export function wrongOperators(q,response) {
  if (['ordered_choice','multi_slot_choice'].includes(q.format)) return scoreQuestion(q,response).correct ? [] : ['order_near_miss'];
  return (array(response)?response:[]).filter(id=>!q.answers.includes(id)).map(id=>q.choices.find(c=>c.id===id)?.operator).filter(Boolean);
}
export function selectQuestions(pack,{mode='full',domains=[],focus=[]}={}) {
  let qs=pack.questions.filter(q=>!domains.length || domains.includes(q.domain));
  if(mode==='full') return qs;
  if(mode==='weak') return [...qs].sort((a,b)=>{
    const n=q=>q.choices.filter(c=>focus.includes(c.operator)).length;
    return n(b)-n(a) || a.major-b.major;
  }).slice(0,6);
  return qs.slice(0,6);
}
export function shuffleChoices(q,random=Math.random) {
  const choices=q.choices.map(c=>({...c}));
  for(let i=choices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  // Correct answers and mark answers are stable IDs, never display positions.
  return {...q,choices};
}
