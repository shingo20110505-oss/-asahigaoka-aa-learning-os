import {icon} from './ui.mjs';
const key='rise-sidebar-collapsed';
export function setupSidebar(){
 const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
 sidebar.id='rise-sidebar';
 sidebar.querySelector('.brand').setAttribute('aria-label','RISE ホーム');
 const toggle=document.createElement('button');toggle.type='button';toggle.className='sidebar-toggle';toggle.setAttribute('aria-controls',sidebar.id);sidebar.querySelector('.brand').after(toggle);
 let collapsed=false;try{collapsed=localStorage.getItem(key)==='true';}catch{}
 const apply=()=>{document.body.classList.toggle('sidebar-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'メニューを広げる':'メニューを折りたたむ');toggle.title=toggle.getAttribute('aria-label');toggle.innerHTML=icon('menu',20);for(const a of sidebar.querySelectorAll('nav a'))a.title=a.textContent.trim();};
 toggle.onclick=()=>{collapsed=!collapsed;try{localStorage.setItem(key,String(collapsed));}catch{}apply();};
 window.addEventListener('storage',e=>{if(e.key===key){collapsed=e.newValue==='true';apply();}});apply();
}
