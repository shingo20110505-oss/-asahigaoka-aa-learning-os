(()=>{
'use strict';
if(window.__AA_AVATAR_V7__) return;
window.__AA_AVATAR_V7__=true;

const VERSION='7.0.0-dev1';
const DB_NAME='aa-avatar-v7-model';
const STORE='parts';
const PREF_KEY='aa-avatar-v7-prefs';
const BRAIN_KEY='aa-avatar-v7-brain';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

let spec=null;
let prefs={enabled:true,scale:.82,x:null,y:null,quality:'auto',autoBlink:true,autoGaze:true,physics:true,showDebug:false};
let brain={mood:0,energy:100,focus:50,correctStreak:0,wrongStreak:0,lastActive:Date.now()};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch(e){}
try{brain={...brain,...JSON.parse(localStorage.getItem(BRAIN_KEY)||'{}')}}catch(e){}
const save=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));localStorage.setItem(BRAIN_KEY,JSON.stringify(brain))}catch(e){}};

const P={headX:0,headY:0,headZ:0,eyeX:0,eyeY:0,eyeLOpen:1,eyeROpen:1,browL:0,browR:0,mouthOpen:0,mouthSmile:0,bodyX:0,bodyY:0,breath:0};
const target={...P};
const vel={};Object.keys(P).forEach(k=>vel[k]=0);
const spring={};
let blinkState={next:performance.now()+1800+Math.random()*3200,t:0,active:false};
let gazeState={next:performance.now()+1200+Math.random()*2500,x:0,y:0};
let speakingUntil=0;
let audioLevel=0;
let lastT=performance.now();

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(key,val){const d=await openDB();await new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(val,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close()}
async function get(key){const d=await openDB();const v=await new Promise(res=>{const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)});d.close();return v}
async function keys(){const d=await openDB();const v=await new Promise(res=>{const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAllKeys();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])});d.close();return v}
async function clearStore(){const d=await openDB();await new Promise(res=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=res});d.close()}

class Spring1D{
  constructor(k=10,d=4,m=1){this.k=k;this.d=d;this.m=m;this.x=0;this.v=0}
  step(target,dt){const a=(this.k*(target-this.x)-this.d*this.v)/this.m;this.v+=a*dt;this.x+=this.v*dt;return this.x}
}

class Renderer2D{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});this.images=new Map();this.ready=false}
  resize(){const dpr=Math.min(devicePixelRatio||1,2);const w=innerWidth,h=innerHeight;this.canvas.width=Math.floor(w*dpr);this.canvas.height=Math.floor(h*dpr);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0)}
  async load(){this.images.clear();if(!spec)return;for(const part of spec.parts){const blob=await get(part.file);if(!blob)continue;const bm=await createImageBitmap(blob);this.images.set(part.id,bm)}this.ready=true;updateStatus()}
  draw(t){const c=this.ctx;c.clearRect(0,0,innerWidth,innerHeight);if(!prefs.enabled)return;const S=Math.min(innerWidth,innerHeight)*prefs.scale;const cx=prefs.x??(innerWidth-S*.50-14);const cy=prefs.y??(innerHeight-S*.53-88);const parts=[...spec.parts].sort((a,b)=>a.z-b.z);for(const part of parts){const img=this.images.get(part.id);if(!img)continue;const ph=part.physics||'head';const ps=spring[ph]||{x:0};let dx=0,dy=0,rot=0,sx=1,sy=1;const head=part.head??0.6;dx+=P.headX*18*head+P.bodyX*5;dy+=P.headY*8*head+P.bodyY*4;rot+=P.headZ*.075*head;dx+=ps.x*(ph.includes('hair')||ph==='accessory'?15:ph==='cloth'?7:2);dy+=Math.sin(t*.0018+part.z)*P.breath*(ph==='body'?3:1.2);
      if(part.id==='iris_l'||part.id==='iris_r'||part.id.includes('highlight')){dx+=P.eyeX*6;dy+=P.eyeY*4}
      if(part.id==='lid_l'){sy=.18+.82*P.eyeLOpen}
      if(part.id==='lid_r'){sy=.18+.82*P.eyeROpen}
      if(part.id.startsWith('brow_')){dy-=((part.id.endsWith('_l')?P.browL:P.browR))*4;rot+=(part.id.endsWith('_l')?-1:1)*P.mouthSmile*.025}
      if(['mouth_inside','teeth','tongue','mouth'].includes(part.id)){sy=.30+.95*P.mouthOpen;sx=1+Math.max(0,P.mouthOpen-.4)*.08;dy+=P.mouthOpen*2}
      if(part.id==='body'){sx*=1+P.breath*.008;sy*=1+P.breath*.014}
      c.save();c.translate(cx+S/2+dx,cy+S/2+dy);c.rotate(rot);c.scale(sx,sy);c.drawImage(img,-S/2,-S/2,S,S);c.restore();
    }
    if(prefs.showDebug){c.fillStyle='rgba(15,23,42,.8)';c.fillRect(8,8,170,74);c.fillStyle='#fff';c.font='11px -apple-system';c.fillText(`AA Avatar ${VERSION}`,16,25);c.fillText(`parts ${this.images.size}/${spec.parts.length}`,16,42);c.fillText(`head ${P.headX.toFixed(2)}, ${P.headY.toFixed(2)}`,16,58);c.fillText(`mouth ${P.mouthOpen.toFixed(2)}`,16,74)}
  }
}

