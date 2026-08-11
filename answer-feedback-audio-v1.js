(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V1__)return;window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'1.0.0',installed:false,correctPlays:0,wrongPlays:0,lastError:null};
let audioCtx=null;
const errText=e=>e&&(`${e.name||'Error'}: ${e.message||String(e)}`);
function getContext(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{audioCtx=audioCtx||new C();if(audioCtx.state==='suspended')audioCtx.resume?.();return audioCtx}catch(e){STATUS.lastError=errText(e);return null}}
function currentQuestionSafe(){try{return typeof currentQ==='function'?currentQ():null}catch(_){return null}}
function isTestLike(q){try{const kind=String(state?.session?.kind||'').toLowerCase();return q?.testMode===true||/(simulator|exam|mock|aichi.*test|practice-test)/.test(kind)}catch(_){return false}}
function enabled(q){try{return state?.ui?.successFeedback!==false&&!document.hidden&&!isTestLike(q)}catch(_){return false}}
function note(ctx,master,frequency,at,duration,type='sine',peak=.75){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(peak,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.025)}
function correctCue(q=currentQuestionSafe()){if(!enabled(q))return false;const ctx=getContext();if(!ctx)return false;try{const t=ctx.currentTime+.006,master=ctx.createGain();master.gain.setValueAtTime(.0001,t);master.gain.exponentialRampToValueAtTime(.038,t+.016);master.gain.exponentialRampToValueAtTime(.0001,t+.34);master.connect(ctx.destination);note(ctx,master,659.25,t,.15,'sine',.72);note(ctx,master,783.99,t+.060,.15,'sine',.68);note(ctx,master,1046.50,t+.122,.18,'sine',.62);STATUS.correctPlays++;return true}catch(e){STATUS.lastError=errText(e);return false}}
function wrongCue(q=currentQuestionSafe()){if(!enabled(q))return false;const ctx=getContext();if(!ctx)return false;try{const t=ctx.currentTime+.006,master=ctx.createGain();master.gain.setValueAtTime(.0001,t);master.gain.exponentialRampToValueAtTime(.030,t+.014);master.gain.exponentialRampToValueAtTime(.0001,t+.28);master.connect(ctx.destination);note(ctx,master,246.94,t,.16,'triangle',.62);note(ctx,master,196.00,t+.085,.18,'triangle',.55);STATUS.wrongPlays++;return true}catch(e){STATUS.lastError=errText(e);return false}}
function patchSettings(){if(typeof settingsHTML!=='function'||settingsHTML.__aaAnswerAudioPatched)return;const before=settingsHTML;settingsHTML=function(){let html=before();html=html.replace('正解時のフィードバック','正解・不正解の音演出').replace('通常演習で正解したときだけ、約0.2秒の小さな音と控えめな視覚表示を出します。入試対策テスト中は鳴りません。','通常演習では、正解時に明るい上昇音、不正解時に短い下降音を鳴らします。入試対策テスト中は鳴りません。').replace('成功音と演出 ','解答音と演出 ');return html};settingsHTML.__aaAnswerAudioPatched=true}
function install(attempt=0){if(typeof selectAnswer!=='function'||typeof playSuccessCue!=='function'||typeof state==='undefined'){if(attempt<100)setTimeout(()=>install(attempt+1),50);return}
 if(selectAnswer.__aaAnswerAudioPatched){STATUS.installed=true;return}
 playSuccessCue=function(){return correctCue(currentQuestionSafe())};
 const before=selectAnswer;selectAnswer=function(idx){const q=currentQuestionSafe(),hadFeedback=!!state?.session?.feedback,correct=!!q&&Number(idx)===Number(q.answerIndex);const out=before(idx);if(!hadFeedback&&!correct)wrongCue(q);return out};selectAnswer.__aaAnswerAudioPatched=true;
 patchSettings();STATUS.installed=true;window.AA_ANSWER_FEEDBACK_AUDIO.playCorrect=correctCue;window.AA_ANSWER_FEEDBACK_AUDIO.playWrong=wrongCue;
 try{if(state?.route==='settings'&&typeof render==='function')render()}catch(_){ }
}
install();
})();
