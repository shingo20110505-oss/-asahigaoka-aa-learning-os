import {retireLocalAI} from './retire-local-ai.mjs';
retireLocalAI().catch(()=>{});
import {drawHome} from './home.mjs';
import {warmChat} from './chat-warmup.mjs';
warmChat();
import {Store} from './store.mjs';
import {dayKey,DAY,weeklyMinutes} from './domain.mjs';
import {icon,esc,heading,link,button,badge,empty,dialog,field,toast} from './ui.mjs';
import {features} from './catalog.mjs';
import {setupSidebar} from './sidebar.mjs';
import {createChatWorkspace} from './side-chat.mjs';
import {ViewCache,viewPath,viewGroup,capturePosition,restorePosition} from './view-cache.mjs';
import {NavGesture} from './nav-gesture.mjs';
const store=new Store();let main=document.getElementById('main');
const nav=[['home','ホーム','home'],['exam','旭丘・5教科対策','learn'],['learn','学ぶ・覚える','learn'],['notes','ノート・資料','notes'],['plan','カレンダー','plan'],['insights','振り返り','insights'],['chat','AIチャット','chat'],['ai-tools','AI学習ツール','flask']];
const navHTML=items=>items.map(([id,label,glyph])=>`<a href="#/${id}" data-nav="${id}" title="1回で前の画面を再開。2回タップ、またはAlt+Enterで入口へ。" aria-keyshortcuts="Alt+Enter">${icon(glyph)}<span>${label}</span></a>`).join('');
document.getElementById('side-nav').innerHTML=navHTML(nav);document.getElementById('side-bottom').innerHTML=navHTML([['settings','設定とデータ','settings']]);document.getElementById('mobile-nav').innerHTML=navHTML([['home','ホーム','home'],['learn','学ぶ','learn'],['notes','ノート','notes'],['plan','予定','plan'],['chat','AI','chat']]);
document.getElementById('global-search').innerHTML=icon('search')+'<span>ノート・教材を検索</span><kbd>⌘ K</kbd>';document.getElementById('settings-link').innerHTML=icon('settings');
setupSidebar();
const resumeButton=document.createElement('button');resumeButton.className='button secondary nav-resume';resumeButton.hidden=true;resumeButton.textContent='前の画面を再開';document.querySelector('.top-actions').prepend(resumeButton);
const gestures=new NavGesture();let navRevision=0;
document.querySelector('.skip').onclick=e=>{e.preventDefault();main.focus();main.scrollIntoView();};
async function loadJSON(name){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('./data/'+name+'.json',{signal:controller.signal});if(!response.ok)throw Error('データを読み込めませんでした。通信を確認してください。');return await response.json();}finally{clearTimeout(timer);}}
const cache=new Map();async function data(name){if(!cache.has(name))cache.set(name,loadJSON(name).then(async value=>name==='history'?(await import('./history-content.mjs')).enrichHistory(value):value).catch(e=>{cache.delete(name);throw e;}));return cache.get(name);}
const chatWorkspace=createChatWorkspace({store,data});
function moduleTile(f){return`<a href="#/${f.id}" class="feature-card"><div class="feature-top"><span class="feature-icon ${f.tone}">${icon(f.icon,24)}</span>${badge(f.subject)}</div><p class="eyebrow">${f.label}</p><h3>${f.title}</h3><p>${f.desc}</p><span class="feature-arrow">${icon('arrow')}</span></a>`;}
function learning(main){main.innerHTML=heading('LEARNING LIBRARY','学び方を、選ぼう。','読む、思い出す、動かす、つなげる。いま必要な学びから。')+`<div class="feature-grid full">${features.map(moduleTile).join('')}</div>`;}
async function search(){const s=store.state;dialog('RISE内を検索',field('キーワード','query','','search','id="search-query" autocomplete="off" placeholder="例：関数、明治、英語…"')+'<div id="search-results"></div>');const input=document.getElementById('search-query'),results=document.getElementById('search-results');const [review,history,reading,{geographyItems}]=await Promise.all([data('review'),data('history'),data('reading/index'),import('./geography-content.mjs')]);const items=[...geographyItems.map(x=>({title:x.title,body:[x.summary,x.why,x.read,x.pitfall].join(' '),route:'geography/'+x.id,type:'地理'})),...features.map(x=>({title:x.title,body:x.desc,route:x.id,type:'機能'})),...s.notes.filter(x=>!x.deletedAt).map(x=>({title:x.title,body:x.body,route:'notes/'+x.id,type:'ノート'})),...s.materials.map(x=>({title:x.title,body:x.memo,route:'materials',type:'資料'})),...review.map(x=>({title:x.title,body:x.question+' '+x.answer,route:'review/'+x.id,type:'復習'})),...reading.map(x=>({title:x.title,body:x.title,route:'reading/'+x.id,type:'英語'})),...history.map(x=>({title:x.event,body:x.detail,route:'history/'+x.id,type:'歴史'}))];input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();results.innerHTML=q?items.filter(x=>(x.title+' '+x.body).toLowerCase().includes(q)).slice(0,30).map(x=>`<a class="list-row" href="#/${x.route}"><span class="badge">${x.type}</span><span>${esc(x.title)}</span></a>`).join('')||'<p class="muted">見つかりませんでした。</p>':'<p class="muted small">ノート・復習・英文・歴史・地理を横断して探せます。</p>';});results.addEventListener('click',e=>{if(e.target.closest('a'))document.getElementById('modal').close();});input.focus();}
document.getElementById('global-search').onclick=()=>search().catch(e=>toast(e.message,true));document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();search().catch(e=>toast(e.message,true));}});
function routeInfo(path){const [pathname,search='']=path.split('?'),[route,tail='']=pathname.split('/');return {route,tail,query:new URLSearchParams(search)};}
function chrome(path){
 const {route}=routeInfo(path),group=viewGroup(path),name=features.find(x=>x.id===route)?.title||nav.find(x=>x[0]===route)?.[1]||({desk:'ノートと資料','handwriting-clean':'手書き消去'})[route]||'設定';
 document.title='RISE | '+name;document.getElementById('breadcrumb').textContent='ワークスペース / '+name;
 document.getElementById('school-label').textContent=store.state.settings.school;document.getElementById('avatar').textContent=(store.state.settings.name||'R').slice(0,1);
 document.querySelectorAll('[data-nav]').forEach(x=>{const active=x.dataset.nav===group;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');x.href='#/'+views.destination(x.dataset.nav);});
 resumeButton.hidden=!(group==='chat'?chatWorkspace.canResumeNavigation():views.canResume(group));
}
const views=new ViewCache({
 create:()=>main.cloneNode(false),revision:()=>store.state.revision||0,
 capture:entry=>capturePosition(entry.element),restore:(entry,position,active)=>restorePosition(entry.element,position,active),
 attach:entry=>{if(main!==entry.element){main.replaceWith(entry.element);main=entry.element;}const {route,query}=routeInfo(entry.path);chatWorkspace.setRoute(route,main,query);chrome(entry.path);},
 mount:async entry=>{
  const host=entry.element,{route,tail,query}=routeInfo(entry.path);
  if(route==='chat'||route==='ai-task')return()=>{};
  if(route==='home'||route==='learn'){const readingIndex=route==='home'?await data('reading/index'):null;const draw=()=>route==='home'?drawHome(host,store.state,readingIndex):learning(host);draw();return Object.assign(()=>{},{refresh:draw});}
  host.innerHTML='<div class="loading" role="status">読み込んでいます…</div>';
  const file=({geography:'geography',desk:'desk','handwriting-clean':'handwriting-clean',classical:'classical','english-words':'english-words','ai-tools':'ai-tools',exam:'exam-hub',explore:'explore',evidence:'evidence',listening:'listening'})[route]||(['reading','vocabulary','review','memory','history'].includes(route)?'learn':route==='labs'?'labs':'workspace');
  const mod=await import('./views/'+file+'.mjs');if(!views.active(entry))return;
  return mod.mount({store,main:host,data,render,chat:chatWorkspace,active:()=>views.active(entry),route,tail,query,
   rememberPath:()=>{views.remember(location.hash);chrome(entry.path);},beforeRestore:()=>views.clearInactive()});
 },
 error:(error,entry)=>{if(!entry)return toast(error.message,true);entry.element.innerHTML=heading('SOMETHING WENT WRONG','画面を開けませんでした。',error.message)+button('もう一度読み込む','retry');entry.element.querySelector('[data-action=retry]').onclick=()=>render({reload:true});}
});
export async function render(options={}){
 let path=viewPath(location.hash);
 if(['web','device-ai'].includes(routeInfo(path).route)){path='home';history.replaceState(history.state,'','#/home');}
 await views.show(path,options);
}
// Only sidebar/mobile navigation resumes the last screen in a section. Links to
// a library, another book, or a specific note keep their explicit destination.
async function resetNav(group,ticket){
 await views.pending.catch(()=>{});if(ticket!==navRevision)return;
 if(group==='chat'&&!await chatWorkspace.resetNavigation())return;
 if(ticket!==navRevision)return;
 history.pushState(history.state,'','#/'+group);await views.reset(group);chrome(views.current?.path||group);
}
resumeButton.onclick=async()=>{try{const group=viewGroup(location.hash);++navRevision;if(group==='chat'){chatWorkspace.resumeNavigation();chrome(views.current.path);return;}await views.resumePrevious(group);history.pushState(history.state,'','#/'+views.current.path);chrome(views.current.path);}catch(error){toast(error.message,true);}};
document.addEventListener('click',e=>{
 const nav=e.target.closest('a[data-nav]');if(!nav||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const ticket=++navRevision,group=nav.dataset.nav,key=nav.parentElement.id+'/'+group;
 const action=gestures.activate(key,{time:e.timeStamp,detail:e.detail});
 views.remember(location.hash);const path=views.destination(group);e.preventDefault();
 if(action==='reset'){resetNav(group,ticket).catch(error=>toast(error.message,true));return;}
 if(viewPath(location.hash)!==path)location.hash='#/'+path;
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('a[data-nav]'))gestures.clear();});
document.addEventListener('keydown',e=>{const nav=e.target.closest('a[data-nav]');if(nav&&e.key==='Enter'&&e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.repeat){e.preventDefault();gestures.clear();resetNav(nav.dataset.nav,++navRevision).catch(error=>toast(error.message,true));}else gestures.clear();});
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('hashchange',()=>{document.getElementById('modal').close();render();});
window.addEventListener('rise:external-change',async()=>{await store.refresh();if(!document.querySelector('dialog[open]')&&!document.activeElement?.matches('input,textarea,select,[contenteditable]')){await views.refresh();chrome(views.current?.path||viewPath(location.hash));}});
try{await store.open();await render();import('./offline.mjs').then(m=>m.prepareOffline()).catch(()=>{});navigator.storage?.persist?.().catch(()=>{});}catch(error){main.innerHTML=heading('STORAGE','保存場所を開けませんでした。','ブラウザの保存設定を確認してください。既存の履歴は削除していません。')+`<p class="notice">${esc(error.message)}</p>`;}
