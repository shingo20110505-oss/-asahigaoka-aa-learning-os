import {materialFiles,referencedFileIds} from './material-files.mjs';
import {copyNotebook} from './ink-notebook.mjs';
import {uid,scheduleReview} from './domain.mjs';
export function quickNote({body='',subject='その他',kind='疑問',title=''},now=Date.now()){
 body=body.trim();if(!body&&!title.trim())throw Error('残しておきたいことを入力してください。');
 return{id:uid(),title:title.trim()||body.split('\n')[0].slice(0,80),body,subject,kind,tags:[],links:[],attachments:[],createdAt:now,updatedAt:now,review:{due:now}};
}
export function reviewNote(state,id,rating,now=Date.now()){const note=editableNote(state,id);note.review=scheduleReview(note.review,rating,now);note.updatedAt=now;}
export const dueNotes=(notes,now=Date.now())=>notes.filter(n=>!n.deletedAt&&!n.archived&&n.review&&n.review.due<=now).sort((a,b)=>a.review.due-b.review.due);
// Purge only the records reviewed in the confirmation, including their deletion
// timestamp. A concurrently restored/re-deleted note must not be purged.
export function purgeNoteTrash(state,confirmed){
 const matches=new Map(confirmed.map(n=>[n.id,n.deletedAt]));
 const removed=state.notes.filter(n=>n.deletedAt&&matches.get(n.id)===n.deletedAt);
 const ids=new Set(removed.map(n=>n.id)),files=referencedFileIds({notes:removed});
 state.notes=state.notes.filter(n=>!ids.has(n.id));
 for(const n of state.notes)n.links=(n.links||[]).filter(id=>!ids.has(id));
 const kept=referencedFileIds(state);
 return{count:removed.length,fileIds:[...files].filter(id=>!kept.has(id))};
}
function editableNote(state,id){const note=state.notes.find(x=>x.id===id);if(!note||note.deletedAt)throw Error('このノートは削除されています。ごみ箱から戻して開き直してください。');return note;}
export function updateNote(state,id,fields,added=[]){
 const note=editableNote(state,id);
 Object.assign(note,fields,{attachments:[...materialFiles(note),...added],updatedAt:Date.now()});return note;
}
export function saveNoteInk(state,id,drawing,expectedRevision){
 const note=editableNote(state,id);
 if((note.handwriting?.revision||0)!==expectedRevision)throw Error('別の画面で手書きが更新されています。「このページを書き出す」で各ページの書き込みを残し、ノートを開き直してください。');
 note.handwriting={...copyNotebook(drawing),revision:expectedRevision+1};note.updatedAt=Date.now();
}
export function trashNote(state,id){const note=editableNote(state,id);note.deletedAt=Date.now();note.updatedAt=note.deletedAt;}
export function restoreNote(state,id){const note=state.notes.find(x=>x.id===id);if(!note?.deletedAt)throw Error('ごみ箱にノートが見つかりません。');delete note.deletedAt;note.archived=false;note.updatedAt=Date.now();}
