export function screenText(root){
 if(!root)return '';
 const clone=root.cloneNode(true),originals=[root,...root.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 for(let i=0;i<originals.length;i++){
  const node=originals[i],copy=copies[i];
  const hidden=node.matches('script,style,form,input,textarea,select,button,nav,[hidden],[aria-hidden="true"],.chat-host,.note-list,.chat-sidebar,.ink-confirm,.note-recall>.prose,.note-recall>.note-attachments,.note-recall>section:has(.note-ink-button)');
  const style=node.isConnected?getComputedStyle(node):null;
  if(hidden||style?.display==='none'||['hidden','collapse'].includes(style?.visibility)){if(copy===clone)return '';copy.remove();}
 }
 // A closed disclosure exposes its summary only, including cached study views.
 for(const detail of clone.querySelectorAll('details:not([open])'))for(const child of [...detail.childNodes])if(child.nodeType!==1||child.tagName!=='SUMMARY')child.remove();
 return clone.textContent.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,8000);
}
export async function studyScreenContext(main,store){
 if(!main)throw Error('教材やノートを開いてから選んでください。');
 const preview=document.querySelector('.media-viewer[open]'),fileIds=new Set();
 for(const node of (preview?[preview]:[...main.querySelectorAll('[data-screen-material][data-file-id]')]))if(node.dataset.fileId)fileIds.add(node.dataset.fileId);
 const target=main.querySelector('#note-detail')||main.querySelector('.reading-passage')||main;
 const context=screenText(target),title=preview?.getAttribute('aria-label')||main.querySelector('h1')?.textContent||'開いていた画面',files=[];
 for(const id of fileIds){const saved=await store.file(id);if(saved)files.push(new File([saved.blob],saved.name,{type:saved.type}));}
 if(!context&&!files.length)throw Error('この画面には添付できる教材がありません。');
 return{title,context,files};
}
