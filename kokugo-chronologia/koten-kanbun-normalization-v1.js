(()=>{'use strict';
const VERSION='1.0.1';
const TAG_RE=/〔(重要語義|文脈語義|文法識別|和歌・読解|文学史確認)〕/g;
const norm=v=>String(v??'').normalize('NFKC').trim().toLowerCase();
const baseWord=v=>String(v??'').replace(TAG_RE,'').trim();
const tagOf=v=>{const m=String(v??'').match(/〔([^〕]+)〕/);return m?m[1]:''};
const displayBand=rank=>rank<=100?'S 最優先':rank<=300?'A 頻出':rank<=500?'B 重要':rank<=1000?'C 発展':rank<=1200?'増補A':rank<=1450?'増補B':'増補C';
const phase=(rank,word)=>{const tag=tagOf(word);if(tag==='重要語義')return'重要語義の再確認';if(tag==='文脈語義')return'文脈語義の再演習';if(tag==='文法識別')return'文法識別の再演習';if(tag==='和歌・読解')return'和歌・読解の再演習';if(tag==='文学史確認')return'文学史の再確認';return rank<=1000?'基礎カード':'増補カード'};
const honorificWords=new Set(['のたまふ','おほす','きこしめす','ごらんず','おぼす','おぼしめす','たまふ','たまはる','まゐる','まうづ','まかる','まかづ','はべり','さぶらふ','つかうまつる','きこゆ','きこえさす','申す','聞こし召す','参らす','侍り','候ふ']);
const cultureWords=new Set(['更衣','中宮','東宮','春宮','院','上皇','法皇','摂政','関白','后','御息所','北の方']);
function domain(rank,category,word,meaning){
 const w=baseWord(word),m=String(meaning??'');
 if(category==='漢文')return'漢文';
 if(honorificWords.has(w)||/(尊敬語|謙譲語|丁寧語|敬語|敬意の方向|二方面敬語|絶対敬語|尊敬〕|謙譲〕|丁寧〕)/.test(w+' '+m)||rank>=598&&rank<=603||rank>=1598&&rank<=1603)return'敬語';
 if(tagOf(word)==='文法識別'||rank>=501&&rank<=597||rank>=1501&&rank<=1597)return'文法';
 if(cultureWords.has(w)||tagOf(word)==='文学史確認'||rank>=650&&rank<=700||rank>=1650&&rank<=1700)return'古典常識';
 if(rank>=607&&rank<=623||rank>=1607&&rank<=1623||/^(和歌|短歌|長歌|旋頭歌|片歌|句切れ|初句切れ|二句切れ|三句切れ|四句切れ|句切れなし|字余り|字足らず|五七調|七五調)$/.test(w))return'和歌';
 if(rank>=604&&rank<=606||rank>=624&&rank<=649||rank>=1604&&rank<=1606||rank>=1624&&rank<=1649||/^(枕詞|序詞|掛詞|縁語)/.test(w))return'表現技法';
 return'古語';
}
function normalizeBank(raw){
 const source=Array.isArray(raw)?raw:[];
 const records=source.map(x=>{const rank=Number(x?.[0])||0,category=String(x?.[1]||''),word=String(x?.[2]||''),reading=String(x?.[3]||''),meaning=String(x?.[4]||''),base=baseWord(word),d=domain(rank,category,word,meaning);return Object.freeze({id:'kk'+String(rank).padStart(4,'0'),rank,sourceCategory:category,word,baseWord:base,reading,meaning,domain:d,phase:phase(rank,word),displayBand:displayBand(rank),canonicalKey:`${d}|${norm(base)}|${norm(reading)}`})}).filter(x=>x.rank&&x.word);
 const first=new Map();for(const x of records)if(!first.has(x.canonicalKey))first.set(x.canonicalKey,x.rank);
 const enriched=records.map(x=>Object.freeze({...x,variantOf:first.get(x.canonicalKey),isRepeat:first.get(x.canonicalKey)!==x.rank}));
 const counts={};for(const x of enriched)counts[x.domain]=(counts[x.domain]||0)+1;
 const unique=new Set(enriched.map(x=>x.canonicalKey));
 return Object.freeze({version:VERSION,total:enriched.length,uniqueConcepts:unique.size,repeatCards:enriched.length-unique.size,counts:Object.freeze(counts),records:Object.freeze(enriched),byRank:new Map(enriched.map(x=>[x.rank,x]))});
}
function installBrowser(api){
 if(typeof document==='undefined')return;
 const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value};
 const setTitle=(el,value)=>{if(el&&el.title!==value)el.title=value};
 const apply=()=>{const sec=document.querySelector('#kkSection');if(!sec)return false;const h=sec.querySelector('.kk-head h2');setText(h,'古文・漢文 学習カード1700');const note=sec.querySelector('.kk-head .note');setText(note,`古文・漢文の学習カード1,700件。原語を削除せず、基礎・重要語義・文脈語義・文法識別・和歌読解・文学史確認を学習フェーズとして区別します。実質概念 ${api.uniqueConcepts.toLocaleString()}件／再演習カード ${api.repeatCards.toLocaleString()}件。`);let box=sec.querySelector('#kkNormalizationSummary');if(!box){box=document.createElement('div');box.id='kkNormalizationSummary';box.className='note';box.style.cssText='margin:8px 0 10px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:#f8fafc;line-height:1.65';sec.querySelector('.kk-summary')?.after(box)}setText(box,['古語','敬語','文法','和歌','表現技法','古典常識','漢文'].map(k=>`${k} ${api.counts[k]||0}`).join(' ・ '));for(const row of sec.querySelectorAll('.kk-row')){const cell=row.querySelector('.kk-rank');if(!cell)continue;const n=Number((cell.textContent.match(/\d+/)||[])[0]);const meta=api.byRank.get(n);if(!meta)continue;const tier=cell.querySelector('.kk-tier');setText(tier,meta.displayBand);const cat=row.querySelector('.kk-cat');if(cat){setText(cat,meta.domain);setTitle(cat,meta.phase+(meta.isRepeat?`／基礎カード #${meta.variantOf} の再演習`:''))}}return true};
 const tryInstall=()=>{const raw=window.AA_KOTEN_KANBUN_BANK;if(Array.isArray(raw)&&raw.length===1700){const built=normalizeBank(raw);window.RISE_KOTEN_KANBUN_NORMALIZED_V1=built;apply();const root=document.querySelector('#kkSection');if(root&&!root.dataset.kkNormalizeObserver){root.dataset.kkNormalizeObserver='1';new MutationObserver(()=>apply()).observe(root,{childList:true,subtree:true})}return true}return false};
 if(tryInstall())return;let n=0;const t=setInterval(()=>{if(tryInstall()||++n>240)clearInterval(t)},50);
}
const api=Object.freeze({version:VERSION,baseWord,tagOf,displayBand,phase,domain,normalizeBank});
if(typeof window!=='undefined'){window.RISE_KOTEN_KANBUN_NORMALIZER_V1=api;installBrowser(api)}
})();
