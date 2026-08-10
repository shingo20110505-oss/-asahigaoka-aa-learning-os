(function(){
'use strict';

const ENGINE_VERSION='6.3.1';
const IMG_DB='chronologia-local-companion-v1';
const IMG_STORE='images';
const PREF_KEY='chronologia-companion-prefs-v2';
const EXPRESSIONS=[
  ['normal','01_normal.png','通常'],['smile','02_smile.png','にっこり'],['stare','03_stare.png','呆れ'],['pressure','04_pressure.png','圧'],
  ['surprise','05_surprise.png','驚き'],['thinking','06_thinking.png','考え中'],['joy','07_joy.png','喜び'],['sleepy','08_sleepy.png','眠そう'],
  ['angry','09_angry.png','怒り'],['serious','10_serious.png','本気'],['goal','11_goal.png','満点・達成'],['rare','12_rare.png','レア']
];
const VOICE_EXPRESSION={
  'wrong_01.mp3':'stare','wrong_02.mp3':'pressure','wrong_03.mp3':'pressure','wrong_04.mp3':'stare','wrong_05.mp3':'angry','wrong_06.mp3':'pressure','wrong_07.mp3':'surprise',
  'hell_01.mp3':'angry','hard_01.mp3':'serious','hard_02.mp3':'serious','hard_03.mp3':'thinking','hard_04.mp3':'serious','retry_01.mp3':'thinking','retry_02.mp3':'serious',
  'success_01.mp3':'joy','careless_01.mp3':'stare','careless_02.mp3':'pressure','review_01.mp3':'stare','review_02.mp3':'serious','idle_01.mp3':'sleepy','timer_01.mp3':'surprise',
  'struggle_01.mp3':'thinking','streak_01.mp3':'smile','streak_02.mp3':'joy','goal_01.mp3':'goal','start_01.mp3':'smile','rare_01.mp3':'rare','return_01.mp3':'surprise','finish_01.mp3':'smile','finish_02.mp3':'smile'
};

let prefs={enabled:true,size:138,opacity:1,motion:1,lip:1,gaze:true,blink:true,physics:true};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch(e){}
const rt={
  urls:new Map(),expr:'normal',timer:null,audio:null,raf:0,phase:0,last:performance.now(),
  gazeX:0,gazeY:0,targetX:0,targetY:0,mouth:0,blink:0,headX:0,headY:0,
  audioCtx:null,analyser:null,audioData:null,mediaNodes:new WeakMap(),realAudioLevel:0,
  expressionSerial:0
};
const savePrefs=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(e){}};

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(IMG_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IMG_STORE))r.result.createObjectStore(IMG_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function importImages(files){
  const db=await openDB();let n=0;
  for(const f of files){
    const low=f.name.toLowerCase();
    const slot=EXPRESSIONS.find(x=>x[1]===low||low.startsWith(x[0]+'_')||low===x[0]+'.png'||low===x[0]+'.jpg'||low===x[0]+'.jpeg'||low===x[0]+'.webp');
    if(!slot)continue;
    await new Promise((res,rej)=>{const tx=db.transaction(IMG_STORE,'readwrite');tx.objectStore(IMG_STORE).put(f,slot[0]);tx.oncomplete=()=>{n++;res()};tx.onerror=()=>rej(tx.error)});
  }
  db.close();await refreshImages();updateCount();if(window.toast)toast(`${n}枚の表情画像を登録しました`);
}
async function refreshImages(){
  for(const u of rt.urls.values())URL.revokeObjectURL(u);rt.urls.clear();
  try{
    const db=await openDB();
    for(const [id] of EXPRESSIONS){await new Promise(res=>{const tx=db.transaction(IMG_STORE,'readonly'),r=tx.objectStore(IMG_STORE).get(id);r.onsuccess=()=>{if(r.result)rt.urls.set(id,URL.createObjectURL(r.result));res()};r.onerror=()=>res()})}
    db.close();
  }catch(e){console.warn('companion image cache',e)}
  renderExpression(true);updateCount();
}
function updateCount(){const e=document.getElementById('companionImageCount');if(e)e.textContent=`画像 ${rt.urls.size}/${EXPRESSIONS.length}`;document.querySelectorAll('.cc-slot').forEach(el=>el.classList.toggle('ok',rt.urls.has(el.dataset.slot)))}

function inject(){
  if(document.getElementById('chronoCompanion'))return;
  const css=document.createElement('style');css.textContent=`
#chronoCompanion{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:calc(10px + env(safe-area-inset-bottom));z-index:75;width:var(--cc-size,138px);height:var(--cc-size,138px);pointer-events:none;opacity:var(--cc-opacity,1);transition:opacity .22s,transform .22s;contain:layout paint style;filter:drop-shadow(0 10px 18px rgba(0,0,0,.22))}
#chronoCompanion.hidden{opacity:0;transform:translateY(18px) scale(.9)}
.cc-stage,.cc-character{position:absolute;inset:0;transform-origin:50% 82%;will-change:transform}.cc-character{overflow:visible}
.cc-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;pointer-events:none;will-change:transform,opacity,filter;transform-origin:50% 55%}
.cc-body{z-index:1;transition:opacity .14s ease}.cc-head{z-index:2;clip-path:inset(2% 7% 24% 7%);transform-origin:50% 48%}.cc-eyes{z-index:3;clip-path:inset(24% 18% 55% 18%);transform-origin:50% 34%}.cc-mouth-layer{z-index:4;clip-path:inset(43% 28% 36% 28%);transform-origin:50% 54%}
.cc-crossfade{position:absolute;inset:0;z-index:5;width:100%;height:100%;object-fit:contain;object-position:center bottom;opacity:0;pointer-events:none;transition:opacity .16s ease}
.cc-speech{position:absolute;right:95%;bottom:64%;z-index:8;width:max-content;max-width:180px;padding:7px 9px;border:1px solid rgba(255,255,255,.22);border-radius:11px;background:rgba(17,24,39,.9);color:#fff;font-size:11px;font-weight:800;line-height:1.35;opacity:0;transform:translateY(4px);transition:.2s;backdrop-filter:blur(8px)}.cc-speech.show{opacity:1;transform:none}
.cc-status{position:absolute;right:0;top:-7px;z-index:9;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:rgba(17,24,39,.78);color:#fff;font-size:9px;line-height:18px;text-align:center;opacity:.75}
#ccPanel{position:fixed;right:10px;bottom:calc(158px + env(safe-area-inset-bottom));z-index:80;width:min(342px,calc(100vw - 20px));padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--card-solid);box-shadow:var(--shadow);display:none;max-height:min(72vh,560px);overflow:auto}#ccPanel.open{display:block}#ccPanel h3{margin:0 0 4px;font-size:.95rem}.cc-sub{color:var(--sub);font-size:.68rem;margin-bottom:8px}.cc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.cc-slot{padding:7px 5px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:.7rem;text-align:center}.cc-slot.ok{border-color:var(--ok);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ok) 35%,transparent)}.cc-row{display:flex;align-items:center;gap:7px;margin-top:8px;flex-wrap:wrap}.cc-row label{font-size:.72rem;color:var(--sub);font-weight:800}.cc-row input[type=range]{width:92px}.cc-mini{font-size:.68rem;color:var(--sub);font-weight:750}
#ccToggle{position:fixed;right:10px;bottom:calc(148px + env(safe-area-inset-bottom));z-index:78;min-width:46px;height:36px;border:1px solid var(--line);border-radius:999px;background:var(--card-solid);color:var(--ink);font-weight:900;box-shadow:var(--shadow-sm)}
@media(max-width:620px){#chronoCompanion{right:5px;bottom:calc(7px + env(safe-area-inset-bottom))}.cc-speech{display:none}#ccPanel{bottom:calc(146px + env(safe-area-inset-bottom))}#ccToggle{bottom:calc(140px + env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:reduce){#chronoCompanion *{transition:none!important}.cc-head,.cc-eyes,.cc-mouth-layer{transform:none!important}}
`;
  document.head.append(css);

  const c=document.createElement('div');c.id='chronoCompanion';c.setAttribute('aria-hidden','true');c.innerHTML=`
    <div class="cc-stage"><div class="cc-character">
      <img class="cc-layer cc-body" alt=""><img class="cc-layer cc-head" alt=""><img class="cc-layer cc-eyes" alt=""><img class="cc-layer cc-mouth-layer" alt=""><img class="cc-crossfade" alt="">
    </div><div class="cc-speech"></div><div class="cc-status">6.3</div></div>`;document.body.append(c);
  const t=document.createElement('button');t.id='ccToggle';t.type='button';t.textContent='相棒';t.setAttribute('aria-label','相棒設定');document.body.append(t);
  const p=document.createElement('div');p.id='ccPanel';p.innerHTML=`
    <h3>相棒・擬似Live2D</h3><div class="cc-sub">顔・目・口・体を仮想分離。音声が再生中は実振幅で口パクし、非対応時は自動フォールバック。</div>
    <div class="cc-grid">${EXPRESSIONS.map(x=>`<button type="button" class="cc-slot" data-slot="${x[0]}">${x[2]}<br><small>${x[1]}</small></button>`).join('')}</div>
    <div class="cc-row"><button class="btn small" id="ccImport">画像登録</button><button class="btn small" id="ccTest">12表情テスト</button><span class="cc-mini" id="companionImageCount">画像 0/12</span><input id="ccFiles" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple hidden></div>
    <div class="cc-row"><label>表示 <input id="ccEnabled" type="checkbox"></label><label>大きさ <input id="ccSize" type="range" min="80" max="220" step="2"></label><label>動き <input id="ccMotion" type="range" min="0" max="1.6" step="0.1"></label></div>
    <div class="cc-row"><label>口パク <input id="ccLip" type="range" min="0" max="1.8" step="0.1"></label><label>瞬き <input id="ccBlink" type="checkbox"></label><label>視線 <input id="ccGaze" type="checkbox"></label><label>物理風 <input id="ccPhysics" type="checkbox"></label></div>
    <div class="cc-mini" style="margin-top:7px">画像は端末内IndexedDBだけに保存し、GitHubへ送信しません。</div>`;document.body.append(p);

  t.onclick=()=>p.classList.toggle('open');
  document.getElementById('ccImport').onclick=()=>document.getElementById('ccFiles').click();
  document.getElementById('ccFiles').onchange=async e=>{await importImages(e.target.files||[]);e.target.value=''};
  document.getElementById('ccTest').onclick=()=>testExpressions();
  document.querySelectorAll('.cc-slot').forEach(b=>b.onclick=()=>setExpression(b.dataset.slot,2600,b.textContent.trim().split('\n')[0]));
  for(const [id,key] of [['ccEnabled','enabled'],['ccBlink','blink'],['ccGaze','gaze'],['ccPhysics','physics']]){const e=document.getElementById(id);e.checked=!!prefs[key];e.onchange=()=>{prefs[key]=e.checked;savePrefs();applyPrefs()}}
  for(const [id,key] of [['ccSize','size'],['ccMotion','motion'],['ccLip','lip']]){const e=document.getElementById(id);e.value=prefs[key];e.oninput=()=>{prefs[key]=Number(e.value);savePrefs();applyPrefs()}}
  applyPrefs();updateCount();
}
function applyPrefs(){const c=document.getElementById('chronoCompanion');if(!c)return;c.style.setProperty('--cc-size',prefs.size+'px');c.style.setProperty('--cc-opacity',prefs.opacity);c.classList.toggle('hidden',!prefs.enabled)}
function bestUrl(id){return rt.urls.get(id)||rt.urls.get('normal')||[...rt.urls.values()][0]||''}
function layerEls(){const c=document.getElementById('chronoCompanion');return c?{body:c.querySelector('.cc-body'),head:c.querySelector('.cc-head'),eyes:c.querySelector('.cc-eyes'),mouth:c.querySelector('.cc-mouth-layer'),fade:c.querySelector('.cc-crossfade')}:{}}
function renderExpression(force=false){
  const u=bestUrl(rt.expr);if(!u)return;const e=layerEls();if(!e.body)return;
  if(!force&&e.body.dataset.url===u)return;
  if(e.body.src){e.fade.src=e.body.src;e.fade.style.opacity='1'}
  [e.body,e.head,e.eyes,e.mouth].forEach(x=>{x.src=u;x.dataset.url=u});
  requestAnimationFrame(()=>{e.fade.style.opacity='0'});updateCount();
}
function setExpression(id,duration=2400,label=''){
  if(!EXPRESSIONS.some(x=>x[0]===id))id='normal';rt.expr=id;rt.expressionSerial++;const serial=rt.expressionSerial;renderExpression();clearTimeout(rt.timer);if(label)say(label,Math.min(duration,1800));
  if(duration>0)rt.timer=setTimeout(()=>{if(serial!==rt.expressionSerial)return;rt.expr='normal';renderExpression()},duration);
}
function say(text,ms=1800){const s=document.querySelector('.cc-speech');if(!s)return;s.textContent=text;s.classList.add('show');setTimeout(()=>s.classList.remove('show'),ms)}
function testExpressions(){const ids=EXPRESSIONS.map(x=>x[0]).filter(x=>rt.urls.has(x));if(!ids.length){say('画像を登録してね',1500);return}let i=0;const next=()=>{if(i>=ids.length)return;setExpression(ids[i++],900);setTimeout(next,600)};next()}

async function ensureAudioAnalysis(audio){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return false;
    if(!rt.audioCtx)rt.audioCtx=new Ctx();if(rt.audioCtx.state==='suspended')await rt.audioCtx.resume().catch(()=>{});
    if(!rt.mediaNodes.has(audio)){
      const src=rt.audioCtx.createMediaElementSource(audio),an=rt.audioCtx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.55;src.connect(an);an.connect(rt.audioCtx.destination);rt.mediaNodes.set(audio,an);
    }
    rt.analyser=rt.mediaNodes.get(audio);rt.audioData=new Uint8Array(rt.analyser.fftSize);return true;
  }catch(e){rt.analyser=null;return false}
}
function readAudioLevel(){
  if(!rt.analyser||!rt.audioData)return null;
  try{rt.analyser.getByteTimeDomainData(rt.audioData);let sum=0;for(const v of rt.audioData){const x=(v-128)/128;sum+=x*x}const rms=Math.sqrt(sum/rt.audioData.length);return Math.min(1,Math.max(0,(rms-.008)*8.8))}catch(e){return null}
}
function observeAudio(){
  const NativeAudio=window.Audio;if(!NativeAudio||NativeAudio.__ccWrapped)return;
  function Wrapped(src){const a=new NativeAudio(src);wireAudio(a,src);return a}
  Wrapped.prototype=NativeAudio.prototype;Object.setPrototypeOf(Wrapped,NativeAudio);Wrapped.__ccWrapped=true;window.Audio=Wrapped;
}
function wireAudio(a,src=''){
  a.addEventListener('play',async()=>{rt.audio=a;await ensureAudioAnalysis(a);let exp=null;for(const [name,id] of Object.entries(VOICE_EXPRESSION)){if(String(src).includes(name)){exp=id;break}}if(exp)setExpression(exp,Math.max(1700,((Number.isFinite(a.duration)?a.duration:2.6)*1000)+300));});
  const stop=()=>{if(rt.audio===a){rt.audio=null;rt.realAudioLevel=0;rt.mouth=0;rt.analyser=null}};a.addEventListener('ended',stop);a.addEventListener('emptied',stop);
}

