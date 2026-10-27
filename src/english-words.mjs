import {scheduleReview} from './domain.mjs';
export const stageLabels={basic:'まず覚える基本語',entrance:'入試準備',extension:'発展・辞書'};
export const posLabels={n:'名詞',v:'動詞',adj:'形容詞',adv:'副詞',prep:'前置詞',conj:'接続詞',pron:'代名詞',article:'冠詞',aux:'助動詞',phrase:'熟語',interjection:'間投詞',unknown:'未分類',mixed:'複数の品詞'};
export const wordProgress=(state,id)=>state.vocabulary[id]||{};
export const posLabel=pos=>pos.split('/').map(x=>posLabels[x]||x).join('・');
export function selectEnglishWords(words,state,{query='',stage='basic',kind='all',pos='all',filter='all'}={},now=Date.now()){
 const q=query.trim().toLowerCase().replaceAll('’',"'");
 return words.filter(w=>{
  if(stage!=='all'&&w.stage!==stage||kind!=='all'&&w.kind!==kind||pos!=='all'&&!w.pos.split('/').includes(pos))return false;
  const p=wordProgress(state,w.id);
  if(filter==='new'&&p.repetitions||filter==='due'&&(!p.repetitions||p.due>now)||filter==='weak'&&!['again','hard'].includes(p.rating)||filter==='learned'&&!p.repetitions)return false;
  return !q||[w.word,w.meaning,...w.forms,...(w.related||[])].some(s=>s.toLowerCase().includes(q));
 });
}
export function rateEnglishWord(state,id,rating,now=Date.now()){
 if(!/^en-[a-f0-9]{16}$/.test(id))throw Error('単語IDを確認してください');
 state.vocabulary[id]=scheduleReview(state.vocabulary[id],rating,now);
}
