import {copyInk,INK_WIDTH,INK_HEIGHT} from './ink.mjs';
const papers=['grid','ruled','blank'];
const copyViewport=v=>({zoom:['width','fit','custom','50','75','100','150','200','300'].includes(v.zoom)?v.zoom:'width',width:Math.max(120,Math.min(4800,Number(v.width)||1200)),left:Math.max(0,Math.min(100000,Number(v.left)||0)),top:Math.max(0,Math.min(100000,Number(v.top)||0))});
const pageId=()=>crypto.randomUUID();
export function copyNotebook(value){
 if(value?.version>3)throw Error('この手書きは新しいRISEで作成されています。アプリを更新してください。');
 if(value?.pages!==undefined&&!Array.isArray(value.pages))throw Error('手書きのページを読み込めませんでした。');
 const source=value?.pages?.length?value.pages:[value||{}],ids=new Set();
 const pages=source.map((p,i)=>{const id=String(p.id||'page-'+(i+1));if(ids.has(id))throw Error('手書きのページIDが重複しています。');ids.add(id);return{id,...copyInk(p),paper:papers.includes(p.paper)?p.paper:'grid',...(p.viewport?{viewport:copyViewport(p.viewport)}:{}),...(typeof p.backgroundId==='string'?{backgroundId:p.backgroundId}:{})};});
 return{version:3,width:INK_WIDTH,height:INK_HEIGHT,pages,activePageId:ids.has(value?.activePageId)?value.activePageId:pages[0].id};
}
export const notebookPages=value=>value?.pages?.length?value.pages:value?[value]:[];
export const notebookPreview=value=>{const pages=notebookPages(value);return pages.find(p=>p.id===value?.activePageId)||pages[0];};
// Each operation replaces its page; history can share untouched pages safely.
export function notebookHistory(value){
 let state=copyNotebook(value),undo=[],redo=[];
 const commit=next=>{undo.push(state);if(undo.length>100)undo.shift();state=next;redo=[];};
 const index=()=>state.pages.findIndex(p=>p.id===state.activePageId);
 const update=change=>{const pages=state.pages.slice(),i=index();pages[i]={...pages[i],...change};commit({...state,pages});};
 return{
  get pages(){return state.pages;},get index(){return index();},get page(){return state.pages[index()];},
  setViewport(viewport){const pages=state.pages.slice();pages[index()]={...this.page,viewport:copyViewport(viewport)};state={...state,pages};},
  replaceStrokes(strokes){update({strokes:copyInk({strokes}).strokes});},
  setBackground(backgroundId){update({backgroundId:backgroundId||undefined});},
  get canUndo(){return undo.length>0;},get canRedo(){return redo.length>0;},
  select(id){if(id===state.activePageId||!state.pages.some(p=>p.id===id))return false;state={...state,activePageId:id};return true;},
  add(stroke){update({strokes:[...this.page.strokes,copyInk({strokes:[stroke]}).strokes[0]]});},
  clear(){if(!this.page.strokes.length)return false;update({strokes:[]});return true;},
  setPaper(paper){if(!papers.includes(paper)||this.page.paper===paper)return false;update({paper});return true;},
  addPage(duplicate=false){const p={id:pageId(),...copyInk(duplicate?this.page:null),paper:this.page.paper,...(duplicate&&this.page.backgroundId?{backgroundId:this.page.backgroundId}:{})},pages=state.pages.slice();pages.splice(index()+1,0,p);commit({...state,pages,activePageId:p.id});},
  removePage(){if(state.pages.length===1)return false;const i=index(),pages=state.pages.filter((_,n)=>n!==i);commit({...state,pages,activePageId:pages[Math.min(i,pages.length-1)].id});return true;},
  movePage(direction){const i=index(),to=i+direction;if(to<0||to>=state.pages.length)return false;const pages=state.pages.slice();[pages[i],pages[to]]=[pages[to],pages[i]];commit({...state,pages});return true;},
  undo(){if(!undo.length)return false;redo.push(state);state=undo.pop();return true;},
  redo(){if(!redo.length)return false;undo.push(state);state=redo.pop();return true;},
  snapshot(){return copyNotebook(state);}
 };
}
