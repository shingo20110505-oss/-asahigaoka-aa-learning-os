import test from 'node:test';
import assert from 'node:assert/strict';
import {inkHistory,inkPoint,copyInk} from '../src/ink.mjs';
import {updateNote,saveNoteInk,trashNote,restoreNote} from '../src/note-data.mjs';
import {copyNotebook,notebookHistory} from '../src/ink-notebook.mjs';
import {noteLinks,validState,freshState} from '../src/domain.mjs';
import {referencedFileIds,materialFiles} from '../src/material-files.mjs';
const stroke=(tool='pen')=>({tool,color:'#182d29',width:6,points:[{x:20,y:30},{x:200,y:300}]});
test('handwriting coordinates survive viewport resizing and undo restores erasing and clearing',()=>{
 assert.deepEqual(inkPoint(60,100,{left:10,top:20,width:100,height:160}),{x:600,y:800});
 assert.deepEqual(inkPoint(110,180,{left:10,top:20,width:200,height:320}),{x:600,y:800});
 const history=inkHistory();history.add(stroke());history.add(stroke('eraser'));const saved=history.snapshot();
 history.undo();assert.equal(history.strokes.length,1);history.redo();assert.deepEqual(history.snapshot(),saved);
 history.clear();assert.equal(history.strokes.length,0);history.undo();assert.deepEqual(history.snapshot(),saved);
 const reopened=inkHistory(JSON.parse(JSON.stringify(saved)));assert.deepEqual(reopened.snapshot(),saved);
 reopened.add(stroke());assert.equal(saved.strokes.length,2,'editing never mutates the saved record');
 assert.throws(()=>copyInk({strokes:[{...stroke(),points:[{x:NaN,y:1}]}]}));
});
test('note attachment additions preserve handwriting and other attached files without a count cap',()=>{
 const ink={...copyInk({strokes:[stroke()]}),revision:2};
 const state={notes:[{id:'note',body:'original',attachment:{id:'old'},handwriting:ink}]};
 updateNote(state,'note',{title:'edited'},Array.from({length:150},(_,i)=>({id:'new-'+i})));
 assert.equal(materialFiles(state.notes[0]).length,151);assert.equal(state.notes[0].body,'original');assert.deepEqual(state.notes[0].handwriting,ink);
 assert.throws(()=>updateNote(state,'deleted',{}));
});
test('handwriting saves preserve metadata and refuse concurrent replacement',()=>{
 const state={notes:[{id:'note',title:'new title from another tab',attachments:[{id:'photo'}]}]},drawing=copyInk({strokes:[stroke()]});
 saveNoteInk(state,'note',drawing,0);assert.equal(state.notes[0].title,'new title from another tab');assert.equal(state.notes[0].attachments[0].id,'photo');assert.equal(state.notes[0].handwriting.revision,1);
 assert.throws(()=>saveNoteInk(state,'note',{...drawing,strokes:[]},0),/別の画面/);assert.equal(state.notes[0].handwriting.pages[0].strokes.length,1);
 saveNoteInk(state,'note',{...drawing,strokes:[]},1);assert.equal(state.notes[0].handwriting.pages[0].strokes.length,0);
});
test('deleting a file keeps blobs referenced by notes, archived notes or materials',()=>{
 const state={notes:[{attachments:[{id:'shared'}]},{archived:true,attachment:{id:'archived'}}],materials:[{attachments:[{id:'shared'},{id:'material-only'}]}]};
 state.materials[0].attachments=[];assert.deepEqual([...referencedFileIds(state)].sort(),['archived','shared']);
});


