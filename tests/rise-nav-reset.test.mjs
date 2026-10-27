import test from 'node:test';import assert from 'node:assert/strict';
import {NavGesture} from '../src/nav-gesture.mjs';import {ViewCache,viewGroup} from '../src/view-cache.mjs';
test('two taps on the same navigation reset; other menus and keyboard do not',()=>{
 const g=new NavGesture();assert.equal(g.activate('a',{time:0}),'resume');assert.equal(g.activate('b',{time:80}),'resume');assert.equal(g.activate('a',{time:100}),'resume');assert.equal(g.activate('a',{time:250}),'reset');assert.equal(g.activate('a',{time:280}),'resume');g.clear();assert.equal(g.activate('a',{time:300,detail:0}),'resume');assert.equal(g.activate('a',{time:310,detail:0}),'resume');assert.equal(g.activate('a',{keyboardReset:true}),'reset');assert.equal(viewGroup('english-words'),'learn');assert.equal(viewGroup('ai-task?mode=image'),'ai-tools');
});
test('reset opens a fresh entry, retains root and nested drafts, and can resume them',async()=>{
 let disposed=0;const c=new ViewCache({create:()=>({draft:''}),revision:()=>0,capture:()=>({y:12}),restore:()=>{},attach:()=>{},mount:async()=>()=>disposed++,error:e=>{throw e;}});
 await c.show('notes');const old=c.current;old.element.draft='未保存の入力';await c.reset('notes');assert.notEqual(c.current,old);assert.equal(c.current.element.draft,'');assert.equal(disposed,0);await c.resumePrevious('notes');assert.equal(c.current,old);assert.equal(c.current.element.draft,'未保存の入力');
 await c.show('english-words');const quiz=c.current;quiz.element.draft='question 7';await c.reset('learn');assert.equal(c.current.path,'learn');assert.equal(c.destination('learn'),'learn');await c.resumePrevious('learn');assert.equal(c.current,quiz);assert.equal(c.current.element.draft,'question 7');
});
test('backup invalidation includes parked views and flushes before disposal',async()=>{
 const events=[];const c=new ViewCache({create:()=>({}),revision:()=>0,capture:()=>null,restore:()=>{},attach:()=>{},mount:async e=>Object.assign(()=>events.push('dispose:'+e.path),{flush:()=>events.push('flush:'+e.path)}),error:e=>{throw e;}});
 await c.show('notes');await c.reset('notes');await c.show('settings');await c.clearInactive();assert.equal(c.canResume('notes'),false);assert.equal(c.entries.size,1);assert.equal(events.filter(x=>x==='flush:notes').length,2);assert.equal(events.filter(x=>x==='dispose:notes').length,2);
});
