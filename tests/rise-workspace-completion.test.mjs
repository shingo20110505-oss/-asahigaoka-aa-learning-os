import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/domain.mjs';
import {calendarEvent,repeatCalendarEvent,moveCalendarEvent,calendarSummary,validDay} from '../src/planner.mjs';
import {referencedFileIds} from '../src/material-files.mjs';
import {attachWorkspaceFiles} from '../src/workspace-files.mjs';
import {purgeNoteTrash} from '../src/note-data.mjs';
import {transformStrokes,selectionBounds,strokeBounds} from '../src/ink-selection.mjs';
import {copyNotebook,notebookHistory} from '../src/ink-notebook.mjs';
import {previewGesture} from '../src/media-viewer.mjs';
import {retireLocalAI} from '../src/retire-local-ai.mjs';
import {webReferences} from '../bridge/web-references.mjs';
import {codexArguments} from '../bridge/codex-client.mjs';
import {studyMode} from '../src/study-modes.mjs';
test('general timed events span days, preserve files and do not add study minutes',()=>{
 const state=freshState(),e=calendarEvent({title:'文化祭',kind:'予定',date:'2026-10-30',endDate:'2026-11-01',allDay:false,startTime:'18:00',endTime:'10:00',location:'体育館'}, {},[{id:'f'}]);state.tasks=[e];
 for(const d of ['2026-10-30','2026-10-31','2026-11-01']){assert.equal(calendarSummary(state,d).tasks.length,1);assert.equal(calendarSummary(state,d).minutes,0);}
 assert.equal(calendarSummary(state,'2026-11-02').tasks.length,0);assert.ok(referencedFileIds(state).has('f'));
 const moved=moveCalendarEvent(e,'2027-01-31');assert.equal(moved.endDate,'2027-02-02');assert.equal(moved.startTime,'18:00');
 assert.equal(validDay('2026-02-30'),false);assert.throws(()=>calendarEvent({...e,endDate:e.date,endTime:'17:00'}));assert.throws(()=>calendarEvent({...e,date:'2026-02-30'}));
});
test('calendar recurrence crosses year and retains duration and independent event identities',()=>{
 const event=calendarEvent({title:'合宿',kind:'予定',date:'2026-12-28',endDate:'2026-12-30'});const rows=repeatCalendarEvent(event,7,3);
 assert.equal(rows[1].date,'2027-01-04');assert.equal(rows[2].endDate,'2027-01-13');assert.equal(new Set(rows.map(t=>t.id)).size,3);assert.equal(new Set(rows.map(t=>t.seriesId)).size,1);assert.throws(()=>repeatCalendarEvent(event,7,100));
});
test('legacy learning and automatic reading reviews remain in the calendar',()=>{const state=freshState();state.tasks=[{title:'英文',date:'2026-10-26',minutes:25}];state.reading={book:{review:{due:Date.parse('2026-10-26T12:00:00+09:00')}}};const x=calendarSummary(state,'2026-10-26',[{id:'book',title:'Reading'}]);assert.equal(x.minutes,25);assert.equal(x.readings[0].title,'Reading');});
test('split attachment saves share blobs and deletion preserves calendar and other references',()=>{
 const state=freshState(),files=[{id:'shared',name:'p.png'}],result=attachWorkspaceFiles(state,{title:'理科',files});assert.equal(state.notes[0].attachments[0].id,state.materials[0].attachments[0].id);
 state.tasks=[calendarEvent({title:'提出',kind:'予定',date:'2026-10-26'},{},files)];state.notes[0].deletedAt=1;state.materials=[];assert.deepEqual(purgeNoteTrash(state,[{id:result.noteId,deletedAt:1}]).fileIds,[]);
 assert.throws(()=>attachWorkspaceFiles(state,{noteId:'missing',materialId:result.materialId,files}));assert.throws(()=>attachWorkspaceFiles(state,{toNote:false,toMaterial:false,files}));
});
test('saving into only one split pane leaves the other destination and its selection untouched',()=>{const state=freshState(),f=[{id:'one'}],both=attachWorkspaceFiles(state,{files:f});assert.notEqual(state.notes[0].attachments,state.materials[0].attachments);const result=attachWorkspaceFiles(state,{noteId:both.noteId,materialId:'disabled-field',toMaterial:false,files:[{id:'two'}]});assert.equal(result.materialId,undefined);assert.deepEqual(state.materials[0].attachments,f);assert.equal(state.notes[0].attachments.length,2);});
const rectangle={tool:'rectangle',color:'#000000',width:6,points:[{x:30,y:50},{x:400,y:300}]};
test('selection transforms retain unrelated ink, fit the page, and undo exactly',()=>{
 const book=notebookHistory({strokes:[rectangle,{...rectangle,tool:'text',text:'重要',points:[{x:500,y:600}]}]}),original=book.snapshot();const transformed=transformStrokes(book.page.strokes,[0],{rotation:45,scale:8});const box=selectionBounds(transformed,[0]);assert.ok(box.x>=-.01&&box.y>=-.01&&box.right<=1200.01&&box.bottom<=1600.01);assert.equal(transformed[0].tool,'pen');assert.deepEqual(transformed[1],original.pages[0].strokes[1]);book.replaceStrokes(transformed);book.undo();assert.deepEqual(book.snapshot(),original);
 const text=transformStrokes(original.pages[0].strokes,[1],{rotation:15});assert.equal(text[1].rotation,15);assert.equal(copyNotebook({strokes:text}).pages[0].strokes[1].rotation,15);assert.throws(()=>transformStrokes([rectangle],[0],{scale:NaN}));
});
test('each notebook page retains its own scroll and zoom without putting navigation on undo stack',()=>{const book=notebookHistory();const first=book.page.id;book.setViewport({zoom:'200',left:100,top:400});book.addPage();book.setViewport({zoom:'fit',left:0,top:0});book.select(first);assert.equal(book.page.viewport.top,400);const saved=copyNotebook(book.snapshot());assert.equal(saved.pages[0].viewport.zoom,'200');book.undo();assert.equal(book.pages.length,1);assert.equal(book.page.viewport.top,400);});
test('long handwritten strokes can be selected without exceeding the JavaScript argument limit',()=>{const s={tool:'pen',width:4,points:Array.from({length:200000},(_,i)=>({x:i%1200,y:i%1600}))};assert.deepEqual(strokeBounds(s),{x:-2,y:-2,right:1201,bottom:1601});});
test('preview taps distinguish edges, centre, swipe, scrolling, hold and pinch',()=>{const rect={left:0,width:1000};assert.equal(previewGesture({x:80,y:20},{x:80,y:20},rect),'prev');assert.equal(previewGesture({x:920,y:20},{x:920,y:20},rect),'next');assert.equal(previewGesture({x:500,y:20},{x:500,y:20},rect),'toggle');assert.equal(previewGesture({x:500,y:20},{x:500,y:90},rect),null);assert.equal(previewGesture({x:500,y:20,at:1},{x:500,y:20,at:800},rect),null);assert.equal(previewGesture({x:500,y:20,multi:true},{x:200,y:20},rect),null);});
test('retiring device AI removes only model data and never touches learning files or chat archives',async()=>{
 const deleted=[],removed=[],opfs=[];const result=await retireLocalAI({cacheStorage:{delete:async key=>deleted.push(key)},storage:{removeItem:key=>removed.push(key)},storageManager:{getDirectory:async()=>({removeEntry:async(...args)=>opfs.push(args)})}});
 assert.equal(result.removed,true);assert.deepEqual(deleted,['webllm/model','webllm/config','webllm/wasm']);assert.ok(removed.every(k=>k.startsWith('rise-local-ai-')));assert.deepEqual(opfs,[['webllm-resume',{recursive:true}]]);
});
test('web search enables only the hosted search tool and reference URLs are safe',()=>{
 const args=codexArguments({images:true,search:true});assert.ok(args.includes('web_search="live"'));assert.ok(args.includes('permissions.rise-chat.network.enabled=false'));for(const feature of ['shell_tool','unified_exec','browser_use','apps'])assert.equal(args[args.indexOf(feature)-1],'--disable');assert.equal(studyMode({search:true}).search,true);assert.throws(()=>studyMode({search:'live'}));
 const refs=webReferences('[県公式](https://example.jp/p) [重複](https://example.jp/p) [bad](javascript:alert(1)) [secret](https://user:pass@example.jp/)');assert.equal(refs.length,1);assert.equal(refs[0].kind,'web');assert.equal(refs[0].title,'県公式');
});
