import {INK_WIDTH,INK_HEIGHT,copyInk} from './ink.mjs';
export function strokeBounds(s){
 if(!s?.points.length)return null;let points=s.points;
 if(s.tool==='text'){const p=points[0],w=s.text.length*s.width*2.4,h=s.width*4,angle=(s.rotation||0)*Math.PI/180;points=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>({x:p.x+x*Math.cos(angle)-y*Math.sin(angle),y:p.y+x*Math.sin(angle)+y*Math.cos(angle)}));}
 let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
 for(const p of points){x=Math.min(x,p.x);y=Math.min(y,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
 const r=s.width/2;return{x:x-r,y:y-r,right:right+r,bottom:bottom+r};
}
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
export function transformStrokes(strokes,ids,{scale=1,rotation=0}={}){
 if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(rotation))throw Error('拡大率・回転角を確認してください。');
 const box=selectionBounds(strokes,ids);if(!box)return copyInk({strokes}).strokes;
 const cx=(box.x+box.right)/2,cy=(box.y+box.bottom)/2,r=rotation*Math.PI/180,chosen=new Set(ids);
 const point=p=>({x:cx+scale*((p.x-cx)*Math.cos(r)-(p.y-cy)*Math.sin(r)),y:cy+scale*((p.x-cx)*Math.sin(r)+(p.y-cy)*Math.cos(r))});
 let transformed=strokes.map((s,i)=>{
  if(!chosen.has(i))return s;let points=s.points,tool=s.tool;const a=points[0],b=points.at(-1);
  // Axis-aligned shapes become vector outlines when rotated; no raster quality loss.
  if(rotation&&tool==='rectangle'){points=[a,{x:b.x,y:a.y},b,{x:a.x,y:b.y},a];tool='pen';}
  if(rotation&&tool==='ellipse'){points=Array.from({length:97},(_,n)=>({x:(a.x+b.x)/2+Math.abs(b.x-a.x)/2*Math.cos(n*Math.PI/48),y:(a.y+b.y)/2+Math.abs(b.y-a.y)/2*Math.sin(n*Math.PI/48)}));tool='pen';}
  return{...s,tool,width:Math.min(100,s.width*scale),points:points.map(point),...(tool==='text'?{rotation:(s.rotation||0)+rotation}:{})};
 });
 let bounds=selectionBounds(transformed,ids),fit=Math.min(1,(INK_WIDTH-2)/(bounds.right-bounds.x),(INK_HEIGHT-2)/(bounds.bottom-bounds.y));
 if(fit<1){transformed=transformed.map((s,i)=>chosen.has(i)?{...s,width:s.width*fit,points:s.points.map(p=>({x:cx+(p.x-cx)*fit,y:cy+(p.y-cy)*fit}))}:s);bounds=selectionBounds(transformed,ids);}
 const dx=bounds.x<0?-bounds.x:bounds.right>INK_WIDTH?INK_WIDTH-bounds.right:0,dy=bounds.y<0?-bounds.y:bounds.bottom>INK_HEIGHT?INK_HEIGHT-bounds.bottom:0;
 return copyInk({strokes:transformed.map((s,i)=>chosen.has(i)?{...s,points:s.points.map(p=>({x:p.x+dx,y:p.y+dy}))}:s)}).strokes;
}
