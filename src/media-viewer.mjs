import {esc,button} from './ui.mjs';
import {mediaKind} from './chat-media.mjs';
export function swipeDirection(start,end){if(!start||!end||start.multi||end.multi)return 0;const dx=end.x-start.x,dy=end.y-start.y;return Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;}
export function previewGesture(start,end,rect){if(!start||!end||start.multi||end.multi)return null;const swipe=swipeDirection(start,end);if(swipe)return swipe>0?'next':'prev';if(Math.hypot(end.x-start.x,end.y-start.y)>10||(end.at||0)-(start.at||0)>450)return null;const fraction=(end.x-rect.left)/rect.width;return fraction<.3?'prev':fraction>.7?'next':'toggle';}
// One full-size blob at a time, regardless of the size of a workbook.
export function mediaViewer({items,index=0,load,title='プレビュー',onAction,actions=[],onAsk,startFullscreen=false}){
 const host=document.createElement('dialog'),previous=document.activeElement;host.className='media-viewer';host.setAttribute('aria-label',title);document.body.append(host);
 let at=Math.max(0,Math.min(index,items.length-1)),ticket=0,url=null,closed=false,start=null,zoom=false,ignoredCloses=0,modal=false,fullscreen=false,nativeOwned=false,fullscreenPending=false;
 host.innerHTML=`<header class="viewer-heading"><div><strong>${esc(title)}</strong><p class="small" data-name></p></div>${button('閉じる','close','secondary','aria-label="プレビューを閉じる"')}</header><div class="viewer-stage" aria-busy="true"></div><footer><div class="viewer-pager">${button('←','prev','secondary','aria-label="前の画像・動画"')}<span data-count role="status" aria-live="polite"></span>${button('→','next','secondary','aria-label="次の画像・動画"')}</div><div class="actions">${button('拡大','zoom','secondary')}${button('ダウンロード','download','secondary')}${onAsk?button('AIに質問','ask-ai','primary'):''}${actions.map(a=>button(esc(a.label),a.id,a.className||'secondary')).join('')}</div><p class="small">左右にスワイプでページ移動。拡大中はスクロールして確認できます。</p><p data-error role="alert"></p></footer>`;
 const stage=host.querySelector('.viewer-stage');
 const fullButton=document.createElement('button');fullButton.type='button';fullButton.className='button secondary';fullButton.dataset.action='fullscreen';fullButton.textContent='全画面';fullButton.setAttribute('aria-pressed','false');
 const headerActions=document.createElement('div');headerActions.className='viewer-window-actions';headerActions.append(fullButton,host.querySelector('[data-action=close]'));host.querySelector('.viewer-heading').append(headerActions);
 const exitFull=document.createElement('button');exitFull.type='button';exitFull.className='button secondary viewer-exit-fullscreen';exitFull.dataset.action='exit-fullscreen';exitFull.textContent='全画面を終了';exitFull.hidden=true;host.append(exitFull);
 const fullStatus=document.createElement('p');fullStatus.className='viewer-fullscreen-status';fullStatus.setAttribute('role','status');fullStatus.hidden=true;host.append(fullStatus);
 let statusTimer;const nativeElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const fullscreenEvents=['fullscreenchange','webkitfullscreenchange'];
 function viewportFallback(){if(closed||!fullscreen)return;host.dataset.fullscreenMode='viewport';if(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone)return;fullStatus.textContent='ブラウザの全画面に切り替えられないため、資料を表示領域いっぱいに広げています。';fullStatus.hidden=false;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{fullStatus.hidden=true;},6000);}
 function sizeViewport(){if(!fullscreen)return;const v=window.visualViewport;if(v&&v.scale<=1.05){host.style.setProperty('--viewer-height',v.height+'px');host.style.setProperty('--viewer-width',v.width+'px');host.style.setProperty('--viewer-top',v.offsetTop+'px');host.style.setProperty('--viewer-left',v.offsetLeft+'px');}else for(const p of ['height','width','top','left'])host.style.removeProperty('--viewer-'+p);}
 async function leaveNative(){if(!nativeOwned)return;nativeOwned=false;if(nativeElement()===document.documentElement)try{await (document.fullscreenElement?document.exitFullscreen:document.webkitExitFullscreen)?.call(document);}catch{/* The viewport-sized preview remains usable. */}}
 function requestNative(){
  const root=document.documentElement;
  if(root.requestFullscreen)return root.requestFullscreen({navigationUI:'hide'});
  // Older iPad/macOS Safari uses events and may return void rather than a Promise.
  if(!root.webkitRequestFullscreen)return null;
  return new Promise((resolve,reject)=>{
   const done=error=>{clearTimeout(timer);document.removeEventListener('webkitfullscreenchange',changed);document.removeEventListener('webkitfullscreenerror',failed);error?reject(error):resolve();};
   const changed=()=>{if(nativeElement()===root)done();},failed=()=>done(Error('Fullscreen unavailable'));
   const timer=setTimeout(()=>nativeElement()===root?done():failed(),4000);
   document.addEventListener('webkitfullscreenchange',changed);document.addEventListener('webkitfullscreenerror',failed);
   try{const result=root.webkitRequestFullscreen();if(result?.then)result.then(changed,done);}catch(error){done(error);}
  });
 }
 async function setFullscreen(value){
  if(closed)return;fullscreen=value;clearTimeout(statusTimer);fullStatus.hidden=true;host.classList.toggle('viewer-fullscreen',value);host.classList.toggle('viewer-controls-hidden',value);exitFull.hidden=!value;fullButton.textContent=value?'全画面を終了':'全画面';fullButton.setAttribute('aria-pressed',String(value));delete host.dataset.fullscreenMode;layout();sizeViewport();(value?exitFull:fullButton).focus({preventScroll:true});
  if(!value){await leaveNative();return;}
  // A dialog cannot itself use requestFullscreen. Keep its top-layer semantics
  // and expand the document; CSS supplies the same viewer on iOS or denial.
  if(nativeElement()||fullscreenPending)return;
  fullscreenPending=true;nativeOwned=true;
  try{const request=requestNative();if(!request){nativeOwned=false;viewportFallback();return;}await request;nativeOwned=true;if(closed||!fullscreen)await leaveNative();else{host.dataset.fullscreenMode='native';sizeViewport();}}
  catch{nativeOwned=false;viewportFallback();}
  finally{fullscreenPending=false;}
 }
 function fullscreenChanged(){if(nativeOwned&&!nativeElement()){nativeOwned=false;if(fullscreen&&!closed)setFullscreen(false);}else sizeViewport();}
 for(const event of fullscreenEvents)document.addEventListener(event,fullscreenChanged);
 window.visualViewport?.addEventListener('resize',sizeViewport);window.visualViewport?.addEventListener('scroll',sizeViewport);
 const ai=host.querySelector('[data-action=ask-ai]');if(ai){ai.classList.add('viewer-ai');ai.textContent='AI';ai.setAttribute('aria-label','この資料をAIに添付');host.append(ai);}
 const hint=host.querySelector('footer>.small');if(hint)hint.textContent='左右の端をタップで前後へ。中央で操作ボタンを隠せます。';
 function release(){stage.querySelector('video')?.pause();if(url)URL.revokeObjectURL(url);url=null;}
 function close(){if(closed)return;closed=true;ticket++;clearTimeout(statusTimer);for(const event of fullscreenEvents)document.removeEventListener(event,fullscreenChanged);window.visualViewport?.removeEventListener('resize',sizeViewport);window.visualViewport?.removeEventListener('scroll',sizeViewport);leaveNative();window.removeEventListener('rise:side-chat-layout',layout);window.removeEventListener('resize',layout);release();host.close();host.remove();if(!document.querySelector(".media-viewer[open]"))document.body.classList.remove("media-viewer-open");previous?.isConnected&&previous.focus({preventScroll:true});}
 async function show(){const seq=++ticket;release();zoom=false;stage.classList.remove('zoomed');stage.innerHTML='<p role="status">読み込んでいます…</p>';stage.setAttribute('aria-busy','true');host.querySelector('[data-error]').textContent='';const item=items[at];host.dataset.fileId=item?.id||'';host.querySelector('[data-name]').textContent=item?.name||'';host.querySelector('[data-count]').textContent=`${at+1} / ${items.length}`;host.querySelector('[data-action=prev]').disabled=at===0;host.querySelector('[data-action=next]').disabled=at===items.length-1;host.querySelector('[data-action=zoom]').textContent='拡大';host.querySelector('[data-action=zoom]').disabled=mediaKind(item)!=='image';host.querySelector('[data-action=download]').disabled=true;
  try{const blob=await load(item);if(closed||seq!==ticket)return;if(!(blob instanceof Blob))throw Error('ファイルが見つかりません。');url=URL.createObjectURL(blob);const kind=mediaKind(item);stage.innerHTML=kind==='image'?`<img src="${esc(url)}" alt="${esc(item.name)}" draggable="false">`:kind==='video'?`<video src="${esc(url)}" controls playsinline preload="metadata" aria-label="${esc(item.name)}"></video>`:'<p>このファイルはダウンロードして確認できます。</p>';const media=stage.querySelector('img,video');media?.addEventListener('error',()=>{host.querySelector('[data-error]').textContent='この形式はブラウザで表示できません。ダウンロードして確認してください。';},{once:true});host.querySelector('[data-action=download]').disabled=false;}catch(e){if(!closed&&seq===ticket)stage.textContent=e.message;}finally{if(!closed&&seq===ticket)stage.setAttribute('aria-busy','false');}}
 const move=delta=>{const next=Math.max(0,Math.min(items.length-1,at+delta));if(next!==at){at=next;show();}};
 host.onclick=async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='close')close();else if(a==='fullscreen')await setFullscreen(!fullscreen);else if(a==='exit-fullscreen')await setFullscreen(false);else if(a==='prev')move(-1);else if(a==='next')move(1);else if(a==='zoom'){zoom=!zoom;stage.classList.toggle('zoomed',zoom);b.textContent=zoom?'全体表示':'拡大';}else if(a==='download'&&url){const link=document.createElement('a');link.href=url;link.download=items[at].name;link.click();}else if(a==='ask-ai'&&onAsk){b.disabled=true;try{await setFullscreen(false);await onAsk(items[at]);}catch(error){host.querySelector('[data-error]').textContent=error.message;}finally{b.disabled=false;}}else if(onAction){const item=items[at];close();await onAction(a,item);}};
 const pointers=new Set();
 stage.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);start=pointers.size===1&&!zoom&&!e.target.closest('video,iframe,a')?{x:e.clientX,y:e.clientY,at:Date.now()}:null;});
 stage.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(!zoom&&(globalThis.visualViewport?.scale||1)<=1.05){const action=previewGesture(start,{x:e.clientX,y:e.clientY,at:Date.now()},stage.getBoundingClientRect());if(action==='next')move(1);if(action==='prev')move(-1);if(action==='toggle')host.classList.toggle('viewer-controls-hidden');}start=null;});
 stage.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);start=null;});
 host.addEventListener('keydown',e=>{if(e.target.closest('video,input,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
 host.addEventListener('cancel',e=>{e.preventDefault();if(fullscreen)setFullscreen(false);else close();});host.addEventListener('close',()=>{if(ignoredCloses){ignoredCloses--;return;}close();});function layout(){if(closed)return;const sideOpen=document.body.classList.contains('side-chat-open'),nextModal=fullscreen||!sideOpen;host.classList.toggle('viewer-with-chat',!fullscreen&&sideOpen&&innerWidth>=900);if(host.open&&nextModal!==modal){ignoredCloses++;host.close();}if(!host.open){modal=nextModal;if(modal)host.showModal();else host.show();}}window.addEventListener('rise:side-chat-layout',layout);window.addEventListener('resize',layout);layout();document.body.classList.add("media-viewer-open");show();if(startFullscreen)setFullscreen(true);return {close};
}
