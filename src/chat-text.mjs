import {esc} from './ui.mjs';
import {safeStudyRoute} from './study-links.mjs';
import katex from './vendor/katex/katex.mjs';
function math(source,display){try{return `<span class="chat-math ${display?'display':''}">${katex.renderToString(source,{displayMode:display,throwOnError:false,trust:false,strict:'ignore',maxExpand:200,maxSize:20,output:'htmlAndMathml'})}</span>`;}catch{return esc(source);}}
// Only closed math and allowlisted RISE study links are rendered. Other URLs remain inert.
export function chatText(value){return String(value??'').split(/(```[\s\S]*?```|`[^`\n]+`)/g).map(part=>{
 if(part.startsWith('```')&&part.endsWith('```'))return '<pre><code>'+esc(part.slice(3,-3).replace(/^[a-zA-Z0-9_-]+\n/,''))+'</code></pre>';
 if(part.startsWith('`')&&part.endsWith('`'))return '<code>'+esc(part.slice(1,-1))+'</code>';
 return part.split(/(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|(?<![\\\w])\$(?!\s)[^$\n]+?(?<!\s)\$(?!\w))/g).map(token=>{
  if(token.startsWith('\\['))return math(token.slice(2,-2),true);
  if(token.startsWith('\\('))return math(token.slice(2,-2),false);
  if(token.startsWith('$$'))return math(token.slice(2,-2),true);
  if(token.startsWith('$')&&token.endsWith('$'))return math(token.slice(1,-1),false);
  return esc(token).replace(/\[([^\]\n]+)\]\(#\/([^\s)]+)\)/g,(all,label,route)=>safeStudyRoute(route)?`<a href="#/${route}">${label}</a>`:all).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/^#{1,4}\s+(.+)$/gm,'<strong>$1</strong>').replace(/^[*-]\s+/gm,'• ');
 }).join('');
}).join('');}
