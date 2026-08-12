(()=>{
'use strict';
const ID='aa-list-study-nav-v1';
function make(){
  const wrap=document.createElement('section');
  wrap.id=ID;
  wrap.className='card';
  wrap.style.marginTop='12px';
  wrap.innerHTML=`
    <div class="eyebrow">LIST STUDY</div>
    <div class="h3" style="font-size:20px;margin-top:5px">一覧で覚える</div>
    <p class="sub" style="margin:0 0 12px">流れで覚える社会年表と、まとめて反復できる国語の慣用句・四字熟語です。問題演習の前後に、短時間で見直せます。</p>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <a href="./chronologia.html" style="text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:16px;padding:14px;background:linear-gradient(145deg,var(--card),var(--blue2));display:block;min-height:132px">
        <div style="font-size:11px;font-weight:900;color:var(--blue);letter-spacing:.08em">社会</div>
        <div style="font-size:19px;font-weight:900;margin:5px 0">歴史年表 1,000</div>
        <div class="sub" style="font-size:11px;line-height:1.55">古代から現代までを時代順に確認。年号・出来事・因果関係をつなげて覚える。</div>
        <div style="margin-top:10px;font-weight:900;color:var(--blue);font-size:12px">年表を開く →</div>
      </a>
      <a href="./kokugo-chronologia/" style="text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:16px;padding:14px;background:linear-gradient(145deg,var(--card),var(--purple2));display:block;min-height:132px">
        <div style="font-size:11px;font-weight:900;color:var(--purple);letter-spacing:.08em">国語</div>
        <div style="font-size:19px;font-weight:900;margin:5px 0">語彙年表 15,000</div>
        <div class="sub" style="font-size:11px;line-height:1.55">慣用句・四字熟語・四字語を一覧反復。読み・意味・入試優先度・要復習を管理。</div>
        <div style="margin-top:10px;font-weight:900;color:var(--purple);font-size:12px">語彙一覧を開く →</div>
      </a>
    </div>`;
  return wrap;
}
function place(){
  if(document.getElementById(ID))return;
  const headings=[...document.querySelectorAll('h1,h2,h3,.h2,.h3')];
  const target=headings.find(el=>/教科別演習/.test(el.textContent||''));
  if(!target)return;
  const card=target.closest('.card')||target.parentElement;
  if(card&&card.parentElement)card.insertAdjacentElement('afterend',make());
}
function run(){place();setTimeout(place,300);setTimeout(place,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(()=>place()).observe(document.documentElement,{subtree:true,childList:true});
})();
