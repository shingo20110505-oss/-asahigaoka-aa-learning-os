import test from 'node:test';
import assert from 'node:assert/strict';
import {inkHistory,inkPoint,copyInk} from '../src/ink.mjs';
import {updateNote,saveNoteInk} from '../src/note-data.mjs';
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
 assert.throws(()=>saveNoteInk(state,'note',{...drawing,strokes:[]},0),/別の画面/);assert.equal(state.notes[0].handwriting.strokes.length,1);
 saveNoteInk(state,'note',{...drawing,strokes:[]},1);assert.equal(state.notes[0].handwriting.strokes.length,0);
});
test('deleting a file keeps blobs referenced by notes, archived notes or materials',()=>{
 const state={notes:[{attachments:[{id:'shared'}]},{archived:true,attachment:{id:'archived'}}],materials:[{attachments:[{id:'shared'},{id:'material-only'}]}]};
 state.materials[0].attachments=[];assert.deepEqual([...referencedFileIds(state)].sort(),['archived','shared']);
});
