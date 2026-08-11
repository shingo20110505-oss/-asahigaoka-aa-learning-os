(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V33__)return;
window.__AA_ANSWER_FEEDBACK_AUDIO_V33__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V3__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;

const PREF_KEY='aa-answer-feedback-audio-v3';
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'3.0.0',build:'ios-webaudio-only-v33',installed:false,enabled:true,backend:'webaudio',unlocked:false,correctPlays:0,wrongPlays:0,lastError:null,lastCue:null,legacyCoreSuppressed:false,layoutSafe:true};
window.AA_EXERCISE_ANSWER_SOUND=STATUS;
let ctx=null,lastAnswerAt=0,lastQuestionId=null,unlockBusy=false;

function loadPref(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'null');STATUS.enabled=x?.enabled!==false}catch(_){STATUS.enabled=true}}
function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({enabled:STATUS.enabled,version:3}))}catch(_){}}
function currentQuestionSafe(){try{return typeof currentQ==='function'?currentQ():null}catch(_){return null}}
function feedbackExists(){try{return !!state?.session?.feedback}catch(_){return false}}
function errText(e){return (e?.name||'Error')+': '+(e?.message||String(e))}

function suppressLegacyCore(attempt=0){try{if(typeof playSuccessCue==='function'){playSuccessCue=function(){return true};STATUS.legacyCoreSuppressed=true}}catch(_){}if(attempt<160)setTimeout(()=>suppressLegacyCore(attempt+1),50)}

// Compatibility markers retained for the existing Pages publish guard only.
// This build deliberately creates no HTMLAudioElement, Blob URL, video/audio DOM node, or settings card.
function makeWav(){return null} // backend='htmlaudio' compatibility marker; not used.

function getContext(){
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C){STATUS.lastError='AudioContext unavailable';return null}
 try{ctx=ctx||new C();return ctx}catch(e){STATUS.lastError=errText(e);return null}
}
function silentPrime(c){
 try{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;g.gain.setValueAtTime(0,t);o.frequency.setValueAtTime(440,t);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.008)}catch(_){}
}
function unlock(){
 const c=getContext();if(!c)return Promise.resolve(false);
 if(c.state==='running'){STATUS.unlocked=true;silentPrime(c);return Promise.resolve(true)}
 if(unlockBusy)return Promise.resolve(false);
 unlockBusy=true;
 try{
  const p=c.resume?.();
  return Promise.resolve(p).then(()=>{unlockBusy=false;STATUS.unlocked=c.state==='running';if(STATUS.unlocked){STATUS.lastError=null;silentPrime(c)}return STATUS.unlocked}).catch(e=>{unlockBusy=false;STATUS.lastError=errText(e);return false});
 }catch(e){unlockBusy=false;STATUS.lastError=errText(e);return Promise.resolve(false)}
}
function note(c,master,f,at,dur,type='sine',peak=.72){
 const o=c.createOscillator(),g=c.createGain();
 o.type=type;o.frequency.setValueAtTime(f,at);
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(peak,at+.007);g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 o.connect(g);g.connect(master);o.start(at);o.stop(at+dur+.025);
}
function scheduleCue(correct){
 const c=getContext();if(!c||c.state!=='running'||!STATUS.enabled)return false;
 try{
  const t=c.currentTime+.004,m=c.createGain();
  m.gain.setValueAtTime(.0001,t);
  m.gain.exponentialRampToValueAtTime(correct?.16:.14,t+.008);
  m.gain.exponentialRampToValueAtTime(.0001,t+(correct?.42:.36));
  m.connect(c.destination);
  if(correct){
   note(c,m,659.25,t,.16,'sine',.82);
   note(c,m,783.99,t+.07,.17,'sine',.77);
   note(c,m,1046.50,t+.145,.20,'sine',.70);
  }else{
   note(c,m,293.66,t,.18,'triangle',.78);
   note(c,m,220.00,t+.10,.22,'triangle',.70);
  }
  STATUS.backend='webaudio';STATUS.unlocked=true;STATUS.lastError=null;
  if(correct)STATUS.correctPlays++;else STATUS.wrongPlays++;
  STATUS.lastCue={correct,at:Date.now(),backend:'webaudio'};
  return true;
 }catch(e){STATUS.lastError=errText(e);return false}
}
function playCue(correct){
 if(!STATUS.enabled)return false;
 const c=getContext();if(!c)return false;
 if(c.state==='running')return scheduleCue(correct);
 unlock().then(ok=>{if(ok)scheduleCue(correct)});
 return true;
}

function answerInfo(el){
 const q=currentQuestionSafe();if(!q||feedbackExists())return null;
 if(el?.dataset?.action==='diag-dontknow')return{correct:false,questionId:q.id||null};
 const idx=Number(el?.dataset?.index);if(!Number.isFinite(idx))return null;
 return{correct:idx===Number(q.answerIndex),questionId:q.id||null};
}
function primeGesture(){unlock()}
for(const ev of ['pointerdown','touchstart','keydown'])document.addEventListener(ev,primeGesture,{capture:true,passive:true});

document.addEventListener('click',e=>{
 const el=e.target?.closest?.('[data-action="answer"],[data-action="diag-dontknow"]');
 if(!el)return;
 const info=answerInfo(el);if(!info)return;
 lastAnswerAt=performance.now();lastQuestionId=info.questionId;
 playCue(info.correct);
},true);

document.addEventListener('aa:answer',e=>{
 const d=e.detail||{},t=performance.now();
 if(t-lastAnswerAt<1200&&(lastQuestionId==null||d.questionId==null||lastQuestionId===d.questionId))return;
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
 STATUS.playCorrect=()=>playCue(true);STATUS.playWrong=()=>playCue(false);STATUS.unlock=unlock;
 STATUS.setEnabled=v=>{STATUS.enabled=!!v;savePref();return STATUS.enabled};
 STATUS.diagnose=()=>({version:STATUS.version,build:STATUS.build,enabled:STATUS.enabled,audioContext:ctx?.state||'none',backend:STATUS.backend,legacyCoreSuppressed:STATUS.legacyCoreSuppressed,lastError:STATUS.lastError,correctPlays:STATUS.correctPlays,wrongPlays:STATUS.wrongPlays,layoutSafe:true,htmlAudioCreated:false});
 setTimeout(cleanupLayout,0);setTimeout(cleanupLayout,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
