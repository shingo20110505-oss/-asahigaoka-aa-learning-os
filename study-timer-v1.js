(()=>{'use strict';
if(window.__AA_STUDY_TIMER_V1__)return;
window.__AA_STUDY_TIMER_V1__={version:'1.0.0'};

const KEY='aa_study_timer_v1';
const SUBJECTS={english:'英語',japanese:'国語',math:'数学',science:'理科',social:'社会',other:'その他'};
const PRESETS=[
 {id:'review',label:'15分 復習',focus:15,rest:3,long:10},
 {id:'focus',label:'25分 集中',focus:25,rest:5,long:15},
 {id:'deep',label:'50分 深掘り',focus:50,rest:10,long:20},
 {id:'exam',label:'90分 演習',focus:90,rest:15,long:25}
];
const DEFAULT={
 version:1,phase:'focus',status:'idle',subject:'english',task:'',
 focusMin:25,breakMin:5,longBreakMin:15,autoBreak:true,
 remainingSec:25*60,endAt:null,startedAt:null,blockStartedAt:null,
 focusSetCount:0,logs:[]
};
let st=load();
let tickId=null,wakeLock=null,audioCtx=null,baseTitle=document.title;

function clamp(n,a,b){n=Number(n);return Number.isFinite(n)?Math.max(a,Math.min(b,n)):a}
function now(){return Date.now()}
function dayKey(ts=now()){const d=new Date(ts);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function secondsFor(s,phase){if(phase==='focus')return Math.round(clamp(s.focusMin,1,180)*60);if(phase==='longBreak')return Math.round(clamp(s.longBreakMin,1,60)*60);return Math.round(clamp(s.breakMin,1,60)*60)}
function phaseSeconds(phase=st.phase){return secondsFor(st,phase)}
function safeState(x){
 const s=Object.assign({},DEFAULT,x&&typeof x==='object'?x:{});
 s.focusMin=clamp(s.focusMin,1,180);s.breakMin=clamp(s.breakMin,1,60);s.longBreakMin=clamp(s.longBreakMin,1,60);
 s.phase=['focus','break','longBreak'].includes(s.phase)?s.phase:'focus';
 s.status=['idle','running','paused'].includes(s.status)?s.status:'idle';
 s.subject=SUBJECTS[s.subject]?s.subject:'other';s.task=String(s.task||'').slice(0,120);
 s.focusSetCount=Math.max(0,Math.floor(Number(s.focusSetCount)||0));
 s.logs=Array.isArray(s.logs)?s.logs.filter(x=>x&&Number.isFinite(Number(x.endedAt))).slice(-365):[];
 s.remainingSec=Math.max(0,Math.round(Number(s.remainingSec)||secondsFor(s,s.phase)));
 s.endAt=Number.isFinite(Number(s.endAt))?Number(s.endAt):null;
 s.startedAt=Number.isFinite(Number(s.startedAt))?Number(s.startedAt):null;
 s.blockStartedAt=Number.isFinite(Number(s.blockStartedAt))?Number(s.blockStartedAt):null;
 s.autoBreak=s.autoBreak!==false;
 return s;
}
function load(){try{return safeState(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){return {...DEFAULT}}}
function save(){try{st.logs=st.logs.slice(-365);localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function phaseLabel(){return st.phase==='focus'?'集中':st.phase==='longBreak'?'長休憩':'休憩'}
function currentRemaining(){return st.status==='running'&&st.endAt?Math.max(0,Math.ceil((st.endAt-now())/1000)):Math.max(0,st.remainingSec)}
function setRemaining(sec){st.remainingSec=Math.max(0,Math.round(sec));if(st.status==='running')st.endAt=now()+st.remainingSec*1000}
function todayLogs(){const k=dayKey();return st.logs.filter(x=>dayKey(x.endedAt)===k)}
function todaySeconds(){return todayLogs().reduce((a,x)=>a+(Number(x.seconds)||0),0)}
function weeklySeconds(){
 const cutoff=now()-6*86400000,start=new Date(cutoff);start.setHours(0,0,0,0);
 return st.logs.filter(x=>x.endedAt>=start.getTime()).reduce((a,x)=>a+(Number(x.seconds)||0),0);
}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function cue(){
 try{navigator.vibrate?.([100,70,100])}catch(_){}
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume?.();
  const t=audioCtx.currentTime+.01,g=audioCtx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.32);g.connect(audioCtx.destination);
  [659.25,783.99].forEach((f,i)=>{const o=audioCtx.createOscillator();o.frequency.value=f;o.type='sine';o.connect(g);o.start(t+i*.10);o.stop(t+.22+i*.10)});
 }catch(_){}
}
async function requestWakeLock(){
 if(st.status!=='running'||document.hidden||!('wakeLock' in navigator))return;
 try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null})}catch(_){}
}
function releaseWakeLock(){try{wakeLock?.release?.()}catch(_){}wakeLock=null}
function recordFocus(seconds,completed){
 const sec=Math.max(0,Math.round(seconds));
 if(sec<60)return;
 st.logs.push({endedAt:now(),subject:st.subject,task:st.task,seconds:sec,plannedSeconds:Math.round(st.focusMin*60),completed:!!completed});
 st.logs=st.logs.slice(-365);
 try{document.dispatchEvent(new CustomEvent('aa:studyTimerComplete',{detail:{seconds:sec,subject:st.subject,task:st.task,completed:!!completed}}))}catch(_){}
}
function finishPhase(){
 if(st.phase==='focus'){
  const planned=Math.round(st.focusMin*60);
  recordFocus(planned,true);st.focusSetCount++;
  const long=st.focusSetCount%4===0;
  st.phase=long?'longBreak':'break';st.remainingSec=phaseSeconds(st.phase);st.startedAt=null;st.blockStartedAt=null;
  if(st.autoBreak){st.status='running';st.endAt=now()+st.remainingSec*1000;requestWakeLock()}else{st.status='idle';st.endAt=null;releaseWakeLock()}
 }else{
  st.phase='focus';st.status='idle';st.remainingSec=phaseSeconds('focus');st.endAt=null;st.startedAt=null;st.blockStartedAt=null;releaseWakeLock();
 }
 save();cue();renderPanel();updateFab();updateTitle();
}
function reconcile(){
 if(st.status!=='running'||!st.endAt)return;
 if(st.endAt<=now()){st.remainingSec=0;finishPhase()}
 else st.remainingSec=currentRemaining();
}
function start(){
 if(st.status==='running')return;
 if(st.remainingSec<=0)st.remainingSec=phaseSeconds();
 st.status='running';st.endAt=now()+st.remainingSec*1000;
 st.startedAt=st.startedAt||now();st.blockStartedAt=st.blockStartedAt||now();
 save();startTicker();requestWakeLock();renderPanel();updateFab();updateTitle();
}
function pause(){
 if(st.status!=='running')return;
 st.remainingSec=currentRemaining();st.status='paused';st.endAt=null;save();releaseWakeLock();renderPanel();updateFab();updateTitle();
}
function resetPhase(){
 st.status='idle';st.endAt=null;st.startedAt=null;st.blockStartedAt=null;st.remainingSec=phaseSeconds();save();releaseWakeLock();renderPanel();updateFab();updateTitle();
}
function finishEarly(){
 if(st.phase!=='focus'){skipBreak();return}
 const planned=Math.round(st.focusMin*60),elapsed=Math.max(0,planned-currentRemaining());
 recordFocus(elapsed,false);st.focusSetCount++;
 const long=st.focusSetCount%4===0;st.phase=long?'longBreak':'break';st.status='idle';st.endAt=null;st.startedAt=null;st.blockStartedAt=null;st.remainingSec=phaseSeconds(st.phase);
 save();releaseWakeLock();cue();renderPanel();updateFab();updateTitle();
}
function skipBreak(){
 st.phase='focus';st.status='idle';st.endAt=null;st.startedAt=null;st.blockStartedAt=null;st.remainingSec=phaseSeconds('focus');save();releaseWakeLock();renderPanel();updateFab();updateTitle();
}
function applyPreset(id){
 const p=PRESETS.find(x=>x.id===id);if(!p)return;
 st.focusMin=p.focus;st.breakMin=p.rest;st.longBreakMin=p.long;
 if(st.status!=='running'){st.phase='focus';st.status='idle';st.remainingSec=phaseSeconds('focus');st.endAt=null;st.startedAt=null;st.blockStartedAt=null}
 save();renderPanel();updateFab();
}
function updateSettingsFromUI(){
 const subject=document.getElementById('aaTimerSubject'),task=document.getElementById('aaTimerTask'),focus=document.getElementById('aaTimerFocus'),rest=document.getElementById('aaTimerBreak'),long=document.getElementById('aaTimerLongBreak'),auto=document.getElementById('aaTimerAutoBreak');
 if(subject)st.subject=SUBJECTS[subject.value]?subject.value:'other';if(task)st.task=task.value.slice(0,120);
 if(focus)st.focusMin=clamp(focus.value,1,180);if(rest)st.breakMin=clamp(rest.value,1,60);if(long)st.longBreakMin=clamp(long.value,1,60);if(auto)st.autoBreak=!!auto.checked;
 if(st.status==='idle')st.remainingSec=phaseSeconds();save();updateFab();
}
function injectStyle(){
 if(document.getElementById('aa-study-timer-style'))return;
 const s=document.createElement('style');s.id='aa-study-timer-style';s.textContent=`
 #aaStudyTimerFab{position:fixed;left:12px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:65;border:0;border-radius:999px;padding:10px 13px;min-height:42px;background:#172033;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.22);font:900 12px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI","Yu Gothic",sans-serif;letter-spacing:.01em}
 #aaStudyTimerFab[data-running="1"]{background:#2458d3}
 #aaStudyTimerOverlay{position:fixed;inset:0;z-index:90;background:rgba(5,10,20,.58);display:none;align-items:flex-end;justify-content:center;padding:14px}
 #aaStudyTimerOverlay.open{display:flex}
 #aaStudyTimerPanel{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#172033);border:1px solid var(--line,#d9e0ea);border-radius:24px 24px 16px 16px;box-shadow:0 -22px 70px rgba(0,0,0,.28);padding:18px;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI","Yu Gothic",sans-serif}
 .aaTimerTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aaTimerTop h2{margin:2px 0 0;font-size:20px}.aaTimerClose{border:1px solid var(--line,#d9e0ea);background:transparent;color:inherit;border-radius:10px;min-width:40px;min-height:40px;font-weight:900}
 .aaTimerEyebrow{font-size:10px;font-weight:900;letter-spacing:.13em;color:var(--blue,#2458d3)}.aaTimerClock{text-align:center;font-size:64px;font-weight:950;letter-spacing:-.035em;line-height:1;margin:18px 0 8px;font-variant-numeric:tabular-nums}
 .aaTimerPhase{text-align:center;font-size:13px;font-weight:900}.aaTimerHint{text-align:center;color:var(--sub,#667085);font-size:11px;line-height:1.55;margin:5px auto 15px;max-width:520px}
 .aaTimerProgress{height:8px;background:var(--line,#d9e0ea);border-radius:999px;overflow:hidden}.aaTimerProgress i{display:block;height:100%;background:linear-gradient(90deg,var(--blue,#2458d3),var(--green,#177a4b));border-radius:999px}
 .aaTimerPresets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:14px 0}.aaTimerPresets button,.aaTimerBtns button{border:1px solid var(--line,#d9e0ea);background:var(--card,#fff);color:var(--ink,#172033);border-radius:11px;min-height:44px;padding:8px;font-weight:900;font-size:12px}
 .aaTimerPresets button:disabled{opacity:.45}.aaTimerBtns{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin:12px 0}.aaTimerBtns .primary{background:var(--navy,#101828);color:#fff;border-color:transparent}.aaTimerBtns .finish{background:var(--blue2,#eaf0ff);color:var(--blue,#2458d3)}
 .aaTimerGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.aaTimerField{margin:8px 0}.aaTimerField label{display:block;font-size:11px;font-weight:900;margin-bottom:5px}.aaTimerField input,.aaTimerField select{width:100%;border:1px solid var(--line,#d9e0ea);border-radius:11px;padding:10px;background:var(--card,#fff);color:var(--ink,#172033);font:inherit}
 .aaTimerMiniGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.aaTimerStat{border:1px solid var(--line,#d9e0ea);border-radius:13px;padding:10px;text-align:center;background:color-mix(in srgb,var(--card,#fff) 92%,var(--blue2,#eaf0ff))}.aaTimerStat b{display:block;font-size:20px}.aaTimerStat span{font-size:10px;color:var(--sub,#667085)}
 .aaTimerSwitch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0;padding:9px 0;border-top:1px solid var(--line,#d9e0ea);border-bottom:1px solid var(--line,#d9e0ea);font-size:12px;font-weight:800}.aaTimerSwitch input{width:20px;height:20px}
 .aaTimerLog{margin-top:12px}.aaTimerLog h3{font-size:14px;margin:0 0 7px}.aaTimerLogRow{display:grid;grid-template-columns:58px 52px 1fr auto;gap:7px;align-items:center;padding:8px 0;border-top:1px solid var(--line,#d9e0ea);font-size:11px}.aaTimerLogRow small{color:var(--sub,#667085);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aaTimerMuted{color:var(--sub,#667085);font-size:11px;line-height:1.55}
 @media(min-width:760px){#aaStudyTimerOverlay{align-items:center}#aaStudyTimerPanel{border-radius:24px}}
 @media(max-width:520px){.aaTimerClock{font-size:56px}.aaTimerPresets{grid-template-columns:1fr 1fr}.aaTimerGrid{grid-template-columns:1fr}.aaTimerBtns{grid-template-columns:1fr 1fr}.aaTimerBtns .primary{grid-column:1/-1}.aaTimerLogRow{grid-template-columns:52px 45px 1fr}}
 `;
 document.head.appendChild(s);
}
function panelHTML(){
 const rem=currentRemaining(),total=phaseSeconds(),progress=total?Math.max(0,Math.min(100,100*(1-rem/total))):0,today=todayLogs(),mins=Math.round(todaySeconds()/60),week=Math.round(weeklySeconds()/60);
 const hint=st.phase==='focus'?'始める前に「この時間で何を終えるか」を1つだけ決めます。':st.phase==='longBreak'?'4セット完了。長めに休んで次の集中を守ります。':'答え合わせを続けず、立つ・水分・目を休める時間にします。';
 const logs=today.slice(-5).reverse();
 return `<div class="aaTimerTop"><div><div class="aaTimerEyebrow">STUDY FOCUS TIMER</div><h2>集中を「時間」ではなく記録に残す</h2></div><button class="aaTimerClose" data-aa-timer="close" aria-label="閉じる">×</button></div>
 <div id="aaTimerClock" class="aaTimerClock">${fmt(rem)}</div><div class="aaTimerPhase">${phaseLabel()}｜${st.status==='running'?'進行中':st.status==='paused'?'一時停止':'準備中'}｜集中セット ${st.focusSetCount%4+1}/4</div><div class="aaTimerHint">${hint}</div>
 <div class="aaTimerProgress"><i id="aaTimerProgressBar" style="width:${progress}%"></i></div>
 <div class="aaTimerPresets">${PRESETS.map(p=>`<button data-aa-timer="preset" data-preset="${p.id}" ${st.status==='running'?'disabled':''}>${p.label}</button>`).join('')}</div>
 <div class="aaTimerGrid"><div class="aaTimerField"><label for="aaTimerSubject">教科</label><select id="aaTimerSubject" ${st.status==='running'?'disabled':''}>${Object.entries(SUBJECTS).map(([k,v])=>`<option value="${k}" ${st.subject===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="aaTimerField"><label for="aaTimerTask">この時間で終えること</label><input id="aaTimerTask" maxlength="120" value="${esc(st.task)}" placeholder="例：英語長文1題＋根拠確認" ${st.status==='running'?'disabled':''}></div></div>
 <div class="aaTimerMiniGrid"><div class="aaTimerField"><label for="aaTimerFocus">集中（分）</label><input id="aaTimerFocus" type="number" min="1" max="180" value="${st.focusMin}" ${st.status==='running'?'disabled':''}></div><div class="aaTimerField"><label for="aaTimerBreak">休憩（分）</label><input id="aaTimerBreak" type="number" min="1" max="60" value="${st.breakMin}" ${st.status==='running'?'disabled':''}></div><div class="aaTimerField"><label for="aaTimerLongBreak">4セット後（分）</label><input id="aaTimerLongBreak" type="number" min="1" max="60" value="${st.longBreakMin}" ${st.status==='running'?'disabled':''}></div></div>
 <label class="aaTimerSwitch"><span>集中終了後に休憩を自動開始</span><input id="aaTimerAutoBreak" type="checkbox" ${st.autoBreak?'checked':''}></label>
 <div class="aaTimerBtns"><button class="primary" data-aa-timer="${st.status==='running'?'pause':'start'}">${st.status==='running'?'一時停止':'スタート'}</button><button data-aa-timer="reset">リセット</button><button class="finish" data-aa-timer="${st.phase==='focus'?'finish':'skip'}">${st.phase==='focus'?'ここまで記録':'休憩をスキップ'}</button></div>
 <div class="aaTimerMiniGrid"><div class="aaTimerStat"><b>${mins}</b><span>今日の集中分</span></div><div class="aaTimerStat"><b>${today.length}</b><span>今日の記録</span></div><div class="aaTimerStat"><b>${week}</b><span>7日間の集中分</span></div></div>
 <div class="aaTimerLog"><h3>今日の直近記録</h3>${logs.length?logs.map(x=>`<div class="aaTimerLogRow"><b>${new Date(x.endedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</b><span>${esc(SUBJECTS[x.subject]||'その他')}</span><small>${esc(x.task||'内容未入力')}</small><b>${Math.max(1,Math.round(x.seconds/60))}分</b></div>`).join(''):'<div class="aaTimerMuted">まだ記録はありません。集中ブロックを終えるとここに残ります。</div>'}</div>
 <p class="aaTimerMuted">タイマー履歴は学習問題の正誤・復習間隔・「覚えた／要復習」のデータとは別に保存します。画面を閉じても、終了時刻を基準に残り時間を復元します。</p>`;
}
function ensureUI(){
 injectStyle();
 if(!document.getElementById('aaStudyTimerFab')){
  const b=document.createElement('button');b.id='aaStudyTimerFab';b.type='button';b.setAttribute('aria-label','学習集中タイマーを開く');b.addEventListener('click',open);document.body.appendChild(b);
 }
 if(!document.getElementById('aaStudyTimerOverlay')){
  const o=document.createElement('div');o.id='aaStudyTimerOverlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','学習集中タイマー');o.innerHTML='<div id="aaStudyTimerPanel"></div>';o.addEventListener('click',e=>{if(e.target===o)close()});o.addEventListener('click',handleClick);o.addEventListener('input',handleInput);o.addEventListener('change',handleInput);document.body.appendChild(o);
 }
 renderPanel();updateFab();
}
function renderPanel(){const p=document.getElementById('aaStudyTimerPanel');if(p)p.innerHTML=panelHTML()}
function open(){reconcile();ensureUI();document.getElementById('aaStudyTimerOverlay')?.classList.add('open');renderPanel();startTicker()}
function close(){document.getElementById('aaStudyTimerOverlay')?.classList.remove('open')}
function handleInput(e){if(!e.target?.matches('#aaTimerSubject,#aaTimerTask,#aaTimerFocus,#aaTimerBreak,#aaTimerLongBreak,#aaTimerAutoBreak'))return;updateSettingsFromUI()}
function handleClick(e){
 const el=e.target.closest('[data-aa-timer]');if(!el)return;
 const a=el.dataset.aaTimer;
 if(a==='close')close();else if(a==='start'){updateSettingsFromUI();start()}else if(a==='pause')pause();else if(a==='reset')resetPhase();else if(a==='finish')finishEarly();else if(a==='skip')skipBreak();else if(a==='preset')applyPreset(el.dataset.preset);
}
function updateFab(){
 const b=document.getElementById('aaStudyTimerFab');if(!b)return;
 const rem=currentRemaining();b.dataset.running=st.status==='running'?'1':'0';
 b.textContent=st.status==='running'?`⏱ ${fmt(rem)} ${phaseLabel()}`:'⏱ 集中タイマー';
}
function updateTitle(){
 if(st.status==='running')document.title=`${fmt(currentRemaining())} ${phaseLabel()}｜${baseTitle}`;
 else if(document.title!==baseTitle)document.title=baseTitle;
}
function tick(){
 if(st.status==='running'){
  const rem=currentRemaining();
  if(rem<=0){finishPhase();return}
  st.remainingSec=rem;const clock=document.getElementById('aaTimerClock');if(clock)clock.textContent=fmt(rem);
  const bar=document.getElementById('aaTimerProgressBar'),total=phaseSeconds();if(bar)bar.style.width=`${Math.max(0,Math.min(100,100*(1-rem/total)))}%`;
  updateFab();updateTitle();
 }
}
function startTicker(){if(tickId)return;tickId=setInterval(tick,500);tick()}
function install(){
 reconcile();ensureUI();startTicker();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseWakeLock();else{reconcile();if(st.status==='running')requestWakeLock();renderPanel();updateFab();updateTitle()}});
 window.addEventListener('pageshow',()=>{reconcile();renderPanel();updateFab();updateTitle()});
 window.addEventListener('storage',e=>{if(e.key===KEY){st=load();reconcile();renderPanel();updateFab();updateTitle()}});
 window.addEventListener('pagehide',save);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();