// One independently authored lesson per row; grouping supplies explicit metadata.
export function lessons(chapter,topic,level,sourceIds,rows){
 return rows.trim().split(/\r?\n/).map(line=>{
  const values=line.split('|');
  if(values.length!==10||values.some(x=>!x.trim()))throw Error('Invalid expanded geography row: '+values[0]);
  const [key,title,location,summary,why,compare,read,pitfall,question,answer]=values;
  return {key,title,location,summary,why,compare,read,pitfall,question,answer,chapter,topic,level,sourceIds,expanded:true};
 });
}

// Focused place/process lessons share the recall format, not the factual content.
// Each authored row supplies its own location, explanation, cause, comparison,
// evidence-reading cue and misconception. A row is one coherent learning unit.
export function atlas(chapter,topic,level,sourceIds,rows){
 return rows.trim().split(/\r?\n/).map(line=>{
  const values=line.split('|');
  if(values.length!==8||values.some(x=>!x.trim()))throw Error('Invalid geography atlas row: '+values[0]);
  const [key,title,location,summary,why,compare,read,pitfall]=values;
  return {key,title,location,summary,why,compare,read,pitfall,question:title+'について、場所・特徴・理由を結びつけて説明しよう。',answer:location+' '+summary+' '+why,chapter,topic,level,sourceIds,expanded:true};
 });
}
