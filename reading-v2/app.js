(()=>{'use strict';
const VERSION='1.4.1',KEY='rise_reading_v2_progress_v1',BASE='../reading-v2-data/';
const SUP={
  'batch-1011.json':'supplement-101-106.json',
  'batch-1012.json':'supplement-107-112.json',
  'batch-1013.json':'supplement-113-118.json',
  'batch-1014.json':'supplement-119-124.json',
  'batch-1015.json':'supplement-125-130.json'
};
let manifest,currentItem;
const cache=new Map(),suppCache=new Map(),sessionShown=new Set(),$=x=>document.getElementById(x);
const E={levels:$('levels'),status:$('status'),total:$('totalCount'),done:$('doneCount'),remain:$('remainCount'),newBtn:$('newButton'),card:$('readingCard'),empty:$('emptyCard'),level:$('readingLevel'),id:$('readingId'),title:$('readingTitle'),passage:$('passage'),translation:$('translation'),panel:$('translationPanel'),show:$('showTranslationButton'),next:$('nextButton')};

function progress(){try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&x.answers?x:{version:1,answers:{}}}catch(_){return{version:1,answers:{}}}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x));return true}catch(_){return false}}
function status(s,e=false){E.status.textContent=s;E.status.classList.toggle('error',e)}
function index(){return manifest?.index||[]}
function levels(){return[...E.levels.querySelectorAll('input:checked')].map(x=>+x.value)}
function unread(){const p=progress(),ls=new Set(levels());return index().filter(x=>ls.has(x.level)&&!p.answers[x.id]&&!sessionShown.has(x.id))}
function stats(){const p=progress(),a=index(),done=a.filter(x=>p.answers[x.id]||sessionShown.has(x.id)).length;E.total.textContent=a.length;E.done.textContent=done;E.remain.textContent=Math.max(0,a.length-done);const n=unread().length;status(n?`選択中のLevelに未読長文が ${n} 作あります。`:'選択中のLevelに未読長文はありません。')}
function wc(s){return String(s||'').trim().split(/\s+/).filter(Boolean).length}
function idNumber(id){const m=String(id||'').match(/(\d+)$/);return m?Number(m[1]):NaN}
function normalizeBatch(raw){if(Array.isArray(raw))return raw;if(raw&&Array.isArray(raw.items))return raw.items;throw Error('長文バッチ形式が不正です')}
async function loadJson(name){const r=await fetch(BASE+name,{cache:'no-store'});if(!r.ok)throw Error(`${name}取得失敗`);return r.json()}
async function supplement(name){if(!name)return null;if(suppCache.has(name))return suppCache.get(name);const x=await loadJson(name);suppCache.set(name,x);return x}
function mergeSupplement(x,s){if(!s||!s[x.id])return x;const a=s[x.id];return{...x,passage:[x.passage,a.passageAppend].filter(Boolean).join('\n\n'),translation:[x.translation,a.translationAppend].filter(Boolean).join('\n\n')}}
async function batch(f){if(cache.has(f))return cache.get(f);const raw=await loadJson(f);let a=normalizeBatch(raw);const s=await supplement(SUP[f]);if(s)a=a.map(x=>mergeSupplement(x,s));cache.set(f,a);return a}
function validate(x){
 if(!x||!x.id||!x.title||!x.passage||!x.translation)throw Error(`${x?.id||'unknown'} 必須項目不足`);
 const n=idNumber(x.id),words=wc(x.passage);
 if(words<250)throw Error(`${x.id} 本文が短すぎます: ${words}語`);
 if(n>=101&&n<=130){
   const range={1:[400,480],2:[480,560],3:[560,640],4:[640,720],5:[720,800]}[x.level];
   if(!range||words<range[0]||words>range[1])throw Error(`${x.id} 語数範囲外 ${words}語`);
 }
}
function randomIndex(n){if(n<=1)return 0;try{const u=new Uint32Array(1);crypto.getRandomValues(u);return u[0]%n}catch(_){return Math.floor(Math.random()*n)}}
function markShown(x){sessionShown.add(x.id);const p=progress();if(!p.answers[x.id])p.answers[x.id]={readAt:new Date().toISOString(),level:x.level};save(p)}
async function pick(){
 const a=unread();
 if(!a.length){E.card.classList.remove('active');E.empty.classList.add('active');stats();return}
 E.newBtn.disabled=true;if(E.next)E.next.disabled=true;
 try{
   const c=a[randomIndex(a.length)];
   const x=(await batch(c.file)).find(y=>y.id===c.id);
   if(!x)throw Error(`${c.id} がバッチにありません`);
   validate(x);
   markShown(x);
   currentItem=x;
   E.level.textContent=`Level ${x.level}`;E.id.textContent=x.id;E.title.textContent=x.title;E.passage.textContent=x.passage;E.translation.textContent=x.translation;
   E.panel.hidden=true;E.panel.classList.remove('active');E.show.style.display='inline-block';E.card.classList.add('active');E.empty.classList.remove('active');
   stats();status(`未読から Level ${x.level}・${x.id} を選びました。次回はこのIDを除外します。`);
 }catch(e){
   currentItem=null;E.card.classList.remove('active');status(e.message||'長文読み込み失敗',true)
 }finally{E.newBtn.disabled=false;if(E.next)E.next.disabled=false}
}
function show(){if(!currentItem)return;E.panel.hidden=false;E.panel.classList.add('active');E.show.style.display='none'}
async function boot(){
 E.levels.innerHTML=[1,2,3,4,5].map(n=>`<label class="level"><input type="checkbox" value="${n}" ${n>=3?'checked':''}><span>Lv ${n}</span></label>`).join('');
 E.levels.addEventListener('change',stats);
 try{
   const r=await fetch(BASE+'manifest.json',{cache:'no-store'});if(!r.ok)throw Error('manifest取得失敗');
   manifest=await r.json();
   if(!Array.isArray(manifest.index)){manifest.index=[];for(const g of manifest.ranges||[])for(let n=g.from;n<=g.to;n++)manifest.index.push({id:`rv3-${String(n).padStart(6,'0')}`,level:g.level,file:g.file})}
   const ids=new Set();for(const x of manifest.index){if(ids.has(x.id))throw Error(`ID重複: ${x.id}`);ids.add(x.id)}
   if(manifest.total!==manifest.index.length)throw Error(`manifest件数不一致: total=${manifest.total}, index=${manifest.index.length}`);
   stats();E.newBtn.disabled=false;
 }catch(e){status(e.message||'読み込み失敗',true)}
}
E.newBtn.addEventListener('click',pick);E.show?.addEventListener('click',show);E.next?.addEventListener('click',pick);boot();
window.__RISE_READING_V2__=Object.freeze({version:VERSION,progressKey:KEY});
})();