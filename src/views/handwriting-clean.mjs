import {esc,heading,button,toast} from '../ui.mjs';
import {uid} from '../domain.mjs';
import {materialFiles} from '../material-files.mjs';
import {createCleaner} from '../handwriting-clean/client.mjs';
import {syntheticPage,compareMask} from '../handwriting-clean/fixtures.mjs';
import {cleanPixels} from '../handwriting-clean/engine.mjs';

export function mount({main,store,query=new URLSearchParams()}) {
  const cleaner=createCleaner(),pages=[];let selected=-1,disposed=false,busy=false,controller=null,full=false,display='original',tool='view',brush=.012,pendingStroke=null,viewUrl='',generation=0;
  let config={red:true,blue:true,strength:38},status='',benchmark=null;
  if(!document.querySelector('link[data-handwriting-clean-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('../handwriting-clean/style.css',import.meta.url).href;css.dataset.handwritingCleanStyle='';document.head.append(css);}
  const current=()=>pages[selected];
  const options=p=>({...config,strokes:p.strokes});
  const release=p=>{if(p.url)URL.revokeObjectURL(p.url);if(p.outputUrl)URL.revokeObjectURL(p.outputUrl);};
  const revokeView=()=>{if(viewUrl)URL.revokeObjectURL(viewUrl);viewUrl='';};
  const guard=fn=>async(...args)=>{try{await fn(...args);}catch(e){if(e.name!=='AbortError'){status=e.message;toast(e.message,true);updateStatus();}}};
  const invalidate=p=>{p.result=null;p.saved=false;p.strokesVersion=(p.strokesVersion||0)+1;if(p.outputUrl)URL.revokeObjectURL(p.outputUrl);p.outputUrl='';};
  function updateStatus(){const e=main.querySelector('[data-clean-status]');if(e)e.textContent=status;}
  function list(){const e=main.querySelector('[data-clean-pages]');if(!e)return;e.innerHTML=pages.map((p,i)=>`<button type="button" class="clean-page ${i===selected?'active':''}" data-clean="page" data-index="${i}" aria-pressed="${i===selected}"><img src="${esc(p.url)}" alt="" loading="lazy"><span>${i+1}. ${esc(p.file.name)}</span><small>${p.saved?'保存済み':p.result?'確認できます':p.error?'処理できませんでした':'原本'}</small></button>`).join('');}
  function draw(){
    generation++;if(!busy)cleaner.cancel();
    main.innerHTML=`<section class="handwriting-clean ${full?'clean-fullscreen':''}">${heading('HANDWRITING CLEANUP','手書き消去','消す部分を確認して、原本と結果を別々に保存。',button(full?'元の大きさ':'全画面','fullscreen','secondary'))}<div class="clean-controls"><label class="button secondary clean-file-label">画像を追加<input type="file" accept="image/*" multiple data-clean-files ${busy?'disabled':''}></label>${button('まとめて消去結果を作る','batch','primary',pages.length&&!busy?'':'disabled')}${busy?button('中止','cancel','secondary'):''}<label><input type="checkbox" data-red ${config.red?'checked':''} ${busy?'disabled':''}>赤</label><label><input type="checkbox" data-blue ${config.blue?'checked':''} ${busy?'disabled':''}>青</label><label>検出の強さ<input aria-label="色の検出閾値" type="range" min="18" max="80" value="${config.strength}" data-strength ${busy?'disabled':''}></label></div><p class="small muted clean-help">赤・青の候補を自動で選びます。黒い書き込みは「消す」で指定し、残したい印刷は「残す」でなぞれます。</p><p data-clean-status role="status">${esc(status)}</p><div class="clean-workspace"><nav class="clean-pages" data-clean-pages aria-label="画像一覧"></nav><div class="clean-main"><div class="clean-tools"><div role="group" aria-label="表示">${[['original','原本'],['mask','消去範囲'],['result','消去後']].map(([id,label])=>button(label,'display-'+id,'secondary small',`aria-pressed="${display===id}" ${busy?'disabled':''}`)).join('')}</div><div role="group" aria-label="消去範囲の編集">${[['view','見る'],['erase','消す'],['protect','残す']].map(([id,label])=>button(label,'tool-'+id,'secondary small',`aria-pressed="${tool===id}" ${busy?'disabled':''}`)).join('')}${button('ひとつ戻す','undo','ghost small',current()?.strokes.length&&!busy?'':'disabled')}<label>太さ<input type="range" min="3" max="60" value="${Math.round(brush*1000)}" data-brush aria-label="ブラシの太さ"></label></div></div><div class="clean-stage" data-clean-stage>${current()?'<div class="clean-image-wrap"><img data-clean-image alt="教材のプレビュー" draggable="false"><canvas data-clean-overlay aria-label="消す範囲・残す範囲をなぞる"></canvas></div>':'<p class="clean-placeholder">教材の写真を選んでください。複数枚をまとめて追加できます。</p>'}</div><div class="clean-actions">${button('原本と結果を資料室へ','save','primary',current()?.result&&!busy?'':'disabled')}${button('結果をダウンロード','download','secondary',current()?.result&&!busy?'':'disabled')}${button('AIで仕上げる（PC）','ai-finish','secondary',current()&&!busy?'':'disabled')}${button('原本に戻す','reset','ghost',current()&&!busy?'':'disabled')}${button('一覧から外す','remove','ghost',current()&&!busy?'':'disabled')}${pages.filter(p=>p.result&&!p.saved).length>1?button('完成したページをまとめて保存','save-all','secondary',busy?'disabled':''):''}</div></div></div><details class="clean-benchmark"><summary>この端末の処理速度を確認</summary><p class="small muted">テスト画像の1・3・10枚を計測します。実際の教材の精度を表す値ではありません。</p>${button('計測する','benchmark','secondary',busy?'disabled':'')}<pre data-clean-benchmark>${benchmark?esc(JSON.stringify(benchmark,null,2)):''}</pre></details></section>`;
    list();bind();paint();
  }
  async function paint(){
    const p=current(),img=main.querySelector('[data-clean-image]');if(!p||!img)return;const token=++generation;revokeView();
    if(display==='original'||busy){img.src=display==='result'&&p.outputUrl?p.outputUrl:p.url;attachOverlay();return;}
    if(display==='result'&&p.result){img.src=p.outputUrl;attachOverlay();return;}
    try{
      const result=await cleaner.process(p.file,options(p),display==='mask',controller?.signal);if(disposed||token!==generation||p!==current())return;
      if(display==='result'){p.result=result;p.outputUrl=URL.createObjectURL(result.blob);img.src=p.outputUrl;status=`${(result.totalMs/1000).toFixed(2)}秒 · 消去範囲 ${result.selected.toLocaleString()}画素`;draw();}
      else{viewUrl=URL.createObjectURL(result.blob);img.src=viewUrl;attachOverlay();}
    }catch(e){if(e.name!=='AbortError'&&!disposed&&token===generation){status=e.message;updateStatus();}}
  }
  function attachOverlay(){const img=main.querySelector('[data-clean-image]'),canvas=main.querySelector('[data-clean-overlay]');if(!img||!canvas)return;canvas.style.pointerEvents=tool==='view'?'none':'auto';canvas.style.touchAction='none';const resize=()=>{const r=img.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width));canvas.height=Math.max(1,Math.round(r.height));canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';};img.onload=resize;if(img.complete)resize();}
  function coords(e,canvas){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
  function drawStroke(canvas,stroke){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=stroke.mode==='protect'?'rgba(30,160,120,.65)':'rgba(245,70,80,.65)';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=stroke.radius*Math.min(canvas.width,canvas.height)*2;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();stroke.points.forEach(([x,y],i)=>i?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));ctx.stroke();if(stroke.points.length===1){ctx.beginPath();ctx.arc(stroke.points[0][0]*canvas.width,stroke.points[0][1]*canvas.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}}
  async function addFiles(files){for(const file of files){if(!file.type.startsWith('image/')&&!/\.(png|jpe?g|webp|gif|avif|heic)$/i.test(file.name))continue;pages.push({id:uid(),file,url:URL.createObjectURL(file),strokes:[],result:null,saved:false});}if(selected<0&&pages.length)selected=0;display='original';status=pages.length+'枚を選択しました';draw();}
  async function batch(){
    if(busy)return;busy=true;controller=new AbortController();cleaner.cancel();const start=performance.now();let completed=0;draw();
    try{for(let i=0;i<pages.length;i++){if(controller.signal.aborted)break;const p=pages[i];status=`${i+1} / ${pages.length}枚を処理しています`;updateStatus();try{const result=await cleaner.process(p.file,options(p),false,controller.signal);if(p.outputUrl)URL.revokeObjectURL(p.outputUrl);p.result=result;p.saved=false;p.error=null;p.outputUrl=URL.createObjectURL(result.blob);completed++;if(i===selected){display='result';const img=main.querySelector('[data-clean-image]');if(img)img.src=p.outputUrl;}list();}catch(e){if(e.name==='AbortError')break;p.error=e.message;list();}}status=`${completed}枚ができました · ${((performance.now()-start)/1000).toFixed(2)}秒${pages.some(p=>p.error)?'（処理できなかった画像があります）':''}`;}finally{busy=false;controller=null;if(!disposed)draw();}
  }
  async function savePage(p){
    if(!p?.result||p.saved||p.saving)return;p.saving=true;const added=[];
    try{added.push(await store.putFile(new File([p.file],p.file.name,{type:p.file.type})));added.push(await store.putFile(new File([p.result.blob],p.file.name.replace(/\.[^.]*$/,'')+'-手書き消去.png',{type:'image/png'})));await store.change(s=>s.materials.unshift({id:uid(),title:p.file.name.replace(/\.[^.]*$/,'')+' · 手書き消去',subject:'その他',kind:'2周目の復習',memo:'1枚目：原本／2枚目：確認した消去結果',attachments:added,updatedAt:Date.now()}));p.saved=true;}catch(e){for(const f of added)await store.deleteFile(f.id);throw e;}finally{p.saving=false;}
  }
  async function benchmarkDevice(){
    if(busy)return;busy=true;draw();const rows=[];
    try{for(const count of [1,3,10]){const start=performance.now();let metrics,totalBytes=0;for(let i=0;i<count;i++){status=`テスト画像 ${count}枚中 ${i+1}枚`;updateStatus();await new Promise(r=>setTimeout(r,0));const f=syntheticPage(),result=cleanPixels(f);metrics=compareMask(f,result);const canvas=document.createElement('canvas');canvas.width=f.width;canvas.height=f.height;canvas.getContext('2d').putImageData(new ImageData(f.data,f.width,f.height),0,0);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));canvas.width=canvas.height=1;const actual=await cleaner.process(blob);totalBytes+=actual.blob.size;}rows.push({pages:count,totalMs:Math.round(performance.now()-start),...metrics,outputBytes:totalBytes});}benchmark={device:navigator.userAgent,createdAt:new Date().toISOString(),fixture:'1200×1600 synthetic; includes fixture generation, encoding, decoding, worker and output encoding',rows};status='この端末で計測しました';}finally{busy=false;if(!disposed)draw();}
  }
  function bind(){
    main.querySelector('[data-clean-files]').onchange=guard(e=>addFiles([...e.target.files]));
    for(const [key,selector]of [['red','[data-red]'],['blue','[data-blue]'],['strength','[data-strength]']])main.querySelector(selector).onchange=e=>{if(busy)return;config[key]=key==='strength'?Number(e.target.value):e.target.checked;pages.forEach(invalidate);display='mask';draw();};
    main.querySelector('[data-brush]').oninput=e=>brush=Number(e.target.value)/1000;
    const canvas=main.querySelector('[data-clean-overlay]');if(canvas){canvas.onpointerdown=e=>{if(busy||tool==='view'||e.button>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pendingStroke={mode:tool,radius:brush,points:[coords(e,canvas)]};drawStroke(canvas,pendingStroke);};canvas.onpointermove=e=>{if(!pendingStroke)return;e.preventDefault();pendingStroke.points.push(coords(e,canvas));drawStroke(canvas,pendingStroke);};const finish=e=>{if(!pendingStroke)return;if(e.type==='pointercancel'){pendingStroke=null;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);return;}current().strokes.push(pendingStroke);pendingStroke=null;invalidate(current());display='mask';draw();};canvas.onpointerup=finish;canvas.onpointercancel=finish;}
    main.onclick=guard(async e=>{const b=e.target.closest('[data-action],[data-clean]');if(!b)return;const a=b.dataset.action||b.dataset.clean,p=current();
      if(a==='cancel'){controller?.abort();cleaner.cancel();return;}
      if(a==='fullscreen'){full=!full;draw();return;}
      if(busy)return;
      if(a==='page'){selected=Number(b.dataset.index);display=current().result?'result':'original';draw();return;}
      if(a==='batch')return batch();if(a==='benchmark')return benchmarkDevice();
      if(a==='save-all'){for(const page of pages)await savePage(page);status='完成したページを資料室に保存しました';draw();return;}
      if(!p)return;
      if(a.startsWith('display-')){display=a.slice(8);draw();return;}
      if(a.startsWith('tool-')){tool=a.slice(5);if(tool!=='view')display='mask';draw();return;}
      if(a==='undo'){p.strokes.pop();invalidate(p);display='mask';draw();return;}
      if(a==='reset'){p.strokes=[];invalidate(p);display='original';draw();return;}
      if(a==='remove'){release(p);pages.splice(selected,1);selected=Math.min(selected,pages.length-1);display='original';draw();return;}
      if(a==='ai-finish'){busy=true;draw();const id=uid();let file;try{file=await store.putFile(new File([p.file],p.file.name,{type:p.file.type}));await store.change(s=>s.materials.unshift({id,title:p.file.name.replace(/\.[^.]*$/,'')+' · AI消去の原本',subject:'その他',kind:'ファイル',memo:'手書き消去に渡した原本',attachments:[file],updatedAt:Date.now()}));location.hash='#/ai-task?mode=clean&material='+encodeURIComponent(id)+'&file='+encodeURIComponent(file.id);}catch(e){if(file)await store.deleteFile(file.id);throw e;}finally{busy=false;if(!disposed)draw();}return;}
      if(a==='save'){await savePage(p);status='原本と消去結果を資料室に保存しました';draw();return;}
      if(a==='download'&&p.result){const a=document.createElement('a');a.href=p.outputUrl;a.download=p.file.name.replace(/\.[^.]*$/,'')+'-手書き消去.png';a.click();}
    });
  }
  draw();
  if(query.get('material'))guard(async()=>{const material=store.state.materials.find(m=>m.id===query.get('material'));const files=materialFiles(material||{}).filter(f=>(!query.get('file')||f.id===query.get('file'))&&f.type?.startsWith('image/'));for(const f of files){const saved=await store.file(f.id);if(saved&&!disposed)await addFiles([new File([saved.blob],f.name,{type:f.type})]);}})();
  return Object.assign(()=>{disposed=true;generation++;controller?.abort();cleaner.dispose();pages.forEach(release);revokeView();main.onclick=null;},{suspend(){full=false;main.querySelector('.handwriting-clean')?.classList.remove('clean-fullscreen');},refresh(){}});
}
