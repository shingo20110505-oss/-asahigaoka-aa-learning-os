(()=>{'use strict';
if(window.__AA_REVIEW_PAGE_V2_SHIM__)return;window.__AA_REVIEW_PAGE_V2_SHIM__=true;
const REVIEW_URL='./review/';
function installReviewLink(){
 const box=document.querySelector('.topBtns');
 if(!box)return;
 box.querySelectorAll('[data-review-open],[data-aa-review],[data-review-fixed]').forEach(x=>x.remove());
 const a=document.createElement('a');
 a.href=REVIEW_URL;
 a.className='iconBtn';
 a.dataset.aaReview='1';
 a.textContent='復習';
 a.style.cssText='text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-width:48px';
 box.prepend(a);
}
const direct=new URL(location.href).searchParams.get('review')==='1';
if(direct){location.replace(REVIEW_URL);return;}
installReviewLink();
new MutationObserver(installReviewLink).observe(document.documentElement,{subtree:true,childList:true});
window.AA_REVIEW_API={version:'2.0.0',open:()=>location.assign(REVIEW_URL),close:()=>history.back(),getItems:()=>Array.isArray(window.AA_REVIEW_BANK)?window.AA_REVIEW_BANK.slice():[]};
})();
