import*as lab from'./lab.mjs';
const $=s=>document.querySelector(s),select=$('#model');
for(const m of lab.manifest.models){const o=document.createElement('option');o.value=m.id;o.textContent=m.name||(m.runtime==='wllama'?'Qwen2.5 3B / wllama（GGUF 4bit）':m.id.replace('-Instruct','').replace('-q4f16_1-MLC',' / WebLLM（4bit）'));select.append(o);}
function details(){const m=lab.manifest.models.find(x=>x.id===select.value);$('#details').textContent=`取得するモデル資産: 約${(m.downloadBytes/1e9).toFixed(2)} GB / ${m.runtime} / ライセンス: ${m.license}。実際の保存領域・実行メモリは測定結果を確認してください。`;}
select.onchange=details;details();
async function action(fn){try{$('#status').textContent='実行中';await fn();$('#status').textContent='完了。結果を確認してください。';}catch(e){$('#status').textContent='エラー: '+e.message;}}
$('#check').onclick=()=>action(async()=>{$('#summary').textContent=JSON.stringify(await lab.environment(),null,2);});
$('#prepare').onclick=()=>action(()=>lab.prepareShell());
$('#run').onclick=()=>action(async()=>{$('#stream').textContent='';const r=await lab.run(select.value);if(r.error)throw Error(r.error);});
$('#stop').onclick=()=>{lab.terminate();$('#status').textContent='中止しました。途中の結果は保存されています。';};
$('#offline').onclick=()=>action(async()=>{const r=await lab.offlineProbe(select.value);if(r.error)throw Error(r.error);});
$('#delete').onclick=()=>action(()=>lab.clearModel(select.value));
$('#persist').onclick=()=>action(async()=>{$('#summary').textContent=JSON.stringify({persisted:await navigator.storage.persist(),storage:await lab.storage()},null,2);});
$('#export').onclick=lab.exportJSON;
$('#chat').onclick=()=>action(async()=>{const prompt=$('#prompt').value;const a=await lab.chat(select.value,prompt);$('#conversation').textContent+=`\n質問: ${prompt}\n回答: ${a.answer}\n`;$('#prompt').value='';});
$('#new-chat').onclick=()=>action(async()=>{lab.clearChat();$('#conversation').textContent='';});
$('#context').onclick=()=>action(async()=>{const r=await lab.contextProbe(select.value);$('#conversation').textContent=r.result?.answer||r.error;if(r.error)throw Error(r.error);});
window.addEventListener('lab-progress',e=>{$('#status').textContent=e.detail.text||`読み込み ${e.detail.loaded||0} / ${e.detail.total||'?'} bytes`;});
window.addEventListener('lab-delta',e=>{$('#stream').textContent+=e.detail;});
window.addEventListener('lab-update',()=>{$('#summary').textContent=JSON.stringify({runs:lab.report.runs.map(r=>({id:r.id,status:r.status,questions:r.questions.length,error:r.error})),active:lab.report.active,offline:lab.report.offline},null,2);});
