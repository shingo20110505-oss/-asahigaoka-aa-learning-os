// Small, independently testable models used by the learning lab.
export function quartiles(values){
 if(values.length<4||values.some(x=>!Number.isFinite(x)))throw Error('4個以上の数値を入力してください');
 const sorted=[...values].sort((a,b)=>a-b),median=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2,n=sorted.length;
 const q1=median(sorted.slice(0,Math.floor(n/2))),q2=median(sorted),q3=median(sorted.slice(Math.ceil(n/2)));
 return{sorted,min:sorted[0],q1,median:q2,q3,max:sorted.at(-1),iqr:q3-q1,mean:sorted.reduce((a,b)=>a+b,0)/n};
}
export function movingPoint(t,w=8,h=6){
 const time=Math.max(0,Math.min(2*w+h,t));let x,y,stage;
 if(time<=w){x=time;y=0;stage=1;}else if(time<=w+h){x=w;y=time-w;stage=2;}else{x=2*w+h-time;y=h;stage=3;}
 // Fixed triangle OCP, O=(0,0), C=(w,h); determinant gives unsigned area.
 return{x,y,stage,area:Math.abs(w*y-h*x)/2,time};
}
export function earthquake(distance,vp,vs){if(distance<0||vp<=vs||vs<=0)throw Error('P波の速さはS波より大きくしてください');const p=distance/vp,s=distance/vs;return{p,s,gap:s-p};}
export function neutralization(acid,base){return{water:Math.min(acid,base),h:Math.max(0,acid-base),oh:Math.max(0,base-acid),na:base,cl:acid};}
export function pyramid(side,height,fromTop){const k=Math.max(0,Math.min(1,fromTop/height));return{k,side:side*k,area:side*side*k*k,smallVolume:side*side*height*k*k*k/3,totalVolume:side*side*height/3};}
export function reflection(ax,ay,bx,by,x){const optimal=(ax*by+bx*ay)/(ay+by),distance=Math.hypot(x-ax,ay)+Math.hypot(bx-x,by);return{optimal,distance,minimum:Math.hypot(bx-ax,ay+by)};}
export function copperReaction(copper,oxygen){const consumedCopper=Math.min(copper,oxygen*4),consumedOxygen=consumedCopper/4;return{product:consumedCopper+consumedOxygen,copperLeft:copper-consumedCopper,oxygenLeft:oxygen-consumedOxygen,total:copper+oxygen};}
export function inheritance(parent1,parent2){const allowed=['AA','Aa','aa'];if(!allowed.includes(parent1)||!allowed.includes(parent2))throw Error('遺伝子の組合せを確認してください');const cells=[...parent1].flatMap(a=>[...parent2].map(b=>[a,b].sort().join('')));return{cells,dominant:cells.filter(x=>x.includes('A')).length,recessive:cells.filter(x=>x==='aa').length};}
