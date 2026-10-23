export const INK_WIDTH=1200,INK_HEIGHT=1600;
export function inkPoint(x,y,rect){return{x:Math.max(0,Math.min(INK_WIDTH,(x-rect.left)/rect.width*INK_WIDTH)),y:Math.max(0,Math.min(INK_HEIGHT,(y-rect.top)/rect.height*INK_HEIGHT))};}
export function copyInk(value){
 const strokes=(value?.strokes||[]).map(s=>{if(!['pen','eraser'].includes(s.tool)||!Number.isFinite(s.width)||s.width<=0||s.width>100||!/^#[a-f0-9]{6}$/i.test(s.color)||!Array.isArray(s.points))throw Error('手書きデータを読み込めませんでした。');const points=s.points.map(p=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('手書きデータを読み込めませんでした。');return{x:Math.max(0,Math.min(INK_WIDTH,p.x)),y:Math.max(0,Math.min(INK_HEIGHT,p.y))};});return{tool:s.tool,width:s.width,color:s.color,points};});
 return{version:1,width:INK_WIDTH,height:INK_HEIGHT,strokes};
}
export function inkHistory(value){let strokes=copyInk(value).strokes,undo=[],redo=[];return{
 get strokes(){return strokes;},get canUndo(){return undo.length>0;},get canRedo(){return redo.length>0;},
 add(stroke){undo.push(strokes);strokes=[...strokes,stroke];redo=[];},
 clear(){if(!strokes.length)return;undo.push(strokes);strokes=[];redo=[];},
 undo(){if(!undo.length)return false;redo.push(strokes);strokes=undo.pop();return true;},
 redo(){if(!redo.length)return false;undo.push(strokes);strokes=redo.pop();return true;},
 snapshot(){return copyInk({strokes});}
};}
export function paintStroke(ctx,stroke){const points=stroke.points;if(!points.length)return;ctx.save();ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();if(points.length===1){ctx.arc(points[0].x,points[0].y,stroke.width/2,0,Math.PI*2);ctx.fill();}else{ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();}ctx.restore();}
export function paintInk(canvas,value){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/INK_WIDTH,canvas.height/INK_HEIGHT);for(const stroke of value?.strokes||[])paintStroke(ctx,stroke);ctx.restore();}
