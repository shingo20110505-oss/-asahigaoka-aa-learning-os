(()=>{'use strict';
if(window.__AA_REVIEW_PAGE_V1__)return;window.__AA_REVIEW_PAGE_V1__=true;
const REVIEW_URL='./review.html?v=1.0.3';
function installReviewLink(){
 const box=document.querySelector('.topBtns');
 if(!box)return;
 box.querySelectorAll('[data-review-open],[data-aa-review]').forEach(x=>x.remove());
 const a=document.createElement('a');
 a.href=REVIEW_URL;
 a.className='iconBtn';
 a.dataset.aaReview='1';
 a.textContent='復習';
 a.style.textDecoration='none';
 a.style.display='inline-flex';
 a.style.alignItems='center';
 box.prepend(a);
}
const direct=new URL(location.href).searchParams.get('review')==='1';
if(direct){location.replace(REVIEW_URL);return;}
installReviewLink();
new MutationObserver(installReviewLink).observe(document.documentElement,{subtree:true,childList:true});
window.AA_REVIEW_API={open:()=>location.assign(REVIEW_URL),close:()=>history.back(),getItems:()=>Array.isArray(window.AA_REVIEW_BANK)?window.AA_REVIEW_BANK.slice():[]};
})();