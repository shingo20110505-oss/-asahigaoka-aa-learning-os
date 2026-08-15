(()=>{'use strict';
if(window.__AA_QUIZ_INTEGRITY_FIX_V1__)return;
window.__AA_QUIZ_INTEGRITY_FIX_V1__={version:'1.0.0-20260815'};

const localNow=()=>typeof now==='function'?now():Date.now();
const localUid=(p='q')=>typeof uid==='function'?uid(p):p+'_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
const sh=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const yr=x=>{if(Number.isFinite(Number(x?.year)))return Number(x.year);const s=String(x?.year??'');const m=s.match(/(\d+)/);if(!m)return Number.POSITIVE_INFINITY;return /紀元前/.test(s)?-Number(m[1]):Number(m[1])};
const history=()=>Array.isArray(DATA?.history)?[...DATA.history].sort((a,b)=>yr(a)-yr(b)||String(a.id).localeCompare(String(b.id))):[];
const unique=(rows,key,omit)=>{const out=[],seen=new Set([String(omit??'')]);for(const x of rows){const v=String(key(x));if(!v||seen.has(v))continue;seen.add(v);out.push(x);if(out.length===3)break}return out};
const choiceShuffle=rows=>typeof shuffleChoices==='function'?shuffleChoices(rows):sh(rows);
const permuteWrong=(letters,correct)=>{const set=new Set();for(let i=0;i<40&&set.size<3;i++){const p=sh(letters).join('→');if(p!==correct)set.add(p)}return [...set]};

function nearby(event,key){
 const all=history().filter(x=>x.id!==event.id&&String(key(x))!==String(key(event)));
 return unique(all.sort((a,b)=>Math.abs(yr(a)-yr(event))-Math.abs(yr(b)-yr(event))||Math.random()-.5),key,key(event));
}
function distinctYearSequence(event){
 const all=history(),targetYear=yr(event),byYear=new Map();
 for(const x of all){const y=yr(x);if(Number.isFinite(y)&&!byYear.has(y))byYear.set(y,x)}
 if(Number.isFinite(targetYear))byYear.set(targetYear,event);
 const rows=[...byYear.values()].sort((a,b)=>yr(a)-yr(b));
 if(rows.length<=4)return rows;
 const i=Math.max(0,rows.findIndex(x=>x.id===event.id));
 const start=Math.max(0,Math.min(rows.length-4,i-1));
 return rows.slice(start,start+4);
}
function historyQuestion(event,format){
 const sorted=history(),y=yr(event),previous=[...sorted].reverse().find(x=>yr(x)<y),next=sorted.find(x=>yr(x)>y);
 let stem,choices,skill='soc.history.chronology';
 if(format==='event'){
  const others=nearby(event,x=>x.event);
  stem=`${event.year}年の出来事を、答えを見る前に思い出してから選びなさい。`;
  choices=choiceShuffle([{text:event.event,ok:true,reason:`${event.year}年：${event.event}`},...others.map(x=>({text:x.event,ok:false,reason:`これは${x.year}年の出来事です。`,error:'chronology',distractorType:'chronology'}))]);
 }else if(format==='cause'){
  skill='soc.history.network';
  const others=nearby(event,x=>x.note);
  const relation=[previous?.event,event.event,next?.event].filter(Boolean).join(' → ');
  stem=`「${event.event}」と最も深く結びつく背景・結果・学習ポイントを選びなさい。`;
  choices=choiceShuffle([{text:event.note,ok:true,reason:relation?`年代順の代表項目：${relation}`:`${event.year}年：${event.event}`},...others.map(x=>({text:x.note,ok:false,reason:`これは主に「${x.event}」に結びつく説明です。`,error:'causal_mismatch',distractorType:'causal_mismatch'}))]);
 }else if(format==='order'){
  const sequence=distinctYearSequence(event);
  if(sequence.length<4)return historyQuestion(event,'year');
  const shown=sh(sequence),letters=shown.map((_,i)=>String.fromCharCode(65+i));
  const correct=sequence.map(x=>String.fromCharCode(65+shown.findIndex(y=>y.id===x.id))).join('→');
  stem=`次の出来事を古い順に並べなさい。\n${shown.map((x,i)=>`${String.fromCharCode(65+i)} ${x.event}`).join('\n')}`;
  const wrongs=permuteWrong(letters,correct);
  choices=choiceShuffle([{text:correct,ok:true,reason:sequence.map(x=>`${x.year} ${x.event}`).join(' → ')},...wrongs.map(text=>({text,ok:false,reason:'年代の異なる4項目の前後関係を取り違えています。',error:'chronology_order',distractorType:'chronology_order'}))]);
 }else{
  const others=nearby(event,x=>x.year);
  stem=`「${event.event}」の年を、答えを見る前に思い出してから選びなさい。`;
  choices=choiceShuffle([{text:String(event.year),ok:true,reason:`${event.year}年：${event.event}`},...others.map(x=>({text:String(x.year),ok:false,reason:`${x.year}年は「${x.event}」です。`,error:'year_confusion',distractorType:'year_confusion'}))]);
 }
 const answerIndex=choices.findIndex(c=>c.ok);
 return{id:`chronologia:${event.id}:${format}:${localUid('q')}`,type:'social',stem,choices,answerIndex,explanation:choices[answerIndex]?.reason||'',skills:[{id:skill,role:'primary'},{id:'soc.history.causality',role:'secondary'}],expectedMs:format==='order'?70000:40000,context:'chronologia-'+format,srsId:'history:'+event.id,reviewKey:'history:'+event.id,format:'history-'+format,source:event};
}
function historyQueue(count=8){
 const rows=history().map(x=>{let score=0;try{score=typeof dueScore==='function'&&typeof itemState==='function'?dueScore(itemState('history:'+x.id)):0}catch(_){}return{x,score:score+Math.random()*.001}}).sort((a,b)=>b.score-a.score);
 const pool=rows.slice(0,Math.min(32,rows.length)),picked=[];
 while(pool.length&&picked.length<count)picked.push(pool.splice(Math.floor(Math.random()*Math.min(8,pool.length)),1)[0].x);
 const formats=['year','event','cause','order'];
 return picked.map((x,i)=>historyQuestion(x,formats[i%formats.length]));
}
function startHistoryRecall(){
 const queue=historyQueue(8);if(queue.length!==8||queue.some(q=>q.choices.length!==4||q.choices.filter(c=>c.ok).length!==1||new Set(q.choices.map(c=>c.text)).size!==4))return false;
 state.session={id:localUid('chronologia'),active:true,mode:'retrieval-spacing',kind:'chronologia',subject:'social',queue,index:0,subIndex:0,answers:{},feedback:null,startedAt:localNow(),accumulatedMs:0,lastActiveAt:localNow(),itemStartedAt:localNow(),scrollY:0,minimumDone:false,clockPaused:false,pausedAt:null};
 state.stats.sessions++;state.route='study';save();render();window.scrollTo(0,0);if(typeof startTicker==='function')startTicker();return true;
}

function classicalConfig(){
 try{const c=state?.ui?.practiceConfig;if(c?.subject!=='japanese')return null;const units=Array.isArray(c.unitsBySubject?.japanese)?c.unitsBySubject.japanese:[];return units.length===1&&units[0]==='classical'?c:null}catch(_){return null}
}
function validSingleChoice(q){return q&&Array.isArray(q.choices)&&q.choices.length===4&&q.choices.filter(c=>c.ok).length===1&&new Set(q.choices.map(c=>String(c.text))).size===4&&!q.answerIndices}
function classicalQueue(config){
 const v2=window.AA_V2_TEST_API,v22=window.AA_V22_TEST_API;if(!v2?.banks?.japanese||!v2.makeQuestion||!v2.startPractice)return[];
 const difficulty=Math.max(1,Math.min(11,Math.round(Number(state.ui.subjectDifficulty)||7))),level=difficulty<=4?1:difficulty<=8?2:3,cap=level===1?7:level===2?9:11;
 const target=config.length==='micro'?3:config.length==='deep'?15:8,out=[],used=new Set();
 if(v22?.japaneseExam){for(const q0 of v22.japaneseExam(level).filter(q=>(q.examUnit||q.source?.area)==='classical'&&!q.answerIndices)){
   const q={...q0,choices:q0.choices.map(c=>({...c})),testMode:false,points:1,examUnit:'classical',context:'unit-practice-japanese-classical'};
   const key=String(q.reviewKey||q.code||q.id);if(validSingleChoice(q)&&!used.has(key)){used.add(key);out.push(q)}
  }}
 const rows=v2.banks.japanese.filter(r=>r.area==='classical'&&Number(r.difficulty||5)<=cap).sort((a,b)=>{
   let pa=0,pb=0;try{pa=typeof recentCorrectPenaltyForKey==='function'?recentCorrectPenaltyForKey('v2:japanese:'+a.id):0;pb=typeof recentCorrectPenaltyForKey==='function'?recentCorrectPenaltyForKey('v2:japanese:'+b.id):0}catch(_){}return pa-pb||Math.abs((a.difficulty||5)-difficulty)-Math.abs((b.difficulty||5)-difficulty)||Math.random()-.5;
  });
 for(const row of rows){if(out.length>=target)break;const key='v2:japanese:'+row.id;if(used.has(key))continue;const q=v2.makeQuestion(row,false);q.testMode=false;q.points=1;q.examUnit='classical';q.context='unit-practice-japanese-classical';q.reviewKey=q.reviewKey||key;if(validSingleChoice(q)){used.add(key);out.push(q)}}
 return out.slice(0,target);
}
function startClassicalPractice(){
 const config=classicalConfig();if(!config)return false;const queue=classicalQueue(config),target=config.length==='micro'?3:config.length==='deep'?15:8;if(queue.length!==target)return false;
 const difficulty=Math.max(1,Math.min(11,Math.round(Number(state.ui.subjectDifficulty)||7))),level=difficulty<=4?1:difficulty<=8?2:3;
 window.AA_V2_TEST_API.startPractice('japanese',config.length,level,queue);
 state.session.kind='unitPractice';state.session.practiceConfig={subject:'japanese',length:config.length,units:['classical'],level,difficulty};state.session.practiceUnits=['classical'];save();render();return true;
}

function intercept(e){
 const el=e.target?.closest?.('[data-action]');if(!el)return;
 if(el.dataset.action==='start-timeline-recall'){
  try{if(startHistoryRecall()){e.preventDefault();e.stopImmediatePropagation()}}catch(err){console.error('[quiz-integrity] history',err)}
  return;
 }
 if(el.dataset.action==='start-unit-practice'&&classicalConfig()){
  try{if(startClassicalPractice()){e.preventDefault();e.stopImmediatePropagation()}}catch(err){console.error('[quiz-integrity] classical',err)}
 }
}
document.addEventListener('click',intercept,true);
window.AA_QUIZ_INTEGRITY_FIX={version:'1.0.0-20260815',historyQueue,classicalQueue,startHistoryRecall,startClassicalPractice};
})();
