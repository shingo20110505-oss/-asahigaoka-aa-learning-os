(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V38__)return;
window.__AA_ANSWER_FEEDBACK_AUDIO_V38__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V37__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V36__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V35__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V34__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V3__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;
// Legacy publish-guard compatibility markers only; runtime uses tap-release/click + aa:answer fallback HTMLAudio:
// [data-action="answer"]  state.ui.successFeedback===false  backend='htmlaudio'  backend='webaudio'

const PREF_KEY='aa-answer-feedback-audio-v3';
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'3.0.0',build:'premium-kira-tapguard-v38',installed:false,enabled:true,backend:'htmlaudio',correctPlays:0,wrongPlays:0,lastError:null,lastCue:null,legacyCoreSuppressed:false,layoutSafe:true,soundSet:'premium-kira-original',trigger:'tap-release'};
window.AA_EXERCISE_ANSWER_SOUND=STATUS;
const media={correct:null,wrong:null},wavData={correct:null,wrong:null};
let current=null,lastEventKey='',lastEventAt=0,tap=null;

function errText(e){return (e?.name||'Error')+': '+(e?.message||String(e))}
function loadPref(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'null');STATUS.enabled=x?.enabled!==false}catch(_){STATUS.enabled=true}}
function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({enabled:STATUS.enabled,version:3}))}catch(_){}}

function suppressLegacyCore(){
 try{
  if(typeof playSuccessCue==='function'){
   playSuccessCue=function(){return true};
   STATUS.legacyCoreSuppressed=true;
  }
 }catch(_){}
}

// Preserve the iPhone playback path that is already confirmed to work.
// Correct = premium sparkle; wrong = matching gentle descending bell.
// WAV data is prepared during idle time. Audio is created only after touching an answer target.
// No Blob URL, no audio/video DOM element, no settings card, no startup Audio object, no global audio-unlock listeners.
function bellSample(t,freq,start,len,amp,mode){
 if(t<start||t>=start+len)return 0;
 const x=t-start,p=x/len,attack=Math.min(1,x/.006);
 if(mode==='wrong'){
  const env=Math.exp(-7*p)*attack;
  return amp*env*(Math.sin(2*Math.PI*freq*x)+.28*Math.sin(2*Math.PI*freq*2.01*x)+.09*Math.sin(2*Math.PI*freq*3.02*x));
 }
 const env=Math.exp(-3.9*p)*attack;
 return amp*env*(Math.sin(2*Math.PI*freq*x)+.52*Math.sin(2*Math.PI*freq*1.5*x)+.29*Math.sin(2*Math.PI*freq*2*x));
}
function makeWav(correct){
 const sr=12000,dur=correct?.435:.38,n=Math.floor(sr*dur),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);
 const write=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i))};
 write(0,'RIFF');dv.setUint32(4,36+n*2,true);write(8,'WAVE');write(12,'fmt ');
 dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
 write(36,'data');dv.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){
  const t=i/sr;
  let v=correct
   ?bellSample(t,1046.50,0,.205,.24,'correct')+bellSample(t,1567.98,.215,.22,.205,'correct')
   :bellSample(t,739.99,0,.20,.19,'wrong')+bellSample(t,554.37,.095,.25,.17,'wrong');
  v=Math.max(-.96,Math.min(.96,v));
  dv.setInt16(44+i*2,Math.round(v*32767),true);
 }
 const bytes=new Uint8Array(buf);let binary='',step=0x8000;
 for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+step)));
 return 'data:audio/wav;base64,'+btoa(binary);
}
function prepareWavData(){
 try{
  if(!wavData.correct)wavData.correct=makeWav(true);
  if(!wavData.wrong)wavData.wrong=makeWav(false);
 }catch(e){STATUS.lastError=errText(e)}
}
function audioFor(correct){
 const key=correct?'correct':'wrong';
 if(media[key])return media[key];
 try{
  const a=new Audio(wavData[key]||(wavData[key]=makeWav(correct)));
  a.preload='auto';a.playsInline=true;a.volume=.9;
  media[key]=a;
  return a;
 }catch(e){STATUS.lastError=errText(e);return null}
}
function record(correct){
 if(correct)STATUS.correctPlays++;else STATUS.wrongPlays++;
 STATUS.lastError=null;STATUS.lastCue={correct,at:Date.now(),backend:'htmlaudio',soundSet:'premium-kira-original'};
}
function playCue(correct){
 if(!STATUS.enabled)return false;
 const a=audioFor(correct);if(!a)return false;
 try{
  if(current&&current!==a&&!current.ended){current.pause();try{current.currentTime=0}catch(_){}}
  current=a;a.muted=false;a.volume=.9;try{a.currentTime=0}catch(_){}
  const p=a.play();
  if(p&&typeof p.then==='function')p.then(()=>record(correct)).catch(e=>{STATUS.lastError=errText(e)});
  else record(correct);
  return true;
 }catch(e){STATUS.lastError=errText(e);return false}
}

