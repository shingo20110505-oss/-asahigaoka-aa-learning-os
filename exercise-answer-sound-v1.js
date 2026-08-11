(()=>{'use strict';
if(window.__AA_EXERCISE_ANSWER_SOUND_V1__)return;window.__AA_EXERCISE_ANSWER_SOUND_V1__=true;
const STATUS=window.AA_EXERCISE_ANSWER_SOUND={version:'1.0.0',installed:false,correctCount:0,wrongCount:0,lastError:null};
let audioContext=null;
function enabled(){try{return typeof state!=='undefined'&&state?.ui?.successFeedback!==false&&!document.hidden}catch(_){return false}}
function exerciseAllowed(){try{if(typeof state==='undefined'||!state?.session?.active||state.route!=='study')return false;const q=typeof currentQ==='function'?currentQ():null;if(q?.testMode===true||state.session?.testMode===true)return false;return true}catch(_){return false}}
function ctx(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{audioContext=audioContext||new C();if(audioContext.state==='suspended')audioContext.resume?.();return audioContext}catch(e){STATUS.lastError=String(e?.message||e);return null}}
function tone(frequency,at,duration,gainAmount,type='sine',destination=null){const c=ctx();if(!c)return false;try{const osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(gainAmount,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(destination||c.destination);osc.start(at);osc.stop(at+duration+.025);return true}catch(e){STATUS.lastError=String(e?.message||e);return false}}
function play(correct){if(!enabled()||!exerciseAllowed())return false;const c=ctx();if(!c)return false;try{const start=c.currentTime+.006,master=c.createGain();master.gain.setValueAtTime(.0001,start);master.gain.exponentialRampToValueAtTime(correct?.055:.048,start+.014);master.gain.exponentialRampToValueAtTime(.0001,start+(correct?.25:.22));master.connect(c.destination);if(correct){tone(523.25,start,.15,.72,'sine',master);tone(659.25,start+.07,.16,.68,'sine',master);STATUS.correctCount++}else{tone(293.66,start,.14,.60,'triangle',master);tone(220,start+.075,.16,.56,'triangle',master);STATUS.wrongCount++}return true}catch(e){STATUS.lastError=String(e?.message||e);return false}}
function patchSettingsText(){try{for(const card of document.querySelectorAll('section.card')){const h=card.querySelector('.h3');if(!h||!h.textContent.includes('正解時のフィードバック'))continue;h.textContent='演習の正解・不正解音';const p=card.querySelector('p.sub');if(p)p.textContent='通常の演習で答えたとき、正解は明るい2音、不正解は低めの2音で短く知らせます。テスト扱いの問題では鳴らしません。';const b=card.querySelector('[data-action="success-feedback"]');if(b)b.textContent=`正解・不正解音 ${enabled()?'ON':'OFF'}`;const t=card.querySelector('.tiny');if(t)t.textContent='音をOFFにしても、正解・不正解の文字、色、解説はそのまま表示します。'}}catch(_){}}
function install(attempt=0){
 if(typeof selectAnswer!=='function'||typeof playSuccessCue!=='function'||typeof currentQ!=='function'||typeof state==='undefined'){if(attempt<120)setTimeout(()=>install(attempt+1),50);return}
 if(selectAnswer.__aaExerciseAnswerSoundPatched){STATUS.installed=true;patchSettingsText();return}
 playSuccessCue=function(){return play(true)};
 const original=selectAnswer;
 const wrapped=function(idx){try{const s=state?.session,q=currentQ();if(s&&q&&!s.feedback&&Number(idx)!==Number(q.answerIndex))play(false)}catch(_){ }return original(idx)};
 wrapped.__aaExerciseAnswerSoundPatched=true;
 selectAnswer=wrapped;
 STATUS.installed=true;
 patchSettingsText();
 const mo=new MutationObserver(()=>patchSettingsText());mo.observe(document.documentElement,{childList:true,subtree:true});
}
install();
})();