function animate(now){
  const dt=Math.min(50,now-rt.last);rt.last=now;rt.phase+=dt/1000;const c=document.getElementById('chronoCompanion');
  if(c&&prefs.enabled){
    const stage=c.querySelector('.cc-stage'),e=layerEls(),m=prefs.motion;
    const breath=Math.sin(rt.phase*2.1)*1.25*m,sway=Math.sin(rt.phase*.8)*1.05*m;
    rt.gazeX+=(rt.targetX-rt.gazeX)*.065;rt.gazeY+=(rt.targetY-rt.gazeY)*.065;
    const physics=prefs.physics?1:0;
    stage.style.transform=`translate3d(${sway*.35}px,${breath*.25}px,0) scale(${1+Math.sin(rt.phase*2.1)*.0025*m})`;
    if(e.body)e.body.style.transform=`translate3d(${sway*.18}px,${breath*.62}px,0) scaleY(${1+Math.sin(rt.phase*2.1)*.002*m})`;
    if(e.head)e.head.style.transform=`translate3d(${rt.gazeX*1.8+sway*.55}px,${rt.gazeY*.8+breath*.32}px,0) rotate(${sway*.12*physics}deg)`;

    let blink=0;if(prefs.blink){const cycle=rt.phase%4.65;if(cycle>4.38&&cycle<4.58)blink=1-Math.abs(cycle-4.48)/.10}
    const eyeY=1-Math.min(.82,Math.max(0,blink)*.78);
    if(e.eyes)e.eyes.style.transform=`translate3d(${rt.gazeX*2.5}px,${rt.gazeY*1.2}px,0) scaleY(${eyeY})`;

    let level=null;if(rt.audio&&!rt.audio.paused&&!rt.audio.ended)level=readAudioLevel();
    if(level===null&&rt.audio&&!rt.audio.paused&&!rt.audio.ended)level=(Math.abs(Math.sin(rt.phase*12.9))+Math.abs(Math.sin(rt.phase*8.2))*.35)/1.35*.62;
    if(level===null)level=0;rt.realAudioLevel+=(level-rt.realAudioLevel)*.34;rt.mouth+=(rt.realAudioLevel-rt.mouth)*.42;
    const open=Math.min(1,rt.mouth*prefs.lip);if(e.mouth)e.mouth.style.transform=`translate3d(${rt.gazeX*.8}px,${open*.8}px,0) scaleX(${1+open*.035}) scaleY(${1+open*.36})`;
  }
  rt.raf=requestAnimationFrame(animate);
}
function pointer(e){if(!prefs.gaze)return;const x=(e.clientX/innerWidth-.5)*2,y=(e.clientY/innerHeight-.5)*2;rt.targetX=Math.max(-1,Math.min(1,x));rt.targetY=Math.max(-1,Math.min(1,y))}
function hookLearningEvents(){
  document.addEventListener('click',e=>{const b=e.target.closest?.('.choice,.reveal,.btn');if(!b)return;if(b.classList.contains('wrong'))setExpression('stare',1900);if(b.classList.contains('correct'))setExpression('smile',1600)});
  const mo=new MutationObserver(()=>{const f=document.querySelector('.feedback');if(!f)return;if(f.classList.contains('ok'))setExpression('smile',1600);if(f.classList.contains('bad'))setExpression('stare',1900)});mo.observe(document.querySelector('.quiz-card')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}

async function init(){
  inject();observeAudio();
  document.addEventListener('chronologia:voice',e=>{const name=e.detail?.name||'';setExpression(VOICE_EXPRESSION[name]||'normal',2800)});
  await refreshImages();hookLearningEvents();
  window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('touchmove',e=>{const t=e.touches?.[0];if(t)pointer(t)},{passive:true});
  requestAnimationFrame(animate);
  window.ChronologiaCompanion={version:ENGINE_VERSION,setExpression,importImages,refreshImages,expressions:EXPRESSIONS,prefs};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
