// A product policy evaluated separately from the three pure comparison arms.
// Answers are copied from retrieved lessons, never invented or hidden in a rubric.
import{calculateGeography}from'./geography-calculator.mjs';
export function sourceAnswer(query,retrieval){
 const q=String(query).normalize('NFKC'),refs=retrieval.refs||[];
 if(/(?:写真|画像|図).*(?:送っていません|添付していません|添付なし)/.test(q))
  return{kind:'missing-input',text:'写真や数値がないため特定できません。図や数値を確認してから質問してください。',references:[]};
 const calculated=calculateGeography(q);
 if(calculated)return{...calculated,references:refs.filter(r=>r.id===calculated.sourceId)};
 // A plain list of related forms has no grammatical labels. Do not let a
 // small model turn every item into a past tense, even if one happens to fit.
 if(/過去形|過去分詞|活用/.test(q)&&/[a-z]/i.test(q))return{kind:'insufficient-source',text:'この教材では語形の種類を確認できません。過去形・過去分詞を区別した説明は、接続後のAIで確認してください。',references:refs};
 if(!/意味|読み|どういう|違い|違います|同じ|捉え方|借り|貸す/.test(q))return null;
 if(/過去形|過去分詞|活用|例文|英文.*作|作文/.test(q))return null;
 const classical=/古文/.test(q)?'古文':/漢文/.test(q)?'漢文':null;
 if(classical){
  // Only words explicitly grouped after the subject are dictionary targets.
  // A later quotation can be a proposed modern translation, not another headword.
  const group=q.match(new RegExp(classical+'(?:の|で)?\\s*([「『“"][^」』”"]+[」』”"](?:\\s*(?:と|や|、|・)\\s*[「『“"][^」』”"]+[」』”"])*)'));
  const quoted=[...(group?.[1]||'').matchAll(/[「『“"]([^」』”"]+)[」』”"]/g)].map(m=>m[1]);
  const targets=quoted.map(t=>classical==='漢文'?t.replace(/^([\p{Script=Han}])(?:だ|ぞ|れ|に)$/u,'$1'):t);
  if(!targets.length)return null;
  const rows=refs.filter(r=>r.title.startsWith(classical+'：')&&targets.includes(r.title.slice(classical.length+1)));
  if(rows.length!==new Set(targets).size)return null;
  return{kind:'source',text:rows.map(r=>r.text).join('\n\n'),references:rows};
 }
 const candidates=refs.filter(r=>r.id.startsWith('english-')&&/^[a-z][a-z '-]*$/i.test(r.title));
 const matches=candidates.flatMap(r=>{
  const escaped=r.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return [...q.matchAll(new RegExp('(?<![a-z])'+escaped+'(?![a-z])','gi'))].map(m=>({r,start:m.index,end:m.index+m[0].length}));
 });
 const kept=matches.filter(m=>!matches.some(n=>n!==m&&n.start<=m.start&&n.end>=m.end&&n.r.title.length>m.r.title.length));
 const rows=[...new Map(kept.map(m=>[m.r.id,m.r])).values()];
 if(!rows.length||rows.length>2)return null;
 const words=q.toLowerCase().match(/[a-z]+(?:['-][a-z]+)*/g)||[],covered=new Set(rows.flatMap(r=>r.title.toLowerCase().split(/\s+/)));
 if(words.some(w=>!['vs','and'].includes(w)&&!covered.has(w)))return null;
 return{kind:'source',text:rows.map(r=>r.text).join('\n\n'),references:rows};
}
