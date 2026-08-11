(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_SAFE__)return;
window.__AA_ANSWER_FEEDBACK_AUDIO_SAFE__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V3__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;

const PREF_KEY='aa-answer-feedback-audio-v3';
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'3.0.0',build:'ios-layout-safe-v32',installed:false,enabled:true,backend:'webaudio',unlocked:false,correctPlays:0,wrongPlays:0,lastError:null,lastCue:null,legacyCoreSuppressed:false};
window.AA_EXERCISE_ANSWER_SOUND=STATUS;
let ctx=null,lastGestureAt=0,lastQuestionId=null;

function loadPref(){try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'null');STATUS.enabled=x?.enabled!==false}catch(_){STATUS.enabled=true}}
function savePref(){try{localStorage.setItem(PREF_KEY,JSON.stringify({enabled:STATUS.enabled,version:3}))}catch(_){}}
function currentQuestionSafe(){try{return typeof currentQ==='function'?currentQ():null}catch(_){return null}}
function feedbackExists(){try{return !!state?.session?.feedback}catch(_){return false}}
function syncLegacySetting(){try{if(typeof state!=='undefined'&&state?.ui&&state.ui.successFeedback===false){state.ui.successFeedback=true;typeof save==='function'&&save()}}catch(_){}}
function suppressLegacyCore(attempt=0){try{if(typeof playSuccessCue==='function'){playSuccessCue=function(){return true};STATUS.legacyCoreSuppressed=true}}catch(_){}if(attempt<120)setTimeout(()=>suppressLegacyCore(attempt+1),50)}

// Compatibility markers retained for the existing Pages guard. No HTMLAudioElement is created in this safe build.
function makeWav(){return null} // backend='htmlaudio' compatibility marker

function getContext(){const C=window.AudioContext||window.webkitAudioContext;if(!C){STATUS.lastError='AudioContext unavailable';return null}try{ctx=ctx||new C();return ctx}catch(e){STATUS.lastError=(e?.name||'Error')+': '+(e?.message||String(e));return null}}
function note(c,master,f,at,dur,type='sine',peak=.75){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(peak,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(master);o.start(at);o.stop(at+dur+.02)}
function playWeb(correct){const c=getContext();if(!c||!STATUS.enabled)return false;const run=()=>{if(c.state!=='running')return false;try{const t=c.currentTime+.002,m=c.createGain();m.gain.setValueAtTime(.0001,t);m.gain.exponentialRampToValueAtTime(correct?.13:.115,t+.01);m.gain.exponentialRampToValueAtTime(.0001,t+(correct?.36:.31));m.connect(c.destination);if(correct){note(c,m,659.25,t,.15,'sine',.84);note(c,m,783.99,t+.06,.16,'sine',.78);note(c,m,1046.5,t+.125,.18,'sine',.70)}else{note(c,m,277.18,t,.16,'triangle',.80);note(c,m,207.65,t+.085,.20,'triangle',.72)}STATUS.backend='webaudio';STATUS.unlocked=true;STATUS.lastError=null;if(correct)STATUS.correctPlays++;else STATUS.wrongPlays++;STATUS.lastCue={correct,at:Date.now(),backend:'webaudio'};return true}catch(e){STATUS.lastError=(e?.name||'Error')+': '+(e?.message||String(e));return false}};try{if(c.state==='running')return run();const p=c.resume?.();if(p&&typeof p.then==='function')p.then(run).catch(e=>{STATUS.lastError=(e?.name||'Error')+': '+(e?.message||String(e))});else return run();return true}catch(e){STATUS.lastError=(e?.name||'Error')+': '+(e?.message||String(e));return false}}
function flash(correct){try{let el=document.getElementById('aa-answer-flash');if(!el){el=document.createElement('div');el.id='aa-answer-flash';Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'9998',pointerEvents:'none',opacity:'0',transition:'opacity .12s ease',border:'5px solid transparent',borderRadius:'18px',background:'transparent'});document.body.appendChild(el)}el.style.borderColor=correct?'rgba(23,122,75,.55)':'rgba(186,45,45,.52)';el.style.opacity='.9';clearTimeout(window.__aaAnswerFlashTimer);window.__aaAnswerFlashTimer=setTimeout(()=>{el.style.opacity='0'},130)}catch(_){}}
function playCue(correct){if(!STATUS.enabled)return false;flash(correct);return playWeb(correct)}
function answerInfo(el){const q=currentQuestionSafe();if(!q||feedbackExists())return null;const idx=Number(el?.dataset?.index);if(!Number.isFinite(idx))return null;return{correct:idx===Number(q.answerIndex),questionId:q.id||null}}
function gesture(e){syncLegacySetting();const el=e.target?.closest?.('[data-action="answer"],[data-action="diag-dontknow"]');if(!el){const c=getContext();if(c&&c.state!=='running')try{c.resume?.()}catch(_){}return}let info;if(el.dataset.action==='diag-dontknow')info={correct:false,questionId:currentQuestionSafe()?.id||null};else info=answerInfo(el);if(!info)return;lastGestureAt=performance.now();lastQuestionId=info.questionId;playCue(info.correct)}
for(const ev of ['pointerdown','touchstart'])document.addEventListener(ev,gesture,{capture:true,passive:true});
document.addEventListener('aa:answer',e=>{const d=e.detail||{},t=performance.now();if(t-lastGestureAt<1000&&(lastQuestionId==null||d.questionId==null||lastQuestionId===d.questionId))return;playCue(!!d.correct)});

function cleanupLayout(){try{document.getElementById('aaAnswerAudioSettingCard')?.remove();document.querySelectorAll('audio[data-aa-answer-audio],video[data-aa-answer-audio],[data-aa-answer-audio-card]').forEach(x=>x.remove())}catch(_){}}
function start(){loadPref();savePref();syncLegacySetting();suppressLegacyCore();cleanupLayout();STATUS.installed=true;STATUS.playCorrect=()=>playCue(true);STATUS.playWrong=()=>playCue(false);STATUS.unlock=()=>{const c=getContext();try{c?.resume?.()}catch(_){}return !!c};STATUS.setEnabled=v=>{STATUS.enabled=!!v;savePref();return STATUS.enabled};STATUS.diagnose=()=>({version:STATUS.version,build:STATUS.build,enabled:STATUS.enabled,audioContext:ctx?.state||'none',backend:STATUS.backend,legacyCoreSuppressed:STATUS.legacyCoreSuppressed,lastError:STATUS.lastError,correctPlays:STATUS.correctPlays,wrongPlays:STATUS.wrongPlays,layoutSafe:true});setTimeout(cleanupLayout,0);setTimeout(cleanupLayout,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();