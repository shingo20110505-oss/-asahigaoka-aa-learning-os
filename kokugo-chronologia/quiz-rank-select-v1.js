(()=>{'use strict';
const VERSION='2026-08-25.2';
const STATE_KEY='kokugoChronologiaStateV2';
const WRONG_KEY='aa_kokugo_vocab_wrong_queue_v1';
if(window.__AA_KOKUGO_QUIZ_RANK_SELECT__)return;
window.__AA_KOKUGO_QUIZ_RANK_SELECT__=VERSION;

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function getState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return {}}}
function saveState(s){try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(_){}}
function loadWrong(){try{const a=JSON.parse(localStorage.getItem(WRONG_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return []}}
function wrongKey(x){return [String(x?.id??''),x?.type||'',x?.word||'',x?.reading||''].join('|')}
function saveWrong(list){const out=[],seen=new Set();for(const x of list||[]){if(!x||!x.word||!x.id)continue;const k=wrongKey(x);if(seen.has(k))continue;seen.add(k);out.push(x)}try{localStorage.setItem(WRONG_KEY,JSON.stringify(out))}catch(_){}return out}
function addWrong(item){const list=loadWrong(),k=wrongKey(item);if(!list.some(x=>wrongKey(x)===k))list.push({id:item.id,word:item.word,reading:item.reading||'',meaning:item.meaning||'',type:item.type||'',rank:item.rank||'',createdAt:Date.now()});saveWrong(list)}
function removeWrong(item){const k=wrongKey(item);saveWrong(loadWrong().filter(x=>wrongKey(x)!==k))}
function matchesFilter(x,kind,rank){return (kind==='all'||x.type===kind)&&(rank==='all'||x.rank===rank)}
function rankText(rank){return rank==='A'?'A 最優先':rank==='B'?'B 重要':rank==='C'?'C 発展':'全ランク'}

function makePool(){
 const merged=[...(window.AA_JUKUGO_BANK||[]),...(window.AA_JUKUGO_ADVANCED||[])],seen=new Set(),bank=[];
 for(const x of merged){const key=`${x.word}|${x.reading||''}`;if(!x.word||seen.has(key))continue;seen.add(key);bank.push({...x,type:x.kind==='二字熟語'?'two':'three'})}
 const curated=(window.AA_IDIOM_BANK||[]).map((x,i)=>({id:'quiz-curated-'+i,word:x.word,reading:x.reading||'',meaning:x.meaning||'',type:x.kind==='四字熟語'?'yoji':'idiom',rank:x.rank||'B'}));
 return [...bank.map(x=>({id:x.id,word:x.word,reading:x.reading||'',meaning:x.meaning||'',type:x.type,rank:x.rank||'C'})),...curated];
}

function install(){
 const quiz=$('#jkgQuiz'),kindEl=$('#quizKind'),modeEl=$('#quizMode'),startEl=$('#quizStart'),wrongStartEl=$('#quizWrongStart'),body=$('#quizBody');
 if(!quiz||!kindEl||!modeEl||!startEl||!wrongStartEl||!body||!Array.isArray(window.AA_JUKUGO_BANK)){setTimeout(install,60);return}
 if(document.getElementById('quizRank'))return;

 const rankEl=document.createElement('select');rankEl.id='quizRank';rankEl.setAttribute('aria-label','出題ランク');rankEl.innerHTML='<option value="all" selected>全ランク</option><option value="A">A 最優先</option><option value="B">B 重要</option><option value="C">C 発展</option>';modeEl.insertAdjacentElement('afterend',rankEl);
 const config=rankEl.closest('.quiz-config');if(config)config.classList.add('aa-quiz-rank-ready');
 const style=document.createElement('style');style.id='aaKokugoQuizRankStyle';style.textContent='.quiz-config.aa-quiz-rank-ready{grid-template-columns:1fr 1fr 1fr auto auto}@media(max-width:760px){.quiz-config.aa-quiz-rank-ready{grid-template-columns:1fr 1fr}.quiz-config.aa-quiz-rank-ready #quizRank{grid-column:1/-1}.quiz-config.aa-quiz-rank-ready button{grid-column:1/-1}}';document.head.appendChild(style);
 const note=quiz.querySelector('.jkg-head .note');if(note)note.textContent='通常の10問は、選択した種類・ランクの全候補から毎回完全ランダムに出題します。過去の出題履歴・正答率・誤答履歴は通常出題の確率に影響しません。誤答だけの解き直しは専用ボタンからできます。';

 const quizPool=makePool(),liveByKey=new Map();quizPool.forEach(x=>liveByKey.set(wrongKey(x),x));
 let qset=[],qi=0,qscore=0,qAnswered=false,qWrongOnly=false,qKind='all',qMode='random',qRank='all';

 function updateWrongCount(){const kind=kindEl.value||'all',rank=rankEl.value||'all',n=loadWrong().filter(x=>matchesFilter(x,kind,rank)).length;const el=$('#quizWrongCount');if(el)el.textContent=n;return n}
 function markReview(item){const s=getState();s[item.id]='review';saveState(s)}
 function buildQuestion(item,mode,pool){const modes=mode==='random'?shuffle(['meaning','reading','word']):[mode];for(const actual of modes){const field=actual==='meaning'?'meaning':actual==='reading'?'reading':'word',prompt=actual==='word'?item.meaning:item.word,hint=actual==='meaning'?'意味を選んでください':actual==='reading'?'読みを選んでください':'この意味に合う語句を選んでください';if(!item[field]||!prompt)continue;const values=[];for(const x of shuffle(pool.filter(x=>x.id!==item.id&&x[field]&&x[field]!==item[field]))){if(!values.includes(x[field]))values.push(x[field]);if(values.length===3)break}if(values.length<3)continue;return{item,actual,field,prompt,hint,answer:item[field],options:shuffle([item[field],...values])}}return null}
 function makeSet(source,mode,pool){const out=[];for(const item of shuffle([...source])){const q=buildQuestion(item,mode,pool);if(q)out.push(q);if(out.length===10)break}return out}
 function finishQuiz(){const remain=updateWrongCount(),title=qWrongOnly?'間違えた問題の解き直し終了':`${qset.length}問終了`,noteText=qWrongOnly?`正解した語は誤答リストから外しました。現在この範囲に残っている誤答は ${remain} 問です。`:`${rankText(qRank)}の全候補から毎回完全ランダムで出題します。過去の出題履歴や正誤履歴による優先付けはありません。`,label=qWrongOnly?'残りを続ける':'もう10問';body.innerHTML=`<div class="quiz-summary"><div>${title}</div><b>${qscore} / ${qset.length}</b><div class="note">${esc(noteText)}</div><button class="quiz-next" id="quizRestart">${label}</button></div>`;$('#quizRestart').onclick=qWrongOnly?startWrongQuiz:startQuiz}
 function showQ(){qAnswered=false;if(qi>=qset.length){finishQuiz();return}const q=qset[qi];body.innerHTML=`<div class="quiz-meta"><span>${qi+1} / ${qset.length}${qWrongOnly?'（解き直し）':''} ・ ${esc(rankText(qRank))}</span><span>正解 ${qscore}</span></div><div class="quiz-q">${esc(q.prompt)}</div><div class="quiz-hint">${esc(q.hint)}</div><div class="quiz-opts">${q.options.map(o=>`<button class="quiz-opt" data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="quiz-result" id="quizResult"></div><button class="quiz-next" id="quizNext" style="display:none">次へ</button>`;body.querySelectorAll('.quiz-opt').forEach(btn=>btn.onclick=()=>{if(qAnswered)return;qAnswered=true;const val=btn.dataset.answer,ok=val===q.answer;if(ok){qscore++;if(qWrongOnly)removeWrong(q.item)}else{addWrong(q.item);markReview(q.item)}updateWrongCount();body.querySelectorAll('.quiz-opt').forEach(b=>{if(b.dataset.answer===q.answer)b.classList.add('correct');else if(b===btn&&!ok)b.classList.add('wrong');b.disabled=true});$('#quizResult').textContent=ok?(qWrongOnly?'正解！ 誤答リストから外しました。':'正解！'):'正解：'+q.answer;$('#quizNext').style.display='inline-block'});$('#quizNext').onclick=()=>{qi++;showQ()}}
 function startQuiz(){const kind=kindEl.value,mode=modeEl.value,rank=rankEl.value,pool=quizPool.filter(x=>matchesFilter(x,kind,rank));qWrongOnly=false;qKind=kind;qMode=mode;qRank=rank;if(pool.length<4){body.innerHTML='<div class="quiz-summary">このランクでは出題できる語が不足しています。</div>';return}qset=makeSet(pool,mode,pool);qi=0;qscore=0;if(!qset.length){body.innerHTML='<div class="quiz-summary">この条件では四択を作れませんでした。</div>';return}showQ()}
 function startWrongQuiz(){const kind=kindEl.value,mode=modeEl.value,rank=rankEl.value,pool=quizPool.filter(x=>matchesFilter(x,kind,rank)),saved=loadWrong().filter(x=>matchesFilter(x,kind,rank)),wrong=saved.map(x=>liveByKey.get(wrongKey(x))||x).filter(x=>x.word&&x.meaning);qWrongOnly=true;qKind=kind;qMode=mode;qRank=rank;if(!wrong.length){body.innerHTML='<div class="quiz-summary">この範囲に間違えた問題はありません。</div>';updateWrongCount();return}if(pool.length<4){body.innerHTML='<div class="quiz-summary">このランクでは四択の選択肢を作る語が不足しています。</div>';return}qset=makeSet(wrong,mode,pool);qi=0;qscore=0;if(!qset.length){body.innerHTML='<div class="quiz-summary">この条件では四択を作れませんでした。</div>';return}showQ()}

 startEl.onclick=startQuiz;wrongStartEl.onclick=startWrongQuiz;
 kindEl.addEventListener('change',()=>setTimeout(updateWrongCount,0));
 rankEl.addEventListener('change',updateWrongCount);
 updateWrongCount();
 document.documentElement.dataset.kokugoQuizRankSelect=VERSION;
 document.documentElement.dataset.aaKokugoQuizRank='PASS';
 document.documentElement.dataset.aaKokugoQuizRandom='UNIFORM';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
