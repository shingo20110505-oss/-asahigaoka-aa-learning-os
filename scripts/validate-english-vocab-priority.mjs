import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const legacy=read('app/legacy/main-runtime.js');
const dataLine=legacy.split(/\r?\n/).find(line=>line.startsWith('const DATA = '));
if(!dataLine)throw new Error('base DATA line not found');
const base=JSON.parse(dataLine.slice('const DATA = '.length,-1)).vocab;
if(!Array.isArray(base))throw new Error('base DATA.vocab must be an array');
const scripts={
 v1:read('english-vocabulary-supplement-v1.js'),
 priority:read('english-vocabulary-priority-v1.js'),
 parts:[1,2,3,4].map(i=>read(`english-vocabulary-supplement-v2-data-${i}.js`)),
 v2:read('english-vocabulary-supplement-v2.js')
};
function sandbox(){
 const s={window:{},DATA:{vocab:structuredClone(base)},console,document:{dispatchEvent(){}},CustomEvent:function(name,opts){this.type=name;this.detail=opts?.detail},setInterval(fn){fn();return 1},clearInterval(){}};
 vm.createContext(s);return s;
}
function run(includePriority){
 const s=sandbox();
 vm.runInContext(scripts.v1,s,{filename:'english-vocabulary-supplement-v1.js'});
 if(includePriority)vm.runInContext(scripts.priority,s,{filename:'english-vocabulary-priority-v1.js'});
 scripts.parts.forEach((code,i)=>vm.runInContext(code,s,{filename:`english-vocabulary-supplement-v2-data-${i+1}.js`}));
 vm.runInContext(scripts.v2,s,{filename:'english-vocabulary-supplement-v2.js'});
 return s;
}
const baseline=run(false),prioritized=run(true);
const failures=[],check=(ok,msg)=>{if(!ok)failures.push(msg)};
const norm=v=>String(v??'').trim().toLowerCase();
const excluded=['coherent','constitute','criterion','deduce','derive','equivalent','framework','notion'];
const baseWords=new Set(baseline.DATA.vocab.map(x=>norm(x.word))),priorityWords=new Set(prioritized.DATA.vocab.map(x=>norm(x.word)));
const removed=[...baseWords].filter(w=>!priorityWords.has(w));
const added=[...priorityWords].filter(w=>!baseWords.has(w));
const addedRows=prioritized.DATA.vocab.filter(x=>added.includes(norm(x.word))).map(x=>({id:x.id,word:x.word,level:x.level,pos:x.pos,source:x.source,srsId:x.srsId}));
const marker=prioritized.window.__AA_ENGLISH_VOCAB_PRIORITY_V1__;
check(baseline.DATA.vocab.length===500,`baseline total must be 500, got ${baseline.DATA.vocab.length}`);
check(prioritized.DATA.vocab.length===500,`prioritized total must be 500, got ${prioritized.DATA.vocab.length}`);
check(prioritized.window.__AA_ENGLISH_VOCAB_SUPPLEMENT_V2__?.complete===true,'prioritized V2 did not complete at 500');
check(marker?.removed?.length===excluded.length,`priority removed ${marker?.removed?.length??0}, expected ${excluded.length}`);
check(excluded.every(w=>!priorityWords.has(w)),`excluded low-yield rows still active: ${excluded.filter(w=>priorityWords.has(w)).join(', ')}`);
check(removed.length===excluded.length&&excluded.every(w=>removed.includes(w)),`baseline-to-priority removals mismatch: ${removed.join(', ')}`);
check(added.length===excluded.length,`expected ${excluded.length} replacements, got ${added.length}: ${added.join(', ')}`);
check(addedRows.every(x=>x.source==='rise-curated-supplement-v2'),'all replacement rows must come from curated V2');
check(addedRows.every(x=>x.srsId===`v:${x.id}`),'replacement rows must retain canonical SRS identity');
check(marker?.historyImpact==='localized-removed-items-not-active-existing-storage-untouched','localized history-impact marker missing');
const registry=read('app/runtime-registry.js');
const iV1=registry.indexOf('english-vocabulary-supplement-v1.js'),iPriority=registry.indexOf('english-vocabulary-priority-v1.js'),iV2=registry.indexOf('english-vocabulary-supplement-v2.js');
check(iV1>=0&&iPriority>iV1&&iV2>iPriority,'priority layer must load after V1 and before V2');
const report={status:failures.length?'FAIL':'PASS',version:marker?.version||'',baselineTotal:baseline.DATA.vocab.length,prioritizedTotal:prioritized.DATA.vocab.length,excluded,removed,added,addedRows,historyImpact:marker?.historyImpact||'',failures};
fs.writeFileSync('english-vocab-priority-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
