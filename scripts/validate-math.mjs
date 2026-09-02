import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url), E=require('../math-exam/engine.js');
const fraction=s=>{const a=s.split('/').map(Number);return a.length===2?a[0]/a[1]:a[0];};
const close=(a,b)=>Math.abs(a-b)<1e-8;
const area=ps=>Math.abs(ps.reduce((s,p,i)=>{const q=ps[(i+1)%ps.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;
export function verify(q){
 assert.equal(q.choices.length,4);assert.equal(new Set(q.choices.map(c=>c.text)).size,4);
 assert.equal(q.choices.filter(c=>c.ok).length,1);assert.equal(q.choices[q.answerIndex].ok,true);
 assert.ok(q.solutionSteps.length>=2);assert.equal(q.partialPoints,0);assert.equal(q.source.curriculum,'junior-high');
 const a=q.choices[q.answerIndex].text,p=q.parameters,{k,n,j}=p;
 const value=fraction(a.replace(/ cm[²³]?$/,''));
 switch(q.family){
 case 'signed':assert.equal(Number(a),j*n-j-n*n);break;
 case 'radical':assert.ok(close(Number(a.split('√')[0])*Math.sqrt(2),Math.sqrt(8*k*k)-Math.sqrt(2*k*k)));break;
 case 'factor':{const roots=[...a.matchAll(/−(\d+)/g)].map(x=>Number(x[1]));assert.equal(roots.reduce((s,x)=>s+x,0),n+j);assert.equal(roots[0]*roots[1],n*j);break;}
 case 'equation':{const v=[...a.matchAll(/＝(\d+)/g)].map(x=>Number(x[1]));assert.equal(v[0]+v[1],n+j);assert.equal(2*v[0]-v[1],2*n-j);break;}
 case 'quadratic':{const v=a.replace('x＝','').split(',').map(Number);assert.equal(new Set(v).size,2);v.forEach(x=>assert.equal((x-n)**2,j*j));break;}
 case 'rate':assert.equal(value,(k*(n+2)**2-k*n*n)/(2*n+2));break;
 case 'integer':assert.equal((value-2)+(value-1)+value,3*n);break;
 case 'histogram':assert.equal(p.counts.reduce((s,x)=>s+x,0),p.total);assert.ok(a.includes(E.frac(p.counts[3],p.total)));break;
 case 'circle':assert.equal(parseFloat(a)*2,k*20);break;
 case 'cone':assert.ok(close(parseFloat(a),((3*k)**2)*(4*k)/3));break;
 case 'probability':{let total=0,good=0;for(let x=1;x<=n;x++)for(let y=x+1;y<=n;y++){total++;if((x*y)%2===0)good++;}assert.ok(close(value,good/total));break;}
 case 'boxplot':{const [x,y]=q.figure.rows.map(r=>r.values);assert.equal(x[3]-x[1],y[3]-y[1]);assert.equal(x[2],y[2]);break;}
 case 'meanbounds':{let min=0,max=0,total=0;p.counts.forEach((c,i)=>{min+=c*(p.start+i*p.width);max+=c*(p.start+(i+1)*p.width);total+=c;});const values=[...a.matchAll(/\d+/g)].map(x=>Number(x[0]));assert.equal(values[0],min/total);assert.equal(values[1],max/total);break;}
 case 'sampling':assert.ok(a.includes(String(n*1000*j/100)));assert.ok(a.includes('推定'));break;
 case 'reflection':{const slope=fraction(a.slice(2,-1)),A=[2,2*k],B=[4,8*k],C=[0,4*k],O=[0,0];const x=C[1]/(slope-k);const D=[x,slope*x];assert.ok(x>0&&x<4);assert.ok(close(area([O,C,D]),area([O,A,B,C])/2));const reflected=[-A[0],A[1]],s=(B[1]-reflected[1])/(B[0]-reflected[0]);assert.ok(close(reflected[1]-s*reflected[0],C[1]));break;}
 case 'moving_value':{const P=[p.L,p.H/2];assert.equal(value,area([[0,0],[0,p.H],P]));break;}
 case 'moving_equal':{let roots=[];const target=p.L*p.H/4;const ranges=[[0,p.L],[p.L,p.L+p.H],[p.L+p.H,2*p.L+p.H]];const f=t=>t<=p.L?p.H*t/2:t<=p.L+p.H?p.L*p.H/2:p.H*(2*p.L+p.H-t)/2;for(const [l,h] of ranges)if((f(l)-target)*(f(h)-target)<0)roots.push([l,h]);assert.equal(parseInt(a),roots.length);break;}
 case 'similarity':assert.ok(close(value/(9*k*j),1-(k/(3*k))**2));break;
 case 'square_length':assert.equal(value,Math.hypot(4*k,3*k));break;
 case 'square_area':{const s=4*k,F=[3*k,0],A=[0,s],C=[s,0];const ray=[3*k/Math.hypot(3*k,4*k),-4*k/Math.hypot(3*k,4*k)];const dot=-ray[1];const ae=[2*dot*ray[0],2*dot*ray[1]+1];const t=s/ae[0];const point=[s,s+t*ae[1]];assert.ok(close(value,area([A,point,C,F])));break;}
 case 'pyramid_height':{const h=Number(a.split('√')[0])*Math.sqrt(2);assert.ok(close(h*h+(Math.hypot(2*k,2*k)/2)**2,(2*k)**2));break;}
 case 'pyramid_ratio':assert.ok(close(value,1-(.5*.5)*.5));break;
 case 'tetrahedron':assert.ok(close(value,(k*k/2)*(2*k)/3));break;
 default:throw Error('unverified family');
 }
 return true;
}
export async function validateBank(file=new URL('../math-exam/catalog.json',import.meta.url)){
 const c=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(c.schemaVersion,1);assert.equal(c.engineVersion,E.VERSION);assert.ok(c.packs.length>=4);
 const ids=new Set();for(const p of c.packs){assert.ok(Number.isSafeInteger(p.seed)&&p.seed>0&&p.seed<10000000);assert.ok(!ids.has(p.seed));ids.add(p.seed);const qs=E.buildSet(p.seed,2);qs.forEach(verify);assert.equal(qs.length,19);assert.equal(qs.reduce((s,q)=>s+q.points,0),22);assert.deepEqual([1,2,3].map(i=>qs.filter(q=>q.bigQuestion==='大問'+i).reduce((s,q)=>s+q.points,0)),[10,7,5]);}
 return c;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let count=0;for(let seed=1;seed<=100;seed++)for(const f of E.FAMILIES){verify(E.make(f,seed,2));count++;}
 const c=await validateBank();console.log(`MATH_VALIDATED: ${count} parameter cases; ${c.packs.length} exam packs; 19 items / 22 points`);
}
