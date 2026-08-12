(()=>{'use strict';
if(window.__AA_QUALITY_CI_RUNNER_V1__)return;window.__AA_QUALITY_CI_RUNNER_V1__=true;
const params=new URLSearchParams(location.search);if(params.get('aa_quality_ci')!=='1')return;
const TARGETS=[
  name=>name.startsWith('英単語穴埋め・答え露出防止'),
  name=>name==='段階学習プラン',
  name=>name==='長文生成・文法ゲート 36本',
  name=>name==='専用誤答タイプ',
  name=>name==='数学公式暗記限定',
  name=>name==='長文タイプを出題へ反映'
];
let tries=0;
function finish(result){
  window.__AA_QUALITY_CI_RESULT__=result;
  document.documentElement.dataset.aaQualityCi=result.pass?'PASS':'FAIL';
  let pre=document.getElementById('aa-ci-quality-result');if(!pre){pre=document.createElement('pre');pre.id='aa-ci-quality-result';pre.style.cssText='position:fixed;inset:0;z-index:2147483647;background:white;color:black;white-space:pre-wrap;overflow:auto;padding:16px';document.body.appendChild(pre)}
  pre.textContent='AA_QUALITY_CI='+JSON.stringify(result);
}
function run(){
  if(typeof qaRun!=='function'||!window.AA_QUALITY_REPAIR||!window.AA_QUALITY_REPAIR_FINAL||!window.AA_V2_TEST_API||!window.AA_ENGLISH_EXAMPLE_AUDIT){if(++tries<240)return setTimeout(run,100);return finish({pass:false,error:'quality runtime not ready',repair:!!window.AA_QUALITY_REPAIR,finalRepair:!!window.AA_QUALITY_REPAIR_FINAL,vocabExamples:!!window.AA_ENGLISH_EXAMPLE_AUDIT})}
  try{
    qaRun();
    const report=Array.isArray(state?.qa?.report)?state.qa.report:[];
    const selected=TARGETS.map(match=>report.find(x=>match(String(x?.name||'')))||null);
    const missing=selected.map((x,i)=>x?null:i).filter(x=>x!==null);
    const failed=selected.filter(x=>x&&!x.ok).map(x=>({name:x.name,detail:x.detail}));
    const baseAudit=typeof window.AA_QUALITY_REPAIR.audit==='function'?window.AA_QUALITY_REPAIR.audit():null;
    const finalAudit=typeof window.AA_QUALITY_REPAIR_FINAL.audit==='function'?window.AA_QUALITY_REPAIR_FINAL.audit():null;
    const vocabAudit=window.AA_ENGLISH_EXAMPLE_AUDIT||{};
    const vocab=Array.isArray(DATA?.vocab)?DATA.vocab:[];
    const advise=vocab.find(v=>String(v?.word||'').toLowerCase()==='advise');
    const lookAfter=vocab.find(v=>String(v?.word||'').toLowerCase()==='look after');
    const vocabExamplesPass=Number(vocabAudit.placeholdersAfter)===0&&Number(vocabAudit.uncoveredCount)===0&&/advis/i.test(String(advise?.example||''))&&/look.+after/i.test(String(lookAfter?.example||''));
    const vocabExampleCheck={name:'英単語例文・全件品質ゲート',ok:vocabExamplesPass,detail:`total=${vocabAudit.total||0}, placeholders=${vocabAudit.placeholdersAfter||0}, uncovered=${vocabAudit.uncoveredCount||0}, advise=${advise?.example||'missing'}, lookAfter=${lookAfter?.example||'missing'}`};
    if(!vocabExamplesPass)failed.push({name:vocabExampleCheck.name,detail:vocabExampleCheck.detail});
    const pass=missing.length===0&&failed.length===0&&finalAudit?.pass===true&&vocabExamplesPass;
    finish({pass,missing,failed,baseAudit,finalAudit,vocabAudit,vocabExampleCheck,checks:[...selected.map(x=>x?{name:x.name,ok:!!x.ok,detail:x.detail}:null),vocabExampleCheck]});
  }catch(error){finish({pass:false,error:String(error?.stack||error)})}
}
setTimeout(run,0);
})();