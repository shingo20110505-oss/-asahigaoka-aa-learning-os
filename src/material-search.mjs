import {studyAliases} from './search-terms.mjs';
// Shared by the module worker and tests. User documents never leave this browser.
export const searchCategories={science:'理科の暗記',geography:'地理',history:'歴史',review:'復習教材',reading:'英語長文',english:'英単語・熟語',vocabulary:'国語語彙',quiz:'国語の演習',classical:'古文・漢文',guide:'読み方・語句解説',exam:'5教科対策',interactive:'実験・資料演習',notes:'ノート',materials:'マイ資料',cards:'暗記カード',feature:'機能'};
export const normalize=text=>String(text??'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[’‘]/g,"'").replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,' ').trim();
export const textOf=value=>value==null?'':Array.isArray(value)?value.map(textOf).filter(Boolean).join('\n'):typeof value==='object'?Object.values(value).map(textOf).filter(Boolean).join('\n'):String(value);
export function privateDocuments(state={}){
 const files=x=>textOf([...(x.attachments||[]),...(x.attachment?[x.attachment]:[])].map(f=>f.name));
 const make=(x,category,route,body)=>({id:category+':'+x.id,title:x.title||x.question||'無題',body:textOf(body),subject:x.subject||'その他',category,route});
 return [
  ...(state.notes||[]).filter(x=>!x.deletedAt&&!x.archived).map(x=>make(x,'notes','notes/'+encodeURIComponent(x.id),[x.body,x.tags,files(x)])),
  ...(state.materials||[]).filter(x=>!x.deletedAt&&!x.archived).map(x=>make(x,'materials','materials/'+encodeURIComponent(x.id),[x.memo,x.pages,x.tags,files(x)])),
  ...(state.cards||[]).filter(x=>!x.deletedAt&&!x.archived).map(x=>make(x,'cards','memory/'+encodeURIComponent(x.id),[x.question,x.answer,x.tags]))
 ];
}
export function prepareDocuments(docs){return docs.map((doc,order)=>({...doc,order,titleKey:normalize(doc.title),bodyKey:normalize(doc.body),metaKey:normalize([doc.subject,searchCategories[doc.category]].join(' '))}));}
export function excerpt(text,query,length=170){
 const raw=String(text||''),terms=normalize(query).split(' ').filter(Boolean),key=normalize(raw);
 const found=terms.map(t=>key.indexOf(t)).filter(n=>n>=0),pos=found.length?Math.min(...found):0;
 // Normalization can change string lengths. Locate with a per-codepoint map only for returned rows.
 const chars=Array.from(raw),offsets=[];let normalized='',offset=0;
 for(const char of chars){const part=normalize(char);for(let i=0;i<part.length;i++)offsets.push(offset);normalized+=part;offset+=char.length;}
 const compactTerms=terms.map(t=>t.replace(/\s/g,''));const hits=compactTerms.map(t=>normalized.indexOf(t)).filter(n=>n>=0);
 const at=hits.length?(offsets[Math.min(...hits)]||0):pos,start=Math.max(0,at-45),end=Math.min(raw.length,start+length);
 return (start?'…':'')+raw.slice(start,end).replace(/\s+/g,' ')+(end<raw.length?'…':'');
}

const aliasGroups=studyAliases.map(group=>[...new Set(group.map(normalize))]);
const aliasMap=new Map(aliasGroups.flatMap(group=>group.map(term=>[term,group])));
export function parseQuery(query){
 const terms=[],excluded=[];
 for(const match of String(query).matchAll(/(-?)"([^"]+)"|(-?)([^\s"]+)/g)){
  const negative=Boolean(match[1]||match[3]),phrase=match[2]!==undefined,raw=match[2]??match[4];
  let key=normalize(raw);if(!phrase)key=key.replace(/(?:とは|について|を教えて|って何)[？?]?$/,'').replace(/[？?]$/,'');
  if(!key)continue;
  if(negative)excluded.push(key);else terms.push({key,phrase,variants:phrase?[key]:aliasMap.get(key)||[key]});
 }
 return {terms,excluded};
}
function distance(a,b,max){
 if(Math.abs(a.length-b.length)>max)return max+1;
 let previous=Array.from({length:b.length+1},(_,i)=>i),before;
 for(let i=1;i<=a.length;i++){
  const row=[i];let minimum=i;
  for(let j=1;j<=b.length;j++){
   row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
   if(before&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],before[j-2]+1);
   minimum=Math.min(minimum,row[j]);
  }
  if(minimum>max)return max+1;before=previous;previous=row;
 }
 return previous[b.length];
}
const vocabCache=new WeakMap();
function vocabulary(docs){
 if(vocabCache.has(docs))return vocabCache.get(docs);
 const frequencies=new Map();
 for(const d of docs){for(const word of new Set(d.titleKey.match(/[a-z][a-z'-]{2,}|[ぁ-ん一-龥々ー]{3,16}/g)||[]))frequencies.set(word,(frequencies.get(word)||0)+1);}
 for(const group of aliasGroups)for(const word of group)frequencies.set(word,(frequencies.get(word)||0)+3);
 const words=[...frequencies].map(([word,count])=>({word,count}));vocabCache.set(docs,words);return words;
}
export function searchDocuments(docs,{query='',subject='all',category='all',offset=0,limit=30}={}){
 const key=normalize(query),{terms,excluded}=parseQuery(query),suggestions=[];
 if(!terms.length)return {total:0,counts:{},items:[],offset:0,suggestions};
 const seen=new Set();
 function find(){
  const counts={},matches=[];
  for(const d of docs){
   if(subject!=='all'&&!d.subject.split(/[・、/]/).includes(subject))continue;
   const fields=[d.titleKey,d.bodyKey,d.metaKey];
   if(excluded.some(t=>fields.some(f=>f.includes(t))))continue;
   let hit=0,score=0,expanded=false,required=true;
   for(const [i,t]of terms.entries()){
    const exact=fields.some(f=>f.includes(t.key)),variant=exact?t.key:t.variants.find(v=>fields.some(f=>f.includes(v)));
    if(variant){hit++;seen.add(i);expanded ||= !exact;score+=(d.titleKey===variant?100:0)+(d.titleKey.includes(variant)?40:0)+(exact?10:3);}
    else if(t.phrase)required=false;
   }
   if(!hit||!required||hit<Math.ceil(terms.length/2))continue;
   counts[d.category]=(counts[d.category]||0)+1;
   if(category!=='all'&&d.category!==category)continue;
   const partial=hit<terms.length;
   score+=(d.titleKey===key?1000:0)+(d.titleKey.includes(key)?120:0)+(d.bodyKey.includes(key)?20:0)+(partial?-80:100);
   score+=d.category==='feature'?-10:d.category==='english'||d.category==='guide'?0:12;
   matches.push({d,score,partial,expanded});
  }
  return {counts,matches};
 }
 let {counts,matches}=find();
 for(const [i,t]of terms.entries()){
  if(seen.has(i)||t.phrase||t.key.length<3||t.key.length>32)continue;
  const latin=/^[a-z]+$/.test(t.key),max=latin&&t.key.length>=7?2:1;
  if(latin&&t.key.length<4)continue;
  const candidates=vocabulary(docs).filter(w=>Math.abs(w.word.length-t.key.length)<=max&&(/^[a-z]+$/.test(w.word)===latin)).map(w=>({...w,edit:distance(t.key,w.word,max)})).filter(w=>w.edit>0&&w.edit<=max).sort((a,b)=>a.edit-b.edit||b.count-a.count||a.word.localeCompare(b.word)).slice(0,3);
  if(!candidates.length)continue;
  const best=candidates[0];t.variants=[...new Set([...t.variants,best.word,...(aliasMap.get(best.word)||[])])];
  for(const candidate of candidates){const suggested=terms.map((term,j)=>j===i?candidate.word:term.phrase?'"'+term.key+'"':term.key).concat(excluded.map(x=>'-"'+x+'"')).join(' ');suggestions.push(suggested);}
 }
 if(suggestions.length)({counts,matches}=find());
 matches.sort((a,b)=>b.score-a.score||a.d.order-b.d.order);
 const page=Math.max(0,Math.min(Math.floor(offset/limit)*limit,Math.max(0,Math.ceil(matches.length/limit)-1)*limit));
 const variants=terms.flatMap(t=>t.variants);
 return {total:matches.length,counts,offset:page,suggestions:[...new Set(suggestions)].slice(0,3),items:matches.slice(page,page+limit).map(({d,partial,expanded})=>{
  const part=d.parts?.map(p=>({p,hits:terms.filter(t=>t.variants.some(v=>normalize(p.text).includes(v))).length})).sort((a,b)=>b.hits-a.hits)[0];
  const location=part?.hits?part.p:null;
  return {id:d.id,title:d.title,subject:d.subject,category:d.category,route:d.route+(location?.target?(d.route.includes('?')?'&':'?')+'part='+encodeURIComponent(location.target):''),label:location?.label||'',partial,expanded,highlight:variants.join(' '),snippet:excerpt(location?.text||d.body,variants.join(' '))};
 })};
}