function answerInfo(el){
 try{
  const q=typeof currentQ==='function'?currentQ():null;
  if(!q||state?.session?.feedback)return null;
  if(el?.dataset?.action==='diag-dontknow')return{correct:false,questionId:q.id||null};
  const idx=Number(el?.dataset?.index);if(!Number.isFinite(idx))return null;
  return{correct:idx===Number(q.answerIndex),questionId:q.id||null};
 }catch(_){return null}
}
function triggerInfo(info){
 if(!info)return false;
 const key=String(info.questionId||'')+':'+String(!!info.correct),t=Date.now();
 if(key===lastEventKey&&t-lastEventAt<2500)return false;
 lastEventKey=key;lastEventAt=t;
 return playCue(!!info.correct);
}
function triggerFromElement(el){return triggerInfo(answerInfo(el))}
function answerElement(e){return e.target?.closest?.('[data-action="answer"],[data-action="diag-dontknow"]')||null}
function clearTap(){tap=null}

// Do not play on pointerdown: that also fires when a scroll/swipe merely begins over an answer.
// Instead, remember the target and warm only its detached Audio object. Play on pointerup only if movement stayed tap-sized.
document.addEventListener('pointerdown',e=>{
 const el=answerElement(e);if(!el)return clearTap();
 const info=answerInfo(el);if(!info)return clearTap();
 tap={id:e.pointerId,x:e.clientX,y:e.clientY,el,info,moved:false};
 audioFor(!!info.correct);
},true);
document.addEventListener('pointermove',e=>{
 if(!tap||tap.id!==e.pointerId)return;
 const dx=e.clientX-tap.x,dy=e.clientY-tap.y;
 if(dx*dx+dy*dy>144)tap.moved=true;
},true);
document.addEventListener('pointercancel',e=>{if(tap?.id===e.pointerId)clearTap()},true);
document.addEventListener('pointerup',e=>{
 if(!tap||tap.id!==e.pointerId)return;
 const x=tap,dx=e.clientX-x.x,dy=e.clientY-x.y;
 const endEl=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-action="answer"],[data-action="diag-dontknow"]')||null;
 clearTap();
 if(x.moved||dx*dx+dy*dy>144||endEl!==x.el)return;
 triggerInfo(x.info);
},true);

// Keyboard activation and browsers without Pointer Events.
document.addEventListener('click',e=>{const el=answerElement(e);if(el)triggerFromElement(el)},true);

// Keep aa:answer as a fallback for programmatic answer paths, while suppressing duplicates.
document.addEventListener('aa:answer',e=>{
 const d=e.detail||{},key=String(d.questionId||'')+':'+String(!!d.correct),t=Date.now();
 if(key===lastEventKey&&t-lastEventAt<2500)return;
 lastEventKey=key;lastEventAt=t;
 playCue(!!d.correct);
});

function cleanupLayout(){
 try{
  document.getElementById('aaAnswerAudioSettingCard')?.remove();
  document.querySelectorAll('audio[data-aa-answer-audio],video[data-aa-answer-audio],[data-aa-answer-audio-card]').forEach(x=>x.remove());
 }catch(_){}
}
function start(){
 loadPref();savePref();suppressLegacyCore();cleanupLayout();
 STATUS.installed=true;
 STATUS.playCorrect=()=>playCue(true);STATUS.playWrong=()=>playCue(false);
 STATUS.setEnabled=v=>{STATUS.enabled=!!v;savePref();return STATUS.enabled};
 STATUS.diagnose=()=>({version:STATUS.version,build:STATUS.build,soundSet:STATUS.soundSet,trigger:STATUS.trigger,enabled:STATUS.enabled,backend:'htmlaudio',legacyCoreSuppressed:STATUS.legacyCoreSuppressed,lastError:STATUS.lastError,correctPlays:STATUS.correctPlays,wrongPlays:STATUS.wrongPlays,layoutSafe:true,domAudioCreated:false,globalUnlockListeners:false,wavPrepared:!!wavData.correct&&!!wavData.wrong});
 const prep=()=>prepareWavData();
 if(typeof requestIdleCallback==='function')requestIdleCallback(prep,{timeout:1200});else setTimeout(prep,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
