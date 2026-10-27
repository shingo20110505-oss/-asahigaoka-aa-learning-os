import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {grades,armOrder,conditionsVersion} from '../experiments/rag/grade-baseline.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'test-results/rag/qwen3-4b-q3.json');
const report=JSON.parse(await fs.readFile(source,'utf8'));
const run=report.runs.find(r=>r.model&&r.conditions.version===conditionsVersion&&r.questions.length===24&&r.status==='completed');
if(!run)throw Error('The frozen complete baseline is missing');
if(run.questions.some(q=>!grades[q.id]))throw Error('Missing manual grade');
const result={
  method:'Manual rubric review by Codex; no keyword grading. Errors in extra explanation also fail. PC reference only.',
  sourceRunId:run.id,conditions:run.conditions,manifest:run.manifest,model:run.model,
  environment:{label:run.environment.label,gpu:run.environment.gpu,userAgent:run.environment.userAgent},
  loadMs:run.load.ms,index:run.index,
  summary:Object.fromEntries(armOrder.map((arm,i)=>{
    const counts=[0,0,0];for(const q of run.questions)counts[grades[q.id][i]]++;
    return [arm,{...run.summary[arm],accuracy:counts[2]/24,fullyCorrect:counts[2],partial:counts[1],wrong:counts[0],note:'Full-answer correctness, including any additional explanation.'}];
  })),
  questions:run.questions.map(q=>({...q,manualReview:{scores:Object.fromEntries(armOrder.map((arm,i)=>[arm,grades[q.id][i]])),reason:grades[q.id][3]}})),
};
const out=path.join(root,'test-results/rag/baseline-graded.json');
await fs.writeFile(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({output:out,summary:result.summary},null,2));
