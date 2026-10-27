// Shared browser/Node lexical retrieval. No embedding model, network or user data.
export const normalizeSearch=value=>String(value??'').normalize('NFKC').toLowerCase().replaceAll('’',"'").replaceAll('明治憲法','大日本帝国憲法');
export function searchTokens(value){
 const s=normalizeSearch(value).replace(/教えて(?:ください)?|説明して(?:ください)?|について|どのように|どうして|ください/g,' '),out=[];
 for(const part of s.match(/[a-z0-9]+(?:['-][a-z0-9]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu)||[]){
  if(/^[a-z0-9]/.test(part))out.push(part);else if(part.length===1)out.push(part);else for(let i=0;i<part.length-1;i++)out.push(part.slice(i,i+2));
 }return out;
}
export function createStudyIndex(documents){
 const docs=documents.map(d=>({...d,aliases:(d.aliases||[d.title]).map(normalizeSearch)})),postings=new Map(),lengths=[];
 for(let i=0;i<docs.length;i++){const words=searchTokens(docs[i].text),freq=new Map();lengths.push(words.length);for(const t of words)freq.set(t,(freq.get(t)||0)+1);for(const [t,n]of freq){if(!postings.has(t))postings.set(t,[]);postings.get(t).push(i,n);}}
 const average=lengths.reduce((a,b)=>a+b,0)/Math.max(docs.length,1),byId=new Map(docs.map(d=>[d.id,d]));
 function search(query,{limit=6,category='all'}={}){
  const q=normalizeSearch(query).trim().slice(0,800);if(!q)return[];
  const dictionaryIntent=/[a-z]|英語|英単語|英訳/.test(q),eligible=d=>(category==='all'||d.category===category)&&(category!=='all'||d.category!=='english'||dictionaryIntent);
  const terms=new Set(searchTokens(q)),scores=new Map(),hits=new Map();
  for(const t of terms){const rows=postings.get(t);if(!rows)continue;const idf=Math.log(1+(docs.length-rows.length/2+.5)/(rows.length/2+.5));for(let j=0;j<rows.length;j+=2){const i=rows[j],tf=rows[j+1];if(!eligible(docs[i]))continue;scores.set(i,(scores.get(i)||0)+idf*tf*2.2/(tf+1.2*(.25+.75*lengths[i]/average)));hits.set(i,(hits.get(i)||0)+1);}}
  const latin=new Set(q.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g)||[]);
  for(let i=0;i<docs.length;i++){const d=docs[i];if(!eligible(d))continue;const matches=d.aliases.filter(a=>a&&(/^[a-z0-9'-]+$/.test(a)?latin.has(a):(a.length>=2||d.category==='kanbun'&&(q.includes('漢文')||q===a||category==='kanbun'))&&q.includes(a)));if(matches.length){scores.set(i,(scores.get(i)||0)+30+Math.max(...matches.map(a=>Math.min(a.length,20)))*2+(d.priority||0));hits.set(i,Math.max(hits.get(i)||0,2));}}
  const ranked=[...scores].filter(([i])=>hits.get(i)>=Math.min(2,terms.size)).sort((a,b)=>b[1]-a[1]||docs[a[0]].id.localeCompare(docs[b[0]].id));
  if(!ranked.length)return[];const floor=Math.max(5,ranked[0][1]*.38);
  return ranked.filter(([,score])=>score>=floor).slice(0,Math.min(12,Math.max(1,limit))).map(([i,score])=>({...docs[i],score:Number(score.toFixed(3))}));
 }
 return {search,get:id=>byId.get(id),count:docs.length,terms:postings.size};
}
