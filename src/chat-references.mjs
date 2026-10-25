import {esc} from './ui.mjs';
export const referenceKey=refs=>(refs||[]).map(r=>r.id).join('|');
export function referenceHTML(refs=[]){
 if(!refs.length)return '';
 return '<details class="chat-references"><summary>参考資料（'+refs.length+'件）</summary>'+refs.map(r=>{
  const route=/^(history\/\d+|reading)$/.test(r.route)?r.route:'learn';
  const sources=(r.sources||[]).filter(url=>{try{return new URL(url).protocol==='https:';}catch{return false;}});
  if(r.kind==='web'&&sources.length)return '<section><a href="'+esc(sources[0])+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+'</a></section>';
  return '<section><a href="#/'+route+'">'+esc(r.title)+'</a><p>'+esc(r.excerpt)+'</p>'+sources.map((url,i)=>'<a class="small" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">出典 '+(i+1)+' を開く</a>').join(' · ')+'</section>';
 }).join('')+'</details>';
}
