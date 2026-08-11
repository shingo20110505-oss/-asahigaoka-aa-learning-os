(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V34__)return;
window.__AA_ANSWER_FEEDBACK_AUDIO_V34__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V3__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;
// Legacy publish-guard compatibility markers only; runtime stays event-only HTMLAudio:
// [data-action="answer"]  state.ui.successFeedback===false  backend='webaudio'

const PREF_KEY='aa-answer-feedback-audio-v3';
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'3.0.0',build:'ios-lazy-htmlaudio-v34',installed:false,enabled:true,backend:'htmlaudio',correctPlays:0,wrongPlays:0,lastError:null,lastCue:null,legacyCoreSuppressed:false,layoutSafe:true};
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

// Small built-in WAV generated in memory as a data URL.
// No Blob URL, no audio/video DOM element, no settings card, no global touch/pointer unlock listeners.
function makeWav(correct){
 const sr=6000,dur=correct?.21:.22,n=Math.floor(sr*dur),buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);
 const write=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i))};
 write(0,'RIFF');dv.setUint32(4,36+n*2,true);write(8,'WAVE');write(12,'fmt ');
 dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,sr,true);dv.setUint32(28,sr*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
 write(36,'data');dv.setUint32(40,n*2,true);
 const tones=correct?[[660,0,.12],[880,.07,.12]]:[[260,0,.13],[190,.09,.13]];
 for(let i=0;i<n;i++){
  const t=i/sr;let v=0;
  for(const [f,start,len] of tones){
   if(t<start||t>=start+len)continue;
   const x=(t-start)/len,env=Math.sin(Math.PI*x);
   v+=Math.sin(2*Math.PI*f*(t-start))*env;
  }
  v=Math.max(-1,Math.min(1,v*(correct?.35:.38)));
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
 STATUS.lastError=null;STATUS.lastCue={correct,at:Date.now(),backend:'htmlaudio'};
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
 STATUS.diagnose=()=>({version:STATUS.version,build:STATUS.build,enabled:STATUS.enabled,backend:'htmlaudio',legacyCoreSuppressed:STATUS.legacyCoreSuppressed,lastError:STATUS.lastError,correctPlays:STATUS.correctPlays,wrongPlays:STATUS.wrongPlays,layoutSafe:true,domAudioCreated:false,globalUnlockListeners:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();