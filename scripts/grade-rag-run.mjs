import fs from'node:fs/promises';import{pathToFileURL}from'node:url';import path from'node:path';
const[source,gradeModule,output]=process.argv.slice(2);
if(!source||!gradeModule||!output)throw Error('Usage: node scripts/grade-rag-run.mjs source.json grades.mjs output.json');
const{grades,armOrder,conditionsVersion,modelId,suite='development'}=await import(pathToFileURL(path.resolve(gradeModule))),report=JSON.parse(await fs.readFile(source,'utf8'));
const runs=report.runs.filter(r=>r.model?.id===modelId&&r.conditions.version===conditionsVersion&&(r.conditions.suite||'development')===suite&&r.questions.length===Object.keys(grades).length&&r.status==='completed');
if(!runs.length)throw Error('Complete matching run is missing');const run=runs.at(-1);
if(run.questions.some(q=>!grades[q.id]))throw Error('Missing manual grade');
const result={method:'Manual rubric review by Codex. Complete answers include necessary reasoning and no erroneous additions. No keyword grading. PC reference only.',...run,summary:Object.fromEntries(armOrder.map((arm,i)=>{const counts=[0,0,0];for(const q of run.questions)counts[grades[q.id][i]]++;return[arm,{...run.summary[arm],fullyCorrect:counts[2],partial:counts[1],wrongOrUnanswered:counts[0],abstained:run.questions.filter(q=>q.arms[arm]?.kind==='insufficient-source').length,accuracy:counts[2]/run.questions.length,note:'Manually graded complete-answer accuracy.'}];})),questions:run.questions.map(q=>({...q,manualReview:{scores:Object.fromEntries(armOrder.map((a,i)=>[a,grades[q.id][i]])),reason:grades[q.id][armOrder.length]}}))};
await fs.writeFile(output,JSON.stringify(result,null,2));console.log(JSON.stringify({output,summary:result.summary},null,2));
