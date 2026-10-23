import {materialFiles} from './material-files.mjs';
export function updateNote(state,id,fields,added=[]){
 const note=state.notes.find(x=>x.id===id);if(!note)throw Error('このノートは別の画面で削除されました。');
 Object.assign(note,fields,{attachments:[...materialFiles(note),...added],updatedAt:Date.now()});return note;
}
export function saveNoteInk(state,id,drawing,expectedRevision){
 const note=state.notes.find(x=>x.id===id);if(!note)throw Error('このノートは別の画面で削除されました。');
 if((note.handwriting?.revision||0)!==expectedRevision)throw Error('別の画面で手書きが更新されています。「画像を書き出す」で今の書き込みを残し、ノートを開き直してください。');
 note.handwriting={...drawing,revision:expectedRevision+1};note.updatedAt=Date.now();
}
