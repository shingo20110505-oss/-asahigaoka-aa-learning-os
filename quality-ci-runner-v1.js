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
  if(typeof qaRun!=='function'||!window.AA_QUALITY_REPAIR||!window.AA_V2_TEST_API){if(++tries<200)return setTimeout(run,100);return finish({pass:false,error:'quality runtime not ready'})}
  try{
    qaRun();
    const report=Array.isArray(state?.qa?.report)?state.qa.report:[];
    const selected=TARGETS.map(match=>report.find(x=>match(String(x?.name||'')))||null);
    const missing=selected.map((x,i)=>x?null:i).filter(x=>x!==null);
    const failed=selected.filter(x=>x&&!x.ok).map(x=>({name:x.name,detail:x.detail}));
    const audit=typeof window.AA_QUALITY_REPAIR.audit==='function'?window.AA_QUALITY_REPAIR.audit():null;
    finish({pass:missing.length===0&&failed.length===0&&audit?.pass===true,missing,failed,audit,checks:selected.map(x=>x?{name:x.name,ok:!!x.ok,detail:x.detail}:null)});
  }catch(error){finish({pass:false,error:String(error?.stack||error)})}
}
setTimeout(run,0);
})();
