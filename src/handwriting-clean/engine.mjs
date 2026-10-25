// Local, deterministic paper cleanup. Inputs are never mutated; only mask pixels change.
export const MAX_PIXELS = 16_000_000;
export function validateImage({width,height,data}) {
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>MAX_PIXELS||data?.length!==width*height*4) throw Error('画像を読み込めません。1600万画素以下の画像を選んでください。');
}
export function colorMask(image,{red=true,blue=true,strength=38,region=null}={}) {
  validateImage(image);const {data,width,height}=image,mask=new Uint8Array(width*height),threshold=Math.max(18,Math.min(100,Number(strength)||38));
  const box=region?{left:region.left*width,top:region.top*height,right:region.right*width,bottom:region.bottom*height}:null;
  for(let p=0;p<mask.length;p++) {
    if(box){const x=p%width,y=Math.floor(p/width);if(x<box.left||x>box.right||y<box.top||y>box.bottom)continue;}
    const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]<128||Math.max(r,g,b)<75)continue;
    if((red&&r-g>threshold&&r-b>threshold*.8)||(blue&&b-r>threshold&&b-g>threshold*.45))mask[p]=1;
  }
  return mask;
}
export function applyStrokes(mask,width,height,strokes=[]) {
  const result=new Uint8Array(mask);
  for(const stroke of strokes){
    const radius=Math.max(1,Math.min(width,height)*(stroke.radius||.012)),points=stroke.points||[],value=stroke.mode==='protect'?0:1;
    const dab=(nx,ny)=>{const cx=nx*width,cy=ny*height,r2=radius*radius;for(let y=Math.max(0,Math.floor(cy-radius));y<=Math.min(height-1,Math.ceil(cy+radius));y++)for(let x=Math.max(0,Math.floor(cx-radius));x<=Math.min(width-1,Math.ceil(cx+radius));x++)if((x-cx)**2+(y-cy)**2<=r2)result[y*width+x]=value;};
    for(let i=0;i<points.length;i++){const [x,y]=points[i];if(!Number.isFinite(x)||!Number.isFinite(y))continue;if(i){const [px,py]=points[i-1],steps=Math.ceil(Math.hypot((x-px)*width,(y-py)*height)/Math.max(1,radius*.5));for(let s=1;s<steps;s++)dab(px+(x-px)*s/steps,py+(y-py)*s/steps);}dab(x,y);}
  }
  return result;
}
export function estimatePaper(image,mask,tileSize=64) {
  const {width,height,data}=image,cols=Math.ceil(width/tileSize),rows=Math.ceil(height/tileSize),paper=new Uint8Array(cols*rows*3);
  for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
    // Find the bright neutral paper in each neighborhood, ignoring handwriting, print and diagrams.
    let r=0,g=0,b=0,count=0,brightest=0,br=255,bg=255,bb=255;
    for(let y=Math.max(0,ty*tileSize-tileSize/2);y<Math.min(height,(ty+1)*tileSize+tileSize/2);y+=3)for(let x=Math.max(0,tx*tileSize-tileSize/2);x<Math.min(width,(tx+1)*tileSize+tileSize/2);x+=3){const p=y*width+x,i=p*4;if(mask[p]||data[i+3]<128)continue;const hi=Math.max(data[i],data[i+1],data[i+2]),lo=Math.min(data[i],data[i+1],data[i+2]);if(hi-lo>35)continue;if(lo>brightest){brightest=lo;br=data[i];bg=data[i+1];bb=data[i+2];}if(lo>145){r+=data[i];g+=data[i+1];b+=data[i+2];count++;}}
    const i=(ty*cols+tx)*3;paper[i]=count?Math.round(r/count):br;paper[i+1]=count?Math.round(g/count):bg;paper[i+2]=count?Math.round(b/count):bb;
  }
  return {paper,cols,rows,tileSize};
}
export function cleanPixels(image,options={}) {
  validateImage(image);const start=performance.now(),{width,height,data}=image;
  let mask=options.mask?new Uint8Array(options.mask):colorMask(image,options);
  if(mask.length!==width*height)throw Error('消去範囲と画像の大きさが一致しません。');
  mask=applyStrokes(mask,width,height,options.strokes);
  const output=new Uint8ClampedArray(data),{paper,cols,rows,tileSize}=estimatePaper(image,mask);let changed=0,selected=0;
  for(let p=0;p<mask.length;p++){if(!mask[p])continue;selected++;const i=p*4,x=Math.max(0,Math.min(cols-1,(p%width)/tileSize-.5)),y=Math.max(0,Math.min(rows-1,Math.floor(p/width)/tileSize-.5)),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(cols-1,x0+1),y1=Math.min(rows-1,y0+1),fx=x-x0,fy=y-y0;let differs=false;for(let c=0;c<3;c++){const a=paper[(y0*cols+x0)*3+c]*(1-fx)+paper[(y0*cols+x1)*3+c]*fx,b=paper[(y1*cols+x0)*3+c]*(1-fx)+paper[(y1*cols+x1)*3+c]*fx;output[i+c]=Math.round(a*(1-fy)+b*fy);differs ||= output[i+c]!==data[i+c];}if(differs)changed++;}
  return {data:output,mask,width,height,selected,changed,elapsedMs:performance.now()-start};
}
export function maskPreview(image,mask) {
  const data=new Uint8ClampedArray(image.data);
  for(let p=0;p<mask.length;p++)if(mask[p]){const i=p*4;data[i]=Math.round(data[i]*.4+255*.6);data[i+1]=Math.round(data[i+1]*.4+70*.6);data[i+2]=Math.round(data[i+2]*.4+80*.6);}
  return {data,width:image.width,height:image.height};
}
