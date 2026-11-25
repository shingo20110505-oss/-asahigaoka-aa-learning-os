import {scheduleReview} from './domain.mjs';
export const stageLabels={basic:'まず覚える基本語',entrance:'入試準備',extension:'発展・辞書'};
export const eikenBandLabels={basic:'基本語',entrance:'入試準備',pre1:'準1級の目安',beyond:'準1級超の発展語'};
export const posLabels={n:'名詞',v:'動詞',adj:'形容詞',adv:'副詞',prep:'前置詞',conj:'接続詞',pron:'代名詞',article:'冠詞',aux:'助動詞',phrase:'熟語',interjection:'間投詞',unknown:'未分類',mixed:'複数の品詞'};
export const wordProgress=(state,id)=>state.vocabulary[id]||{};
export const posLabel=pos=>pos.split('/').map(x=>posLabels[x]||x).join('・');
export const normalizeEnglishSearch=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/[‘’‛ʼ]/g,"'").replace(/[‐‑‒–—―−﹘]/g,'-').replace(/\s+/g,' ').trim();

// Dictionary records are immutable after loading; cache normalized fields without
// retaining a dictionary after its view and data cache have released it.
const searchIndex=new WeakMap();
function indexedWord(word){
 let indexed=searchIndex.get(word);
 if(!indexed){
  indexed={headword:normalizeEnglishSearch(word.word),other:[word.meaning,...(word.forms||[]),...(word.related||[])].map(normalizeEnglishSearch),hasExample:Boolean(word.example?.trim()||word.senses?.some(s=>s.definitions?.some(d=>d.example?.en?.trim())))};
  searchIndex.set(word,indexed);
 }
 return indexed;
}

export function selectEnglishWords(words,state,{query='',stage='basic',kind='all',pos='all',filter='all',favoriteOnly=false,band='all',exampleOnly=false}={},now=Date.now()){
 const q=normalizeEnglishSearch(query),matches=q?[[],[],[],[]]:[[]];
 for(const w of words){
  if(stage!=='all'&&w.stage!==stage||kind!=='all'&&w.kind!==kind||pos!=='all'&&!w.pos.split('/').includes(pos)||band!=='all'&&w.eikenBand!==band)continue;
  const p=wordProgress(state,w.id);
  if(favoriteOnly&&!p.favorite||filter==='new'&&p.repetitions||filter==='due'&&(!p.repetitions||p.due>now)||filter==='weak'&&!['again','hard'].includes(p.rating)||filter==='learned'&&!p.repetitions)continue;
  const indexed=q||exampleOnly?indexedWord(w):null;
  if(exampleOnly&&!indexed.hasExample)continue;
  if(!q){matches[0].push(w);continue;}
  const rank=indexed.headword===q?0:indexed.headword.startsWith(q)?1:indexed.headword.includes(q)?2:indexed.other.some(text=>text.includes(q))?3:-1;
  if(rank>=0)matches[rank].push(w);
 }
 return matches.flat();
}
export function toggleEnglishFavorite(state,id){
 if(!/^en-[a-f0-9]{16}$/.test(id))throw Error('単語IDを確認してください');
 const previous=wordProgress(state,id),favorite=!previous.favorite;
 state.vocabulary[id]={...previous,favorite};
 return favorite;
}
export function rateEnglishWord(state,id,rating,now=Date.now()){
 if(!/^en-[a-f0-9]{16}$/.test(id))throw Error('単語IDを確認してください');
 state.vocabulary[id]=scheduleReview(state.vocabulary[id],rating,now);
}
