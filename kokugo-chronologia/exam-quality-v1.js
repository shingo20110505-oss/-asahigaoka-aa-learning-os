(()=>{'use strict';
const VERSION='1.0.2';
const text=v=>v==null?'':String(v).trim();
const norm=v=>text(v).normalize('NFKC').toLowerCase();
const key=x=>`${norm(x?.word??x?.term)}|${norm(x?.reading)}`;
const exclusions=new Set(['間に合う|まにあう']);
const normalizeRank=v=>['A','B','C'].includes(String(v||'').toUpperCase())?String(v).toUpperCase():'C';
const category=x=>['two','three','yoji','idiom','four'].includes(x?.type)?x.type:'four';
function base(raw={}){return{rank:'C',examRank:'C',qualityConfidence:'low',reviewStatus:'pending-editorial',qualitySource:'full15000',category:category(raw)}}
function verified(raw={},source='curated'){const rank=normalizeRank(raw.rank);return{rank,examRank:rank,qualityConfidence:'high',reviewStatus:'verified',qualitySource:source,category:category(raw)}}
function isExcluded(x){return exclusions.has(key(x))}
function isExamImportant(x){return !!x&&!isExcluded(x)&&x.reviewStatus==='verified'&&['A','B'].includes(normalizeRank(x.examRank||x.rank))}
function summarize(rows=[]){const active=rows.filter(x=>!isExcluded(x)),verifiedRows=active.filter(x=>x.reviewStatus==='verified'),pendingRows=active.filter(x=>x.reviewStatus!=='verified');return Object.freeze({version:VERSION,total:active.length,verified:verifiedRows.length,pendingEditorial:pendingRows.length,examImportant:verifiedRows.filter(isExamImportant).length,rankA:active.filter(x=>normalizeRank(x.rank)==='A').length,rankB:active.filter(x=>normalizeRank(x.rank)==='B').length,rankC:active.filter(x=>normalizeRank(x.rank)==='C').length,excluded:rows.length-active.length})}
window.RISE_JAPANESE_EXAM_QUALITY_V1=Object.freeze({version:VERSION,key,exclusions,base,verified,isExcluded,isExamImportant,summarize});
if(typeof document!=='undefined'&&/\/kokugo-chronologia\/?(?:index\.html)?$/.test(location.pathname)){
 const current=document.currentScript?.src||location.href,src=new URL('./koten-kanbun-normalization-v1.js?v=1.0.2',current).href;
 if(!document.querySelector('script[data-rise-kk-normalizer]')){const s=document.createElement('script');s.src=src;s.async=true;s.dataset.riseKkNormalizer='1';document.head.appendChild(s)}
}
})();
