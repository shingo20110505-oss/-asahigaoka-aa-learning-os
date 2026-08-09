(function(){
'use strict';

const DAILY_KEY='chronologia-daily-v2';
const VOICE_DB='chronologia-local-voice-v1';
const VOICE_STORE='voices';
const DEFAULT_GOAL=30;
const IDLE_MS=120000;
const HEARTBEAT_MS=15000;
const ACTIVE_GAP_MS=120000;

const VOICE_FILES=[
  'wrong_01.mp3','wrong_02.mp3','wrong_03.mp3','wrong_04.mp3','wrong_05.mp3','wrong_06.mp3','wrong_07.mp3',
  'hell_01.mp3','hard_01.mp3','hard_02.mp3','hard_03.mp3','hard_04.mp3','retry_01.mp3','retry_02.mp3',
  'success_01.mp3','careless_01.mp3','careless_02.mp3','review_01.mp3','review_02.mp3','idle_01.mp3','timer_01.mp3',
  'struggle_01.mp3','streak_01.mp3','streak_02.mp3','goal_01.mp3','start_01.mp3','rare_01.mp3','return_01.mp3','finish_01.mp3','finish_02.mp3'
];

const runtime={
  questionStartedAt:0,correctStreak:0,wrongStreak:0,lastInteractionAt:0,lastHeartbeatAt:Date.now(),idleFired:false,
  voiceLastGlobal:0,voiceLastByName:Object.create(null),voiceUrls:new Map(),activeAudio:null,firstStudyVoiceDone:false
};

function pad2(n){return String(n).padStart(2,'0')}
function dayKey(d=new Date()){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`}
function dayFromKey(k){const [y,m,d]=String(k).split('-').map(Number);return new Date(y,m-1,d,12,0,0,0)}
function shiftDay(k,delta){const d=dayFromKey(k);d.setDate(d.getDate()+delta);return dayKey(d)}
function blankDay(){return {answered:0,correct:0,wrong:0,activeMs:0,firstAt:0,lastAt:0,goalReached:false}}
function loadDaily(){
  let d={goalQuestions:DEFAULT_GOAL,history:{},voiceMode:'spicy',volume:0.82};
  try{const x=JSON.parse(localStorage.getItem(DAILY_KEY)||'{}');if(x&&typeof x==='object')d={...d,...x,history:x.history&&typeof x.history==='object'?x.history:{}}}catch(e){}
  d.goalQuestions=Math.max(5,Math.min(200,Number(d.goalQuestions)||DEFAULT_GOAL));
  d.voiceMode=['off','normal','spicy','hell'].includes(d.voiceMode)?d.voiceMode:'spicy';
  d.volume=Math.max(0,Math.min(1,Number(d.volume)||0.82));
  return d;
}
let daily=loadDaily();
function saveDaily(){try{localStorage.setItem(DAILY_KEY,JSON.stringify(daily))}catch(e){console.warn('Daily save failed',e)}}
function ensureToday(){const k=dayKey();if(!daily.history[k])daily.history[k]=blankDay();return daily.history[k]}
function studied(day){return !!day&&((day.answered||0)>0||(day.activeMs||0)>=60000)}
function lastStudyKey(beforeKey=dayKey()){return Object.keys(daily.history).filter(k=>k<beforeKey&&studied(daily.history[k])).sort().pop()||null}
function daysSincePreviousStudy(){const now=dayFromKey(dayKey()),k=lastStudyKey();if(!k)return null;return Math.round((now-dayFromKey(k))/86400000)}
function streak(){let k=dayKey(),n=0;if(!studied(daily.history[k]))k=shiftDay(k,-1);while(studied(daily.history[k])){n++;k=shiftDay(k,-1);if(n>3660)break}return n}
function yesterday(){return daily.history[shiftDay(dayKey(),-1)]||blankDay()}
function accuracy(d){return d.answered?Math.round((d.correct||0)/d.answered*100):null}

function injectUI(){
  if(document.getElementById('dailyLearningBoard'))return;
  const style=document.createElement('style');
  style.textContent=`
  .daily-board{margin:0 0 15px;padding:14px 15px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:var(--shadow-sm);backdrop-filter:blur(12px)}
  .daily-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.daily-head strong{font-size:.96rem}.daily-date{color:var(--sub);font-size:.75rem;font-weight:800}
  .daily-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.daily-cell{padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:var(--card-solid)}.daily-cell span{display:block;color:var(--sub);font-size:.7rem}.daily-cell strong{display:block;margin-top:1px;font:800 1.15rem Georgia,serif}
  .daily-goal{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:10px}.daily-goalbar{height:8px;overflow:hidden;border-radius:99px;background:var(--line)}.daily-goalbar>span{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--gold2));transition:width .25s}.daily-goaltext{color:var(--sub);font-size:.72rem;font-weight:800;white-space:nowrap}
  .daily-tools{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px}.daily-tools label{color:var(--sub);font-size:.72rem;font-weight:800}.daily-tools select,.daily-tools input[type=range]{width:auto;min-height:34px}.daily-tools .btn{min-height:34px;padding:5px 9px;font-size:.76rem}.voice-count{color:var(--sub);font-size:.7rem;font-weight:800}
  @media(max-width:620px){.daily-grid{grid-template-columns:repeat(2,1fr)}.daily-board{padding:12px}.daily-tools{align-items:flex-start}.daily-tools label{display:flex;align-items:center;gap:5px}.daily-goal{grid-template-columns:1fr}.daily-goaltext{text-align:right}}
  @media print{.daily-board{display:none!important}}`;
  document.head.append(style);
  const board=document.createElement('section');board.className='daily-board';board.id='dailyLearningBoard';board.setAttribute('aria-label','今日の学習');
  board.innerHTML=`
    <div class="daily-head"><strong>今日の学習</strong><span class="daily-date" id="dailyDateLabel"></span></div>
    <div class="daily-grid">
      <div class="daily-cell"><span>今日の解答</span><strong id="dailyAnswered">0問</strong></div>
      <div class="daily-cell"><span>今日の正答率</span><strong id="dailyAccuracy">—</strong></div>
      <div class="daily-cell"><span>実学習時間</span><strong id="dailyMinutes">0分</strong></div>
      <div class="daily-cell"><span>連続学習</span><strong id="dailyStreak">0日</strong></div>
    </div>
    <div class="daily-goal"><div class="daily-goalbar"><span id="dailyGoalFill"></span></div><div class="daily-goaltext" id="dailyGoalText">0 / 30問</div></div>
    <div class="daily-date" id="dailyYesterday" style="margin-top:6px"></div>
    <div class="daily-tools">
      <label>目標 <select id="dailyGoalSelect"><option>10</option><option>20</option><option selected>30</option><option>50</option><option>80</option></select>問</label>
      <label>相棒 <select id="voiceModeSelect"><option value="off">OFF</option><option value="normal">NORMAL</option><option value="spicy">SPICY</option><option value="hell">HELL</option></select></label>
      <label>音量 <input id="voiceVolume" type="range" min="0" max="1" step="0.05"></label>
      <button class="btn" id="voiceImportBtn" type="button">ローカルボイス登録</button>
      <button class="btn" id="voiceTestBtn" type="button">音声テスト</button>
      <span class="voice-count" id="voiceCount">登録 0 / ${VOICE_FILES.length}</span>
      <input id="voiceFilesInput" type="file" accept="audio/mpeg,audio/mp3,.mp3" multiple hidden>
    </div>`;
  const stats=document.querySelector('.stats');if(stats)stats.insertAdjacentElement('afterend',board);else document.querySelector('.app')?.prepend(board);
  document.getElementById('dailyGoalSelect').value=String(daily.goalQuestions);
  document.getElementById('voiceModeSelect').value=daily.voiceMode;
  document.getElementById('voiceVolume').value=String(daily.volume);
  document.getElementById('dailyGoalSelect').addEventListener('change',e=>{daily.goalQuestions=Number(e.target.value)||DEFAULT_GOAL;saveDaily();renderDaily()});
  document.getElementById('voiceModeSelect').addEventListener('change',e=>{daily.voiceMode=e.target.value;saveDaily()});
  document.getElementById('voiceVolume').addEventListener('input',e=>{daily.volume=Number(e.target.value);saveDaily()});
  document.getElementById('voiceImportBtn').addEventListener('click',()=>document.getElementById('voiceFilesInput').click());
  document.getElementById('voiceFilesInput').addEventListener('change',async e=>{if(e.target.files?.length)await importVoices(e.target.files);e.target.value=''});
  document.getElementById('voiceTestBtn').addEventListener('click',()=>playVoice('start_01.mp3',{force:true}));
}
function renderDaily(){
  const d=ensureToday(),a=accuracy(d),goal=daily.goalQuestions||DEFAULT_GOAL,pct=Math.min(100,(d.answered||0)/goal*100),el=id=>document.getElementById(id);
  if(!el('dailyLearningBoard'))return;
  el('dailyDateLabel').textContent=dayFromKey(dayKey()).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
  el('dailyAnswered').textContent=`${d.answered||0}問`;el('dailyAccuracy').textContent=a===null?'—':`${a}%`;el('dailyMinutes').textContent=`${Math.floor((d.activeMs||0)/60000)}分`;el('dailyStreak').textContent=`${streak()}日`;
  el('dailyGoalFill').style.width=`${pct}%`;el('dailyGoalText').textContent=`${d.answered||0} / ${goal}問${d.goalReached?' ✓':''}`;
  const y=yesterday(),ya=accuracy(y),delta=(d.answered||0)-(y.answered||0);el('dailyYesterday').textContent=`昨日：${y.answered||0}問${ya===null?'':`・正答率 ${ya}%`} ／ 今日との差 ${delta>=0?'+':''}${delta}問`;
}
function markActivity(){const now=Date.now(),d=ensureToday();runtime.lastInteractionAt=now;runtime.idleFired=false;if(!d.firstAt)d.firstAt=now;d.lastAt=now;saveDaily()}
function heartbeat(){
  const now=Date.now(),delta=Math.min(HEARTBEAT_MS*1.5,now-runtime.lastHeartbeatAt);runtime.lastHeartbeatAt=now;
  if(document.visibilityState==='visible'&&runtime.lastInteractionAt&&now-runtime.lastInteractionAt<=ACTIVE_GAP_MS){const d=ensureToday();d.activeMs=(d.activeMs||0)+delta;d.lastAt=now;saveDaily();renderDaily()}
  if(document.visibilityState==='visible'&&runtime.lastInteractionAt&&now-runtime.lastInteractionAt>=IDLE_MS&&!runtime.idleFired){runtime.idleFired=true;playVoice('idle_01.mp3')}
}
function recordDailyAnswer(correct){
  const d=ensureToday(),goal=daily.goalQuestions||DEFAULT_GOAL,before=d.answered||0;d.answered=before+1;if(correct)d.correct=(d.correct||0)+1;else d.wrong=(d.wrong||0)+1;d.lastAt=Date.now();if(!d.firstAt)d.firstAt=d.lastAt;
  const reached=!d.goalReached&&before<goal&&d.answered>=goal;if(reached)d.goalReached=true;saveDaily();renderDaily();if(reached)playVoice('goal_01.mp3',{priority:true});
}

function openVoiceDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(VOICE_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(VOICE_STORE))db.createObjectStore(VOICE_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function importVoices(fileList){
  const db=await openVoiceDB();let n=0;
  await Promise.all([...fileList].map(file=>new Promise((resolve,reject)=>{const name=file.name.toLowerCase();if(!VOICE_FILES.includes(name)){resolve();return}const tx=db.transaction(VOICE_STORE,'readwrite');tx.objectStore(VOICE_STORE).put(file,name);tx.oncomplete=()=>{n++;resolve()};tx.onerror=()=>reject(tx.error)})));
  db.close();await refreshVoiceCache();if(typeof toast==='function')toast(`${n}個のローカルボイスを登録しました`);
}
async function refreshVoiceCache(){
  for(const url of runtime.voiceUrls.values())URL.revokeObjectURL(url);runtime.voiceUrls.clear();
  try{const db=await openVoiceDB();await Promise.all(VOICE_FILES.map(name=>new Promise(resolve=>{const tx=db.transaction(VOICE_STORE,'readonly'),r=tx.objectStore(VOICE_STORE).get(name);r.onsuccess=()=>{if(r.result)runtime.voiceUrls.set(name,URL.createObjectURL(r.result));resolve()};r.onerror=()=>resolve()})));db.close()}catch(e){console.warn('voice cache',e)}
  const el=document.getElementById('voiceCount');if(el)el.textContent=`登録 ${runtime.voiceUrls.size} / ${VOICE_FILES.length}`;
}
function modeAllows(name){
  if(daily.voiceMode==='off')return false;if(name.startsWith('hell_')||name.startsWith('rare_'))return daily.voiceMode==='hell';
  const spicy=['wrong_02','wrong_03','wrong_04','wrong_05','wrong_06','wrong_07','careless_','review_01','idle_','timer_','struggle_','success_','return_'];if(spicy.some(p=>name.startsWith(p)))return daily.voiceMode==='spicy'||daily.voiceMode==='hell';return true;
}
function playVoice(name,opt={}){
  if(!opt.force&&!modeAllows(name))return false;
  try{document.dispatchEvent(new CustomEvent('chronologia:voice',{detail:{name}}))}catch(e){}if(!runtime.voiceUrls.has(name))return false;const now=Date.now();if(!opt.force){if(now-runtime.voiceLastGlobal<(opt.priority?5000:18000))return false;if(now-(runtime.voiceLastByName[name]||0)<180000)return false}
  try{if(runtime.activeAudio){runtime.activeAudio.pause();runtime.activeAudio=null}const a=new Audio(runtime.voiceUrls.get(name));a.volume=daily.volume;a.preload='auto';runtime.activeAudio=a;runtime.voiceLastGlobal=now;runtime.voiceLastByName[name]=now;a.onended=()=>{if(runtime.activeAudio===a)runtime.activeAudio=null};a.play().catch(()=>{});return true}catch(e){return false}
}
function firstStudyVoice(){if(runtime.firstStudyVoiceDone)return;runtime.firstStudyVoiceDone=true;const gap=daysSincePreviousStudy();if(gap!==null&&gap>=5)playVoice('return_01.mp3',{priority:true});else playVoice('start_01.mp3',{priority:true})}

function hookLearning(){
  if(typeof recordAnswer==='function'){const baseRecord=recordAnswer;recordAnswer=function(id,correct){const r=baseRecord(id,correct);recordDailyAnswer(!!correct);return r}}
  if(typeof showQuiz==='function'){const baseShowQuiz=showQuiz;showQuiz=function(){const r=baseShowQuiz();runtime.questionStartedAt=performance.now();const q=state.quiz,item=q?.items?.[q.index];if(item&&item.level==='S'&&Math.random()<0.055){const p=state.progress?.[item.id];playVoice((p?.wrong||0)>0?'hard_02.mp3':'hard_01.mp3')}return r}}
  if(typeof startQuiz==='function'){const baseStartQuiz=startQuiz;startQuiz=function(){markActivity();firstStudyVoice();return baseStartQuiz.apply(this,arguments)}}
  if(typeof finishAnswer==='function'){
    const baseFinish=finishAnswer;finishAnswer=function(item,correct){
      const before=state.progress?.[item.id]?{...state.progress[item.id]}:{seen:0,correct:0,wrong:0,stage:0};const elapsed=runtime.questionStartedAt?performance.now()-runtime.questionStartedAt:999999;const r=baseFinish(item,correct);markActivity();
      if(correct){runtime.correctStreak++;runtime.wrongStreak=0;if((before.wrong||0)>=3)playVoice('success_01.mp3',{priority:true});else if(runtime.correctStreak%10===0)playVoice('streak_02.mp3',{priority:true});else if(runtime.correctStreak%5===0)playVoice('streak_01.mp3',{priority:true})}
      else{runtime.wrongStreak++;runtime.correctStreak=0;if(elapsed<1200){if(daily.voiceMode==='hell'&&Math.random()<0.22)playVoice('hell_01.mp3',{priority:true});else playVoice('careless_02.mp3',{priority:true})}else if((before.correct||0)>0)playVoice('review_01.mp3',{priority:true});else if((before.wrong||0)>=2)playVoice('wrong_03.mp3',{priority:true});else if((before.wrong||0)>=1)playVoice('review_02.mp3',{priority:true});else if(runtime.wrongStreak>=2)playVoice('wrong_02.mp3',{priority:true});else if(Math.random()<0.22)playVoice('wrong_01.mp3');if(daily.voiceMode==='hell'&&Math.random()<0.008)playVoice('rare_01.mp3',{priority:true})}
      return r;
    }
  }
  if(typeof showQuizResult==='function'){const baseResult=showQuizResult;showQuizResult=function(){const r=baseResult(),d=ensureToday();setTimeout(()=>playVoice(d.goalReached?'finish_01.mp3':'finish_02.mp3',{priority:true}),200);return r}}
}
function compareYesterday(){const t=ensureToday(),y=yesterday();return {today:t,yesterday:y,answeredDelta:(t.answered||0)-(y.answered||0),accuracyToday:accuracy(t),accuracyYesterday:accuracy(y)}}
window.ChronologiaDaily={dayKey,ensureToday,streak,daysSincePreviousStudy,compareYesterday,playVoice,refreshVoiceCache,voiceFiles:[...VOICE_FILES]};
function initDaily(){injectUI();ensureToday();renderDaily();refreshVoiceCache();hookLearning();['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,markActivity,{passive:true}));document.addEventListener('visibilitychange',()=>{runtime.lastHeartbeatAt=Date.now();if(document.visibilityState==='visible'){ensureToday();renderDaily()}});setInterval(heartbeat,HEARTBEAT_MS);setInterval(()=>{ensureToday();renderDaily()},60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDaily,{once:true});else initDaily();
})();
