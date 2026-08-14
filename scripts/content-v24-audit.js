'use strict';
const fs=require('fs'),vm=require('vm');
const ctx={console,window:{},DATA:{vocab:[],readingScenarios:[]},document:{dispatchEvent(){}},CustomEvent:function(){}};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['curriculum-v2-data.js','v23-japanese.js','v23-math.js','v23-science.js','science-content-fix-v1.js','v23-social.js','curriculum-expansion-v24.js','source-quote-bank-v1.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const C=ctx.AA_V2_CURRICULUM,subs=['japanese','math','science','social'];
const result={version:ctx.AA_V24_CONTENT_STATS?.version,subjects:{},v24:ctx.AA_V24_CONTENT_STATS,quotes:ctx.AA_SOURCE_QUOTES,deepAudit:{}};let fail=[];
const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
function bump(obj,key){obj[key]=(obj[key]||0)+1;}
for(const s of subs){
  const rows=C[s]||[],ids=new Set(),dups=[],bad=[],promptAnswers=new Map(),exact=new Map(),exactDups=[],conflicts=[],unitCounts={},difficultyCounts={},templateCounts={};
  for(const r of rows){
    if(!Array.isArray(r)||r.length<6||!String(r[0]||'').trim()||!String(r[1]||'').trim()||!String(r[2]||'').trim()||!String(r[3]||'').trim()||!String(r[4]||'').trim()||!Number.isFinite(Number(r[5])))bad.push(r?.[0]||'?');
    if(ids.has(String(r[0])))dups.push(String(r[0]));ids.add(String(r[0]));
    const area=norm(r[1]),prompt=norm(r[2]),answer=norm(r[3]),key=prompt+'\u0000'+answer;
    bump(unitCounts,area||'(blank)');bump(difficultyCounts,String(Number(r[5])));
    if(exact.has(key))exactDups.push({id:String(r[0]),otherId:exact.get(key),prompt:String(r[2]),answer:String(r[3])});else exact.set(key,String(r[0]));
    if(prompt){const prev=promptAnswers.get(prompt);if(prev&&prev.answer!==answer)conflicts.push({id:String(r[0]),otherId:prev.id,prompt:String(r[2]),answer:String(r[3]),otherAnswer:prev.rawAnswer});else if(!prev)promptAnswers.set(prompt,{answer,id:String(r[0]),rawAnswer:String(r[3])});}
    const template=prompt.replace(/[0-9０-９]+/g,'#').replace(/[「『“\"].*?[」』”\"]/g,'Q');if(template)bump(templateCounts,template);
  }
  const repeatedTemplates=Object.entries(templateCounts).filter(([,n])=>n>=8).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([template,count])=>({template,count}));
  const reverseConflicts=conflicts.filter(c=>c.prompt.startsWith('次の説明に最も対応する語句・法則を選ぶ：'));
  result.subjects[s]={rows:rows.length,uniqueIds:ids.size,duplicateIds:dups.length,badRows:bad.length,v24Rows:rows.filter(r=>String(r[0]).startsWith('v24')).length};
  result.deepAudit[s]={exactDuplicateQuestionAnswer:exactDups.length,exactDuplicateSamples:exactDups.slice(0,20),samePromptDifferentWordingAnswers:conflicts.length,conflictSamples:conflicts.slice(0,30),ambiguousReversePrompts:reverseConflicts.length,ambiguousReverseSamples:reverseConflicts.slice(0,20),unitCounts,difficultyCounts,repeatedTemplates};
  if(dups.length||bad.length)fail.push(s+':invalid');
  if(reverseConflicts.length)fail.push(s+':ambiguousReversePrompts='+reverseConflicts.length);
}
const v=ctx.AA_V24_CONTENT_STATS||{};const q=ctx.AA_SOURCE_QUOTES||{};
if((v.totalNewRows||0)<600)fail.push('v24Rows<600');
if((v.added?.japanese||0)<100)fail.push('japaneseAdded<100');
if((v.added?.math||0)<100)fail.push('mathAdded<100');
if((v.added?.science||0)<150)fail.push('scienceAdded<150');
if((v.added?.social||0)<150)fail.push('socialAdded<150');
if((v.added?.englishVocab||0)<80)fail.push('englishVocab<80');
if((v.added?.englishReading||0)<10)fail.push('englishReading<10');
if((q.total||0)<25)fail.push('sourceQuotes<25');
const qrows=[...(C.japanese||[]),...(C.social||[])].filter(r=>String(r[0]).startsWith('v24q'));
if(qrows.some(r=>!String(r[4]).includes('出典：')))fail.push('quoteAttributionMissing');
const vocab=ctx.DATA.vocab||[],vocabSeen=new Set(),vocabDup=[];
for(let i=0;i<vocab.length;i++){const x=vocab[i],key=norm(typeof x==='string'?x:(x?.word??x?.term??x?.en??JSON.stringify(x)));if(key&&vocabSeen.has(key))vocabDup.push(i);else if(key)vocabSeen.add(key);}
result.english={curatedVocab:vocab.length,curatedReading:ctx.DATA.readingScenarios.length,vocabExactDuplicates:vocabDup.length};
result.deepAudit.note='Same-prompt different-answer wording is diagnostic unless it creates an ambiguous reverse-selection prompt. Exact duplicate rows are reported without deleting IDs so existing progress references remain stable.';
result.pass=fail.length===0;result.failures=fail;
console.log('CONTENT_V24_AUDIT '+JSON.stringify(result));if(!result.pass)process.exitCode=1;