test('legacy ink becomes page one without changing strokes and survives backup round trips',()=>{
 const legacy={...copyInk({strokes:[stroke(),stroke('eraser')]}),revision:4},original=structuredClone(legacy);
 const book=copyNotebook(legacy);assert.equal(book.pages.length,1);assert.deepEqual(book.pages[0].strokes,legacy.strokes);assert.deepEqual(legacy,original);
 const state=freshState();state.notes.push({id:'legacy',handwriting:legacy});saveNoteInk(state,'legacy',book,4);
 const restored=validState(JSON.parse(JSON.stringify(state)));assert.deepEqual(copyNotebook(restored.notes[0].handwriting),book);assert.equal(restored.notes[0].handwriting.revision,5);
 assert.throws(()=>copyNotebook({version:3}),/更新/);
});
test('pages keep independent drawings, paper, order and active selection after reopening',()=>{
 const book=notebookHistory({strokes:[stroke()]}),first=book.page.id;book.addPage();const second=book.page.id;
 book.add(stroke('line'));book.setPaper('ruled');book.select(first);assert.equal(book.page.strokes[0].tool,'pen');
 book.select(second);book.addPage(true);const duplicate=book.page.id;book.clear();assert.equal(book.page.strokes.length,0);
 book.select(second);assert.equal(book.page.strokes.length,1,'duplicate edits leave source intact');book.movePage(-1);assert.equal(book.pages[0].id,second);
 const copy=book.snapshot(),reopened=notebookHistory(JSON.parse(JSON.stringify(copy)));assert.equal(reopened.page.id,second);assert.equal(reopened.page.paper,'ruled');assert.equal(reopened.pages[2].id,duplicate);assert.equal(reopened.pages[1].strokes[0].tool,'pen');
 book.clear();assert.equal(copy.pages[0].strokes.length,1,'saved snapshots are detached from future edits');
});
test('undo and redo recover deleted pages and never leave a notebook without a page',()=>{
 const book=notebookHistory();assert.equal(book.removePage(),false);const first=book.page.id;book.add(stroke());book.addPage();const second=book.page.id;book.add(stroke('rectangle'));const before=book.snapshot();
 book.select(first);book.removePage();assert.equal(book.pages.length,1);assert.equal(book.page.id,second);
 book.undo();assert.equal(book.pages.length,2);assert.equal(book.page.id,first);assert.deepEqual(book.pages,before.pages);
 book.redo();assert.equal(book.pages.length,1);book.undo();book.select(second);book.clear();book.undo();assert.equal(book.page.strokes.length,1);
});
test('multipage saves reject stale writes without losing any page',()=>{
 const state={notes:[{id:'note'}]},book=notebookHistory();book.add(stroke());book.addPage();book.add(stroke('highlighter'));
 saveNoteInk(state,'note',book.snapshot(),0);const before=structuredClone(state.notes[0].handwriting);
 assert.throws(()=>saveNoteInk(state,'note',copyNotebook(),0),/別の画面/);assert.deepEqual(state.notes[0].handwriting,before);
});
test('trash and restore preserve all note pages, attachment references and links',()=>{
 const book=notebookHistory({strokes:[stroke()]});book.addPage();book.add(stroke('ellipse'));
 const state={notes:[{id:'a',title:'A',body:'body',attachments:[{id:'shared'}],links:['b'],handwriting:book.snapshot(),archived:true},{id:'b',links:['a']}],materials:[]};
 const content=structuredClone(state.notes[0]);trashNote(state,'a');assert.ok(state.notes[0].deletedAt);assert.deepEqual(noteLinks(state.notes,'b').incoming,[]);assert.ok(referencedFileIds(state).has('shared'));
 assert.throws(()=>saveNoteInk(state,'a',copyNotebook(),0),/削除/);assert.throws(()=>updateNote(state,'a',{title:'overwrite'}),/削除/);
 restoreNote(state,'a');assert.equal(state.notes[0].deletedAt,undefined);assert.equal(state.notes[0].archived,false);assert.deepEqual(state.notes[0].handwriting,content.handwriting);assert.deepEqual(state.notes[0].attachments,content.attachments);assert.deepEqual(state.notes[0].links,content.links);assert.equal(noteLinks(state.notes,'b').incoming[0].id,'a');
});
