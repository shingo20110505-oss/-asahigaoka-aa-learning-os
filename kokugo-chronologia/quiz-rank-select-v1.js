(()=>{'use strict';
const VERSION='2026-09-05.3';
const FULL_DATA_URL='./data.jsonl?v=quiz15000-20260905-quality2';
const STATE_KEY='kokugoChronologiaStateV2';
const WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1';
const CYCLE_KEY='aa_kokugo_vocab_full15000_cycle_v1';
const NON_IDIOM_EXCLUDE_KEYS=new Set(['間に合う|まにあう']);
if(window.__AA_KOKUGO_QUIZ_RANK_SELECT__)return;
window.__AA_KOKUGO_QUIZ_RANK_SELECT__=VERSION;

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasJapanese=s=>/[\u3040-\u30ff\u3400-\u9fff]/.test(String(s||''));
const entryKey=x=>`${x?.word||''}|${x?.reading||''}`;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function getState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}}
function saveState(s){try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(_){}}
function loadWrong(){try{const a=JSON.parse(localStorage.getItem(WRONG_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function wrongKey(x){return [String(x?.id??''),x?.word||'',x?.reading||''].join('|')}
function saveWrong(list){const out=[],seen=new Set();for(const x of list||[]){if(!x||!x.word||!x.id)continue;const k=wrongKey(x);if(seen.has(k))continue;seen.add(k);out.push(x)}try{localStorage.setItem(WRONG_KEY,JSON.stringify(out))}catch(_){}return out}
function addWrong(item){const list=loadWrong(),k=wrongKey(item);if(!list.some(x=>wrongKey(x)===k))list.push({id:item.id,word:item.word,reading:item.reading||'',meaning:item.meaning||'',type:item.type||'',rank:item.rank||'',createdAt:Date.now()});saveWrong(list)}
function removeWrong(item){const k=wrongKey(item);saveWrong(loadWrong().filter(x=>wrongKey(x)!==k))}
function matchesFilter(x,kind,rank){return (kind==='all'||x.type===kind)&&(rank==='all'||x.rank===rank)}
function rankText(rank){return rank==='A'?'A 最優先':rank==='B'?'B 重要':rank==='C'?'C 発展':'全ランク'}
function loadCycle(){try{const x=JSON.parse(localStorage.getItem(CYCLE_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}}
function saveCycle(x){try{localStorage.setItem(CYCLE_KEY,JSON.stringify(x))}catch(_){}}
function directMeaning(id){const v=(window.KOKUGO_DIRECT_MEANINGS||{})[String(id??'')];return typeof v==='string'?v.trim():''}

let full15000=[];
async function loadFull15000(){
 if(full15000.length===15000)return full15000;
 const res=await fetch(FULL_DATA_URL,{cache:'no-cache'});
 if(!res.ok)throw new Error('15,000語データ HTTP '+res.status);
 const text=await res.text(),rows=text.split(/\r?\n/).filter(x=>x.trim()).map(x=>JSON.parse(x));
 if(rows.length!==15000)throw new Error('15,000語データ件数 '+rows.length+'（15,000ではありません）');
 const seen=new Set();
 full15000=rows.map((x,i)=>{
   const meaning=directMeaning(x.id??i);
   if(!meaning||!hasJapanese(meaning))throw new Error('日本語意味が未確認: '+String(x.term||x.id||i));
   return{
     id:'quiz-full-'+String(x.id??i),word:String(x.term||''),reading:String(x.reading||''),meaning,
     type:['yoji','idiom','four'].includes(x.type)?x.type:'four',rank:'C',source:'full15000',quality:'dictionary-supplement'
   };
 });
 for(const x of full15000){const k=entryKey(x);if(!x.word||seen.has(k))throw new Error('15,000語データに空欄または重複: '+k);seen.add(k)}
 window.__AA_KOKUGO_FULL_15000_COUNT__=full15000.length;
 return full15000;
}

function makePool(){
 const out=[],byKey=new Map();
 let excluded=0,bankOverrides=0,curatedOverrides=0;
 const put=(x,priority)=>{
   const k=entryKey(x);if(!x.word||NON_IDIOM_EXCLUDE_KEYS.has(k)){if(NON_IDIOM_EXCLUDE_KEYS.has(k))excluded++;return}
   const i=byKey.get(k);
   if(i==null){byKey.set(k,out.length);out.push({...x,_priority:priority});return}
   const prev=out[i];
   if(priority>=(prev._priority||0)){
     const stableId=prev.id||x.id;
     out[i]={...prev,...x,id:stableId,_priority:priority};
     if(priority===2)bankOverrides++;
     if(priority===3)curatedOverrides++;
   }
 };
 for(const x of full15000)put(x,1);
 const merged=[...(window.AA_JUKUGO_BANK||[]),...(window.AA_JUKUGO_ADVANCED||[])],seenBank=new Set();
 for(const x of merged){
   const k=`${x.word}|${x.reading||''}`;if(!x.word||seenBank.has(k))continue;seenBank.add(k);
   put({id:x.id,word:x.word,reading:x.reading||'',meaning:x.meaning||'',type:x.kind==='二字熟語'?'two':'three',rank:x.rank||'C',source:'jukugo-bank',quality:'verified-bank'},2)
 }
 for(const [i,x] of (window.AA_IDIOM_BANK||[]).entries()){
   put({id:'quiz-curated-'+i,word:x.word,reading:x.reading||'',meaning:x.meaning||'',type:x.kind==='四字熟語'?'yoji':'idiom',rank:x.rank||'B',source:'idiom-bank',quality:'verified-curated'},3)
 }
 const clean=out.map(({_priority,...x})=>x);
 const rankCounts=clean.reduce((a,x)=>(a[x.rank]=(a[x.rank]||0)+1,a),{}),verified=clean.filter(x=>String(x.quality||'').startsWith('verified')).length,examImportant=clean.filter(x=>String(x.quality||'').startsWith('verified')&&['A','B'].includes(x.rank)).length;
 window.__AA_KOKUGO_QUALITY_STATS__={raw15000:full15000.length,pool:clean.length,bankOverrides,curatedOverrides,excluded,verified,pendingEditorial:clean.length-verified,examImportant,rankCounts};
 return clean;
}

function validFieldValue(field,v){return !!v&&(field!=='meaning'||hasJapanese(v))}
function pickDistractors(pool,item,field){
 const vals=[],seen=new Set([item[field]]);
 const take=pred=>{for(const x of shuffle([...pool])){if(vals.length>=3)break;const v=x?.[field];if(!x||x.id===item.id||!pred(x)||!validFieldValue(field,v)||seen.has(v))continue;seen.add(v);vals.push(v)}};
 take(x=>x.type===item.type&&x.rank===item.rank);take(x=>x.type===item.type);take(x=>x.rank===item.rank);take(()=>true);
 return vals;
}
function buildQuestion(item,mode,pool){
 const modes=mode==='random'?shuffle(['meaning','reading','word']):[mode];
 for(const actual of modes){
   const field=actual==='meaning'?'meaning':actual==='reading'?'reading':'word';
   const prompt=actual==='word'?item.meaning:item.word;
   const hint=actual==='meaning'?'意味を選んでください':actual==='reading'?'読みを選んでください':'この意味に合う語句を選んでください';
   if(!validFieldValue(field,item[field])||!prompt||(actual==='word'&&!hasJapanese(prompt)))continue;
   const values=pickDistractors(pool,item,field);if(values.length<3)continue;
   return{item,actual,field,prompt,hint,answer:item[field],options:shuffle([item[field],...values])};
 }
 return null;
}
function makeSet(source,mode,pool,limit=10){const out=[];for(const item of shuffle([...source])){const q=buildQuestion(item,mode,pool);if(q)out.push(q);if(out.length===limit)break}return out}
function cycleKey(kind,rank){return `${kind}|${rank}`}
function makeNoRepeatSet(pool,kind,rank,mode){
 const state=loadCycle(),key=cycleKey(kind,rank),valid=new Set(pool.map(x=>x.id));
 let rem=Array.isArray(state[key]?.remaining)?state[key].remaining.filter((id,i,a)=>valid.has(id)&&a.indexOf(id)===i):[];
 const known=new Set(Array.isArray(state[key]?.known)?state[key].known:[]),newIds=pool.filter(x=>!known.has(x.id)).map(x=>x.id);
 if(!state[key]||!state[key].initialized){rem=shuffle(pool.map(x=>x.id));state[key]={remaining:rem,known:pool.map(x=>x.id),initialized:true,cycle:1}}
 else{
   if(newIds.length){const have=new Set(rem);rem=[...shuffle(newIds).filter(id=>!have.has(id)),...rem]}
   if(!rem.length){rem=shuffle(pool.map(x=>x.id));state[key].cycle=(Number(state[key].cycle)||0)+1}
   state[key].remaining=rem;state[key].known=pool.map(x=>x.id);
 }
 const byId=new Map(pool.map(x=>[x.id,x])),selected=[],usedIds=[];
 for(const id of rem){const item=byId.get(id);if(!item)continue;const q=buildQuestion(item,mode,pool);if(!q)continue;selected.push(q);usedIds.push(id);if(selected.length===10)break}
 const used=new Set(usedIds);state[key].remaining=rem.filter(id=>!used.has(id));saveCycle(state);
 return selected;
}

async function install(){
 const quiz=$('#jkgQuiz'),kindEl=$('#quizKind'),modeEl=$('#quizMode'),startEl=$('#quizStart'),wrongStartEl=$('#quizWrongStart'),body=$('#quizBody');
 if(!quiz||!kindEl||!modeEl||!startEl||!wrongStartEl||!body||!Array.isArray(window.AA_JUKUGO_BANK)){setTimeout(install,60);return}
 if(document.getElementById('quizRank'))return;
 body.innerHTML='<div class="quiz-summary">15,000語データをクイズに読み込み中…</div>';
 try{await loadFull15000()}catch(err){body.innerHTML='<div class="quiz-summary">15,000語データを読み込めませんでした：'+esc(err?.message||err)+'</div>';return}
 if(![...kindEl.options].some(o=>o.value==='four'))kindEl.insertAdjacentHTML('beforeend','<option value="four">四字語（補助）</option>');
 kindEl.value='all';

 const rankEl=document.createElement('select');rankEl.id='quizRank';rankEl.setAttribute('aria-label','出題ランク');rankEl.innerHTML='<option value="all" selected>全ランク</option><option value="A">A 最優先</option><option value="B">B 重要</option><option value="C">C 発展</option>';modeEl.insertAdjacentElement('afterend',rankEl);
 const config=rankEl.closest('.quiz-config');if(config)config.classList.add('aa-quiz-rank-ready');
 const style=document.createElement('style');style.id='aaKokugoQuizRankStyle';style.textContent='.quiz-config.aa-quiz-rank-ready{grid-template-columns:1fr 1fr 1fr auto auto}@media(max-width:760px){.quiz-config.aa-quiz-rank-ready{grid-template-columns:1fr 1fr}.quiz-config.aa-quiz-rank-ready #quizRank{grid-column:1/-1}.quiz-config.aa-quiz-rank-ready button{grid-column:1/-1}}';document.head.appendChild(style);
 const note=quiz.querySelector('.jkg-head .note');if(note)note.textContent='A/Bは精査済み学習バンクを優先し、辞書拡張15,000語は未精査の重要度を過大評価しないようC（発展）として扱います。同じ条件では一巡するまで同じ語を再出題しません。';

 const quizPool=makePool(),liveByKey=new Map();quizPool.forEach(x=>liveByKey.set(wrongKey(x),x));
 window.__AA_KOKUGO_QUIZ_POOL_COUNT__=quizPool.length;
 const badge=quiz.querySelector('.jkg-badge');if(badge){badge.textContent='10問 / 15,000語接続済み';badge.title='品質統合後の候補 '+quizPool.length.toLocaleString()+'語'}
 let qset=[],qi=0,qscore=0,qAnswered=false,qWrongOnly=false,qKind='all',qMode='random',qRank='all';

 function updateWrongCount(){const kind=kindEl.value||'all',rank=rankEl.value||'all',n=loadWrong().filter(x=>matchesFilter(x,kind,rank)).length;const el=$('#quizWrongCount');if(el)el.textContent=n;return n}
 function markReview(item){const s=getState();s[item.id]='review';saveState(s)}
 function finishQuiz(){const remain=updateWrongCount(),title=qWrongOnly?'間違えた問題の解き直し終了':`${qset.length}問終了`,noteText=qWrongOnly?`正解した語は誤答リストから外しました。現在この範囲に残っている誤答は ${remain} 問です。`:`15,000語データ接続済み。${rankText(qRank)}・${qKind==='all'?'全部':qKind}は一巡するまで同じ語を再出題しません。`,label=qWrongOnly?'残りを続ける':'もう10問';body.innerHTML=`<div class="quiz-summary"><div>${title}</div><b>${qscore} / ${qset.length}</b><div class="note">${esc(noteText)}</div><button class="quiz-next" id="quizRestart">${label}</button></div>`;$('#quizRestart').onclick=qWrongOnly?startWrongQuiz:startQuiz}
 function showQ(){qAnswered=false;if(qi>=qset.length){finishQuiz();return}const q=qset[qi];body.innerHTML=`<div class="quiz-meta"><span>${qi+1} / ${qset.length}${qWrongOnly?'（解き直し）':''} ・ ${esc(rankText(qRank))}</span><span>正解 ${qscore}</span></div><div class="quiz-q">${esc(q.prompt)}</div><div class="quiz-hint">${esc(q.hint)}</div><div class="quiz-opts">${q.options.map(o=>`<button class="quiz-opt" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="quiz-result" id="quizResult"></div><button class="quiz-next" id="quizNext" style="display:none">次へ</button>`;body.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{if(qAnswered)return;qAnswered=true;const val=btn.dataset.answer,ok=val===q.answer;if(ok){qscore++;if(qWrongOnly)removeWrong(q.item)}else{addWrong(q.item);markReview(q.item)}updateWrongCount();body.querySelectorAll('.quiz-opt').forEach(b=>{if(b.dataset.answer===q.answer)b.classList.add('correct');else if(b===btn&&!ok)b.classList.add('wrong');b.disabled=true});$('#quizResult').textContent=ok?(qWrongOnly?'正解！ 誤答リストから外しました。':'正解！'):'正解：'+q.answer;$('#quizNext').style.display='inline-block'});$('#quizNext').onclick=()=>{qi++;showQ()}}
 function startQuiz(){const kind=kindEl.value,mode=modeEl.value,rank=rankEl.value,pool=quizPool.filter(x=>matchesFilter(x,kind,rank));qWrongOnly=false;qKind=kind;qMode=mode;qRank=rank;if(pool.length<4){body.innerHTML='<div class="quiz-summary">この条件では出題できる語が不足しています。</div>';return}qset=makeNoRepeatSet(pool,kind,rank,mode);qi=0;qscore=0;if(!qset.length){body.innerHTML='<div class="quiz-summary">この条件では四択を作れませんでした。</div>';return}showQ()}
 function startWrongQuiz(){const kind=kindEl.value,mode=modeEl.value,rank=rankEl.value,pool=quizPool.filter(x=>matchesFilter(x,kind,rank)),saved=loadWrong().filter(x=>matchesFilter(x,kind,rank)),wrong=saved.map(x=>liveByKey.get(wrongKey(x))||x).filter(x=>x.word&&x.meaning);qWrongOnly=true;qKind=kind;qMode=mode;qRank=rank;if(!wrong.length){body.innerHTML='<div class="quiz-summary">この範囲に間違えた問題はありません。</div>';updateWrongCount();return}if(pool.length<4){body.innerHTML='<div class="quiz-summary">このランクでは四択の選択肢を作る語が不足しています。</div>';return}qset=makeSet(wrong,mode,pool);qi=0;qscore=0;if(!qset.length){body.innerHTML='<div class="quiz-summary">この条件では四択を作れませんでした。</div>';return}showQ()}

 startEl.onclick=startQuiz;wrongStartEl.onclick=startWrongQuiz;
 kindEl.addEventListener('change',()=>setTimeout(updateWrongCount,0));rankEl.addEventListener('change',updateWrongCount);updateWrongCount();
 body.innerHTML='<div class="quiz-summary">品質統合済み15,000語データ。「10問スタート」で開始します。</div>';
 document.documentElement.dataset.kokugoQuizRankSelect=VERSION;
 document.documentElement.dataset.aaKokugoQuizRank='PASS-QUALITY-MERGE';
 document.documentElement.dataset.aaKokugoQuizRandom='FULL15000-NOREPEAT-JA';
 document.documentElement.dataset.aaKokugoFull15000=String(full15000.length);
 document.documentElement.dataset.aaKokugoQuizPool=String(quizPool.length);
 document.documentElement.dataset.aaKokugoQuality='CURATED-AB-DICTIONARY-C';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();