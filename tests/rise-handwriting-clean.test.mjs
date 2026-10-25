import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPixels,colorMask,applyStrokes,maskPreview,validateImage} from '../src/handwriting-clean/engine.mjs';
import {syntheticPage,compareMask} from '../src/handwriting-clean/fixtures.mjs';

test('color cleanup retains every black printed pixel and every pixel outside its mask',()=>{
  const source=syntheticPage(),before=new Uint8ClampedArray(source.data),result=cleanPixels(source),metrics=compareMask(source,result);
  assert.deepEqual(source.data,before);assert.equal(metrics.recall,1);assert.equal(metrics.precision,1);assert.equal(metrics.printedRetention,1);assert.equal(metrics.outsideMaskChangedPixels,0);assert.ok(result.changed>0);
});
test('color detection never claims to detect black handwriting',()=>{
  const fixture=syntheticPage(400,600,{black:true}),result=cleanPixels(fixture);assert.equal(result.selected,0);assert.equal(compareMask(fixture,result).recall,0);assert.deepEqual(result.data,fixture.data);
});
test('red print is a documented false positive that a protect stroke can restore exactly',()=>{
  const fixture=syntheticPage(600,800,{coloredPrint:true}),auto=cleanPixels(fixture);
  assert.ok(compareMask(fixture,auto).printedRetention<1);
  const result=cleanPixels(fixture,{strokes:[{mode:'protect',radius:.025,points:[[45/600,18/800],[305/600,18/800]]}]});
  for(let y=12;y<25;y++)for(let x=45;x<305;x++){const i=(y*600+x)*4;assert.deepEqual(result.data.slice(i,i+4),fixture.data.slice(i,i+4));}
  assert.equal(compareMask(fixture,result).outsideMaskChangedPixels,0);
});
test('manual erase and protect work sequentially without mutating their input',()=>{
  const original=new Uint8Array(10000),erased=applyStrokes(original,100,100,[{mode:'erase',radius:.04,points:[[.2,.5],[.8,.5]]}]);
  assert.equal(original.reduce((a,b)=>a+b),0);assert.equal(erased[50*100+50],1);
  const protectedMask=applyStrokes(erased,100,100,[{mode:'protect',radius:.06,points:[[.5,.5]]}]);assert.equal(protectedMask[50*100+50],0);assert.equal(erased[50*100+50],1);
});
test('manual mask changes only selected pixels and preserves alpha',()=>{
  const fixture=syntheticPage(200,300,{black:true}),mask=new Uint8Array(60000);mask[500]=1;fixture.data[500*4+3]=200;
  const result=cleanPixels(fixture,{mask});assert.equal(result.selected,1);assert.equal(result.data[500*4+3],200);assert.equal(compareMask(fixture,result).outsideMaskChangedPixels,0);
});
test('turning both colors off and applying no brush returns a pixel-identical copy',()=>{
  const f=syntheticPage(200,300),r=cleanPixels(f,{red:false,blue:false});assert.equal(r.selected,0);assert.deepEqual(r.data,f.data);assert.notEqual(r.data,f.data);
});
test('region restricts automatic detection and mask preview does not mutate image',()=>{
  const f=syntheticPage(400,600),mask=colorMask(f,{region:{left:0,top:0,right:.5,bottom:1}});assert.equal(mask.reduce((a,b)=>a+b),0);
  const full=colorMask(f),before=f.data.slice(),preview=maskPreview(f,full);assert.deepEqual(f.data,before);assert.notDeepEqual(preview.data,before);
});
test('malformed and excessively large input fail before allocating image copies',()=>{
  assert.throws(()=>validateImage({width:40000,height:40000,data:[]}));assert.throws(()=>cleanPixels({width:2,height:2,data:new Uint8ClampedArray(12)}));assert.throws(()=>cleanPixels(syntheticPage(20,30),{mask:new Uint8Array(5)}));
});
