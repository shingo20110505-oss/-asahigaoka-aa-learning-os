import {INK_WIDTH,INK_HEIGHT,copyInk} from './ink.mjs';
export function strokeBounds(s){if(!s?.points.length)return null;let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;for(const p of s.points){x=Math.min(x,p.x);y=Math.min(y,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}const r=s.width/2;return{x:x-r,y:y-r,right:right+r+(s.tool==='text'?s.text.length*s.width*2.4:0),bottom:bottom+r+(s.tool==='text'?s.width*4:0)};}
export function strokeAt(strokes,point){
 const distance=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);};
 for(let i=strokes.length-1;i>=0;i--){const s=strokes[i],b=strokeBounds(s);if(!b||s.tool==='eraser')continue;const radius=s.width/2+8,first=s.points[0],last=s.points.at(-1);let points=s.points;
  if(s.tool==='text'){if(point.x>=b.x&&point.x<=b.right&&point.y>=b.y&&point.y<=b.bottom)return i;continue;}
  if(s.tool==='rectangle')points=[first,{x:last.x,y:first.y},last,{x:first.x,y:last.y},first];
  if(s.tool==='line')points=[first,last];
  if(s.tool==='ellipse'){const rx=Math.abs(last.x-first.x)/2,ry=Math.abs(last.y-first.y)/2,cx=(last.x+first.x)/2,cy=(last.y+first.y)/2;points=Array.from({length:65},(_,n)=>({x:cx+rx*Math.cos(n*Math.PI/32),y:cy+ry*Math.sin(n*Math.PI/32)}));}
  if(points.length===1&&distance(first,first)<=radius)return i;
  for(let n=1;n<points.length;n++)if(distance(points[n-1],points[n])<=radius)return i;
 }return -1;
}
export function selectionBounds(strokes,ids){const boxes=ids.map(i=>strokeBounds(strokes[i])).filter(Boolean);if(!boxes.length)return null;return{x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))};}
export function selectStrokes(strokes,from,to){const x=Math.min(from.x,to.x),y=Math.min(from.y,to.y),right=Math.max(from.x,to.x),bottom=Math.max(from.y,to.y);return strokes.flatMap((s,i)=>{const b=strokeBounds(s);return b&&s.tool!=='eraser'&&b.x<=right&&b.right>=x&&b.y<=bottom&&b.bottom>=y?[i]:[];});}
export function moveStrokes(strokes,ids,dx,dy){const box=selectionBounds(strokes,ids);if(!box)return copyInk({strokes}).strokes;dx=Math.max(-box.x,Math.min(INK_WIDTH-box.right,dx));dy=Math.max(-box.y,Math.min(INK_HEIGHT-box.bottom,dy));return copyInk({strokes:strokes.map((s,i)=>ids.includes(i)?{...s,points:s.points.map(p=>({x:p.x+dx,y:p.y+dy}))}:s)}).strokes;}
