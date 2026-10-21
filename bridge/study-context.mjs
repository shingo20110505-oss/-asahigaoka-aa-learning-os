import fs from 'node:fs/promises';
import {enrichHistory} from '../src/history-content.mjs';
import {readingGuide} from '../src/reading-guide.mjs';

let historyPromise;
const normalized=text=>String(text).normalize('NFKC').toLowerCase().replace(/[\sの]/g,'');
const guideKeywords=[['主語','動詞','svo'],['関係代名詞'],['代名詞','指示語'],['although','however','逆接','対比'],['because','therefore','因果'],['比較級','fewer','less','否定'],['受動態','受け身','現在完了'],['根拠','選択肢']];
export async function studyReferences(question){
 const query=normalized(question).replaceAll('明治憲法','大日本帝国憲法'),refs=[];
 // Only records with an explicit checked source are used for AI grounding.
 historyPromise??=fs.readFile(new URL('../data/history.json',import.meta.url),'utf8').then(JSON.parse).then(enrichHistory).catch(e=>{historyPromise=null;throw e;});
 const history=await historyPromise;
 const ranked=history.filter(row=>row.sources?.length).map(row=>({row,score:(row.tags||[]).reduce((n,tag)=>{const key=normalized(tag);return n+(key.length>=3&&query.includes(key)?key.length:0);},0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
 for(const {row} of ranked)refs.push({id:'history-'+row.id,title:row.date+' · '+row.event,route:'history/'+row.id,excerpt:(row.note?.summary||row.detail).slice(0,260),sources:row.sources});
 for(let i=0;i<readingGuide.length&&refs.length<4;i++)if(guideKeywords[i].some(word=>query.includes(normalized(word)))){const g=readingGuide[i];refs.push({id:'reading-guide-'+i,title:g.title,route:'reading',excerpt:g.example+'\n'+g.meaning+'\n'+g.explanation,sources:[]});}
 return refs;
}
export function referenceInput(refs){return refs.length?'RISEの参照資料（本文にない日付・人物を推測で追加しない。以下の記載と回答を照合する）：\n'+refs.map((r,i)=>'['+(i+1)+'] '+r.title+'\n'+r.excerpt).join('\n\n'):'';}
