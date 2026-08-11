(()=>{'use strict';
if(window.__CHRONOLOGIA_DEEP_EXPLANATIONS_V1__)return;
window.__CHRONOLOGIA_DEEP_EXPLANATIONS_V1__=true;

const VERSION='1.0.0';
const EXACT_YEAR=/^(?:紀元前)?\d+年$/;
const LEVEL_LABEL={S:'最重要',A:'重要',B:'補強'};
const FOCUS_RULES=[
 ['政治・制度',/天皇|幕府|将軍|政府|内閣|憲法|法律|法令|制度|改革|政治|議会|選挙|律令|守護|地頭|摂政|関白|中央集権|国会|条規|勅諭|勅語|法典|王政|共和政|帝政/],
 ['外交・戦争',/戦争|戦い|乱\b|一揆|事変|軍|侵攻|襲来|出兵|講和|条約|同盟|外交|開国|鎖国|貿易|使節|遣唐使|遣隋使|国際|植民地|帝国主義|遠征/],
 ['経済・産業',/農業|商業|工業|産業|経済|市場|貨幣|税|年貢|地租|工場|鉄道|会社|製糸|製鉄|株仲間|商品作物|荘園|二毛作|座\b|城下町|三都|街道|宿場|交易/],
 ['社会・民衆',/農民|民衆|町人|庶民|武士|御家人|労働|社会|自治|惣村|差別|女性|人々|生活|都市|農村|身分|人口/],
 ['文化・文学',/文化|美術|芸術|絵|画|彫刻|像|建築|寺|城|庭園|能\b|歌舞伎|浄瑠璃|茶の湯|茶道|浮世絵|工芸|和歌|文学|物語|随筆|俳諧|俳句|短歌|小説|歌集|出版|文字/],
 ['宗教・思想',/仏教|宗教|神道|キリスト教|イスラム|儒教|国学|蘭学|思想|啓蒙|社会契約|人民主権|三権分立|法華|浄土|禅宗|天台|真言|神社|寺院|信仰/],
 ['科学・技術',/科学|技術|蒸気|地動説|望遠鏡|万有引力|進化論|医学|解剖|測量|地図|鉄道|自動車|飛行|航空|原子|核|宇宙|印刷|暦|ペニシリン|発明|発見/],
 ['人権',/人権|女性|差別|解放|参政|選挙権|水平社|労働者|労働基準|基本的人権|平等|奴隷|アイヌ/],
 ['環境・災害',/災害|震災|台風|公害|鉱毒|環境|飢饉|ききん|原子力発電所事故/]
];

function clean(s){return String(s??'').replace(/\s+/g,' ').trim()}
function sentence(s){s=clean(s);if(!s)return'';return/[。！？]$/.test(s)?s:s+'。'}
function uniq(arr){return[...new Set(arr.filter(Boolean))]}
function tagsOf(x){return Array.isArray(x?.tags)?x.tags.map(clean).filter(Boolean):[]}
function viewsOf(x){return Array.isArray(x?.views)?x.views.map(clean).filter(Boolean):[]}
function textOf(x){return clean([x?.event,x?.detail,x?.area,x?.period,...tagsOf(x),...viewsOf(x)].join(' '))}
function groupOf(area=''){
 area=String(area);
 if(area.includes('愛知')||area.includes('日本'))return'日本・愛知';
 if(area.includes('東アジア'))return'東アジア';
 if(area.includes('南アジア'))return'南アジア';
 if(area.includes('西アジア'))return'西アジア';
 return'欧米・世界';
}
function focusOf(item){
 const out=viewsOf(item).filter(v=>v!=='世界とのつながり'&&v!=='愛知・地域').slice(0,3);
 const t=textOf(item);for(const [label,re] of FOCUS_RULES)if(re.test(t)&&!out.includes(label))out.push(label);
 return uniq(out).slice(0,3);
}
function sharedCount(a,b){const A=new Set(tagsOf(a)),B=tagsOf(b);let n=0;for(const x of A)if(B.has(x))n++;return n}
function viewShared(a,b){const A=new Set(viewsOf(a));let n=0;for(const x of viewsOf(b))if(A.has(x))n++;return n}
function relationScore(a,b){
 const dist=Math.abs(Number(a.sort||0)-Number(b.sort||0));
 return sharedCount(a,b)*8+viewShared(a,b)*2.4+(a.period===b.period?2:0)+(a.area===b.area?2:0)+(groupOf(a.area)===groupOf(b.area)?1.5:0)+Math.max(0,3-Math.log10(dist+1));
}
function ordered(data,group){return data.filter(x=>groupOf(x.area)===group).slice().sort((a,b)=>Number(a.sort)-Number(b.sort)||Number(a.id)-Number(b.id))}
function relatedSide(data,item,dir,count=2){
 const arr=ordered(data,groupOf(item.area)),idx=arr.findIndex(x=>Number(x.id)===Number(item.id));if(idx<0)return[];
 const start=dir<0?Math.max(0,idx-16):idx+1,end=dir<0?idx:Math.min(arr.length,idx+17),cand=arr.slice(start,end);
 return cand.map(x=>({x,s:relationScore(item,x)})).sort((a,b)=>b.s-a.s||Math.abs(Number(a.x.sort)-Number(item.sort))-Math.abs(Number(b.x.sort)-Number(item.sort))).slice(0,count).map(o=>o.x).sort((a,b)=>Number(a.sort)-Number(b.sort));
}
function similarItems(data,item,count=2){
 return data.filter(x=>Number(x.id)!==Number(item.id)&&sharedCount(item,x)>0).map(x=>({x,s:relationScore(item,x)+sharedCount(item,x)*5})).sort((a,b)=>b.s-a.s||Math.abs(Number(a.x.sort)-Number(item.sort))-Math.abs(Number(b.x.sort)-Number(item.sort))).slice(0,count).map(o=>o.x);
}
function sameEraOther(data,item,count=2){
 const g=groupOf(item.area);return data.filter(x=>Number(x.id)!==Number(item.id)&&groupOf(x.area)!==g).map(x=>({x,d:Math.abs(Number(x.sort||0)-Number(item.sort||0)),s:relationScore(item,x)})).sort((a,b)=>a.d-b.d||b.s-a.s).slice(0,count).map(o=>o.x);
}
function periodLens(item){
 const f=focusOf(item),focus=f.length?f.join('・'):'時代の変化';
 const area=clean(item.area)||'この地域',period=clean(item.period)||'この時代';
 return `この項目は、${period}の${area}で起きた${focus}の動きを、年表の前後関係の中で捉えるための基準になる。`;
}
function keySentence(item){const t=tagsOf(item).slice(0,5);return t.length?`重要語は「${t.join('・')}」。人物名・制度名・文化名を年号だけでなく内容と結び付けて覚える。`:''}
function describeList(items){return items.map(x=>`${x.date}「${x.event}」— ${sentence(x.detail)}`).join(' ')}
function chronologySentence(prev,item,next){
 if(prev&&next)return `並べ替えでは、${prev.date}「${prev.event}」→ ${item.date}「${item.event}」→ ${next.date}「${next.event}」という位置関係をまず固定する。`;
 if(prev)return `並べ替えでは、${prev.date}「${prev.event}」より後に${item.date}「${item.event}」が位置することを確認する。`;
 if(next)return `並べ替えでは、${item.date}「${item.event}」が${next.date}「${next.event}」より前に位置することを確認する。`;
 return'';
}
function buildNote(data,rich,item){
 const curated=rich?.[item.event]||{};
 const prevs=relatedSide(data,item,-1,2),nexts=relatedSide(data,item,1,2),similar=similarItems(data,item,2),cross=sameEraOther(data,item,2);
 const prev=prevs[prevs.length-1]||null,next=nexts[0]||null,focus=focusOf(item);
 const summaryParts=[curated.summary||item.detail,periodLens(item),keySentence(item)];
 const summary=uniq(summaryParts.map(sentence)).join(' ');

 let background=clean(curated.background);
 if(background){
   const extra=prevs.length?`前後関係を補うと、直前の関連事項として${describeList(prevs)}がある。これらと現在の出来事を比較すると、${focus[0]||'政治・社会'}の変化を段階的に整理できる。`:periodLens(item);
   if(!background.includes(prev?.event||'§§'))background=`${sentence(background)} ${extra}`;
 }else if(prevs.length){
   background=`この出来事を単独で覚えるのではなく、直前の関連事項を確認する。${describeList(prevs)} ${focus.length?`こうした流れの中で、${focus.join('・')}のどこが変化したのかを「${item.event}」と結び付けて見ると、背景を具体的に説明しやすい。`:`こうした前段階と現在の出来事の違いを比べると、背景を具体的に説明しやすい。`}`;
 }else{
   background=`${periodLens(item)} ${cross.length?`同じ時期の別地域では${describeList(cross)}も確認できる。地域ごとの動きを比較し、この出来事が生まれた時代条件を整理する。`:`年号だけでなく、地域・時代・重要語を組み合わせて背景を説明できるようにする。`}`;
 }

 let result=clean(curated.result);
 if(result){
   const extra=nexts.length?`その後の年表では${describeList(nexts)}が続く。直接の因果と単なる同時期の動きを区別しつつ、「この出来事の後に何が変わったか」を確認する。`:'';
   if(extra&&!result.includes(next?.event||'§§'))result=`${sentence(result)} ${extra}`;
 }else if(nexts.length){
   result=`その後の展開を年表で追うと、${describeList(nexts)}が続く。現在の出来事と後続事項の間で、制度・社会・外交・文化のどこが変化したかを比べると、「何が変わったか」を具体的に説明できる。`;
 }else{
   result=`この出来事の影響を考えるときは、${focus.length?focus.join('・'):'政治・社会・国際関係'}のうち何が残り、何が次の時代で変わったかを確認する。${cross.length?`同時期の別地域では${describeList(cross)}があり、横の比較にも使える。`:''}`;
 }

 const terms=tagsOf(item).slice(0,4),sameDate=data.filter(x=>Number(x.id)!==Number(item.id)&&x.date===item.date).slice(0,2);
 let exam=clean(curated.exam);
 const examBits=[];
 if(terms.length)examBits.push(`資料に「${terms.join('・')}」が出たら、この出来事を候補にする`);
 if(EXACT_YEAR.test(clean(item.date)))examBits.push(`${item.date}は正確な年号として並べ替え・年表空欄で使える`);
 if(sameDate.length)examBits.push(`同じ${item.date}の「${sameDate.map(x=>x.event).join('」「')}」も同年事項として確認する`);
 if(prev||next)examBits.push(chronologySentence(prev,item,next));
 if(similar.length)examBits.push(`「${similar.map(x=>`${x.date} ${x.event}`).join('」「')}」と名称・時代・目的を区別する`);
 const rank=`${LEVEL_LABEL[item.level]||'確認'}項目として、出来事の説明・前後関係・資料中の手掛かりをセットで答えられる状態にする。`;
 exam=[sentence(exam),rank,...examBits.map(sentence)].filter(Boolean).join(' ');

 const asahi=clean(curated.asahi)||[
   `30秒説明では、まず「${item.date}・${item.event}」と答え、次に「${sentence(item.detail)}」まで言う。`,
   prev?`さらに直前の関連事項「${prev.date}・${prev.event}」との違いを一言で説明する。`:'',
   next?`続けて後の関連事項「${next.date}・${next.event}」までつなぐ。`:'',
   cross.length?`最後に同時代の別地域として「${cross[0].date}・${cross[0].event}」を結び付ける。`:''
 ].filter(Boolean).join(' ');

 let trap=clean(curated.trap);
 if(!trap){
   if(similar.length)trap=`混同注意：${similar.map(x=>`${x.date}「${x.event}」— ${clean(x.detail)}`).join(' ／ ')}。共通語だけで判断せず、年代・人物・目的・結果の違いを確認する。`;
   else trap=`似た名称の人物・制度・条約・文化がある場合は、「${terms.join('・')||item.event}」だけで決めず、年代・地域・内容を3点セットで確認する。`;
 }

 const deepFacts=[
   {label:'この出来事の核心',text:sentence(item.detail)},
   prevs.length?{label:'直前の関連事項',text:describeList(prevs)}:null,
   nexts.length?{label:'直後の関連事項',text:describeList(nexts)}:null,
   cross.length?{label:'同時代の別地域',text:describeList(cross)}:null,
   similar.length?{label:'比較して覚える',text:similar.map(x=>`${x.date}「${x.event}」`).join(' ／ ')+'。共通点と相違点を、年代・目的・結果で比べる。'}:null,
   terms.length?{label:'資料で拾う語',text:terms.join('・')}:null
 ].filter(Boolean);

 return{summary,background,result,exam,asahi,trap,deepFacts,__chronoV7:true,__chronoDeepV1:true,id:Number(item.id),version:VERSION};
}
function buildAll(){
 try{
   if(typeof DATA==='undefined'||typeof RICH_NOTES==='undefined'||!Array.isArray(DATA)||!DATA.length)return null;
   const map={};for(const item of DATA)map[Number(item.id)]=buildNote(DATA,RICH_NOTES,item);
   window.CHRONOLOGIA_DEEP_NOTES_BY_ID=map;
   window.CHRONOLOGIA_DEEP_EXPLANATION_STATS={version:VERSION,total:DATA.length,generated:Object.keys(map).length,withCurated:DATA.filter(x=>!!RICH_NOTES[x.event]).length,pass:Object.keys(map).length===DATA.length};
   markBadge();return map;
 }catch(e){console.error('Chronologia deep explanations build failed',e);return null}
}
function injectCSS(){
 if(document.getElementById('chrono-deep-v1-css'))return;const s=document.createElement('style');s.id='chrono-deep-v1-css';s.textContent=`.chrono-deep-v1{border-color:color-mix(in srgb,var(--gold) 42%,var(--line));background:linear-gradient(145deg,color-mix(in srgb,var(--gold) 7%,var(--card-solid)),var(--card-solid))}.chrono-deep-v1-list{display:grid;gap:10px;margin-top:10px}.chrono-deep-v1-row{padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card-solid)}.chrono-deep-v1-row strong{display:block;margin-bottom:3px;color:var(--ink)}.chrono-deep-v1-row span{display:block;color:var(--sub);font-size:.9rem;line-height:1.7}.chrono-deep-badge{display:inline-flex;align-items:center;margin-left:7px;padding:3px 8px;border:1px solid rgba(68,88,200,.38);border-radius:999px;background:color-mix(in srgb,var(--accent) 8%,var(--card-solid));font-size:.72rem;font-weight:900;color:var(--ink)}`;document.head.appendChild(s)
}
function markBadge(){
 try{const status=document.querySelector('#timelineView .statusbar');if(!status||status.querySelector('.chrono-deep-badge'))return;const b=document.createElement('span');b.className='chrono-deep-badge';b.textContent=`詳説 ${typeof DATA!=='undefined'?DATA.length:'全'}件`;status.appendChild(b)}catch(_){}
}
function addDeepSection(item,note){
 try{const body=typeof $==='function'?$('modalBody'):document.getElementById('modalBody');if(!body||body.querySelector('.chrono-deep-v1')||!note?.deepFacts?.length)return;const sec=document.createElement('section');sec.className='detail-section chrono-deep-v1';sec.innerHTML=`<h4>詳説 — この出来事を年表の中で理解する</h4><div class="chrono-deep-v1-list">${note.deepFacts.map(x=>`<div class="chrono-deep-v1-row"><strong>${typeof esc==='function'?esc(x.label):x.label}</strong><span>${typeof esc==='function'?esc(x.text):x.text}</span></div>`).join('')}</div>`;const exam=body.querySelector('.detail-section.exam');if(exam)exam.insertAdjacentElement('beforebegin',sec);else body.appendChild(sec)}catch(e){console.warn('Chronologia deep section render failed',e)}
}
function patchOpenDetail(){
 if(window.__CHRONOLOGIA_DEEP_OPEN_PATCHED__||typeof openDetail!=='function')return false;window.__CHRONOLOGIA_DEEP_OPEN_PATCHED__=true;const old=openDetail;
 openDetail=function(id,options={}){
   if(!window.CHRONOLOGIA_DEEP_NOTES_BY_ID)buildAll();
   const item=typeof byId!=='undefined'?byId.get(Number(id)):null,note=item?window.CHRONOLOGIA_DEEP_NOTES_BY_ID?.[Number(item.id)]:null,key=item?.event;
   let had=false,prior;if(note&&typeof RICH_NOTES!=='undefined'&&key){had=Object.prototype.hasOwnProperty.call(RICH_NOTES,key);prior=RICH_NOTES[key];RICH_NOTES[key]=note}
   let result;try{result=old(id,options)}finally{if(note&&typeof RICH_NOTES!=='undefined'&&key){if(had)RICH_NOTES[key]=prior;else delete RICH_NOTES[key]}}
   if(item&&note)addDeepSection(item,note);return result;
 };
 return true;
}
function install(){injectCSS();patchOpenDetail();if(typeof DATA!=='undefined'&&Array.isArray(DATA)&&DATA.length)buildAll();}

document.addEventListener('chronologia:content-updated',()=>{buildAll();patchOpenDetail();markBadge()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
let tries=0;const timer=setInterval(()=>{tries++;install();if((window.CHRONOLOGIA_DEEP_EXPLANATION_STATS?.pass&&window.__CHRONOLOGIA_DEEP_OPEN_PATCHED__)||tries>80)clearInterval(timer)},250);
window.ChronologiaDeepExplanations={version:VERSION,build:buildAll,stats:()=>window.CHRONOLOGIA_DEEP_EXPLANATION_STATS||null};
})();