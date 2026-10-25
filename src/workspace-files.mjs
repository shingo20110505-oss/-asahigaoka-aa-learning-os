import {uid} from './domain.mjs';
import {quickNote,updateNote} from './note-data.mjs';
import {materialFiles} from './material-files.mjs';
export function attachWorkspaceFiles(state,{noteId,materialId,toNote=true,toMaterial=true,title='資料',files=[]}){
 if(!files.length)throw Error('追加するファイルを選んでください。');
 if(!toNote&&!toMaterial)throw Error('ノート・資料のどちらかを選んでください。');
 const note=noteId?state.notes.find(n=>n.id===noteId&&!n.deletedAt):null,material=materialId?state.materials.find(m=>m.id===materialId):null;
 if(toNote&&noteId&&!note||toMaterial&&materialId&&!material)throw Error('追加先が削除されています。選び直してください。');
 if(toNote){if(note)updateNote(state,noteId,{},files);else{const next=quickNote({title});next.attachments=[...files];state.notes.unshift(next);noteId=next.id;}}
 if(toMaterial){if(material){material.attachments=[...materialFiles(material),...files];material.updatedAt=Date.now();}else{materialId=uid();state.materials.unshift({id:materialId,title,kind:'ファイル',subject:'その他',attachments:[...files],updatedAt:Date.now()});}}
 return{noteId:toNote?noteId:undefined,materialId:toMaterial?materialId:undefined};
}
