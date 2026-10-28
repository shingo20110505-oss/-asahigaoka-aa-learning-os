import {esc,heading,toast} from '../ui.mjs';
import {scienceItems,scienceUnits,scienceFields,scienceLevels,scienceSources,scienceVersion,filterScience,scienceCardId,scienceProgress,saveScienceCard,rateScience} from '../science-content.mjs';

export async function mount({main,store,query,tail,rememberPath=()=>{}}){
 const filters={grade:query.get('grade')||'all',field:query.get('field')||'all',unit:query.get('unit')||'all',level:query.get('level')||'all',status:query.get('status')||'all',query:query.get('q')||''};
 let tab=query.get('tab')==='scope'?'scope':'study',limit=12,saving=false,focusId=scienceItems.some(x=>x.id===tail)?tail:'';
 const revealed=new Set(),unitById=new Map(scienceUnits.map(u=>[u.id,u]));
 const rows=()=>focusId?scienceItems.filter(x=>x.id===focusId):filterScience({...filters,state:store.state});
 function syncPath(){
  const params=new URLSearchParams();for(const [key,value] of Object.entries(filters))if(value&&value!=='all')params.set(key==='query'?'q':key,value);
  if(tab==='scope')params.set('tab','scope');
  const suffix=params.toString();history.replaceState(history.state,'','#/science-memory'+(focusId?'/'+focusId:'')+(suffix?'?'+suffix:''));rememberPath();
 }
 const select=(name,label,options)=>`<label class="field"><span>${label}</span><select data-science-filter="${name}" aria-label="${label}">${options.map(([value,text])=>`<option value="${esc(value)}" ${String(filters[name])===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
 const source=(id,pages='')=>{const ref=scienceSources[id];return `<li><a href="${esc(ref.url)}" target="_blank" rel="noopener">${esc(ref.title)} ↗</a>${pages?`（本文 p.${esc(pages)}）`:''}<p>${esc(ref.scope)}</p></li>`;};
 function lesson(x){
  const u=unitById.get(x.unit),shown=revealed.has(x.id),r=scienceProgress(store.state,x),saved=store.state.cards.some(c=>c.id===scienceCardId(x)&&!c.archived);
  return `<article class="panel science-card" id="${x.id}"><div class="science-meta"><span>中${x.grade} · ${scienceFields[x.field]}</span><span>${esc(u.title)}</span><span class="badge">${scienceLevels[x.level]}</span></div><h2>${esc(x.question)}</h2><button class="button ${shown?'secondary':''}" data-action="reveal" data-id="${x.id}" aria-expanded="${shown}" aria-controls="answer-${x.id}">${shown?'答えを隠す':'答えと理由を見る'}</button><div id="answer-${x.id}" ${shown?'':'hidden'}>${shown?`<div class="science-answer"><p class="science-core">${esc(x.answer)}</p><h3>理由・しくみ</h3><p>${esc(x.reason)}</p><h3>つなげて覚える</h3><p>${esc(x.connection)}</p></div><div class="actions"><button class="button secondary" data-action="rate" data-id="${x.id}" data-rating="again">もう一度</button><button class="button" data-action="rate" data-id="${x.id}" data-rating="good">思い出せた</button></div>`:''}</div><div class="science-save"><button class="button secondary small" data-action="save" data-id="${x.id}">${saved?'復習に追加済み':'復習に追加'}</button><span data-progress="${x.id}" class="small muted">${r?.repetitions?`学習 ${r.repetitions}回 · 次回 ${new Date(r.due).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`:saved?'暗記カードからも復習できます':'答えを見てから、思い出せたか記録しよう。'}</span></div><details class="science-sources"><summary>この項目の参照資料</summary><p>範囲と主要概念：${esc(u.curriculum)}。問い・理由・比較の文章はRISE独自です。</p><ul>${source('mext',u.pages)}${source('tokyo'+x.grade)}${[...new Set(x.factIds)].filter(id=>id!=='mext'&&id!=='tokyo'+x.grade).map(id=>source(id)).join('')}</ul><p class="small muted">教科書会社の指導計画は範囲の照合に使用。全文章を複数資料で個別検証したものではありません。確認日：2026-10-28</p></details></article>`;
 }
 function counts(){return `<span>全${scienceItems.length}項目</span><span>学習済み ${scienceItems.filter(x=>scienceProgress(store.state,x)?.repetitions).length}</span><span>今日の復習 ${filterScience({status:'due',state:store.state}).length}</span>`;}
 function list(){const items=rows();return `<p class="science-result small muted" role="status">${items.length}項目${focusId?' · リンクした項目を表示中':''}${filters.status==='due'?' · 登録済みで復習時刻を迎えた項目':''}</p>${items.slice(0,limit).map(lesson).join('')}${items.length===0?'<div class="panel"><p>該当する項目はありません。条件を減らしてみましょう。</p><button class="button secondary" data-action="reset">すべての項目に戻る</button></div>':''}${items.length>limit?'<button class="button secondary science-more" data-action="more">次の12項目を表示</button>':''}`;}
 function redrawList(){main.querySelector('#science-counts').innerHTML=counts();main.querySelector('#science-list').innerHTML=list();}
 function draw(){
  main.classList.add('science-view');
  main.innerHTML=heading('SCIENCE · RECALL','理科を、理由と覚える。',`中学1〜3年の物理・化学・生物・地学。${scienceUnits.length}単元・${scienceItems.length}項目を、答えを隠して思い出そう。`)+`<div class="science-counts" id="science-counts">${counts()}</div><nav class="chips" aria-label="理科の学び方"><button class="chip ${tab==='study'?'active':''}" data-action="tab" data-tab="study" aria-pressed="${tab==='study'}">暗記する</button><button class="chip ${tab==='scope'?'active':''}" data-action="tab" data-tab="scope" aria-pressed="${tab==='scope'}">範囲と調査資料</button><a class="chip" href="#/memory">暗記カードで復習</a></nav><div id="science-body"></div>`;
  const body=main.querySelector('#science-body');
  if(tab==='study'){
   const units=scienceUnits.filter(u=>(filters.grade==='all'||u.grade===Number(filters.grade))&&(filters.field==='all'||u.field===filters.field));
   body.innerHTML=`<div class="science-filters">${select('grade','理科の学年',[['all','全学年'],['1','中1'],['2','中2'],['3','中3']])}${select('field','理科の分野',[['all','全分野'],...Object.entries(scienceFields)])}${select('unit','理科の単元',[['all','全単元'],...units.map(u=>[u.id,`中${u.grade} ${u.title}`])])}${select('level','理科の学習段階',[['all','基本と発展'],...Object.entries(scienceLevels)])}${select('status','理科の学習状況',[['all','すべて'],['new','未学習'],['due','今日の復習'],['weak','もう一度']])}<label class="field science-search"><span>用語・理由・関連を検索</span><input type="search" data-science-search aria-label="理科を検索" value="${esc(filters.query)}" placeholder="例：道管、イオン、月 満ち欠け"></label></div><div class="science-guide"><p class="small muted">基本で用語と関係を、発展で理由や混同しやすい点を確認。計算演習は含みません。段階はRISEの学習順です。発展には酵素名など、資料によって扱いが異なる詳しい内容も含みます。</p><button class="button secondary small" data-action="hide">表示した答えを隠す</button><button class="button secondary small" data-action="reset">条件をリセット</button></div><div id="science-list">${list()}</div>`;
  }else{
   body.innerHTML=`<section class="panel science-scope"><h2>暗記する範囲</h2><p>用語・定義・分類・性質・仕組み、観察結果、実験操作とその理由を扱います。公式は量の意味と関係を言葉で説明する範囲にとどめ、数値代入・計算手順・作図演習は含めません。</p><p>文部科学省の理科解説を基準に、東京書籍・大日本図書・啓林館の公開指導計画で主要単元を照合しました。すべての教科書の全記述を網羅したという意味ではありません。学年は標準的な配当で、授業順は学校によって異なります。</p><h2>学年・分野から選ぶ</h2><div class="science-coverage">${[1,2,3].flatMap(g=>Object.entries(scienceFields).map(([f,name])=>{const xs=scienceItems.filter(x=>x.grade===g&&x.field===f);return `<button class="button secondary" data-action="coverage" data-grade="${g}" data-field="${f}">中${g} · ${name}<span>${xs.length}項目 · 基本${xs.filter(x=>x.level==='basic').length} / 発展${xs.filter(x=>x.level==='advanced').length}</span></button>`;})).join('')}</div><h2>単元別の収録</h2><div class="science-unit-list">${scienceUnits.map(u=>`<button class="button secondary" data-action="unit" data-unit="${u.id}"><span>中${u.grade} · ${scienceFields[u.field]} · ${esc(u.title)}</span><span>${u.items.length}項目</span></button>`).join('')}</div><h2>調査と確認の範囲</h2><p>学習指導要領解説で主要概念・関係・実験の扱いを確認し、追加資料では下記の内容を照合しました。各項目には該当単元のページと追加確認先を表示します。指導計画は範囲を確かめる資料で、教材の全文章を直接裏付ける資料ではありません。</p><p>教材は独自の文章です。実験の操作は意味を覚えるための説明で、単独で実験を行う手順書ではありません。実際の観察・実験は教員の指示と安全管理の下で行ってください。</p><ul class="science-source-list">${Object.keys(scienceSources).map(id=>source(id)).join('')}</ul><p class="small muted">確認日：2026-10-28 · 教材版 ${scienceVersion}。外部専門家による全項目の校閲は未実施です。</p></section>`;
  }
 }
 function reset(){Object.assign(filters,{grade:'all',field:'all',unit:'all',level:'all',status:'all',query:''});focusId='';limit=12;revealed.clear();}
 main.onclick=async e=>{
  const b=e.target.closest('[data-action]');if(!b||saving)return;
  const action=b.dataset.action,id=b.dataset.id,item=scienceItems.find(x=>x.id===id);
  if(action==='tab'){tab=b.dataset.tab;syncPath();draw();}
  if(action==='more'){limit+=12;redrawList();}
  if(action==='reset'){reset();syncPath();draw();}
  if(action==='hide'){revealed.clear();redrawList();}
  if(action==='reveal'&&item){revealed.has(id)?revealed.delete(id):revealed.add(id);redrawList();main.querySelector(`[data-action="reveal"][data-id="${id}"]`)?.focus({preventScroll:true});}
  if(action==='coverage'||action==='unit'){reset();tab='study';if(action==='coverage'){filters.grade=b.dataset.grade;filters.field=b.dataset.field;}else{const u=unitById.get(b.dataset.unit);filters.grade=String(u.grade);filters.field=u.field;filters.unit=u.id;}syncPath();draw();main.querySelector('#science-list').scrollIntoView({block:'start'});}
  if((action==='save'||action==='rate')&&item){
   if(action==='rate'&&!revealed.has(id))return;
   saving=true;b.disabled=true;
   try{let added;await store.change(s=>{if(action==='rate')rateScience(s,item,b.dataset.rating);else added=saveScienceCard(s,item);});redrawList();toast(action==='rate'?'復習日を保存しました':added?'復習に追加しました':'復習に登録済みです');}
   catch(error){toast(error.message||'保存できませんでした',true);b.disabled=false;}
   finally{saving=false;}
  }
 };
 main.oninput=e=>{if(e.target.matches('[data-science-search]')){filters.query=e.target.value;focusId='';limit=12;revealed.clear();syncPath();redrawList();}};
 main.onchange=e=>{const name=e.target.dataset.scienceFilter;if(!name)return;filters[name]=e.target.value;if(name==='grade'||name==='field')filters.unit='all';focusId='';limit=12;revealed.clear();syncPath();draw();main.querySelector(`[data-science-filter="${name}"]`)?.focus({preventScroll:true});};
 draw();
 return Object.assign(()=>{main.onclick=main.oninput=main.onchange=null;},{refresh:draw});
}
