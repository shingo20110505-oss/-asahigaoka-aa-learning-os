import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewCache,viewPath,viewGroup,capturePosition,restorePosition} from '../src/view-cache.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(overrides={}) {
  const events=[];let revision=0,position={x:0,y:0};
  const cache=new ViewCache({
    create:()=>({draft:'',question:1}),revision:()=>revision,
    capture:()=>position,restore:(entry,value)=>{events.push(['restore',entry.path,value]);},
    attach:entry=>events.push(['attach',entry.path]),
    mount:async entry=>{events.push(['mount',entry.path]);return Object.assign(()=>events.push(['dispose',entry.path]),{
      suspend:()=>events.push(['suspend',entry.path]),resume:()=>events.push(['resume',entry.path]),refresh:()=>events.push(['refresh',entry.path])
    });},error:error=>events.push(['error',error.message]),...overrides
  });
  return {cache,events,bump:()=>revision++,scroll:y=>position={x:0,y}};
}
test('sidebar resume keeps the same view, draft, question and scroll position',async()=>{
  const {cache,events,scroll}=fixture();
  await cache.show('vocabulary?mode=context');const first=cache.current;
  first.element.draft='途中のメモ';first.element.question=7;scroll(930);
  await cache.show('notes');await cache.show(cache.destination('learn'));
  assert.equal(cache.current,first);assert.equal(first.element.draft,'途中のメモ');assert.equal(first.element.question,7);
  assert.equal(events.filter(x=>x[0]==='mount'&&x[1].startsWith('vocabulary')).length,1);
  assert.deepEqual(events.at(-1),['restore','vocabulary?mode=context',{x:0,y:930}]);
  assert.equal(events.some(x=>x[0]==='dispose'),false);
});
test('internal reader URLs follow the cached view; explicit library links still open a library',async()=>{
  const {cache}=fixture();await cache.show('reading');const reader=cache.current;
  cache.remember('#/reading/rv3-000001');await cache.show('notes');
  assert.equal(cache.destination('learn'),'reading/rv3-000001');
  await cache.show(cache.destination('learn'));assert.equal(cache.current,reader);
  await cache.show('reading');assert.notEqual(cache.current,reader);
  assert.equal(viewGroup('#/materials'),'notes');assert.equal(viewPath('#/'),'home');
});
test('changed data refreshes a cached view without mounting or resetting its draft',async()=>{
  const {cache,events,bump}=fixture();await cache.show('notes');const notes=cache.current;notes.element.draft='下書き';
  await cache.show('reading');bump();await cache.show('notes');
  assert.equal(cache.current,notes);assert.equal(notes.element.draft,'下書き');
  assert.equal(events.filter(x=>x[0]==='refresh'&&x[1]==='notes').length,1);
  await cache.show('home');await cache.show('notes');
  assert.equal(events.filter(x=>x[0]==='refresh'&&x[1]==='notes').length,1);
});
test('rapid navigation discards an incomplete mount and never activates a stale view',async()=>{
  const gate=deferred(),started=deferred();const {cache,events}=fixture({mount:async entry=>{
    if(entry.path==='reading'){started.resolve();await gate.promise;assert.equal(cache.active(entry),false);}
    return()=>events.push(['dispose',entry.path]);
  }});
  const a=cache.show('reading');await started.promise;
  const b=cache.show('notes'),c=cache.show('plan');gate.resolve();await Promise.all([a,b,c]);
  assert.equal(cache.current.path,'plan');assert.equal(cache.entries.has('reading'),false);
  assert.equal(cache.entries.has('notes'),false);
  assert.deepEqual(events.filter(x=>x[0]==='attach').map(x=>x[1]),['reading','plan']);
});
test('a data update while a view is visible still invalidates its cached rendering',async()=>{
  const {cache,events,bump}=fixture();await cache.show('notes');bump();
  await cache.show('home');await cache.show('notes');
  assert.ok(events.some(x=>x[0]==='refresh'&&x[1]==='notes'));
});
test('suspension finishes before the next screen opens, including back during a save',async()=>{
  const gate=deferred(),started=deferred();const {cache,events}=fixture();await cache.show('reading');const reader=cache.current;
  reader.controller.suspend=async()=>{started.resolve();await gate.promise;events.push(['saved']);};
  const next=cache.show('notes');await started.promise;const back=cache.show('reading');gate.resolve();await Promise.all([next,back]);
  assert.equal(cache.current,reader);assert.equal(cache.active(reader),true);
  assert.equal(cache.entries.has('notes'),false);assert.equal(events.some(x=>x[0]==='resume'),true);
});
test('a failed suspension retains the draft for retry instead of destroying the view',async()=>{
  const {cache,events}=fixture();await cache.show('reading');const reader=cache.current;
  reader.element.draft='保存待ち';reader.controller.suspend=()=>{throw Error('storage full');};
  await cache.show('notes');await cache.show('reading');assert.equal(cache.current,reader);
  assert.equal(reader.element.draft,'保存待ち');assert.ok(events.some(x=>x[0]==='error'));
});
test('failed mounts can retry, and same-route navigation does not reset a healthy view',async()=>{
  let attempts=0;const {cache}=fixture({mount:async()=>{if(++attempts===1)throw Error('network');}});
  await cache.show('history');assert.equal(cache.current.ready,false);
  await cache.show('history',{reload:true});assert.equal(cache.current.ready,true);
  await cache.show('history');assert.equal(attempts,2);
});
test('backup import waits for inactive drafts to flush and drops stale caches',async()=>{
  const gate=deferred(),started=deferred();const {cache}=fixture();await cache.show('reading');
  cache.current.controller=async()=>{started.resolve();await gate.promise;};
  await cache.show('settings');const settings=cache.current;let imported=false;
  const restore=cache.clearInactive().then(()=>{imported=true;});await started.promise;
  assert.equal(imported,false);gate.resolve();await restore;
  assert.equal(cache.current,settings);assert.equal(cache.entries.size,1);
  assert.equal(cache.destination('learn'),'learn');
});
test('window and nested scrolling restore only while the corresponding view is active',()=>{
  const child={scrollTop:150,scrollLeft:12},detail={open:true,querySelector:()=>({textContent:'保存したファイル'})};
  const main={querySelectorAll:selector=>selector==='details'?[detail]:[child],contains:n=>n===child};
  const moves=[],frames=[],win={scrollX:4,scrollY:600,scrollTo:v=>moves.push(v),requestAnimationFrame:f=>frames.push(f)};
  const position=capturePosition(main,win);child.scrollTop=0;child.scrollLeft=0;detail.open=false;let active=true;
  restorePosition(main,position,()=>active,win);assert.equal(child.scrollTop,150);assert.equal(child.scrollLeft,12);
  assert.deepEqual(moves[0],{left:4,top:600,behavior:'instant'});
  assert.equal(detail.open,true);
  active=false;frames[0]();assert.equal(moves.length,1);
});
