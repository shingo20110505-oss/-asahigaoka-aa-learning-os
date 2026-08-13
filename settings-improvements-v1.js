(()=>{'use strict';
const SUBJECT_IDS=['english','japanese','math','science','social'];
const SUBJECT_LABELS={english:'英語',japanese:'国語',math:'数学',science:'理科',social:'社会'};
const DEFAULT_PCT={english:20,japanese:20,math:20,science:20,social:20};

function current(){
  try{
    const src=state?.ui?.subjectProbability;
    if(!src||typeof src!=='object')return {...DEFAULT_PCT};
    const out={}; let sum=0;
    for(const id of SUBJECT_IDS){out[id]=Math.max(0,Math.round(Number(src[id])||0));sum+=out[id]}
    if(sum!==100)return {...DEFAULT_PCT};
    return out;
  }catch(_){return {...DEFAULT_PCT}}
}
function applyWeights(pct){
  try{for(const id of SUBJECT_IDS)SUBJECT_WEIGHTS[id]=Math.max(.01,(Number(pct[id])||0)/20)}catch(_){}
}
function persist(pct){
  try{state.ui.subjectProbability={...pct};applyWeights(pct);save()}catch(_){}
}
function probabilityCard(){
  const p=current();
  const rows=SUBJECT_IDS.map(id=>`<div class="aaProbRow"><label for="aa-prob-${id}">${SUBJECT_LABELS[id]}</label><input id="aa-prob-${id}" class="aaProbRange" type="range" min="0" max="100" step="5" value="${p[id]}" data-aa-prob="${id}"><output data-aa-prob-out="${id}">${p[id]}%</output></div>`).join('');
  return `<section class="card aaSettingsCard"><div class="aaSettingsTitle"><div><div class="eyebrow">QUESTION MIX</div><h3 class="h3">出題確率（教科別）</h3></div><span class="chip good" id="aa-prob-total">合計100%</span></div><p class="sub">MISSIONや混合演習で、どの教科を出しやすくするかを調整します。合計は自動で100%に保たれます。</p>${rows}<div class="aaProbPresets"><button class="btn ghost sm" type="button" data-aa-prob-preset="equal">均等 20%ずつ</button><button class="btn ghost sm" type="button" data-aa-prob-preset="aa">旭丘向け・5教科均等</button></div><div class="tiny">0%にしても、入試セット・指定教科・復習期限が来た問題では出題されることがあります。</div></section><div class="sp12"></div>`;
}
function injectCSS(){
  if(document.getElementById('aa-settings-improvements-css'))return;
  const s=document.createElement('style');s.id='aa-settings-improvements-css';s.textContent=`
  .aaSettingsCard{background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--blue2) 38%,var(--card)));border-color:color-mix(in srgb,var(--blue) 22%,var(--line))}
  .aaSettingsTitle{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .aaProbRow{display:grid;grid-template-columns:62px 1fr 58px;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .aaProbRow:first-of-type{border-top:0}.aaProbRow label{font-weight:800;font-size:13px}.aaProbRow output{text-align:right;font-weight:900;color:var(--blue);font-variant-numeric:tabular-nums}
  .aaProbRange{width:100%;accent-color:var(--blue)}.aaProbPresets{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 12px}
  @media(max-width:430px){.aaProbRow{grid-template-columns:52px 1fr 52px}.aaSettingsTitle{align-items:center}}
  `;document.head.appendChild(s);
}
function normalizeChanged(changedId,newValue){
  const p=current(); const old=p[changedId]; const next=Math.max(0,Math.min(100,Math.round(newValue/5)*5));
  const delta=next-old; p[changedId]=next;
  const others=SUBJECT_IDS.filter(x=>x!==changedId);
  if(delta!==0){
    let remaining=-delta;
    for(let pass=0;pass<20&&remaining!==0;pass++){
      const candidates=others.filter(id=>remaining>0?p[id]<100:p[id]>0); if(!candidates.length)break;
      for(const id of candidates){if(remaining===0)break;const step=remaining>0?Math.min(5,remaining,100-p[id]):-Math.min(5,-remaining,p[id]);p[id]+=step;remaining-=step}
    }
  }
  let sum=SUBJECT_IDS.reduce((a,id)=>a+p[id],0);
  if(sum!==100){const id=others[0];p[id]=Math.max(0,Math.min(100,p[id]+(100-sum)))}
  return p;
}
function refreshControls(p){
  for(const id of SUBJECT_IDS){const r=document.querySelector(`[data-aa-prob="${id}"]`),o=document.querySelector(`[data-aa-prob-out="${id}"]`);if(r)r.value=p[id];if(o)o.textContent=p[id]+'%'}
  const total=SUBJECT_IDS.reduce((a,id)=>a+p[id],0),el=document.getElementById('aa-prob-total');if(el)el.textContent='合計'+total+'%';
}
function wire(){
  document.addEventListener('input',e=>{const id=e.target?.dataset?.aaProb;if(!id)return;const p=normalizeChanged(id,Number(e.target.value));refreshControls(p);persist(p)});
  document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-aa-prob-preset]');if(!btn)return;const p={...DEFAULT_PCT};refreshControls(p);persist(p)});
}
function patchSettings(){
  try{
    if(typeof settingsHTML!=='function'||settingsHTML.__aaProbabilityPatched)return false;
    const prev=settingsHTML;
    settingsHTML=function(){
      let html=prev();
      if(html.includes('data-aa-prob="english"'))return html;
      const marker='<section class="card"><h3 class="h3">英語長文・個人語彙カバレッジ</h3>';
      return html.includes(marker)?html.replace(marker,probabilityCard()+marker):html.replace('</main>',probabilityCard()+'</main>');
    };
    settingsHTML.__aaProbabilityPatched=true;
    return true;
  }catch(_){return false}
}
function boot(){
  injectCSS();
  try{if(!state.ui.subjectProbability)state.ui.subjectProbability={...DEFAULT_PCT};applyWeights(current());save()}catch(_){}
  if(!patchSettings()){setTimeout(boot,120);return}
  wire();
  try{if(state.route==='settings')render()}catch(_){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

(()=>{
  if(document.getElementById('aa-english-question-quality-v2-loader'))return;
  const s=document.createElement('script');
  s.id='aa-english-question-quality-v2-loader';
  s.src='./english-question-quality-v2.js?v=2.0.0-20260813';
  s.async=false;
  document.head.appendChild(s);
})();
