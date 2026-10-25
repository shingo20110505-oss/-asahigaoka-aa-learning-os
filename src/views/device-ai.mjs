import {heading,esc,button,link,download} from '../ui.mjs';
import {localAI} from '../local-ai/client.mjs';
import {MODELS} from '../local-ai/models.mjs';
import {PC_EVALUATION} from '../local-ai/evaluation.mjs';

const seconds=value=>Number.isFinite(value)?(value/1000).toFixed(2)+'秒':'—';
function reportHTML(report){
 if(!report?.results?.length)return '<p class="muted">この端末では、まだ比較していません。</p>';
 return `<p class="muted">固定の学習問題を使った簡易判定です。回答の正しさも原文で確認してください。</p>${report.results.map(r=>`<details><summary>${esc(MODELS.find(m=>m.id===r.model)?.name||r.model)} · ${esc(r.error?'中断・失敗':r.state==='running'?'確認中':`${r.passed??r.cases.filter(c=>c.quality.passed).length}/6問`)} · 応答 ${seconds(r.medianTotalMs)}</summary>${r.error?`<p>${esc(r.error)}</p>`:''}<p class="muted">最初の文字: ${seconds(r.medianFirstTokenMs)} / 読み込み: ${seconds(r.loadMs)} / 保存済みデータからの再起動: ${r.offlineVerified?'確認済み':'未確認'}</p>${r.cases.map(c=>`<div class="device-ai-answer"><strong>${esc(c.prompt)}</strong><p>${esc(c.answer)}</p><small>簡易判定: ${c.quality.passed?'通過':'要確認'} / ${seconds(c.totalMs)}</small></div>`).join('')}</details>`).join('')}`;
}

