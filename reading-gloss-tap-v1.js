(()=>{'use strict';
if(window.__AA_READING_GLOSS_TAP_V1__)return;window.__AA_READING_GLOSS_TAP_V1__=true;
const STATUS=window.AA_READING_GLOSS_TAP={version:'1.0.0',installed:false,unresolvedTaps:0,lastUnresolved:null};
const CONTRACTIONS={"can't":'〜できない',"cannot":'〜できない',"couldn't":'〜できなかった・できないだろう',"won't":'〜しないだろう',"wouldn't":'〜しないだろう',"shouldn't":'〜すべきでない',"don't":'〜しない',"doesn't":'〜しない',"didn't":'〜しなかった',"isn't":'〜ではない・〜していない',"aren't":'〜ではない・〜していない',"wasn't":'〜ではなかった・〜していなかった',"weren't":'〜ではなかった・〜していなかった',"haven't":'まだ〜していない',"hasn't":'まだ〜していない',"hadn't":'まだ〜していなかった',"i'm":'私は〜です・〜しています',"you're":'あなたは〜です・〜しています',"we're":'私たちは〜です・〜しています',"they're":'彼らは〜です・〜しています',"he's":'彼は〜です・彼は〜した',"she's":'彼女は〜です・彼女は〜した',"it's":'それは〜です・それは〜した',"that's":'それは〜です',"there's":'〜がある・いる'};
const clean=w=>String(w||'').toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g,'');
function directMeaning(w){try{let v=typeof DATA!=='undefined'&&Array.isArray(DATA.vocab)?DATA.vocab.find(x=>String(x?.word||'').toLowerCase()===w):null;let m=v?.meaning||(typeof READING_GLOSSARY!=='undefined'?READING_GLOSSARY[w]:null)||state?.profile?.unknownWords?.[w]?.meaning||null;return m?{word:v?.word||w,meaning:m,data:v||null}:null}catch(_){return null}}
function candidates(w){let out=[w];if(w.endsWith("'s")&&w.length>3)out.push(w.slice(0,-2));if(w.endsWith('ies')&&w.length>4)out.push(w.slice(0,-3)+'y');if(w.endsWith('ied')&&w.length>4)out.push(w.slice(0,-3)+'y');if(w.endsWith('ves')&&w.length>4){out.push(w.slice(0,-3)+'f');out.push(w.slice(0,-3)+'fe')}if(w.endsWith('ing')&&w.length>5){let s=w.slice(0,-3);out.push(s,s+'e');if(/([a-z])\1$/.test(s))out.push(s.slice(0,-1))}if(w.endsWith('ed')&&w.length>4){let s=w.slice(0,-2);out.push(s,s+'e');if(/([a-z])\1$/.test(s))out.push(s.slice(0,-1))}if(w.endsWith('er')&&w.length>4){let s=w.slice(0,-2);out.push(s,s+'e');if(s.endsWith('i'))out.push(s.slice(0,-1)+'y')}if(w.endsWith('est')&&w.length>5){let s=w.slice(0,-3);out.push(s,s+'e');if(s.endsWith('i'))out.push(s.slice(0,-1)+'y')}if(w.endsWith('es')&&w.length>4)out.push(w.slice(0,-2));if(w.endsWith('s')&&w.length>3)out.push(w.slice(0,-1));return [...new Set(out.filter(Boolean))]}
function install(attempt=0){
 if(typeof glossLookup!=='function'||typeof renderPassage!=='function'||typeof esc!=='function'||typeof state==='undefined'){if(attempt<80)setTimeout(()=>install(attempt+1),50);return}
 if(glossLookup.__aaTapAllPatched){STATUS.installed=true;return}
 const originalGloss=glossLookup;
 glossLookup=function(raw){
  let base=originalGloss(raw);if(base?.meaning)return base;let w=clean(raw);if(CONTRACTIONS[w])return {...base,raw:String(raw||''),word:w,lemma:w,meaning:CONTRACTIONS[w],source:'fallback',learnable:false,data:null};
  for(const c of candidates(w)){let d=directMeaning(c);if(!d)continue;let via=originalGloss(c);return {...base,...via,raw:String(raw||''),word:w,lemma:via?.lemma||d.word||c,meaning:via?.meaning||d.meaning,source:via?.source||'fallback',data:via?.data||d.data||null,learnable:!!(via?.meaning||d.meaning),verbForms:via?.verbForms||null}}
  return base;
 };
 glossLookup.__aaTapAllPatched=true;
 renderPassage=function(read){if(read?.assistMode==='exam'||!state.profile.vocabSupport)return esc(read.passage);return String(read.passage).split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g).map(part=>{if(!/^[A-Za-z]/.test(part))return esc(part);let g=glossLookup(part),known=g?.meaning?'':' data-gloss-missing="1"';return `<button type="button" class="wordTap" data-action="gloss" data-word="${esc(part)}"${known} aria-label="${esc(part)} の意味を見る">${esc(part)}</button>`}).join('')};
 renderPassage.__aaTapAllPatched=true;
 document.addEventListener('click',e=>{let el=e.target.closest?.('[data-action="gloss"][data-gloss-missing="1"]');if(!el)return;let g=glossLookup(el.dataset.word);if(!g?.meaning){STATUS.unresolvedTaps++;STATUS.lastUnresolved=clean(el.dataset.word)}} ,true);
 STATUS.installed=true;
 try{if(state?.route==='study'&&state?.session?.active&&typeof render==='function')render()}catch(_){ }
}
install();
})();