let canvas,renderer,ui,drag=null;
function css(){const s=document.createElement('style');s.textContent=`#aa7Canvas{position:fixed;inset:0;z-index:54;pointer-events:none}#aa7Hit{position:fixed;z-index:55;width:150px;height:180px;right:8px;bottom:82px;touch-action:none;background:transparent}#aa7LabBtn{position:fixed;right:10px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:56;border:1px solid rgba(255,255,255,.75);background:rgba(15,23,42,.9);color:#fff;border-radius:999px;padding:7px 10px;font:800 10px -apple-system;box-shadow:0 5px 15px rgba(0,0,0,.2)}#aa7Panel{position:fixed;z-index:99;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));max-width:620px;max-height:78vh;overflow:auto;margin:auto;background:rgba(255,255,255,.98);color:#172033;border:1px solid #d0d5dd;border-radius:20px;padding:15px;box-shadow:0 25px 75px rgba(15,23,42,.3);display:none;-webkit-overflow-scrolling:touch}#aa7Panel.open{display:block}#aa7Panel h3{margin:0 0 4px}.aa7Close{position:absolute;right:10px;top:10px;border:0;background:#eef2f6;border-radius:999px;width:34px;height:34px;font-size:18px}.aa7Tools{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.aa7Tools button{border:1px solid #d0d5dd;background:#fff;border-radius:10px;padding:8px 10px;font-weight:800}.aa7Tools .primary{background:#111827;color:#fff}.aa7Grid{display:grid;grid-template-columns:78px 1fr 46px;gap:7px;align-items:center;margin:6px 0;font-size:11px}.aa7Grid input{width:100%}.aa7Status{font-size:10px;color:#667085;line-height:1.5;margin-top:8px}.aa7Section{border-top:1px solid #e4e7ec;margin-top:10px;padding-top:10px}.aa7Check{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:#475467}@media(prefers-color-scheme:dark){#aa7Panel{background:rgba(20,28,44,.98);color:#f2f4f7;border-color:#344054}.aa7Tools button,.aa7Close{background:#111827;color:#fff;border-color:#475467}.aa7Status,.aa7Check{color:#b9c1d0}}`;document.head.appendChild(s)}

