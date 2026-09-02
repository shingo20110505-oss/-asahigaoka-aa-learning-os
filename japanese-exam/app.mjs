import {VERSION,assertPack,scoreQuestion,scoreExam,wrongOperators,selectQuestions,shuffleChoices,OPERATOR_LABELS} from './core.mjs';
import {starterPacks} from './starter-packs.mjs';
import {authorInstructions} from './prompts.mjs';
const app=document.getElementById('app');
const KEYS={session:'aa_japanese_exam_session_v1',history:'aa_japanese_exam_history_v1',imports:'aa_japanese_exam_imports_v1'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code=(q,id)=>'アイウエオカ'[q.choices.findIndex(c=>c.id===id)]||'―';
const names={1:'論説・説明',2:'漢字・語句',3:'小説・随筆',4:'古典'};
const domainNames={modern_logical:'論説・説明',kanji_vocabulary:'漢字・語句',literary_or_essay_reading:'小説・随筆',classical:'古典'};
let storageError=false,message='',session=null,history=[],view='setup',feedback=false,promptOpen=false;
const packs=starterPacks.map(assertPack);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageError=true;return false;}}
const imported=read(KEYS.imports,[]);
if(Array.isArray(imported))for(const p of imported){try{assertPack(p);if(!packs.some(x=>x.id===p.id))packs.push(p);}catch{/* Ignore invalid local imports; do not erase stored content. */}}
history=read(KEYS.history,[]);if(!Array.isArray(history))history=[];
history=history.filter(h=>h&&typeof h.id==='string'&&typeof h.title==='string'&&Number.isFinite(h.at)&&Number.isFinite(h.earned)&&Number.isFinite(h.max)&&h.earned>=0&&h.earned<=h.max);
const previous=read(KEYS.session,null);
if(previous?.schemaVersion===1 && previous.pack && Array.isArray(previous.questions)){
  try{assertPack(previous.pack);const known=new Map(previous.pack.questions.map(q=>[q.id,q]));
    if(previous.questions.every(q=>known.has(q.id)) && previous.questions.length && previous.responses && typeof previous.responses==='object'){
      // Restore only question IDs and display order; use validated content for answers and scores.
      session={...previous,questions:previous.questions.map(q=>{
        const canonical=known.get(q.id),order=(q.choices||[]).map(c=>c.id);
        return order.length===canonical.choices.length && new Set(order).size===order.length && order.every(id=>canonical.choices.some(c=>c.id===id)) ? {...canonical,choices:order.map(id=>canonical.choices.find(c=>c.id===id))} : canonical;
      }),index:Math.max(0,Math.min(previous.index||0,previous.questions.length-1)),flags:previous.flags||{},revealed:previous.revealed||{}};
    }
  }catch{/* Preserve data; offer a fresh start. */}
}
const params=new URLSearchParams(location.search);
const incoming={domains:(params.get('domains')||'').split(',').filter(x=>Object.hasOwn(domainNames,x)),mode:params.get('mode')==='practice'?'practice':'full',minutes:Math.max(5,Math.min(90,Number(params.get('minutes'))||45)),classicalGenre:['kobun','kanbun'].includes(params.get('classicalGenre'))?params.get('classicalGenre'):null};
function save(){if(session)write(KEYS.session,session);}
function weakness(){const counts={};for(const h of history)for(const [k,n] of Object.entries(h.operators||{}))counts[k]=(counts[k]||0)+Number(n||0);return Object.entries(counts).filter(([k])=>OPERATOR_LABELS[k]).sort((a,b)=>b[1]-a[1]);}
function rule(q){if(q.format==='multi_slot_choice'&&q.scoring.rule==='additive_partial')return '各欄1点。同じ選択肢を複数の欄に使えます。';if(q.format==='ordered_choice')return q.scoring.rule==='all_or_nothing'?`順序が全て一致した場合に${q.points}点。同じ選択肢は一度だけ。`:'指定した採点単位ごとの部分点。同じ選択肢は一度だけ。';if(q.format==='multi_select')return q.scoring.rule==='additive_partial'?`${q.requiredCount}つ選択。正しい選択肢1つにつき${q.points/q.requiredCount}点（選択数不足は0点）。`:`${q.requiredCount}つ選択。全て一致した場合に${q.points}点。`;return `${q.points}点・一つ選択。`;}
function chrome(body){return `${message?`<div class="notice" role="status">${esc(message)}</div>`:''}${storageError?'<p class="error">端末への保存ができません。画面を閉じると今回の解答が失われる可能性があります。既存の履歴は削除していません。</p>':''}${body}<footer>愛知県の入試傾向を参考にした非公式・オリジナル教材です。公式問題・成績予測ではありません。解答はこの端末に保存し、外部のAIへ送信しません。既存の復習・語彙・音声・画像の保存データは変更しません。</footer>`;}
function renderSetup(){
 const weak=weakness(),resume=session&&!session.finished;
 const body=`<section class="panel"><div class="eyebrow">AICHI / JAPANESE</div><h1>本文と選択肢の「ずれ」を見抜く。</h1><p>論説・小説／随筆・語彙・古典。長い選択肢を根拠と照合し、主語・範囲・因果・言い過ぎを確かめます。</p><div class="summary"><div class="stat"><strong>22</strong> 点</div><div class="stat"><strong>4</strong> 大問</div><div class="stat"><strong>${packs.length}</strong> セット</div></div><p class="muted">全問マーク式。教材選択・並べ替え・採点は端末内で動くため、API料金はかかりません。選択肢の順序は変わりますが、同じセットは同じ本文・設問です。</p>${resume?'<div class="notice">途中の解答があります。<div class="controls"><button class="primary" data-action="resume">途中から続ける</button></div></div>':''}</section>
 <div class="grid"><section class="panel"><h2>演習を始める</h2><label class="field">教材<select id="pack">${packs.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}（${esc(p.levelLabel||'応用')}）</option>`).join('')}</select></label><label class="field">解き方<select id="mode"><option value="full" ${incoming.mode==='full'?'selected':''}>本番構成・採点は最後</option><option value="practice" ${incoming.mode==='practice'?'selected':''}>分野別・一問ごとに根拠確認</option><option value="weak">誤答傾向を優先・6問</option></select></label><fieldset><legend>分野（本番構成は全分野）</legend><div class="checks">${Object.entries(domainNames).map(([id,n])=>`<label><input type="checkbox" name="domain" value="${id}" ${!incoming.domains.length||incoming.domains.includes(id)?'checked':''}>${n}</label>`).join('')}</div></fieldset><label class="checks"><input id="timed" type="checkbox">時間を計る</label><label class="field">制限時間（分）<input id="minutes" type="number" min="5" max="90" value="${incoming.minutes}"></label><div class="controls"><button class="primary" data-action="start">この教材で始める</button></div><p class="muted">本番構成は現代文15点＋語句3点＋古典4点。分野別は選んだ分野だけを採点します。旧形式の記述問題は出しません。</p></section>
 <section class="panel"><h2>この端末の記録</h2>${history.length?`<p>${history.length}回の学習記録があります。</p><table class="score-table"><thead><tr><th>最近の演習</th><th>得点</th></tr></thead><tbody>${history.slice(-5).reverse().map(h=>`<tr><td>${esc(h.title)}<br><span class="muted">${esc(new Date(h.at).toLocaleDateString('ja-JP'))}・${h.mode==='full'?'本番構成':'演習'}</span></td><td>${h.earned}/${h.max}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">最初の演習が終わると、得点と誤答の種類がここに残ります。</p>'}<h3>選んだ誤答に多いずれ</h3>${weak.length?`<ul>${weak.slice(0,5).map(([k,n])=>`<li>${esc(OPERATOR_LABELS[k])}：${n}回</li>`).join('')}</ul>`:'<p class="muted">まだ記録がありません。未回答だけで弱点を判定することはありません。</p>'}</section></div>
 <section class="panel"><details><summary>新しい教材を追加する</summary><p>追加用の指示文をAIへ渡し、返された問題JSONを読み込めます。構造・正答数・本文引用・配点は自動検査します。ただし、AIの解釈が正しいかは別に確認が必要です。</p><div class="controls"><button data-action="prompt">作問用の指示文を表示</button><label class="button">教材JSONを読み込む<input id="import" type="file" accept=".json,application/json" hidden></label></div>${promptOpen?`<textarea readonly aria-label="作問用の指示文">${esc(authorInstructions())}</textarea>`:''}<p class="muted">読み込んだ教材はこの端末だけに保存します。自動生成を装った定型文の水増しは行いません。</p></details></section>`;
 app.innerHTML=chrome(body);
}
function passageHTML(q,all=false){const ids=new Set(q.evidence.map(e=>e.sourceId));return session.pack.passages.filter(p=>(all||p.major===q.major||ids.has(p.id))&&(p.role!=='answer_only'||all)).map(p=>`<article><h2>${esc(p.title)}</h2><p class="muted">${esc(p.genre)}・${esc(p.rights.label)}</p><div class="passage">${p.paragraphs.map((t,i)=>`<p id="source-${esc(p.id)}-${i+1}" class="anchor-target"><span class="pno">${i+1}</span>${esc(t)}</p>`).join('')}</div></article>`).join('');}
function explanations(q){const r=session.responses[q.id],s=scoreQuestion(q,r);return `<section class="explanation"><h3 class="${s.correct?'good':s.earned?'':'bad'}">${s.correct?'正解':s.earned?'部分点':'根拠を確認'} ${s.earned} / ${s.max}点</h3><p>${esc(q.explanation)}</p><h3>本文の根拠</h3>${q.evidence.map(e=>{const p=session.pack.passages.find(p=>p.id===e.sourceId);return `<div class="evidence">「${esc(e.quote)}」${p.role==='answer_only'?`<span class="muted"> ${esc(p.title)}</span>`:`<a href="#source-${esc(e.sourceId)}-${e.paragraph}">${esc(p.title)}・第${e.paragraph}段落へ</a>`}</div>`}).join('')}<details><summary>主語・範囲・因果を分けて確かめる</summary><dl>${Object.entries({subject:'主語',predicate:'内容',scope:'範囲',causality:'因果・関係',modality:'程度・断定',paraphrase:'言い換え'}).map(([k,n])=>`<dt>${n}</dt><dd>${esc(q.proposition[k])}</dd>`).join('')}</dl></details><h3>選択肢ごとの照合</h3>${q.choices.map(c=>{const structured=['ordered_choice','multi_slot_choice'].includes(q.format),ok=q.answers.includes(c.id),selected=Array.isArray(r)&&r.includes(c.id);return `<div class="feedback ${structured?'':ok?'correct':selected?'incorrect':''}"><div><span class="choice-code">${code(q,c.id)}</span> ${esc(c.text)}</div>${!structured?`<p class="${ok?'good':selected?'bad':'muted'}">${ok?'正答':selected?'あなたの選択':'誤答肢'}${q.polarity==='not_stated'?(c.relation==='not_stated'?'・本文に記載なし':'・本文に記載あり'):''}</p>`:''}<p>${esc(c.explanation)}</p>${!structured&&!ok?`<p class="muted">ずれ：<mark>${esc(c.errorSpan)}</mark><br>${esc(OPERATOR_LABELS[c.operator]||c.operator)}</p>`:''}</div>`}).join('')}${q.marks?`<p class="notice">正しいマーク：${q.marks.map(m=>`${esc(m.label)}＝${code(q,m.answer)}`).join(' ／ ')}</p>`:''}</section>`;}
function renderQuestion(){
 const q=session.questions[session.index],r=session.responses[q.id],revealed=!!session.revealed[q.id]||session.finished;
 const struct=['ordered_choice','multi_slot_choice'].includes(q.format),answered=scoreQuestion(q,r).complete;
 const answer=struct?`<div>${q.choices.map(c=>`<div class="candidate"><span class="choice-code">${code(q,c.id)}</span> ${esc(c.text)}</div>`).join('')}</div><fieldset><legend>各欄の記号を選択</legend>${q.marks.map(m=>`<label class="mark-row">${esc(m.label)}<select data-mark="${esc(m.id)}" ${revealed?'disabled':''}><option value="">未選択</option>${q.choices.map(c=>`<option value="${esc(c.id)}" ${r?.[m.id]===c.id?'selected':''}>${code(q,c.id)}　${esc(c.text)}</option>`).join('')}</select></label>`).join('')}</fieldset>`:`<fieldset><legend>${q.requiredCount===1?'一つ選んでください':`${q.requiredCount}つ選んでください`}</legend>${q.choices.map(c=>`<label class="choice"><input type="${q.requiredCount===1?'radio':'checkbox'}" name="answer" value="${esc(c.id)}" ${r?.includes(c.id)?'checked':''} ${revealed?'disabled':''}><span><span class="choice-code">${code(q,c.id)}</span> ${esc(c.text)}</span></label>`).join('')}</fieldset>`;
 app.innerHTML=chrome(`<section class="panel"><div class="toolbar"><div><span class="eyebrow">${session.finished?'解答の確認':session.mode==='full'?'本番構成':'分野別・弱点演習'}</span><h1>${esc(session.pack.title)}</h1></div><span id="timer" class="timer"></span><button data-action="setup">設定へ戻る</button></div><nav class="question-nav" aria-label="問題を移動">${session.questions.map((x,i)=>`<button class="jump ${i===session.index?'current':''} ${scoreQuestion(x,session.responses[x.id]).complete?'answered':''} ${session.flags[x.id]?'flagged':''}" data-jump="${i}" aria-label="${names[x.major]} ${x.displayNumber}" ${i===session.index?'aria-current="step"':''}>${i+1}</button>`).join('')}</nav><p class="muted">色つき＝回答済み ／ 下線＝見直し候補。解答は移動しても残ります。</p></section><div class="reader"><section class="panel source">${q.major===2?'<h2>漢字・語句</h2><p>文脈・漢字の意味・語句の使い分けを確かめます。解答後に語彙の根拠が表示されます。</p>':passageHTML(q)}</section><section class="panel question"><div class="toolbar"><div class="eyebrow">大問${['','一','二','三','四'][q.major]} ${esc(q.displayNumber)} ／ ${q.points}点</div><button data-action="flag" aria-pressed="${!!session.flags[q.id]}">${session.flags[q.id]?'見直し候補を解除':'見直し候補にする'}</button></div><p class="question-text">${esc(q.stem)}</p><p class="score-rule">${rule(q)}</p>${answer}${!scoreQuestion(q,r).valid?'<p class="error">同じ記号を重複して並べていないか、選択数を確認してください。</p>':''}<div class="controls">${session.index?'<button data-action="prev">前へ</button>':''}${session.mode!=='full'&&!revealed?`<button class="primary" data-action="check" ${answered?'':'disabled'}>採点して根拠を確認</button>`:''}${session.index<session.questions.length-1?'<button data-action="next">次へ</button>':''}${session.finished?'<button class="primary" data-action="results">結果へ</button>':'<button class="primary" data-action="finish">終了して採点</button>'}</div>${revealed?explanations(q):''}</section></div>`);
 tick();
}
function renderResults(){const result=scoreExam(session.questions,session.responses);app.innerHTML=chrome(`<section class="panel"><div class="eyebrow">AFTER CHECK</div><h1>${result.earned} / ${result.max} 点</h1><p>${esc(session.pack.title)}${session.mode!=='full'?'・分野別／弱点演習':''}</p><table class="score-table"><thead><tr><th>分野</th><th>得点</th></tr></thead><tbody>${result.majors.filter(r=>r.max).map(r=>`<tr><td>${names[r.major]}</td><td>${r.earned} / ${r.max}</td></tr>`).join('')}</tbody></table><p class="muted">合否や実際の入試得点を予測する数値ではありません。正答の根拠と、自分が選んだ誤答のずれを確認してください。</p><div class="controls"><button class="primary" data-action="review-wrong">誤答・未回答から確認</button><button data-action="review-all">全問の解説を見る</button><button data-action="setup">教材を選ぶ</button></div></section><section class="panel"><h2>問題別の結果</h2>${result.details.map((r,i)=>`<div class="toolbar feedback"><div>大問${['','一','二','三','四'][r.major]} ${esc(session.questions[i].displayNumber)}　<span class="${r.correct?'good':'bad'}">${r.earned}/${r.max}点${r.complete?'':'・未完／無効'}</span></div><button data-jump="${i}">根拠へ戻る</button></div>`).join('')}</section>`);}
function render(){feedback=false;if(view==='question'&&session)renderQuestion();else if(view==='results'&&session)renderResults();else renderSetup();}
function start(){if(session&&!session.finished&&!confirm('途中の解答を新しい演習に置き換えますか？過去の結果は残ります。'))return;
 const pack=packs.find(p=>p.id===document.getElementById('pack').value),mode=document.getElementById('mode').value;
 const domains=mode==='full'?[]:[...document.querySelectorAll('[name=domain]:checked')].map(e=>e.value);
 if(mode!=='full'&&!domains.length){message='演習する分野を一つ以上選んでください。';render();return;}
 let questions=(mode==='practice'?pack.questions.filter(q=>domains.includes(q.domain)):selectQuestions(pack,{mode,domains,focus:weakness().slice(0,3).map(x=>x[0])}));
 if(mode!=='full'&&incoming.classicalGenre){const classical=pack.passages.find(p=>p.major===4);const genre=classical?.genre.includes('漢文')?'kanbun':'kobun';if(genre!==incoming.classicalGenre)questions=questions.filter(q=>q.major!==4);}
 if(!questions.length){message='選択した古典の種類を含まない教材です。「空白の調査ノート」は古文、「間を聞く」は漢文風書き下し文を含みます。教材を選び直してください。';render();return;}
 questions=questions.map(q=>shuffleChoices(q));
 const timed=document.getElementById('timed').checked,minutes=Math.max(5,Math.min(90,Number(document.getElementById('minutes').value)||45));
 session={schemaVersion:1,id:globalThis.crypto?.randomUUID?.()||'ja-'+Date.now(),pack,questions,mode,index:0,responses:{},flags:{},revealed:{},startedAt:Date.now(),deadline:timed?Date.now()+minutes*60000:null,finished:false};
 message='';save();view='question';render();window.scrollTo(0,0);}
function finish(auto=false){if(!session||session.finished)return;const missing=session.questions.filter(q=>!scoreQuestion(q,session.responses[q.id]).complete).length;
 if(!auto&&!confirm(`${missing?`未回答・未完成が${missing}問あります。`:'全問回答済みです。'}終了して採点しますか？`))return;
 session.finished=true;session.finishedAt=Date.now();const result=scoreExam(session.questions,session.responses),operators={};
 for(const q of session.questions){const r=session.responses[q.id];if(r&&(Array.isArray(r)?r.length:Object.values(r).some(Boolean)))for(const k of wrongOperators(q,r))operators[k]=(operators[k]||0)+1;}
 if(!history.some(h=>h.id===session.id))history.push({id:session.id,title:session.pack.title,packId:session.pack.id,mode:session.mode,at:session.finishedAt,earned:result.earned,max:result.max,operators});
 write(KEYS.history,history);save();view='results';message=auto?'制限時間になりました。保存済みの解答を採点しました。':'';render();window.scrollTo(0,0);}
function tick(){if(!session||session.finished||!session.deadline)return;const seconds=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));const el=document.getElementById('timer');if(el){el.textContent=`残り ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;el.classList.toggle('warning',seconds<300);}if(seconds===0)finish(true);}
app.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;if(el.dataset.jump!==undefined){if(!session)return;session.index=Number(el.dataset.jump);save();view='question';message='';render();window.scrollTo(0,0);return;}const action=el.dataset.action;
 if(action==='start')return start();if(action==='prompt'){promptOpen=true;render();const details=app.querySelector('details');if(details)details.open=true;return;}
 if(action==='setup'){view='setup';message='';render();return;}
 if(action==='resume'&&session){view=session.finished?'results':'question';render();return;}
 if(!session)return;const q=session.questions[session.index];
 if(action==='finish')return finish();if(action==='results'){view='results';render();return;}
 if(action==='flag'){session.flags[q.id]=!session.flags[q.id];save();render();return;}
 if(action==='check'){if(scoreQuestion(q,session.responses[q.id]).complete){session.revealed[q.id]=true;save();render();}return;}
 if(action==='prev'||action==='next'){session.index=Math.max(0,Math.min(session.questions.length-1,session.index+(action==='next'?1:-1)));save();message='';render();window.scrollTo(0,0);return;}
 if(action==='review-all'||action==='review-wrong'){session.index=action==='review-wrong'?Math.max(0,session.questions.findIndex(x=>!scoreQuestion(x,session.responses[x.id]).correct)):0;view='question';render();window.scrollTo(0,0);}
});
app.addEventListener('change',async e=>{
 if(e.target.id==='import'){
   const file=e.target.files?.[0];if(!file)return;
   try{if(file.size>2000000)throw Error('ファイルが大きすぎます。2MB以下の一式を選んでください。');const pack=assertPack(JSON.parse(await file.text()));if(packs.some(p=>p.id===pack.id))throw Error('同じIDの教材は既にあります。');packs.push(pack);write(KEYS.imports,packs.filter(p=>!starterPacks.some(s=>s.id===p.id)));message='教材をこの端末へ追加しました。内容の解釈は学習前にも確認してください。';}catch(err){message='追加できません：'+err.message;}render();return;
 }
 if(view!=='question'||!session||session.finished)return;const q=session.questions[session.index];if(session.revealed[q.id])return;
 if(e.target.name==='answer'){
   const picked=[...app.querySelectorAll('input[name=answer]:checked')].map(x=>x.value);
   if(picked.length>q.requiredCount){e.target.checked=false;message=`選べるのは${q.requiredCount}つまでです。別の選択肢を解除してから選んでください。`;render();return;}
   session.responses[q.id]=picked;
 }else if(e.target.dataset.mark)session.responses[q.id]={...(session.responses[q.id]||{}),[e.target.dataset.mark]:e.target.value};else return;
 message='';save();const focused=e.target.name==='answer'?`input[value="${e.target.value}"]`:`select[data-mark="${e.target.dataset.mark}"]`;render();app.querySelector(focused)?.focus({preventScroll:true});
});
window.addEventListener('pagehide',save);window.addEventListener('pageshow',tick);setInterval(tick,1000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(()=>{});
render();
// Optional accepted online packs: failures never remove the built-in offline exercises.
fetch('./catalog.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(async catalog=>{
  if(catalog?.schemaVersion!==1||!Array.isArray(catalog.entries))return;
  let added=0;
  for(const entry of catalog.entries.slice(0,100)){
    if(!/^[a-f0-9]{64}$/.test(entry.sha256)||entry.path!==`items/${entry.sha256}.json`)continue;
    try{const r=await fetch('./'+entry.path,{cache:'no-cache'});if(!r.ok)continue;const raw=await r.text();if(raw.length>2000000||!crypto.subtle)continue;
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)continue;
      const pack=assertPack(JSON.parse(raw));if(pack.quality.method!=='independent-blind-answer-check'||packs.some(p=>p.id===pack.id))continue;packs.push(pack);added++;
    }catch{/* Keep current validated content available. */}
  }
  // Do not rerender the setup form while the learner is making selections.
  if(added){message=`新しい検査済み教材を${added}セット読み込みました。設定へ戻ると選べます。`;}
}).catch(()=>{});
