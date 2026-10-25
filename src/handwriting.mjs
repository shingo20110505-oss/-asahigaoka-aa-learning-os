import {selectStrokes,selectionBounds,moveStrokes,strokeAt,transformStrokes} from './ink-selection.mjs';
import {esc,button,download} from './ui.mjs';
import {INK_WIDTH,INK_HEIGHT,inkPoint,paintStroke,paintInk} from './ink.mjs';
import {notebookHistory} from './ink-notebook.mjs';

export function handwritingEditor({title,value,onSave,onClose,images=[],loadImage}){
 const book=notebookHistory(value),host=document.createElement('dialog'),previous=document.activeElement;
 host.className='ink-editor ink-maximized';host.setAttribute('aria-label','ノートの手書き');
 host.innerHTML=`<header class="ink-heading"><div><h2>${esc(title)}</h2><p data-page-heading></p></div><div class="actions">${button('ページ一覧','page-overview','secondary','aria-expanded="false"')}${button('道具を隠す','tools','secondary','aria-expanded="true" aria-controls="ink-toolbar"')}${button('元の表示','maximize','secondary','aria-pressed="true" aria-label="手書き画面を元に戻す"')}${button('閉じる','close','secondary')}</div></header>
 <div id="ink-toolbar" class="ink-controls">
  <div class="ink-tools" role="toolbar" aria-label="手書きの道具">
   <label>道具<select aria-label="書く道具"><option value="pen">ペン</option><option value="highlighter">蛍光ペン</option><option value="eraser">消しゴム</option><option value="line">直線</option><option value="rectangle">四角</option><option value="ellipse">丸</option><option value="select">範囲選択・移動</option><option value="object-eraser">線ごと消す</option><option value="text">文字を置く</option><option value="pan">用紙を移動</option></select></label>
   <label>色<input type="color" aria-label="ペンの色" value="#182d29"></label><label>太さ<select aria-label="線の太さ"><option value="1">極細</option><option value="3">細</option><option value="6" selected>普通</option><option value="12">太</option><option value="24">極太</option></select></label>
   ${button('↶','undo','secondary','aria-label="手書きを取り消す"')}${button('↷','redo','secondary','aria-label="手書きをやり直す"')}
   <label><input type="checkbox" data-finger checked>指でも書く</label>
   <label>表示<select aria-label="手書きの表示倍率"><option value="width">幅に合わせる</option><option value="fit">ページ全体</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="150">150%</option><option value="200">200%</option><option value="300">300%</option><option value="custom" disabled>ピンチで拡大</option></select></label>
  </div>
  <div class="ink-selection-tools" hidden><span data-selection-count></span>${button('縮小','shrink-selection','secondary small','aria-label="選択範囲を縮小"')}${button('拡大','grow-selection','secondary small','aria-label="選択範囲を拡大"')}${button('↶ 15°','rotate-left','secondary small','aria-label="選択範囲を左に回転"')}${button('15° ↷','rotate-right','secondary small','aria-label="選択範囲を右に回転"')}${button('太さを変更','width-selection','secondary small')}${button('複製','copy-selection','secondary small')}${button('選んだ色に変更','color-selection','secondary small')}${button('削除','delete-selection','secondary small')}</div>
  <label class="ink-text-entry" hidden>置く文字<input type="text" maxlength="500" data-ink-text placeholder="文字を入力し、用紙をタップ"></label>
  <details class="ink-more"><summary>用紙・ページ操作</summary><div class="ink-tools">
   <label>用紙<select aria-label="用紙の種類"><option value="grid">方眼</option><option value="ruled">罫線</option><option value="blank">無地</option></select></label>
   ${images.length?`<label>資料の上に書く<select aria-label="下に敷く画像"><option value="">画像なし</option>${images.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select></label>`:''}${button('ページを複製','duplicate-page','secondary')}${button('前へ移す','move-before','secondary')}${button('後ろへ移す','move-after','secondary')}${button('ページを削除','delete-page','secondary')}${button('このページを白紙に','clear','secondary')}${button('このページを書き出す','export','secondary')}
  </div></details>
 </div>
 <div class="ink-page-overview" hidden aria-label="ページの一覧"></div><div class="ink-stage" tabindex="0" aria-label="手書き用紙。移動モードや2本指でスクロールできます。"><div class="ink-paper"><img class="ink-background" hidden alt="書き込みの下に敷いた資料"><canvas width="${INK_WIDTH}" height="${INK_HEIGHT}" aria-label="手書きキャンバス。ペン、指、マウスで書けます。"></canvas></div></div>
 <nav class="ink-pages" aria-label="手書きのページ移動">${button('前','previous-page','secondary','aria-label="前のページ"')}<label class="ink-page-select"><span class="sr-only">ページ</span><select aria-label="手書きのページ"></select></label>${button('次','next-page','secondary','aria-label="次のページ"')}${button('＋ ページ','add-page','primary','aria-label="ページを追加"')}</nav>
 <footer class="ink-footer"><p data-status role="status">この端末に自動保存 · 移動モードか2本指で用紙を動かせます。</p><p data-error role="alert"></p><p data-notice aria-live="polite"></p></footer>
 <section class="ink-confirm" hidden><p>まだ保存できていない書き込みがあります。</p><div class="actions">${button('保存して閉じる','save-close','primary')}${button('編集を続ける','continue','secondary')}${button('保存せず閉じる','discard','ghost')}</div></section>`;
 document.body.append(host);
 const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),paper=host.querySelector('.ink-paper'),stage=host.querySelector('.ink-stage'),status=host.querySelector('[data-status]'),error=host.querySelector('[data-error]'),notice=host.querySelector('[data-notice]'),pageSelect=host.querySelector('[aria-label="手書きのページ"]'),zoomSelect=host.querySelector('[aria-label="手書きの表示倍率"]');
 let tool='pen',active=null,pan=null,gesture=null,gestureEnded=false,lastPen=0,changed=0,saved=0,pending=null,timer=null,closed=false,maximized=true,zoom='width',customWidth=INK_WIDTH;
 let selection=[],selecting=null;const backgroundUrls=new Map(),background=host.querySelector('.ink-background');
 const touches=new Map(),control=a=>host.querySelector('[data-action="'+a+'"]');
 const sync=()=>{
  control('undo').disabled=!book.canUndo;control('redo').disabled=!book.canRedo;control('clear').disabled=!book.page.strokes.length;
  for(const action of ['previous-page','move-before'])control(action).disabled=book.index===0;
  for(const action of ['next-page','move-after'])control(action).disabled=book.index===book.pages.length-1;
  control('delete-page').disabled=book.pages.length===1;
  pageSelect.innerHTML=book.pages.map((p,i)=>`<option value="${esc(p.id)}" ${i===book.index?'selected':''}>${i+1} / ${book.pages.length} ページ</option>`).join('');
  host.querySelector('[data-page-heading]').textContent=`手書きノート · ${book.index+1} / ${book.pages.length} ページ`;
  host.querySelector('[aria-label="用紙の種類"]').value=book.page.paper;
  paper.className='ink-paper ink-'+book.page.paper;
  host.querySelector('.ink-selection-tools').hidden=!selection.length;host.querySelector('[data-selection-count]').textContent=selection.length+'個を選択中';
  const overview=host.querySelector('.ink-page-overview');if(!overview.hidden){overview.innerHTML=book.pages.map((p,i)=>`<button class="ink-page-card ${p.id===book.page.id?'active':''}" data-action="select-page" data-page="${esc(p.id)}"><canvas width="90" height="120"></canvas><span>${i+1}ページ${p.backgroundId?' · 資料あり':''}</span></button>`).join('');overview.querySelectorAll('canvas').forEach((c,i)=>paintInk(c,book.pages[i]));}
  const bgSelect=host.querySelector('[aria-label="下に敷く画像"]');if(bgSelect)bgSelect.value=book.page.backgroundId||'';
  showBackground();
 };
 async function showBackground(){const id=book.page.backgroundId;if(!id){background.hidden=true;background.removeAttribute('src');return;}if(background.dataset.file!==id){background.hidden=true;background.dataset.file=id;}try{let url=backgroundUrls.get(id);if(!url){const blob=await loadImage?.(id);if(!blob)throw Error('下に敷く画像が見つかりません。ノートの添付を確認してください。');url=URL.createObjectURL(blob);if(closed){URL.revokeObjectURL(url);return;}backgroundUrls.set(id,url);}if(book.page.backgroundId!==id)return;background.src=url;background.hidden=false;}catch(e){if(book.page.backgroundId===id){background.hidden=true;error.textContent=e.message;}}}
 function selectionBox(box){if(!box)return;ctx.save();ctx.strokeStyle='#1474e5';ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.strokeRect(box.x,box.y,box.right-box.x,box.bottom-box.y);ctx.restore();}
 const redraw=()=>{paintInk(canvas,book.page);selectionBox(selectionBounds(book.page.strokes,selection));sync();};
 function sizePaper(width){paper.style.width=width+'px';paper.style.height=width*INK_HEIGHT/INK_WIDTH+'px';paper.style.setProperty('--ink-grid-size',32*width/INK_WIDTH+'px');}
 function resize(){const available=Math.max(120,stage.clientWidth-24);sizePaper(zoom==='width'?available:zoom==='fit'?Math.min(available,Math.max(120,(stage.clientHeight-24)*INK_WIDTH/INK_HEIGHT)):zoom==='custom'?customWidth:INK_WIDTH*Number(zoom)/100);}
 async function flush(){
  clearTimeout(timer);if(pending)await pending;if(closed||saved===changed)return;
  pending=(async()=>{while(saved!==changed&&!closed){const revision=changed,snapshot=book.snapshot();status.textContent='保存しています…';error.textContent='';await onSave(snapshot);saved=revision;}status.textContent='この端末に保存済み · オフラインでも使えます。';})().finally(()=>{pending=null;});return pending;
 }
 const saveError=e=>{status.textContent='未保存';error.textContent=e.message||'保存できませんでした。画面を閉じずに再試行してください。';};
 const dirty=()=>{changed++;status.textContent='保存待ち…';clearTimeout(timer);timer=setTimeout(()=>flush().catch(saveError),400);sync();};
 function finish(){if(selecting){selecting=null;redraw();}if(!active)return;book.add(active.stroke);active=null;dirty();}
 const center=()=>{const a=[...touches.values()];return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,distance:Math.max(1,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y))};};
 canvas.onpointerdown=e=>{
  if(e.pointerType==='touch'&&Date.now()-lastPen<800)return;
  if(e.pointerType==='touch')touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touches.size>=2){e.preventDefault();active=null;pan=null;selecting=null;redraw();const c=center(),rect=canvas.getBoundingClientRect();gesture={...c,width:rect.width,anchorX:(c.x-rect.left)/rect.width,anchorY:(c.y-rect.top)/rect.height};canvas.setPointerCapture(e.pointerId);return;}
  if(active||pan||gestureEnded||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
  if(tool==='pan'||e.pointerType==='touch'&&!host.querySelector('[data-finger]').checked){pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};return;}
  if(e.pointerType==='pen')lastPen=Date.now();
  const point=inkPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());
  if(tool==='select'){const box=selectionBounds(book.page.strokes,selection),moving=box&&point.x>=box.x&&point.x<=box.right&&point.y>=box.y&&point.y<=box.bottom;selecting={id:e.pointerId,start:point,end:point,moving,strokes:book.page.strokes};if(!moving)selection=[];return;}
  if(tool==='object-eraser'){const hit=strokeAt(book.page.strokes,point);if(hit>=0){book.replaceStrokes(book.page.strokes.filter((_,i)=>i!==hit));selection=[];redraw();dirty();}return;}
  if(tool==='text'){const text=host.querySelector('[data-ink-text]').value.trim();if(!text){notice.textContent='道具の下の欄に文字を入力してください。';return;}book.add({tool:'text',text,color:host.querySelector('[aria-label="ペンの色"]').value,width:12,points:[point]});redraw();dirty();return;}
  selection=[];
  const stroke={tool,color:host.querySelector('[aria-label="ペンの色"]').value,width:Math.min(100,Number(host.querySelector('[aria-label="線の太さ"]').value)*(['eraser','highlighter'].includes(tool)?4:1)),points:[inkPoint(e.clientX,e.clientY,canvas.getBoundingClientRect())]};active={id:e.pointerId,stroke};paintStroke(ctx,stroke);
 };
 canvas.onpointermove=e=>{
  if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gesture&&touches.size>=2){e.preventDefault();const c=center();zoom='custom';customWidth=Math.max(120,Math.min(4800,gesture.width*c.distance/gesture.distance));zoomSelect.value='custom';resize();const rect=canvas.getBoundingClientRect();stage.scrollLeft+=rect.left+gesture.anchorX*rect.width-c.x;stage.scrollTop+=rect.top+gesture.anchorY*rect.height-c.y;return;}
  if(pan?.id===e.pointerId){e.preventDefault();stage.scrollLeft=pan.left-(e.clientX-pan.x);stage.scrollTop=pan.top-(e.clientY-pan.y);return;}
  if(selecting?.id===e.pointerId){e.preventDefault();selecting.end=inkPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());const a=selecting;if(a.moving){const strokes=moveStrokes(a.strokes,selection,a.end.x-a.start.x,a.end.y-a.start.y);paintInk(canvas,{strokes});selectionBox(selectionBounds(strokes,selection));}else{paintInk(canvas,book.page);selectionBox({x:Math.min(a.start.x,a.end.x),y:Math.min(a.start.y,a.end.y),right:Math.max(a.start.x,a.end.x),bottom:Math.max(a.start.y,a.end.y)});}return;}
  if(active?.id!==e.pointerId)return;e.preventDefault();if(e.pointerType==='pen')lastPen=Date.now();
  const shape=['line','rectangle','ellipse'].includes(tool),samples=e.getCoalescedEvents?.();
  for(const sample of samples?.length?samples:[e]){const p=inkPoint(sample.clientX,sample.clientY,canvas.getBoundingClientRect()),last=active.stroke.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)<1)continue;if(shape)active.stroke.points=[active.stroke.points[0],p];else active.stroke.points.push(p);
   if(shape||tool==='highlighter'){paintInk(canvas,book.page);paintStroke(ctx,active.stroke);}else paintStroke(ctx,{...active.stroke,points:[last,p]});}
 };
 const endPointer=e=>{if(selecting?.id===e.pointerId){const a=selecting;selecting=null;if(a.moving){if(e.type!=='pointercancel'&&(a.start.x!==a.end.x||a.start.y!==a.end.y)){book.replaceStrokes(moveStrokes(a.strokes,selection,a.end.x-a.start.x,a.end.y-a.start.y));dirty();}}else selection=selectStrokes(book.page.strokes,a.start,a.end);redraw();}if(active?.id===e.pointerId)finish();if(pan?.id===e.pointerId)pan=null;touches.delete(e.pointerId);if(gesture&&touches.size<2){gesture=null;gestureEnded=true;}if(!touches.size)gestureEnded=false;};
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=endPointer;
 const beforeUnload=e=>{if(saved!==changed||active){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
 function destroy(){if(closed)return;closed=true;for(const url of backgroundUrls.values())URL.revokeObjectURL(url);clearTimeout(timer);observer.disconnect();window.removeEventListener('beforeunload',beforeUnload);host.close();host.remove();if(!document.querySelector('.ink-editor[open]'))document.body.classList.remove('ink-editor-open');previous?.isConnected&&previous.focus({preventScroll:true});onClose?.();}
 async function close(){finish();rememberViewport();changed++;try{await flush();destroy();}catch(e){saveError(e);host.querySelector('.ink-confirm').hidden=false;}}
 function rememberViewport(){book.setViewport({zoom,width:customWidth,left:stage.scrollLeft,top:stage.scrollTop});}
 function afterPageChange(){selection=[];const v=book.page.viewport||{zoom:'width',left:0,top:0};zoom=v.zoom;customWidth=v.width||INK_WIDTH;zoomSelect.value=zoom;redraw();resize();stage.scrollTo(v.left||0,v.top||0);dirty();}

 host.onclick=async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  try{
   if(action==='close'||action==='save-close')return await close();
   if(action==='discard'){if(pending)try{await pending;}catch{}return destroy();}
   if(action==='continue'){host.querySelector('.ink-confirm').hidden=true;return;}
   finish();rememberViewport();notice.textContent='';
   if(action==='page-overview'){const overview=host.querySelector('.ink-page-overview');overview.hidden=!overview.hidden;control(action).setAttribute('aria-expanded',String(!overview.hidden));sync();resize();}
   if(action==='select-page'&&book.select(e.target.closest('[data-page]').dataset.page))afterPageChange();
   if(selection.length&&['shrink-selection','grow-selection','rotate-left','rotate-right'].includes(action)){book.replaceStrokes(transformStrokes(book.page.strokes,selection,{scale:action==='grow-selection'?1.25:action==='shrink-selection'?.8:1,rotation:action==='rotate-left'?-15:action==='rotate-right'?15:0}));redraw();dirty();}
   if(action==='width-selection'&&selection.length){const width=Number(host.querySelector('[aria-label="線の太さ"]').value);book.replaceStrokes(book.page.strokes.map((s,i)=>selection.includes(i)?{...s,width}:s));redraw();dirty();}
   if(action==='delete-selection'&&selection.length){book.replaceStrokes(book.page.strokes.filter((_,i)=>!selection.includes(i)));selection=[];redraw();dirty();}
   if(action==='copy-selection'&&selection.length){const copies=moveStrokes(book.page.strokes,selection,30,30).filter((_,i)=>selection.includes(i)),start=book.page.strokes.length;book.replaceStrokes([...book.page.strokes,...copies]);selection=copies.map((_,i)=>start+i);redraw();dirty();}
   if(action==='color-selection'&&selection.length){const color=host.querySelector('[aria-label="ペンの色"]').value;book.replaceStrokes(book.page.strokes.map((s,i)=>selection.includes(i)?{...s,color}:s));redraw();dirty();}
   if(action==='undo'||action==='redo'){if(book[action]())afterPageChange();}
   if(action==='clear'&&book.clear()){redraw();dirty();notice.textContent='白紙にしました。「取り消す」で戻せます。';}
   if(action==='add-page'||action==='duplicate-page'){book.addPage(action==='duplicate-page');afterPageChange();}
   if(action==='previous-page'||action==='next-page'){const p=book.pages[book.index+(action==='previous-page'?-1:1)];if(p&&book.select(p.id))afterPageChange();}
   if(action==='move-before'||action==='move-after'){if(book.movePage(action==='move-before'?-1:1))afterPageChange();}
   if(action==='delete-page'&&book.removePage()){afterPageChange();notice.textContent='ページを削除しました。「取り消す」で戻せます。';}
   if(action==='tools'){const controls=host.querySelector('.ink-controls');controls.hidden=!controls.hidden;control('tools').textContent=controls.hidden?'道具を表示':'道具を隠す';control('tools').setAttribute('aria-expanded',String(!controls.hidden));resize();}
   if(action==='maximize'){maximized=!maximized;host.classList.toggle('ink-maximized',maximized);control('maximize').textContent=maximized?'元の表示':'最大化';control('maximize').setAttribute('aria-pressed',String(maximized));control('maximize').setAttribute('aria-label',maximized?'手書き画面を元に戻す':'手書き画面を最大化');resize();}
   if(action==='export'){const out=document.createElement('canvas');out.width=INK_WIDTH;out.height=INK_HEIGHT;const context=out.getContext('2d');context.fillStyle='white';context.fillRect(0,0,out.width,out.height);if(!background.hidden){await background.decode();const scale=Math.min(INK_WIDTH/background.naturalWidth,INK_HEIGHT/background.naturalHeight),w=background.naturalWidth*scale,h=background.naturalHeight*scale;context.drawImage(background,(INK_WIDTH-w)/2,(INK_HEIGHT-h)/2,w,h);}paintInk(canvas,book.page);context.drawImage(canvas,0,0);selectionBox(selectionBounds(book.page.strokes,selection));const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw Error('画像を書き出せませんでした');download((title.replace(/[<>:"/\\|?*]/g,'_')||'note')+`-p${book.index+1}.png`,blob,'image/png');}
  }catch(e){saveError(e);}
 };
 host.onchange=e=>{finish();rememberViewport();const label=e.target.getAttribute('aria-label');
  if(label==='下に敷く画像'){book.setBackground(e.target.value);dirty();redraw();}
  if(label==='書く道具'){tool=e.target.value;selection=[];redraw();host.querySelector('.ink-text-entry').hidden=tool!=='text';canvas.classList.toggle('ink-pan',tool==='pan');}
  if(label==='手書きのページ'&&book.select(e.target.value))afterPageChange();
  if(label==='用紙の種類'&&book.setPaper(e.target.value)){redraw();dirty();}
  if(label==='手書きの表示倍率'){zoom=e.target.value;resize();stage.scrollTo(0,0);}
 };
 host.onkeydown=e=>{if(e.target.matches('input,textarea,select')||!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();control(key==='y'||e.shiftKey?'redo':'undo').click();}};
 host.addEventListener('cancel',e=>{e.preventDefault();close();});
 const observer=new ResizeObserver(resize);observer.observe(stage);host.showModal();document.body.classList.add('ink-editor-open');const initial=book.page.viewport;if(initial){zoom=initial.zoom;customWidth=initial.width||INK_WIDTH;zoomSelect.value=zoom;}redraw();resize();if(initial)stage.scrollTo(initial.left||0,initial.top||0);
 return{close,async dispose(){finish();rememberViewport();changed++;try{await flush();destroy();}catch(e){saveError(e);host.querySelector('.ink-confirm').hidden=false;}}};
}
