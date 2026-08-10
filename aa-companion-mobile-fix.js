(()=>{
'use strict';
const wait=()=>{
  const sheet=document.getElementById('aaPetSheet');
  const pet=document.getElementById('aaPet');
  if(!sheet||!pet){setTimeout(wait,120);return;}
  if(document.getElementById('aaPetClose'))return;

  const style=document.createElement('style');
  style.textContent=`
    #aaPetSheet{overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-top:54px!important}
    #aaPetClose{position:absolute;right:12px;top:10px;z-index:3;width:38px;height:38px;border-radius:999px;border:1px solid #d8dee9;background:#fff;color:#172033;font-size:24px;font-weight:800;line-height:1;display:grid;place-items:center;box-shadow:0 4px 14px rgba(15,23,42,.12)}
    #aaPetDone{width:100%;min-height:46px;margin-top:12px;border:0;border-radius:13px;background:#101828;color:#fff;font-size:15px;font-weight:900}
    #aaPetBackdrop{position:fixed;inset:0;z-index:89;background:rgba(15,23,42,.18);backdrop-filter:blur(2px);display:none}
    #aaPetBackdrop.open{display:block}
    @media(prefers-color-scheme:dark){#aaPetClose{background:#111827;color:#fff;border-color:#344054}}
  `;
  document.head.appendChild(style);

  const close=document.createElement('button');
  close.id='aaPetClose';close.type='button';close.setAttribute('aria-label','閉じる');close.textContent='×';
  sheet.prepend(close);
  const done=document.createElement('button');
  done.id='aaPetDone';done.type='button';done.textContent='閉じる';sheet.appendChild(done);
  const backdrop=document.createElement('div');backdrop.id='aaPetBackdrop';document.body.appendChild(backdrop);

  const setOpen=(v)=>{sheet.classList.toggle('open',v);backdrop.classList.toggle('open',v);};
  const closeSheet=()=>setOpen(false);
  close.onclick=closeSheet;done.onclick=closeSheet;backdrop.onclick=closeSheet;

  const obs=new MutationObserver(()=>backdrop.classList.toggle('open',sheet.classList.contains('open')));
  obs.observe(sheet,{attributes:true,attributeFilter:['class']});

  let y0=null,t0=0;
  sheet.addEventListener('touchstart',e=>{if(e.touches.length===1){y0=e.touches[0].clientY;t0=Date.now();}},{passive:true});
  sheet.addEventListener('touchend',e=>{if(y0==null)return;const y=e.changedTouches?.[0]?.clientY;const dy=(y??y0)-y0;if(dy>95&&Date.now()-t0<650)closeSheet();y0=null;},{passive:true});

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
};
wait();
})();
