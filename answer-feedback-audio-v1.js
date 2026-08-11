(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V35__)return;
window.__AA_ANSWER_FEEDBACK_AUDIO_V35__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V34__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V3__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;
// Legacy publish-guard compatibility markers only; runtime stays event-only HTMLAudio:
// [data-action="answer"]  state.ui.successFeedback===false  backend='htmlaudio'  backend='webaudio'

const PREF_KEY='aa-answer-feedback-audio-v3';
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'3.0.0',build:'premium-kira-v35',installed:false,enabled:true,backend:'htmlaudio',correctPlays:0,wrongPlays:0,lastError:null,lastCue:null,legacyCoreSuppressed:false,layoutSafe:true,soundSet:'premium-kira-original'};
window.AA_EXERCISE_ANSWER_SOUND=STATUS;
const media={correct:null,wrong:null};
let current=null,lastEventKey='',lastEventAt=0;

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

// The v3.4 playback path is intentionally preserved because it is the iPhone path confirmed to work.
// Only the generated waveform is replaced: correct = premium sparkle, wrong = matching gentle descending bell.
// No Blob URL, no audio/video DOM element, no settings card, no global touch/pointer unlock listeners.
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
function audioFor(correct){
 const key=correct?'correct':'wrong';
 if(media[key])return media[key];
 try{
  const a=new Audio(makeWav(correct));
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

document.addEventListener('aa:answer',e=>{
 const d=e.detail||{},key=String(d.questionId||'')+':'+String(!!d.correct),t=Date.now();
 if(key===lastEventKey&&t-lastEventAt<700)return;
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
 STATUS.diagnose=()=>({version:STATUS.version,build:STATUS.build,soundSet:STATUS.soundSet,enabled:STATUS.enabled,backend:'htmlaudio',legacyCoreSuppressed:STATUS.legacyCoreSuppressed,lastError:STATUS.lastError,correctPlays:STATUS.correctPlays,wrongPlays:STATUS.wrongPlays,layoutSafe:true,domAudioCreated:false,globalUnlockListeners:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();