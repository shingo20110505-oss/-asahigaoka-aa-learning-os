(()=>{
  'use strict';
  if (window.__RISE_READING_V2_ROUTE__) return;
  const VERSION='1.1.0';
  const TARGET='./reading-v2/';
  let scheduled=false;

  function makeLink(old){
    const link=document.createElement('a');
    link.className=old?.className||'btn primary';
    link.href=TARGET;
    link.textContent='英語長文 400〜800語';
    link.setAttribute('data-reading-v2-entry','1');
    link.setAttribute('aria-label','英語長文。400〜800語の未読英文を読み、日本語訳を確認します');
    return link;
  }

  function normalizeCard(entry){
    const card=entry?.closest?.('.rv4SubjectCard,.r6Card,.aaSupportReadingLearning');
    if(!card)return;
    const subject=card.querySelector('.r6Subject');
    const title=subject?.querySelector('h3');
    const desc=subject?.querySelector('p');
    if(title&&/長文|英語/.test(title.textContent||''))title.textContent='英語長文';
    if(desc)desc.textContent='400〜800語の初見英文を読み、必要なときだけ全文和訳を確認します。';
    card.querySelectorAll('.aaReadingModeNote').forEach(n=>n.remove());
    const badge=card.querySelector('.r6Badge');
    if(badge)badge.textContent='固定ライブラリ';
  }

  function replaceActions(scope=document){
    let changed=false;
    const actions=[...scope.querySelectorAll('[data-action="ai-reading-exam"],[data-action="start-reading-exam"],[data-action="ai-reading-scaffold"],[data-reading-mode="exam"],[data-reading-mode="scaffold-exam"]')];
    const groups=new Set(actions.map(n=>n.closest('.r6Actions,.rv4SubjectExtras,.actions')).filter(Boolean));

    for(const group of groups){
      if(group.querySelector('[data-reading-v2-entry="1"]')){
        normalizeCard(group.querySelector('[data-reading-v2-entry="1"]'));
        group.querySelectorAll('[data-action="ai-reading-exam"],[data-action="start-reading-exam"],[data-action="ai-reading-scaffold"],[data-reading-mode="exam"],[data-reading-mode="scaffold-exam"]').forEach(n=>n.remove());
        continue;
      }
      const old=group.querySelector('[data-action="ai-reading-exam"],[data-action="start-reading-exam"],[data-reading-mode="exam"],[data-action="ai-reading-scaffold"],[data-reading-mode="scaffold-exam"]');
      if(!old)continue;
      const link=makeLink(old);
      group.replaceChildren(link);
      normalizeCard(link);
      changed=true;
    }

    // Fallback for an isolated legacy reading button outside a known action group.
    scope.querySelectorAll('[data-action="ai-reading-exam"],[data-action="start-reading-exam"]').forEach(old=>{
      if(old.closest('.r6Actions,.rv4SubjectExtras,.actions'))return;
      const link=makeLink(old);
      old.replaceWith(link);
      normalizeCard(link);
      changed=true;
    });
    return changed;
  }

  function scan(){
    scheduled=false;
    replaceActions(document);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(scan);
  }

  const observer=new MutationObserver(schedule);
  const start=()=>{
    scan();
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  document.addEventListener('rise:navigation',schedule);
  document.addEventListener('aa:v23ready',schedule);
  for(const delay of [0,80,250,800,2000,5000])setTimeout(schedule,delay);

  window.__RISE_READING_V2_ROUTE__=Object.freeze({version:VERSION,target:TARGET});
})();
