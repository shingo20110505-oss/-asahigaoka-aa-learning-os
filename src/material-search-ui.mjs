import {dialog,esc} from './ui.mjs';
import {privateDocuments,searchCategories,normalize} from './material-search.mjs';
let worker,ready,counts,total=0,sequence=0,listener;
function connect(){
 if(ready)return ready;
 ready=new Promise((resolve,reject)=>{
  try{worker=new Worker(new URL('./material-search-worker.mjs',import.meta.url),{type:'module'});}catch(error){reject(error);return;}
  const fail=message=>{worker?.terminate();worker=null;ready=null;reject(Error(message));listener?.({type:'error',message});};
  worker.onerror=()=>fail('検索を準備できませんでした。再試行してください。');
  worker.onmessage=({data:m})=>{if(m.type==='ready'){counts=m.counts;total=m.total;resolve();}else if(m.type==='error')fail(m.message);else listener?.(m);};
  worker.postMessage({type:'load'});
 }).catch(error=>{ready=null;throw error;});
 return ready;
}
function highlighted(text,query){
 // Escape every fragment; search terms are plain text, never regular expressions or HTML.
 const terms=normalize(query).split(' ').filter(Boolean).sort((a,b)=>b.length-a.length),raw=String(text),chars=Array.from(raw),segments=[];let key='',at=0;
 for(const ch of chars){const n=ch.normalize('NFKC').toLocaleLowerCase('ja').replace(/[’‘]/g,"'").replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));for(let i=0;i<n.length;i++)segments.push([at,at+ch.length]);key+=n;at+=ch.length;}
 const ranges=[];for(const t of terms){let p=key.indexOf(t);while(p>=0){ranges.push([segments[p][0],segments[p+t.length-1][1]]);p=key.indexOf(t,p+t.length);}}
 ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const r of ranges){const last=merged.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push([...r]);}
 let out='',cursor=0;for(const [start,end]of merged){out+=esc(raw.slice(cursor,start))+'<mark>'+esc(raw.slice(start,end))+'</mark>';cursor=end;}return out+esc(raw.slice(cursor));
}
export function openMaterialSearch(store){
 const existing=document.querySelector('dialog.search-dialog[open] #search-query');if(existing){existing.focus();return;}
 const host=dialog('RISE内を検索',`<div class="material-search"><label class="field"><span>教材の本文・問題・解説を検索</span><input id="search-query" type="search" autocomplete="off" placeholder="例：中和 イオン、明治、関係代名詞"></label><div class="search-filters"><label>教科<select id="search-subject"><option value="all">すべての教科</option>${['国語','数学','英語','理科','社会'].map(s=>`<option>${s}</option>`).join('')}</select></label><label>教材<select id="search-category"><option value="all">すべての教材</option>${Object.entries(searchCategories).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label></div><p id="search-status" class="small muted" role="status">検索を準備しています…</p><div id="search-suggestions" class="actions" aria-live="polite"></div><div id="search-results" aria-busy="true"></div><div id="search-pages" class="actions"></div><details class="search-scope"><summary>検索できる内容</summary><p>収録教材の本文・和訳・問題・選択肢・解説と、この端末のノート・暗記カード・資料メモ・ファイル名を検索します。写真・PDF・動画の中身や、リンク先のWebページは自動で文字起こししません。語句を半角の &quot; &quot; で囲むとその並びを指定でき、-語句 で除外できます。</p><div id="search-coverage"></div></details></div>`);
 host.classList.add('search-dialog');host.onclick=null;
 const form=host.querySelector('form'),input=host.querySelector('#search-query'),results=host.querySelector('#search-results'),status=host.querySelector('#search-status'),pages=host.querySelector('#search-pages');
 form.querySelectorAll('[value=cancel]').forEach(b=>{b.type='button';b.onclick=()=>host.close();});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();host.close();}});
 let loaded=false,request=0,offset=0,timer,disposed=false;
 const live=()=>!disposed&&form.isConnected&&host.open;
 const search=()=>{
  if(!live()||!loaded)return;
  request=++sequence;pages.innerHTML='';results.setAttribute('aria-busy','true');
  if(!input.value.trim()){host.querySelector('#search-suggestions').innerHTML='';results.innerHTML='';results.setAttribute('aria-busy','false');status.textContent=`収録教材 ${total.toLocaleString()}件と、この端末の学習内容を検索できます。表記ゆれやスペル違いにも対応。空白で区切ると、語句の一致が多い順に表示します。`;return;}
  worker.postMessage({type:'personal',documents:privateDocuments(store.state)});
  worker.postMessage({type:'search',request,query:input.value,subject:host.querySelector('#search-subject').value,category:host.querySelector('#search-category').value,offset,limit:30});
 };
 const receive=m=>{
  if(!live())return;
  if(m.type==='error'){loaded=false;status.textContent=m.message;results.setAttribute('aria-busy','false');results.innerHTML='<button type="button" class="button secondary" data-search-retry>再試行</button>';return;}
  if(m.request!==request)return;
  offset=m.offset;results.dataset.query=input.value;results.setAttribute('aria-busy','false');
  status.textContent=m.total?`${m.total.toLocaleString()}件 · ${offset+1}〜${Math.min(offset+30,m.total)}件`:'一致する教材がありません。短い語句や別の表現で試してください。';
  host.querySelector('#search-suggestions').innerHTML=m.suggestions?.length?'この語でも検索：'+m.suggestions.map(q=>`<button type="button" class="chip" data-search-suggestion="${esc(q)}">${esc(q)}</button>`).join(''):'';
  results.innerHTML=m.items.map(x=>`<a class="search-result" href="#/${esc(x.route)}"><span class="search-result-meta">${esc(x.subject)} · ${esc(searchCategories[x.category])}${x.label?' · '+esc(x.label):''}${x.partial?' · 一部の語が一致':x.expanded?' · 表記ゆれ・補正':''}</span><strong>${highlighted(x.title,x.highlight||input.value)}</strong><span class="search-snippet">${highlighted(x.snippet,x.highlight||input.value)}</span></a>`).join('');
  pages.innerHTML=m.total>30?`<button type="button" class="button secondary" data-search-page="${offset-30}" ${offset?'':'disabled'}>前の30件</button><button type="button" class="button secondary" data-search-page="${offset+30}" ${offset+30<m.total?'':'disabled'}>次の30件</button>`:'';
 };
 async function start(){loaded=false;listener=receive;status.textContent='検索を準備しています…';try{await connect();if(!live())return;loaded=true;host.querySelector('#search-coverage').innerHTML=Object.entries(counts).map(([k,n])=>`<span>${esc(searchCategories[k])} ${n.toLocaleString()}件</span>`).join('');search();}catch(error){receive({type:'error',message:error.message});}}
 const update=()=>{offset=0;request=++sequence;results.setAttribute('aria-busy','true');clearTimeout(timer);timer=setTimeout(search,120);};
 input.oninput=update;host.querySelector('#search-subject').onchange=update;host.querySelector('#search-category').onchange=update;
 form.addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();clearTimeout(timer);search();});
 form.addEventListener('click',e=>{if(e.target.closest('.search-result'))host.close();const page=e.target.closest('[data-search-page]');if(page){offset=Number(page.dataset.searchPage);search();results.scrollTop=0;}if(e.target.closest('[data-search-retry]'))start();const suggestion=e.target.closest('[data-search-suggestion]');if(suggestion){input.value=suggestion.dataset.searchSuggestion;offset=0;search();}});
 host.addEventListener('close',()=>{disposed=true;clearTimeout(timer);host.classList.remove('search-dialog');if(listener===receive)listener=null;worker?.postMessage({type:'personal',documents:[]});},{once:true});
 input.focus();start();
}
