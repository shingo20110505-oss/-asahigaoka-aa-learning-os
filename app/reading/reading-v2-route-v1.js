(()=>{
  'use strict';
  if (window.__RISE_READING_V2_ROUTE__) return;
  const VERSION='1.0.0';
  const TARGET='./reading-v2/';
  let scheduled=false;

  function replaceEntry(node){
    if (!(node instanceof Element)) return false;
    const old=node.matches?.('[data-action="ai-reading-exam"]')?node:node.querySelector?.('[data-action="ai-reading-exam"]');
    if(!old) return false;
    const link=document.createElement('a');
    link.className=old.className||'btn primary';
    link.href=TARGET;
    link.textContent=old.textContent?.trim()||'入試長文を解く';
    link.setAttribute('data-reading-v2-entry','1');
    link.setAttribute('aria-label','英語長文 V2 を開く');
    for(const attr of old.attributes){
      if(attr.name==='class'||attr.name==='data-action'||attr.name==='type'||attr.name==='aria-label') continue;
      if(attr.name.startsWith('data-')) link.setAttribute(attr.name,attr.value);
    }
    old.replaceWith(link);
    return true;
  }

  function scan(){
    scheduled=false;
    document.querySelectorAll('[data-action="ai-reading-exam"]').forEach(old=>replaceEntry(old));
  }
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(scan);
  }

  const observer=new MutationObserver(schedule);
  const start=()=>{
    scan();
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.__RISE_READING_V2_ROUTE__=Object.freeze({version:VERSION,target:TARGET});
})();
