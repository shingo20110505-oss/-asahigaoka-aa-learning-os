// Deterministic ground-truth fixture for regression/performance, not a real handwriting accuracy claim.
export function syntheticPage(width=1200,height=1600,{black=false,coloredPrint=false,shadow=false}={}) {
  const data=new Uint8ClampedArray(width*height*4),ink=new Uint8Array(width*height),print=new Uint8Array(width*height);
  for(let p=0;p<ink.length;p++){const light=shadow?Math.round(248*(.7+.3*(p%width)/width)):248;data.set([light,light,light,255],p*4);}
  const rect=(x,y,w,h,color,mask)=>{for(let py=Math.max(0,y);py<Math.min(height,y+h);py++)for(let px=Math.max(0,x);px<Math.min(width,x+w);px++){const p=py*width+px;data.set([...color,255],p*4);mask[p]=1;}};
  // Black text-like strokes and table rules, plus a deliberately colored printed title.
  for(let y=50;y<height-40;y+=95){for(let x=40;x<width*.58;x+=24){rect(x,y,3,22,[24,24,24],print);rect(x,y,16,3,[24,24,24],print);rect(x,y+10,15,3,[24,24,24],print);}rect(40,y+50,width-80,2,[70,70,70],print);}
  if(coloredPrint)rect(45,12,260,13,[195,30,40],print);
  for(let y=75;y<height-40;y+=95){for(let x=Math.floor(width*.67);x<width*.9;x++){const py=Math.round(y+Math.sin(x*.1)*12);rect(x,py,1,5,black?[35,35,35]:(Math.floor(y/95)%2?[30,45,185]:[195,30,40]),ink);}}
  return {width,height,data,ink,print};
}
export function compareMask(fixture,result) {
  let tp=0,fp=0,fn=0,prints=0,changedPrint=0,outside=0;
  for(let p=0;p<result.mask.length;p++){const selected=Boolean(result.mask[p]),ink=Boolean(fixture.ink[p]);if(selected&&ink)tp++;if(selected&&!ink)fp++;if(!selected&&ink)fn++;if(fixture.print[p]&&!ink){prints++;if(selected)changedPrint++;}if(!selected)for(let c=0;c<4;c++)if(result.data[p*4+c]!==fixture.data[p*4+c]){outside++;break;}}
  return {precision:tp/Math.max(1,tp+fp),recall:tp/Math.max(1,tp+fn),printedRetention:1-changedPrint/Math.max(1,prints),outsideMaskChangedPixels:outside};
}
