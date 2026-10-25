import {heading,link,icon} from '../ui.mjs';
export function mount({main}){
 const tools=[['handwriting-clean','手書きを消す','複数枚をまとめて処理。消去範囲を直し、原本と結果を保存できます。'],['ai-task?mode=similar','類題を作る','教材から、難易度に合わせた類題と解説を作成。'],['ai-task?mode=image','画像を作る','文章や参考画像から、図やイメージを作成。']];
 main.innerHTML=heading('AI TOOLS','AI学習ツール','',link('AIチャット','chat','secondary'))+`<div class="grid-3">${tools.map(([route,title,description])=>`<section class="panel"><span class="feature-icon">${icon('flask',24)}</span><h2>${title}</h2><p>${description}</p>${link('使う',route,'primary')}</section>`).join('')}</div>`;
 return()=>{};
}