function makeUI(){css();canvas=document.createElement('canvas');canvas.id='aa7Canvas';document.body.appendChild(canvas);renderer=new Renderer2D(canvas);renderer.resize();addEventListener('resize',()=>{renderer.resize();placeHit()},{passive:true});const hit=document.createElement('div');hit.id='aa7Hit';document.body.appendChild(hit);const btn=document.createElement('button');btn.id='aa7LabBtn';btn.textContent='Avatar 7';document.body.appendChild(btn);ui=document.createElement('section');ui.id='aa7Panel';ui.innerHTML=`<button class="aa7Close" aria-label="閉じる">×</button><h3>Companion 7.0 Model Lab</h3><div style="font-size:11px;color:#667085">PC不要。Live2D用の分割PNGをiPhoneから直接登録して調整できます。</div><div class="aa7Tools"><button class="primary" id="aa7Import">パーツPNGを追加</button><button id="aa7Reference">基準画像を表示</button><button id="aa7Clear">モデル消去</button><button id="aa7Debug">DEBUG</button></div><input id="aa7Files" type="file" accept="image/png,image/webp,image/jpeg" multiple hidden><div class="aa7Check"><label><input id="aa7Blink" type="checkbox"> 自動瞬き</label><label><input id="aa7Gaze" type="checkbox"> 自動視線</label><label><input id="aa7Physics" type="checkbox"> Physics</label></div><div class="aa7Section" id="aa7Sliders"></div><div class="aa7Status" id="aa7Status"></div>`;document.body.appendChild(ui);btn.onclick=()=>ui.classList.add('open');ui.querySelector('.aa7Close').onclick=()=>ui.classList.remove('open');document.getElementById('aa7Blink').checked=prefs.autoBlink;document.getElementById('aa7Gaze').checked=prefs.autoGaze;document.getElementById('aa7Physics').checked=prefs.physics;document.getElementById('aa7Blink').onchange=e=>{prefs.autoBlink=e.target.checked;save()};document.getElementById('aa7Gaze').onchange=e=>{prefs.autoGaze=e.target.checked;save()};document.getElementById('aa7Physics').onchange=e=>{prefs.physics=e.target.checked;save()};document.getElementById('aa7Debug').onclick=()=>{prefs.showDebug=!prefs.showDebug;save()};document.getElementById('aa7Clear').onclick=async()=>{if(confirm('7.0の登録モデルを消しますか？')){await clearStore();await renderer.load()}};document.getElementById('aa7Import').onclick=()=>document.getElementById('aa7Files').click();document.getElementById('aa7Files').onchange=async e=>{await importFiles(e.target.files);e.target.value=''};document.getElementById('aa7Reference').onclick=()=>{target.headX=0;target.headY=0;target.headZ=0;target.eyeX=0;target.eyeY=0;target.mouthOpen=0;};makeSliders();hit.addEventListener('pointerdown',down);hit.addEventListener('pointermove',move);hit.addEventListener('pointerup',up);hit.addEventListener('pointercancel',up);placeHit()}
function makeSliders(){const box=document.getElementById('aa7Sliders');const defs=[['headX','顔 左右',-1,1,.01],['headY','顔 上下',-1,1,.01],['headZ','首かしげ',-1,1,.01],['eyeX','視線 左右',-1,1,.01],['eyeY','視線 上下',-1,1,.01],['eyeLOpen','左目',0,1,.01],['eyeROpen','右目',0,1,.01],['mouthOpen','口',0,1,.01],['mouthSmile','笑顔',-1,1,.01],['bodyX','体 左右',-1,1,.01],['breath','呼吸',0,1,.01]];box.innerHTML=defs.map(([k,l,a,b,s])=>`<div class="aa7Grid"><span>${l}</span><input data-k="${k}" type="range" min="${a}" max="${b}" step="${s}" value="${target[k]}"><output>${target[k].toFixed(2)}</output></div>`).join('');box.oninput=e=>{const k=e.target.dataset.k;if(!k)return;target[k]=+e.target.value;e.target.nextElementSibling.textContent=target[k].toFixed(2)}}
async function importFiles(files){if(!spec)return;let n=0;const known=new Map(spec.parts.map(p=>[p.file.toLowerCase(),p.file]));for(const f of [...files]){if(!f.type.startsWith('image/'))continue;let key=known.get(f.name.toLowerCase());if(!key){const current=await keys();const empty=spec.parts.find(p=>!current.includes(p.file));if(!empty)continue;key=empty.file}await put(key,f);n++}await renderer.load();flash(`${n}パーツ登録`)}
function flash(t){const s=document.getElementById('aa7Status');if(s){s.textContent=t+'｜'+s.textContent;setTimeout(updateStatus,1500)}}
async function updateStatus(){const s=document.getElementById('aa7Status');if(!s||!spec)return;const k=await keys();s.textContent=`モデル ${k.length}/${spec.parts.length}パーツ｜Renderer Canvas2D high-precision｜v${VERSION}`}
function placeHit(){const h=document.getElementById('aa7Hit');if(!h)return;const S=Math.min(innerWidth,innerHeight)*prefs.scale;const cx=prefs.x??(innerWidth-S*.50-14),cy=prefs.y??(innerHeight-S*.53-88);h.style.width=S+'px';h.style.height=S+'px';h.style.left=cx+'px';h.style.top=cy+'px';h.style.right='auto';h.style.bottom='auto'}
function down(e){drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:prefs.x,y:prefs.y};const h=document.getElementById('aa7Hit');h.setPointerCapture?.(e.pointerId);if(prefs.x==null||prefs.y==null){const r=h.getBoundingClientRect();drag.x=r.left;drag.y=r.top}}
function move(e){if(!drag||e.pointerId!==drag.id)return;prefs.x=drag.x+e.clientX-drag.sx;prefs.y=drag.y+e.clientY-drag.sy;placeHit()}
function up(e){if(!drag||e.pointerId!==drag.id)return;drag=null;save()}

