import {esc} from './ui.mjs';
// A deliberately small formatter: never interpret raw HTML, URLs or images
// produced by a model. Code stays literal; ordinary emphasis remains readable.
export function chatText(value){return String(value??'').split(/(```[\s\S]*?```|`[^`\n]+`)/g).map(part=>{
 if(part.startsWith('```')&&part.endsWith('```'))return '<pre><code>'+esc(part.slice(3,-3).replace(/^[a-zA-Z0-9_-]+\n/,''))+'</code></pre>';
 if(part.startsWith('`')&&part.endsWith('`'))return '<code>'+esc(part.slice(1,-1))+'</code>';
 return esc(part).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/^#{1,4}\s+(.+)$/gm,'<strong>$1</strong>').replace(/^[*-]\s+/gm,'• ');
}).join('');}
