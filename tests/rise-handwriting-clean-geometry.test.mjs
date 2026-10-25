import test from 'node:test';
import assert from 'node:assert/strict';
import {observeImageOverlay} from '../src/views/handwriting-clean.mjs';

function fixture(){
  const image=new EventTarget(),canvas={width:0,height:0,style:{}},target=new EventTarget();
  let rect={width:800,height:1066.5},pending=true,cancelled=0;
  image.getBoundingClientRect=()=>rect;
  return{image,canvas,target,setSize(width,height){rect={width,height};},onResize(){pending=false;cancelled++;},get pending(){return pending;},get cancelled(){return cancelled;}};
}
test('overlay follows image resizing and cancels an in-progress stroke; disposed observer cannot touch it',()=>{
  const f=fixture();let deliver,observed,disconnects=0;
  class Observer {constructor(callback){deliver=callback;}observe(image){observed=image;}disconnect(){disconnects++;}}
  const dispose=observeImageOverlay(f.image,f.canvas,()=>f.onResize(),{ResizeObserver:Observer,resizeTarget:f.target});
  assert.equal(observed,f.image);assert.equal(f.canvas.width,800);assert.equal(f.canvas.height,1067);assert.equal(f.canvas.style.height,'1066.5px');assert.equal(f.pending,false);
  f.setSize(320,426.6);deliver();assert.equal(f.canvas.width,320);assert.equal(f.canvas.height,427);assert.equal(f.canvas.style.width,'320px');assert.equal(f.cancelled,2);
  deliver();assert.equal(f.cancelled,2,'same-size observer delivery must not clear a new stroke');
  f.setSize(0,0);deliver();assert.equal(f.canvas.width,320,'temporarily detached cached view retains its coordinate system');
  f.setSize(600,800);deliver();assert.equal(f.canvas.width,600);
  dispose();f.setSize(999,999);deliver();f.image.dispatchEvent(new Event('load'));assert.equal(f.canvas.width,600);assert.equal(disconnects,1);
});
test('window resize and image load cover browsers without ResizeObserver and remove listeners on cleanup',()=>{
  const f=fixture();const dispose=observeImageOverlay(f.image,f.canvas,()=>f.onResize(),{ResizeObserver:false,resizeTarget:f.target});
  f.setSize(375,500);f.target.dispatchEvent(new Event('resize'));assert.equal(f.canvas.width,375);assert.equal(f.canvas.height,500);
  f.setSize(500,375);f.image.dispatchEvent(new Event('load'));assert.equal(f.canvas.width,500);assert.equal(f.canvas.height,375);
  dispose();f.setSize(1024,768);f.target.dispatchEvent(new Event('resize'));f.image.dispatchEvent(new Event('load'));assert.equal(f.canvas.width,500);
});
