import {icon,button,toast} from './ui.mjs';
import {studyScreenContext} from './screen-context.mjs';

// One chat view owns the session, archive and transport. Moving its DOM keeps them alive.
export function createChatWorkspace({store,data}){
 const pane=document.createElement('aside');pane.id='side-chat-pane';pane.className='side-chat-pane';pane.hidden=true;pane.setAttribute('aria-label','サイドチャット');
 pane.innerHTML=`<header class="side-chat-heading"><strong>教材を見ながら質問</strong><div>${button('広く表示','side-full','ghost small')}${button('閉じる','side-close','secondary small','aria-label="サイドチャットを閉じる"')}</div></header>`;
 const host=document.createElement('div');host.className='chat-host';pane.append(host);document.body.append(pane);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='side-chat-trigger';trigger.innerHTML=icon('chat',18)+'<span>AIに質問</span>';trigger.setAttribute('aria-controls',pane.id);trigger.setAttribute('aria-expanded','false');document.body.append(trigger);
 let controller=null,pending=null,route='',pageMain=null,lastContentMain=null,open=false,lastPage='#/reading',previousFocus=null,background=new Map();
 function modalSync(){const mobile=open&&innerWidth<900;pane.setAttribute('role',mobile?'dialog':'complementary');if(mobile)pane.setAttribute('aria-modal','true');else pane.removeAttribute('aria-modal');for(const [el,inert]of background)el.inert=inert;background.clear();if(mobile){for(const el of document.querySelectorAll('.main-shell,.sidebar,.mobile-nav,.skip,.media-viewer')){background.set(el,el.inert);el.inert=true;}}const v=window.visualViewport;pane.style.setProperty('--side-height',(v?.height||innerHeight)+'px');pane.style.setProperty('--side-top',(v?.offsetTop||0)+'px');}
 function layout(){pane.hidden=!open;trigger.hidden=['chat','ai-task'].includes(route)||open;trigger.setAttribute('aria-expanded',String(open));document.body.classList.toggle('side-chat-open',open);modalSync();controller?.refreshDisplay();window.dispatchEvent(new CustomEvent('rise:side-chat-layout',{detail:{open,width:open&&innerWidth>=900?pane.getBoundingClientRect().width:0}}));}
 async function ensure(query=new URLSearchParams()){
  if(!pending){host.innerHTML='<p class="loading" role="status">チャットに接続しています…</p>';pending=import('./views/chat.mjs').then(m=>m.mount({store,data,main:host,query,screenContext:()=>studyScreenContext(lastContentMain,store),active:()=>true,onMaximize:()=>{if(!['chat','ai-task'].includes(route))location.hash='#/chat';else controller?.toggleMaximize();}})).then(c=>{controller=c;return c;}).catch(error=>{pending=null;host.textContent=error.message;throw error;});}
  return pending;
 }
 async function show(){if(['chat','ai-task'].includes(route))return ensure();lastPage=location.hash||'#/home';previousFocus=document.activeElement;open=true;host.classList.add('chat-docked');pane.append(host);layout();pane.querySelector('[data-action="side-close"]').focus({preventScroll:true});return ensure();}
 function close(){open=false;controller?.restore();layout();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
 async function ask(value={}){try{const c=await show();await c.ready;await c.accept(value);}catch(error){toast(error.message,true);}}
 function setRoute(next,main,query){
  controller?.restore();if(['chat','ai-task'].includes(route)&&host.parentElement===pageMain)pane.append(host);route=next;pageMain=main;
  if(['chat','ai-task'].includes(next)){open=false;layout();host.classList.remove('chat-docked');main.replaceChildren(host);ensure(query).then(c=>c.applyQuery(query)).catch(e=>toast(e.message,true));}
  else{lastContentMain=main;lastPage=location.hash||'#/home';host.classList.add('chat-docked');pane.append(host);layout();}
 }
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!['chat','ai-task'].includes(route)&&a?.getAttribute('href')?.startsWith('#/chat'))lastPage=location.hash||'#/home';},true);
 pane.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='side-close')close();if(action==='side-full')location.hash='#/chat';});trigger.onclick=()=>show().catch(e=>toast(e.message,true));
 const key=e=>{if(!open||document.querySelector('dialog[open]'))return;if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'&&innerWidth<900){const controls=[...pane.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length),first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||!pane.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);
 window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',modalSync);window.visualViewport?.addEventListener('scroll',modalSync);
 host.addEventListener('click',e=>{if(e.target.closest('[data-action="back-to-material"]'))location.hash=lastPage;});
 async function resetNavigation(){const c=await ensure();await c.ready;return c.resetNavigation();}
 return {ask,show,close,setRoute,resetNavigation,canResumeNavigation:()=>controller?.canResumeNavigation()||false,resumeNavigation:()=>controller?.resumeNavigation()};
}
