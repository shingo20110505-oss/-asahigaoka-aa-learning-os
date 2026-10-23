import {materialFiles} from './material-files.mjs';
import {copyNotebook} from './ink-notebook.mjs';
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
