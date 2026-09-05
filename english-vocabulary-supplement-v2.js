(()=>{'use strict';
const VERSION='2026-09-05.1',TARGET=500,PART_COUNT=4;
const norm=value=>String(value??'').trim().toLowerCase();
function buildRows(){
 const parts=window.__AA_ENGLISH_VOCAB_V2_PARTS__;
 if(!Array.isArray(parts)||parts.length<PART_COUNT||Array.from({length:PART_COUNT},(_,i)=>typeof parts[i]==='string'&&parts[i].trim()).some(x=>!x))return null;
 return parts.slice(0,PART_COUNT).join('\n').split(/\n/).filter(Boolean).map((line,index)=>{
  const [word,meaning,pos,level,example]=line.split('|'),id=`en-sup-v2-${String(index+1).padStart(3,'0')}`;
  return{id,word,meaning,pos,level,example,cloze:example,family:[],syn:'',srsId:`v:${id}`,source:'rise-curated-supplement-v2',verified:true};
 });
}
function install(){
 if(typeof DATA==='undefined'||!Array.isArray(DATA.vocab)||!window.__AA_ENGLISH_VOCAB_SUPPLEMENT__)return false;
 const rows=buildRows();if(!rows)return false;
 const ids=new Set(DATA.vocab.map(x=>String(x.id||''))),words=new Set(DATA.vocab.map(x=>norm(x.word)));let added=0,skipped=0;
 for(const row of rows){
  if(DATA.vocab.length>=TARGET)break;
  const key=norm(row.word);if(!key||ids.has(row.id)||words.has(key)){skipped++;continue}
  DATA.vocab.push(row);ids.add(row.id);words.add(key);added++;
 }
 const total=DATA.vocab.length,complete=total===TARGET;
 window.__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__={version:VERSION,target:TARGET,candidates:rows.length,added,skipped,total,complete,compatibility:'append-only-existing-id-preserved'};
 try{document.dispatchEvent(new CustomEvent('aa:vocab-supplement-v2-ready',{detail:window.__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__}))}catch(_){}
 if(!complete)console.error(`[AA vocab v2] target ${TARGET} not reached without deleting existing data: ${total}`);
 return true;
}
if(!install()){let tries=0;const timer=setInterval(()=>{if(install()||++tries>600)clearInterval(timer)},10)}
})();