function stepParam(k,dt,stiff=18,damp=7){const a=(stiff*(target[k]-P[k])-damp*vel[k]);vel[k]+=a*dt;P[k]+=vel[k]*dt}
function autonomous(now){if(prefs.autoBlink){if(!blinkState.active&&now>blinkState.next){blinkState.active=true;blinkState.t=now}if(blinkState.active){const x=(now-blinkState.t)/150;let o=x<1?1-x:x<2?x-1:1;target.eyeLOpen=target.eyeROpen=clamp(o,0,1);if(x>=2){blinkState.active=false;target.eyeLOpen=target.eyeROpen=1;blinkState.next=now+1800+Math.random()*4200}}}
  if(prefs.autoGaze&&now>gazeState.next){gazeState.x=clamp((Math.random()-.5)*1.2,-.7,.7);gazeState.y=clamp((Math.random()-.5)*.7,-.45,.45);target.eyeX=gazeState.x;target.eyeY=gazeState.y;gazeState.next=now+1000+Math.random()*3000}
  target.breath=.5+.5*Math.sin(now*.00155);if(now<speakingUntil)target.mouthOpen=clamp(.18+audioLevel*.9+.18*Math.abs(Math.sin(now*.026)),0,1);else if(!document.querySelector('#aa7Sliders input[data-k="mouthOpen"]:active'))target.mouthOpen*=.88;
}
function physics(dt){if(!spec)return;for(const [name,cfg] of Object.entries(spec.physics||{})){spring[name]??=new Spring1D(cfg.stiffness,cfg.damping,cfg.mass);let goal=0;if(name==='hairLight'||name==='hairHeavy'||name==='accessory'||name==='cloth')goal=-P.headX*(cfg.lag||.2)-P.headZ*.25;else if(name==='body')goal=P.bodyX*.2;spring[name].step(prefs.physics?goal:0,dt)}}
function loop(now){const dt=Math.min(.04,(now-lastT)/1000);lastT=now;autonomous(now);Object.keys(P).forEach(k=>stepParam(k,dt,k.startsWith('eye')?30:k.startsWith('mouth')?26:18,k.startsWith('eye')?10:7));physics(dt);renderer?.draw(now);requestAnimationFrame(loop)}

function setParam(name,v){if(name in target)target[name]=clamp(+v,-1,1)}
function trigger(name,data={}){const map={correct:()=>{brain.correctStreak++;brain.wrongStreak=0;brain.mood=clamp(brain.mood+3,-100,100);target.mouthSmile=.65;target.headY=.12;setTimeout(()=>{target.mouthSmile=0;target.headY=0},1100)},wrong:()=>{brain.wrongStreak++;brain.correctStreak=0;brain.mood=clamp(brain.mood-4,-100,100);target.headZ=-.18;target.mouthSmile=-.28;target.eyeY=-.16;setTimeout(()=>{target.headZ=0;target.mouthSmile=0;target.eyeY=0},1500)},hard:()=>{target.eyeX=0;target.eyeY=.12;target.headY=-.08;setTimeout(()=>{target.headY=0},1700)},idle:()=>{target.eyeLOpen=target.eyeROpen=.45;target.headZ=.12},goal:()=>{target.mouthSmile=1;target.headY=.18;setTimeout(()=>{target.mouthSmile=0;target.headY=0},2200)}};map[name]?.();brain.lastActive=Date.now();save()}
function voiceLevel(level,duration=120){audioLevel=clamp(level,0,1);speakingUntil=Math.max(speakingUntil,performance.now()+duration)}

async function init(){spec=await fetch('./companion7-model-spec.json',{cache:'no-store'}).then(r=>r.json());for(const [name,cfg] of Object.entries(spec.physics||{}))spring[name]=new Spring1D(cfg.stiffness,cfg.damping,cfg.mass);makeUI();await renderer.load();requestAnimationFrame(loop);window.AAAvatar7={version:VERSION,setParam,trigger,voiceLevel,reload:()=>renderer.load(),get params(){return {...P}},get spec(){return spec}};window.dispatchEvent(new CustomEvent('aa-avatar-v7-ready',{detail:{version:VERSION}}))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
