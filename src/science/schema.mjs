// Hand-authored rows. IDs never depend on array order or question wording.
export function unit(id, grade, field, title, curriculum, pages, text) {
 const items=text.trim().split('\n').filter(Boolean).map(line=>{
  const [key,level,question,answer,reason,connection,facts='']=line.split('|').map(x=>x.trim());
  if(!key||!['B','A'].includes(level)||!question||!answer||!reason||!connection)throw Error('Invalid science row: '+id+'/'+key);
  return {id:'sci-memory-'+id+'-'+key,unit:id,grade,field,level:level==='B'?'basic':'advanced',question,answer,reason,connection,factIds:facts?facts.split(','):[]};
 });
 return {id,grade,field,title,curriculum,pages,items};
}
