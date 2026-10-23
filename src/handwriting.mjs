import {esc,button,download} from './ui.mjs';
import {INK_WIDTH,INK_HEIGHT,inkHistory,inkPoint,paintStroke,paintInk} from './ink.mjs';
export function handwritingEditor({title,value,onSave,onClose}){
 const history=inkHistory(value),host=document.createElement('dialog'),previous=document.activeElement;host.className='ink-editor';host.setAttribute('aria-label','ノートの手書き');
 host.innerHTML=`<header class="ink-heading"><div><h2>${esc(title)}</h2><p>手書きノート</p></div><div class="actions">${button('最大化','maximize','secondary','aria-pressed="false" aria-label="手書き画面を最大化"')}${button('閉じる','close','secondary')}</div></header><div class="ink-tools" role="toolbar" aria-label="手書きの道具">${button('ペン','pen','secondary','aria-pressed="true"')}${button('消しゴム','eraser','secondary','aria-pressed="false"')}<label>色<select aria-label="ペンの色"><option value="#182d29">黒</option><option value="#2457b2">青</option><option value="#bf3939">赤</option><option value="#186653">緑</option></select></label><label>太さ<select aria-label="線の太さ"><option value="3">細</option><option value="6" selected>普通</option><option value="12">太</option></select></label>${button('↶','undo','secondary','aria-label="手書きを取り消す"')}${button('↷','redo','secondary','aria-label="手書きをやり直す"')}${button('全消去','clear','secondary')}<label><input type="checkbox" data-finger checked>指でも書く</label><label><input type="checkbox" data-grid checked>方眼</label></div><div class="ink-stage"><div class="ink-paper ink-grid"><canvas width="${INK_WIDTH}" height="${INK_HEIGHT}" aria-label="手書きキャンバス。ペン、指、マウスで書けます。"></canvas></div></div><footer class="ink-footer"><div><p data-status role="status">書き込みはこの端末に自動保存します。</p><p data-error role="alert"></p></div>${button('画像を書き出す','export','secondary')}</footer><section class="ink-confirm" hidden><p>まだ保存できていない書き込みがあります。</p><div class="actions">${button('保存して閉じる','save-close','primary')}${button('編集を続ける','continue','secondary')}${button('保存せず閉じる','discard','ghost')}</div></section>`;
 document.body.append(host);const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),paper=host.querySelector('.ink-paper'),stage=host.querySelector('.ink-stage'),status=host.querySelector('[data-status]'),error=host.querySelector('[data-error]');
 let tool='pen',active=null,lastPen=0,changed=0,saved=0,pending=null,timer=null,closed=false,maximized=false;
 const sync=()=>{host.querySelector('[data-action=undo]').disabled=!history.canUndo;host.querySelector('[data-action=redo]').disabled=!history.canRedo;host.querySelector('[data-action=clear]').disabled=!history.strokes.length;};
 const redraw=()=>{paintInk(canvas,{strokes:history.strokes});sync();};
 const resize=()=>{const width=Math.max(1,Math.min(stage.clientWidth-24,(stage.clientHeight-24)*INK_WIDTH/INK_HEIGHT));paper.style.width=width+'px';paper.style.height=width*INK_HEIGHT/INK_WIDTH+'px';};
 async function flush(){
  clearTimeout(timer);if(pending)await pending;
  if(closed||saved===changed)return;
  pending=(async()=>{while(saved!==changed&&!closed){const revision=changed,snapshot=history.snapshot();status.textContent='保存しています…';error.textContent='';await onSave(snapshot);saved=revision;}status.textContent='この端末に保存済み · オフラインでも使えます。';})().finally(()=>{pending=null;});
  return pending;
 }
 const saveError=e=>{status.textContent='未保存';error.textContent=e.message||'保存できませんでした。画面を閉じずに再試行してください。';};
 const dirty=()=>{changed++;status.textContent='保存待ち…';clearTimeout(timer);timer=setTimeout(()=>flush().catch(saveError),400);sync();};
 function finish(e){if(!active||e&&e.pointerId!==active.id)return;history.add(active.stroke);active=null;dirty();}
 canvas.onpointerdown=e=>{if(active||e.button!==0||e.pointerType==='touch'&&(!host.querySelector('[data-finger]').checked||Date.now()-lastPen<1000))return;if(e.pointerType==='pen')lastPen=Date.now();e.preventDefault();const stroke={tool,color:host.querySelector('[aria-label="ペンの色"]').value,width:Number(host.querySelector('[aria-label="線の太さ"]').value)*(tool==='eraser'?4:1),points:[inkPoint(e.clientX,e.clientY,canvas.getBoundingClientRect())]};active={id:e.pointerId,stroke};canvas.setPointerCapture(e.pointerId);paintStroke(ctx,stroke);};
 canvas.onpointermove=e=>{if(active?.id!==e.pointerId)return;e.preventDefault();if(e.pointerType==='pen')lastPen=Date.now();const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e]){const p=inkPoint(sample.clientX,sample.clientY,canvas.getBoundingClientRect()),last=active.stroke.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)<1)continue;active.stroke.points.push(p);paintStroke(ctx,{...active.stroke,points:[last,p]});}};
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=finish;
 const beforeUnload=e=>{if(saved!==changed||active){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
 function destroy(){if(closed)return;closed=true;clearTimeout(timer);observer.disconnect();window.removeEventListener('beforeunload',beforeUnload);host.close();host.remove();if(!document.querySelector('.ink-editor[open]'))document.body.classList.remove('ink-editor-open');previous?.isConnected&&previous.focus({preventScroll:true});onClose?.();}
 async function close(){finish();try{await flush();destroy();}catch(e){saveError(e);host.querySelector('.ink-confirm').hidden=false;}}
 host.onclick=async e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  try{if(action==='close'||action==='save-close')return await close();if(action==='discard'){if(pending)try{await pending;}catch{}return destroy();}if(action==='continue'){host.querySelector('.ink-confirm').hidden=true;return;}
   if(action==='pen'||action==='eraser'){tool=action;for(const a of ['pen','eraser'])host.querySelector('[data-action='+a+']').setAttribute('aria-pressed',String(a===tool));}
   if(action==='undo'||action==='redo'){finish();if(history[action]()){redraw();dirty();}}
   if(action==='clear'&&history.strokes.length){finish();history.clear();redraw();dirty();}
   if(action==='maximize'){maximized=!maximized;host.classList.toggle('ink-maximized',maximized);const b=e.target.closest('button');b.textContent=maximized?'元の表示':'最大化';b.setAttribute('aria-pressed',String(maximized));b.setAttribute('aria-label',maximized?'手書き画面を元に戻す':'手書き画面を最大化');resize();}
   if(action==='export'){finish();const out=document.createElement('canvas');out.width=INK_WIDTH;out.height=INK_HEIGHT;const context=out.getContext('2d');context.fillStyle='white';context.fillRect(0,0,out.width,out.height);context.drawImage(canvas,0,0);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw Error('画像を書き出せませんでした');download((title.replace(/[<>:"/\\|?*]/g,'_')||'note')+'-手書き.png',blob,'image/png');}
  }catch(e){saveError(e);}
 };
 host.querySelector('[data-grid]').onchange=e=>paper.classList.toggle('ink-grid',e.target.checked);
 host.addEventListener('cancel',e=>{e.preventDefault();close();});
 const observer=new ResizeObserver(resize);observer.observe(stage);host.showModal();document.body.classList.add('ink-editor-open');redraw();resize();
 return{close,async dispose(){finish();try{await flush();destroy();}catch(e){saveError(e);host.querySelector('.ink-confirm').hidden=false;}}};
}
