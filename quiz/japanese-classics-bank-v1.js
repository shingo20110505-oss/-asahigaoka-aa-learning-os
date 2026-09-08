(()=>{'use strict';
const VERSION='2.0.0';
const raw=window.AA_KOTEN_KANBUN_BANK;
const normalizer=window.RISE_KOTEN_KANBUN_NORMALIZER_V1;
if(!Array.isArray(raw)||raw.length!==1700||!normalizer?.normalizeBank)throw new Error('古文・漢文1,700カードを読み込めません');
const model=normalizer.normalizeBank(raw);
const text=v=>v==null?'':String(v).trim();
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const levelOf=x=>x.sourceCategory==='漢文'?(x.rank<=850?'A':'B'):x.rank<=100?'S':x.rank<=300?'A':x.rank<=500?'B':'C';
const levelLabel=(kind,level)=>kind==='kanbun'?(level==='A'?'A 頻出':'B 発展'):({S:'S 最優先',A:'A 頻出',B:'B 重要',C:'C 発展'})[level]||level;
const unique=model.records.filter(x=>!x.isRepeat).map(x=>Object.freeze({
 id:x.id,rank:x.rank,kind:x.sourceCategory==='古文'?'classical':'kanbun',type:x.sourceCategory==='古文'?'koten':'kanbun',category:x.sourceCategory,area:x.domain,phase:x.phase,word:x.baseWord,reading:x.reading,meaning:x.meaning,level:levelOf(x),displayBand:levelLabel(x.sourceCategory==='古文'?'classical':'kanbun',levelOf(x)),canonicalKey:x.canonicalKey
}));
const classical=Object.freeze(unique.filter(x=>x.kind==='classical'));
const kanbun=Object.freeze(unique.filter(x=>x.kind==='kanbun'));
function distractors(pool,item,field,count=3){
 const out=[],seen=new Set([text(item[field])]);
 const take=pred=>{for(const x of shuffle(pool)){if(out.length>=count)break;if(x===item||!pred(x))continue;const value=text(x[field]);if(!value||seen.has(value))continue;seen.add(value);out.push(value)}};
 take(x=>x.area===item.area);take(()=>true);return out;
}
function makeQuestion(item,want='random',pool){
 pool=Array.isArray(pool)&&pool.length?pool:(item.kind==='classical'?classical:kanbun);
 const modes=want==='random'||want==='auto'?shuffle(['meaning','reading','word']):[want];
 for(const actual of modes){
  const field=actual==='meaning'?'meaning':actual==='reading'?'reading':'word';
  const prompt=actual==='word'?item.meaning:item.word,answer=text(item[field]);
  if(!prompt||!answer)continue;
  const wrong=distractors(pool,item,field,3);if(wrong.length<3)continue;
  return Object.freeze({item,actual,prompt,answer,choices:Object.freeze(shuffle([answer,...wrong])),hint:actual==='meaning'?'意味を選んでください':actual==='reading'?'読みを選んでください':'この意味に合う語句を選んでください',explanation:`${item.word}${item.reading?'（'+item.reading+'）':''}｜${item.meaning}`});
 }
 return null;
}
window.RISE_JAPANESE_CLASSICS_BANK_V1=Object.freeze({version:VERSION,sourceTotal:model.total,total:unique.length,repeatCards:model.repeatCards,classical,kanbun,all:Object.freeze(unique),levelLabel,makeQuestion});
})();
