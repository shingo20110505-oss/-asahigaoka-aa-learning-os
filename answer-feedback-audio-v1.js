(()=>{'use strict';
if(window.__AA_ANSWER_FEEDBACK_AUDIO_V2__)return;window.__AA_ANSWER_FEEDBACK_AUDIO_V2__=true;
window.__AA_ANSWER_FEEDBACK_AUDIO_V1__=true;window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;
const STATUS=window.AA_ANSWER_FEEDBACK_AUDIO={version:'2.0.0',installed:false,unlocked:false,correctPlays:0,wrongPlays:0,lastError:null};window.AA_EXERCISE_ANSWER_SOUND=STATUS;
let audioCtx=null,unlocking=null;
const errText=e=>e&&(`${e.name||'Error'}: ${e.message||String(e)}`);
function getContext(){const C=window.AudioContext||window.webkitAudioContext;if(!C){STATUS.lastError='AudioContext unavailable';return null}try{audioCtx=audioCtx||new C();return audioCtx}catch(e){STATUS.lastError=errText(e);return null}}
function silentPrime(c){try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource(),g=c.createGain();g.gain.value=.000001;s.buffer=b;s.connect(g);g.connect(c.destination);s.start(0)}catch(_){}}
function unlockAudio(){const c=getContext();if(!c)return Promise.resolve(null);if(c.state==='running'){STATUS.unlocked=true;return Promise.resolve(c)}if(unlocking)return unlocking;try{silentPrime(c);const r=c.resume?.();unlocking=Promise.resolve(r).catch(e=>{STATUS.lastError=errText(e)}).then(()=>{silentPrime(c);STATUS.unlocked=c.state==='running';unlocking=null;return c});return unlocking}catch(e){STATUS.lastError=errText(e);unlocking=null;return Promise.resolve(c)}}
function arm(){unlockAudio()}
for(const ev of ['pointerdown','touchstart','mousedown','keydown'])document.addEventListener(ev,arm,{capture:true,passive:true});
function currentQuestionSafe(){try{return typeof currentQ==='function'?currentQ():null}catch(_){return null}}
function enabled(){try{return state?.ui?.successFeedback!==false&&!document.hidden}catch(_){return false}}
function note(ctx,master,frequency,at,duration,type='sine',peak=.75){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(peak,at+.010);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.025)}
function flash(correct){try{let el=document.getElementById('aa-answer-flash');if(!el){el=document.createElement('div');el.id='aa-answer-flash';Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'9998',pointerEvents:'none',opacity:'0',transition:'opacity .16s ease',border:'5px solid transparent',borderRadius:'18px'});document.body.appendChild(el)}el.style.borderColor=correct?'rgba(23,122,75,.50)':'rgba(186,45,45,.48)';el.style.opacity='.82';clearTimeout(window.__aaAnswerFlashTimer);window.__aaAnswerFlashTimer=setTimeout(()=>{el.style.opacity='0'},150)}catch(_){}}
function scheduleCue(correct,c){if(!c||c.state!=='running')return false;try{const t=c.currentTime+.004,master=c.createGain();master.gain.setValueAtTime(.0001,t);master.gain.exponentialRampToValueAtTime(correct?.075:.065,t+.012);master.gain.exponentialRampToValueAtTime(.0001,t+(correct?.38:.31));master.connect(c.destination);if(correct){note(c,master,659.25,t,.16,'sine',.78);note(c,master,783.99,t+.064,.17,'sine',.73);note(c,master,1046.50,t+.132,.19,'sine',.68);STATUS.correctPlays++;STATUS.correctCount=STATUS.correctPlays}else{note(c,master,277.18,t,.17,'triangle',.70);note(c,master,207.65,t+.092,.20,'triangle',.64);STATUS.wrongPlays++;STATUS.wrongCount=STATUS.wrongPlays}flash(correct);STATUS.unlocked=true;return true}catch(e){STATUS.lastError=errText(e);return false}}
function playCue(correct){if(!enabled())return false;const c=getContext();if(!c)return false;if(c.state==='running')return scheduleCue(correct,c);unlockAudio().then(x=>{if(x?.state==='running')scheduleCue(correct,x)});return true}
function correctCue(){return playCue(true)}function wrongCue(){return playCue(false)}
function patchSettings(){if(typeof settingsHTML!=='function'||settingsHTML.__aaAnswerAudioV2Patched)return;const before=settingsHTML;settingsHTML=function(){let html=before();html=html.replace('正解時のフィードバック','正解・不正解の音演出').replace('通常演習で正解したときだけ、約0.2秒の小さな音と控えめな視覚表示を出します。入試対策テスト中は鳴りません。','問題に答えた瞬間、正解は明るい上昇音、不正解は短い下降音で知らせます。iPhoneのホーム画面版でも、最初のタップで音声を有効化します。').replace('成功音と演出 ','解答音と演出 ');return html};settingsHTML.__aaAnswerAudioV2Patched=true}
function install(attempt=0){if(typeof selectAnswer!=='function'||typeof playSuccessCue!=='function'||typeof state==='undefined'){if(attempt<140)setTimeout(()=>install(attempt+1),50);return}if(selectAnswer.__aaAnswerAudioV2Patched){STATUS.installed=true;return}
 playSuccessCue=correctCue;
 const before=selectAnswer;selectAnswer=function(idx){const q=currentQuestionSafe(),hadFeedback=!!state?.session?.feedback,correct=!!q&&Number(idx)===Number(q.answerIndex);if(!hadFeedback&&!correct)wrongCue();const out=before(idx);return out};selectAnswer.__aaAnswerAudioV2Patched=true;
 patchSettings();STATUS.installed=true;STATUS.playCorrect=correctCue;STATUS.playWrong=wrongCue;STATUS.unlock=unlockAudio;
 try{if(state?.route==='settings'&&typeof render==='function')render()}catch(_){ }
}
install();
})();