export async function mount({main}){
 if(!document.querySelector('[data-device-ai-css]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../device-ai.css',import.meta.url);css.dataset.deviceAiCss='';document.head.append(css);}
 main.innerHTML=heading('LOCAL AI','端末内AIの検証','日本語の回答と、端末での動作を確認します。',link('AIチャットへ','chat'))+`<div class="device-ai">
 <section class="panel"><h2>比較の結果</h2><p>今回の実行環境で比較した7モデルには、日本語の学習で重要な誤りが残ったため、チャットへの自動切り替えを有効にしていません。</p><p id="local-ai-support" class="muted">端末の対応を確認しています。</p><div class="actions">${button('端末の対応を確認','check')}</div><p id="local-ai-message" role="status" aria-live="polite"></p><progress id="local-ai-progress" max="1" hidden></progress></section>
 <section class="panel"><h2>PCでの比較記録</h2><p class="muted">${esc(PC_EVALUATION.date)} · ${esc(PC_EVALUATION.device)} · ${esc(PC_EVALUATION.runtime)}<br>iPad A16の実測値ではありません。時間は固定6問の中央値です。</p><div class="device-ai-table-wrap"><table><thead><tr><th>モデル</th><th>簡易判定</th><th>最初の文字</th><th>回答完了</th></tr></thead><tbody>${PC_EVALUATION.rows.map(r=>`<tr><td>${esc(r.name)}<br><small>${esc(r.note)}</small></td><td>${esc(r.score)}</td><td>${r.first.toFixed(2)}秒</td><td>${r.total.toFixed(2)}秒</td></tr>`).join('')}</tbody></table></div><p class="muted">語句照合の判定に加えて、回答原文を確認しました。* Qwen3 0.6Bには、実際は誤りなのに判定を通過した回答も含まれます。</p></section>
 <details class="panel"><summary>この端末で比較する（実験用）</summary><p>モデルを端末に保存して順番に比較します。すべて比較すると数GB以上の通信と保存領域が必要です。個人のチャットや資料は使いません。この比較だけで通常のチャットに切り替わることはありません。</p><label class="device-ai-terms"><input id="local-ai-terms" type="checkbox" ${localAI.termsAccepted()?'checked disabled':''}> Gemmaを含める場合は、<a href="${new URL('../local-ai/vendor/GEMMA_TERMS.txt',import.meta.url)}" target="_blank" rel="noopener">利用規約</a>と<a href="${new URL('../local-ai/vendor/GEMMA_PROHIBITED_USE.txt',import.meta.url)}" target="_blank" rel="noopener">使用に関する制限</a>に同意します。</label><div class="actions">${button('この端末で比較する','compare','primary')}${button('中止する','cancel','secondary','hidden')}</div><div class="device-ai-models">${MODELS.map(m=>`<article class="panel"><h3>${esc(m.name)}</h3><p class="muted">GPUメモリの参考値: ${m.vramMB}MB</p><p data-cache="${esc(m.id)}">未確認</p><div class="actions">${button('このモデルを比較','benchmark-model','secondary',`data-model="${esc(m.id)}"`)}${button('保存データを削除','remove','ghost',`data-model="${esc(m.id)}"`)}</div></article>`).join('')}</div></details>
 <section class="panel"><div class="device-ai-result-title"><h2>この端末の記録</h2><div class="actions">${button('結果を保存','export')}${button('結果をコピー','copy')}</div></div><div id="local-ai-report">${reportHTML(localAI.report())}</div></section></div>`;
 let alive=true,busy=false,controller=null;
 const message=text=>{if(alive)main.querySelector('#local-ai-message').textContent=text;};
 const refresh=async()=>{try{const state=await localAI.status();if(!alive)return;main.querySelector('#local-ai-support').textContent=state.supported?'このブラウザはWebGPUに対応しています。学習用AIの採用は保留中です。':state.reason;main.querySelectorAll('[data-cache]').forEach(el=>el.textContent=state.installed.includes(el.dataset.cache)?'保存済み・実験用':'未保存');main.querySelectorAll('[data-action="compare"],[data-action="benchmark-model"]').forEach(el=>el.disabled=busy||!state.supported);main.querySelectorAll('[data-action="remove"]').forEach(el=>el.disabled=busy);main.querySelector('#local-ai-report').innerHTML=reportHTML(localAI.report());}catch(error){message(error.message);}};
 const progress=p=>{if(!alive)return;message(p.stage==='load'?'モデルを準備しています。'+(Number.isFinite(p.progress)?` ${Math.round(p.progress*100)}%`:''):p.text||'回答を記録しています。');const bar=main.querySelector('progress');bar.hidden=false;if(Number.isFinite(p.progress))bar.value=p.progress;else bar.removeAttribute('value');};
 main.querySelector('#local-ai-terms').addEventListener('change',event=>{if(event.target.checked){localAI.acceptTerms();event.target.disabled=true;}});
 main.onclick=async event=>{
  const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
  if(action==='check'){await refresh();return;}if(action==='cancel'){controller?.abort();return;}
  if(action==='export'||action==='copy'){const report=localAI.report();if(!report){message('保存する記録がありません。');return;}const text=JSON.stringify(report,null,2);try{if(action==='export')download('rise-device-ai-report.json',text);else{await navigator.clipboard.writeText(text);message('比較結果をコピーしました。');}}catch{message('コピーできませんでした。「結果を保存」を使ってください。');}return;}
  if(busy)return;busy=true;controller=new AbortController();main.querySelector('[data-action="cancel"]').hidden=false;await refresh();
  try{if(action==='remove'){await localAI.remove(target.dataset.model);message('モデルの保存データと回答確認の記録を削除しました。');}else{const id=target.dataset.model;if((!id||MODELS.find(m=>m.id===id)?.license)&&!localAI.termsAccepted())throw Error('Gemmaを比較するには、利用規約を確認して同意してください。');await localAI.benchmark({...(id?{modelIds:[id]}:{}),onProgress:progress,signal:controller.signal});message('比較が終わりました。通常のチャットには切り替えていません。');}}
  catch(error){message(error.name==='AbortError'?'比較を中止しました。途中までの記録は残っています。':error.message);}
  finally{busy=false;controller=null;if(alive){main.querySelector('[data-action="cancel"]').hidden=true;main.querySelector('progress').hidden=true;await refresh();}}
 };
 window.addEventListener('rise:local-ai',refresh);await refresh();
 return ()=>{alive=false;controller?.abort();window.removeEventListener('rise:local-ai',refresh);main.onclick=null;};
}
