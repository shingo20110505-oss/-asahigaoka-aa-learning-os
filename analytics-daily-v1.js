(()=>{'use strict';
if(window.__AA_DAILY_ANALYTICS_V3__)return;
window.__AA_DAILY_ANALYTICS_V3__=true;
window.__AA_DAILY_ANALYTICS_V2__=true;
window.__AA_DAILY_ANALYTICS_V1__=true;

const MAIN_KEY='asahi_learning_os_v1';
const LEDGER_KEY='aa-daily-analytics-v1';
const STREAK_KEY='aa-companion-study-streak-v1';
const RELEASE_FLOOR_MS=1786806000000; // 2026-08-16 00:00 JST. Only a rollback floor; native clock advances normally after this.
const SUBJECTS={english:'英語',japanese:'国語',math:'数学',science:'理科',social:'社会',mixed:'混合'};
let lastRaw='',lastSessionSig='',lastRenderSig='',showAll=false,renderTimer=0,storageInfo=null,storageInspectBusy=false,autoRecoveryTried=false;

function getNativeDate(){
 try{
  const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='display:none!important';
  (document.documentElement||document.body).appendChild(f);const D=f.contentWindow?.Date;f.remove();if(D&&typeof D.now==='function')return D;
 }catch(_){}
 return Date;
}
const NativeDate=getNativeDate();
function nowMs(){const x=Number(NativeDate.now());return Math.max(Number.isFinite(x)?x:0,RELEASE_FLOOR_MS)}
function plainObj(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function safeJSON(s,f){try{return JSON.parse(s)||f}catch(_){return f}}
function readLocal(k,f){try{return safeJSON(localStorage.getItem(k),f)}catch(_){return f}}
function mainState(){return readLocal(MAIN_KEY,{})}
function ledger(){const x=readLocal(LEDGER_KEY,{});return Object.assign({version:3,sessions:{}},plainObj(x)?x:{})}
function saveLedger(x){try{localStorage.setItem(LEDGER_KEY,JSON.stringify(x))}catch(_){}}
function finite0(v){v=Number(v);return Number.isFinite(v)?Math.max(0,v):0}
function dayKey(t=nowMs()){const d=new NativeDate(Number(t)),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`}
function addDays(k,n){const [y,m,d]=String(k||'').split('-').map(Number),x=new NativeDate(y,m-1,d);if(!Number.isFinite(x.getTime()))return dayKey();x.setDate(x.getDate()+n);return dayKey(x.getTime())}
function fmtMs(ms){ms=finite0(ms);const min=Math.floor(ms/60000),sec=Math.floor((ms%60000)/1000);if(min>=60){const h=Math.floor(min/60),m=min%60;return `${h}時間${m?m+'分':''}`}if(min>0)return `${min}分${sec?String(sec).padStart(2,'0')+'秒':''}`;return `${sec}秒`}
function fmtClock(t){if(!t)return'--';const d=new NativeDate(Number(t));if(!Number.isFinite(d.getTime()))return'--';return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function median(a){const x=(Array.isArray(a)?a:[]).filter(Number.isFinite).sort((p,q)=>p-q);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
function avg(a){const x=(Array.isArray(a)?a:[]).filter(Number.isFinite);return x.length?x.reduce((p,q)=>p+q,0)/x.length:null}
function streak(){const x=readLocal(STREAK_KEY,{});return Object.assign({current:0,best:0,totalStudyDays:0,lastCompleted:''},plainObj(x)?x:{})}

function rebuiltDaysFromAttempts(attempts){
 const out={};for(const a of (Array.isArray(attempts)?attempts:[])){const t=Number(a?.timestamp);if(!Number.isFinite(t))continue;const k=dayKey(t),d=out[k]||(out[k]={attempts:0,correct:0,ms:0});d.attempts++;if(a.correct)d.correct++;d.ms+=finite0(a.responseMs)}return out;
}
function repairDayStats(s){
 if(!plainObj(s))return false;if(!plainObj(s.stats))s.stats={};const original=plainObj(s.stats.days)?s.stats.days:{},rebuilt=rebuiltDaysFromAttempts(s.attempts),fixed={};let changed=!plainObj(s.stats.days);
 for(const [k,v] of Object.entries(original)){if(!plainObj(v)){fixed[k]=rebuilt[k]||{attempts:0,correct:0,ms:0};changed=true;continue}const nv={...v,attempts:finite0(v.attempts),correct:finite0(v.correct),ms:finite0(v.ms)};if(nv.attempts!==v.attempts||nv.correct!==v.correct||nv.ms!==v.ms)changed=true;fixed[k]=nv}
 for(const [k,v] of Object.entries(rebuilt))if(!(k in fixed)){fixed[k]=v;changed=true}if(changed)s.stats.days=fixed;return changed;
}
function repairAnalyticsState(){
 try{if(typeof state!=='undefined'&&plainObj(state)){const changed=repairDayStats(state);if(changed){if(typeof save==='function')save();else localStorage.setItem(MAIN_KEY,JSON.stringify(state))}return changed}}catch(e){console.warn('analytics in-memory repair failed',e)}
 try{const raw=localStorage.getItem(MAIN_KEY);if(!raw)return false;const s=safeJSON(raw,null);if(!plainObj(s))return false;const changed=repairDayStats(s);if(changed)localStorage.setItem(MAIN_KEY,JSON.stringify(s));return changed}catch(e){console.warn('analytics storage repair failed',e);return false}
}
function installBaseAnalyticsGuard(){
 try{if(typeof analyticsHTML!=='function'||analyticsHTML.__aaDailyGuardV3)return;const original=analyticsHTML;const guarded=function(){repairAnalyticsState();try{return original()}catch(e){console.error('Analytics render recovered',e);const attempts=(typeof state!=='undefined'&&Array.isArray(state?.attempts))?state.attempts.length:0,body=`<section class="card"><div class="eyebrow">ANALYTICS RECOVERY</div><h2 class="h2">学習分析</h2><div class="notice"><b>分析表示を安全に復旧しました。</b><br>回答履歴は削除していません。</div><div class="sp12"></div><div class="metricRow"><div class="metric"><b>${attempts}</b><span>保存済み回答</span></div></div></section>`;return typeof layout==='function'?layout(body):body}};guarded.__aaDailyGuardV3=true;guarded.__original=original;analyticsHTML=guarded}catch(e){console.warn('analytics guard install failed',e)}
}
function inferSubject(a){for(const x of (a?.skills||[])){const id=String(x?.id||'');if(id.startsWith('en.'))return'english';if(id.startsWith('ja.'))return'japanese';if(id.startsWith('math.'))return'math';if(id.startsWith('sci.'))return'science';if(id.startsWith('soc.'))return'social'}const id=String(a?.itemId||'');if(/^vocab:|^v:/.test(id))return'english';if(/^kanji:|^k:|^ja:/.test(id))return'japanese';return'mixed'}
function captureSession(s){
 const ss=s?.session;if(!ss?.id||!ss?.startedAt)return;const sig=[ss.id,ss.active,ss.endedAt,ss.accumulatedMs,ss.abandoned,ss.index,ss.clockPaused].join('|');if(sig===lastSessionSig)return;lastSessionSig=sig;if(!ss.endedAt&&!ss.clockPaused)return;
 const l=ledger(),old=l.sessions[ss.id]||{},rec={id:ss.id,startedAt:Number(ss.startedAt)||nowMs(),endedAt:Number(ss.endedAt)||null,ms:finite0(ss.accumulatedMs),mode:ss.mode||'',kind:ss.kind||'',subject:ss.subject||'',completed:!!ss.endedAt&&!ss.abandoned&&!ss.active,abandoned:!!ss.abandoned,updatedAt:nowMs(),streakRecorded:!!old.streakRecorded};
 l.sessions[ss.id]={...old,...rec};const ids=Object.keys(l.sessions);if(ids.length>1200){ids.sort((a,b)=>(l.sessions[a].updatedAt||0)-(l.sessions[b].updatedAt||0));for(const id of ids.slice(0,ids.length-1000))delete l.sessions[id]}
 if(rec.completed&&!rec.streakRecorded&&dayKey(rec.endedAt||nowMs())===dayKey()){try{if(window.Companion7?.recordStudyComplete){window.Companion7.recordStudyComplete();l.sessions[ss.id].streakRecorded=true}}catch(_){}}
 saveLedger(l);
}
function baseDay(k){return{day:k,attempts:0,correct:0,responseMs:0,firstAt:null,lastAt:null,subjects:{},errors:{},sessionIds:new Set(),readingWpm:[],coverage:[],readings:0,exactMs:0,completedSessions:0,abandonedSessions:0,exactIds:new Set(),estimatedMs:0,timeQuality:'なし',studyMs:0}}
function buildDays(s){
 const map={},get=k=>map[k]||(map[k]=baseDay(k)),bySession={};
 for(const a of (Array.isArray(s?.attempts)?s.attempts:[])){const t=Number(a?.timestamp);if(!Number.isFinite(t))continue;const k=dayKey(t),d=get(k);d.attempts++;if(a.correct)d.correct++;d.responseMs+=finite0(a.responseMs);d.firstAt=d.firstAt==null?t:Math.min(d.firstAt,t);d.lastAt=d.lastAt==null?t:Math.max(d.lastAt,t+finite0(a.responseMs));const sub=inferSubject(a);d.subjects[sub]=(d.subjects[sub]||0)+1;if(!a.correct){const e=String(a.errorType||'未分類');d.errors[e]=(d.errors[e]||0)+1}if(a.sessionId){d.sessionIds.add(a.sessionId);const id=`${k}|${a.sessionId}`,g=bySession[id]||(bySession[id]={day:k,id:a.sessionId,min:t,max:t,sum:0});g.min=Math.min(g.min,t);g.max=Math.max(g.max,t+finite0(a.responseMs));g.sum+=finite0(a.responseMs)}}
 for(const x of (Array.isArray(s?.stats?.readingPace)?s.stats.readingPace:[])){const t=Number(x?.at);if(!Number.isFinite(t))continue;const d=get(dayKey(t));if(Number.isFinite(Number(x.wpm)))d.readingWpm.push(Number(x.wpm));d.readings++}
 for(const x of (Array.isArray(s?.stats?.lexicalSessions)?s.stats.lexicalSessions:[])){const t=Number(x?.at);if(!Number.isFinite(t))continue;const d=get(dayKey(t));if(Number.isFinite(Number(x.coverage)))d.coverage.push(Number(x.coverage))}
 const l=ledger();for(const rec of Object.values(plainObj(l.sessions)?l.sessions:{})){if(!plainObj(rec))continue;const t=Number(rec.endedAt||rec.startedAt);if(!Number.isFinite(t)||!t)continue;const d=get(dayKey(t));d.exactMs+=finite0(rec.ms);if(rec.id)d.exactIds.add(rec.id);if(rec.id)d.sessionIds.add(rec.id);if(rec.completed)d.completedSessions++;if(rec.abandoned)d.abandonedSessions++;const st=Number(rec.startedAt)||t,en=Number(rec.endedAt)||t;d.firstAt=d.firstAt==null?st:Math.min(d.firstAt,st);d.lastAt=d.lastAt==null?en:Math.max(d.lastAt,en)}
 for(const g of Object.values(bySession)){const d=get(g.day);if(d.exactIds.has(g.id))continue;d.estimatedMs+=Math.max(g.sum,g.max-g.min)}
 const live=s?.session;if(live?.active&&live.startedAt){const d=get(dayKey(Number(live.startedAt)));let ms=finite0(live.accumulatedMs);if(!live.clockPaused&&live.lastActiveAt)ms+=Math.max(0,nowMs()-Number(live.lastActiveAt));if(!d.exactIds.has(live.id))d.estimatedMs+=ms;if(live.id)d.sessionIds.add(live.id)}
 for(const d of Object.values(map)){if(d.exactMs>0){d.studyMs=d.exactMs+d.estimatedMs;d.timeQuality=d.estimatedMs>0?'実測＋推定':'実測'}else if(d.estimatedMs>0){d.studyMs=d.estimatedMs;d.timeQuality='推定'}else{d.studyMs=d.responseMs;d.timeQuality=d.responseMs>0?'回答時間':'なし'}}return map;
}
function subjectHTML(d){const arr=Object.entries(d.subjects||{}).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);return arr.length?arr.map(([k,n])=>`<span class="aaDayChip">${SUBJECTS[k]||esc(k)} ${n}</span>`).join(''):'<span class="aaDayMuted">記録なし</span>'}
function topError(d){const a=Object.entries(d.errors||{}).sort((x,y)=>y[1]-x[1]);if(!a.length)return'なし';const [k,n]=a[0];return `${String(k).replaceAll('_',' ')}（${n}回）`}
function dayCard(d,today){const active=d.attempts>0||d.studyMs>0||d.readings>0,acc=d.attempts?Math.round(d.correct/d.attempts*100):null,wpm=median(d.readingWpm),cov=avg(d.coverage),date=d.day.slice(5).replace('-','/'),exact=d.timeQuality==='実測'||d.timeQuality==='実測＋推定';return `<details class="aaDay ${active?'hasStudy':'noStudy'}" data-aa-day="${d.day}" ${d.day===today?'open':''}><summary><span><b>${date}</b>${d.day===today?' <em>今日</em>':''}</span><span>${active?`${fmtMs(d.studyMs)} ・ ${d.attempts}問${acc!=null?' ・ '+acc+'%':''}`:'学習なし'}</span></summary>${active?`<div class="aaDayBody"><div class="aaDayMetrics"><div><b>${fmtMs(d.studyMs)}</b><span>学習時間${exact?'':' ('+d.timeQuality+')'}</span></div><div><b>${d.attempts}</b><span>回答</span></div><div><b>${d.correct}/${d.attempts}</b><span>正解</span></div><div><b>${d.sessionIds.size}</b><span>セッション</span></div></div><div class="aaDayLine"><b>教科</b><div>${subjectHTML(d)}</div></div><div class="aaDayLine"><b>時間帯</b><span>${fmtClock(d.firstAt)}〜${fmtClock(d.lastAt)}</span></div><div class="aaDayLine"><b>長文</b><span>${d.readings?`${d.readings}本${wpm!=null?'・WPM中央値 '+Math.round(wpm):''}`:'なし'}</span></div><div class="aaDayLine"><b>語彙既知率</b><span>${cov!=null?(cov*100).toFixed(1)+'%':'--'}</span></div><div class="aaDayLine"><b>主な誤答</b><span>${esc(topError(d))}</span></div><div class="aaDayLine"><b>完了 / 中断</b><span>${d.completedSessions} / ${d.abandonedSessions}</span></div></div>`:''}</details>`}
function css(){if(document.getElementById('aa-daily-analytics-css'))return;const s=document.createElement('style');s.id='aa-daily-analytics-css';s.textContent=`#aaDailyAnalyticsCard .aaSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}#aaDailyAnalyticsCard .aaSummary>div{padding:11px;border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--card) 90%,var(--blue2))}#aaDailyAnalyticsCard .aaSummary b{display:block;font-size:18px}#aaDailyAnalyticsCard .aaSummary span{font-size:10px;color:var(--sub)}#aaDailyAnalyticsCard .aaHeat{display:grid;grid-template-columns:repeat(15,1fr);gap:4px;margin:10px 0 14px}.aaHeat i{aspect-ratio:1;border-radius:4px;background:color-mix(in srgb,var(--line) 72%,transparent);border:1px solid var(--line)}.aaHeat i.on{background:color-mix(in srgb,var(--green) 58%,var(--card));border-color:color-mix(in srgb,var(--green) 55%,var(--line))}.aaDay{border-top:1px solid var(--line)}.aaDay:first-of-type{border-top:0}.aaDay summary{list-style:none;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 2px;cursor:pointer;font-size:12px}.aaDay summary::-webkit-details-marker{display:none}.aaDay summary em{font-style:normal;font-size:9px;padding:3px 6px;border-radius:999px;background:var(--blue2);color:var(--blue)}.aaDay.noStudy summary{color:var(--muted)}.aaDayBody{padding:0 0 13px}.aaDayMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.aaDayMetrics>div{padding:8px;border-radius:10px;background:var(--bg2);border:1px solid var(--line)}.aaDayMetrics b{display:block;font-size:13px}.aaDayMetrics span{font-size:9px;color:var(--sub)}.aaDayLine{display:grid;grid-template-columns:82px 1fr;gap:8px;padding-top:8px;font-size:11px}.aaDayLine>b{color:var(--sub)}.aaDayChip{display:inline-block;padding:3px 6px;margin:0 3px 3px 0;border-radius:999px;background:var(--blue2);color:var(--blue);font-size:10px;font-weight:800}.aaDayMuted{color:var(--muted)}@media(max-width:520px){#aaDailyAnalyticsCard .aaSummary{grid-template-columns:repeat(2,1fr)}#aaDailyAnalyticsCard .aaHeat{grid-template-columns:repeat(10,1fr)}.aaDayMetrics{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s)}
function analyticsMain(){const h=[...document.querySelectorAll('h2')].find(x=>(x.textContent||'').includes('学習分析'));return h?.closest('main')||null}
function recoveryNotice(s,l){
 const current=Array.isArray(s?.attempts)?s.attempts.length:0,sessions=Object.keys(l.sessions||{}).length,best=storageInfo?.bestAttempts??null,candidates=storageInfo?.candidates??null;
 if(best!=null&&best>current)return `<div class="notice"><b>端末内に復旧候補があります：</b> 現在 ${current}問 / 最多バックアップ ${best}問。自動復旧を再試行しています。</div><div class="sp12"></div>`;
 if(current===0&&sessions>0)return `<div class="notice"><b>学習時間は残っていますが、回答履歴が0問です。</b><br>端末内バックアップ候補 ${candidates==null?'確認中':candidates+'件'}${best!=null?'（最多 '+best+'問）':''}。時間記録と回答履歴は別保存のため、回答履歴の残存状況を確認しています。</div><div class="sp12"></div>`;
 return '';
}
function renderDaily(){
 const main=analyticsMain();if(!main){document.getElementById('aaDailyAnalyticsCard')?.remove();lastRenderSig='';return}
 css();const s=mainState(),l=ledger(),days=buildDays(s),today=dayKey(),keys=[];for(let i=0;i<30;i++)keys.push(addDays(today,-i));const active30=keys.filter(k=>{const d=days[k];return d&&(d.attempts>0||d.studyMs>0)}).length,last7=keys.slice(0,7).map(k=>days[k]||baseDay(k)),ms7=last7.reduce((a,d)=>a+(d.studyMs||0),0),att7=last7.reduce((a,d)=>a+d.attempts,0),cor7=last7.reduce((a,d)=>a+d.correct,0),st=streak(),visible=showAll?keys:keys.slice(0,14);
 for(const sec of [...main.querySelectorAll('section.card')])if(sec.id!=='aaDailyAnalyticsCard'&&sec.querySelector('h3')?.textContent?.includes('直近学習日'))sec.style.display='none';
 let card=document.getElementById('aaDailyAnalyticsCard');if(!card){card=document.createElement('section');card.className='card';card.id='aaDailyAnalyticsCard';const firstLegacy=[...main.querySelectorAll('section.card')].find(x=>x.querySelector('h3')?.textContent?.includes('直近学習日'));if(firstLegacy)firstLegacy.insertAdjacentElement('beforebegin',card);else main.appendChild(card)}
 const html=`<div class="eyebrow">DAILY RECORD</div><h3 class="h3">日々の学習記録</h3><div class="tiny" data-aa-analytics-date="${today}">基準日 ${today.slice(5).replace('-','/')}（端末のネイティブ時計で計算）</div><div class="sp8"></div>${recoveryNotice(s,l)}<div class="aaSummary"><div><b>${finite0(st.current)}日</b><span>現在の連続学習</span></div><div><b>${active30}/30</b><span>直近30日の学習日</span></div><div><b>${fmtMs(ms7)}</b><span>直近7日学習時間</span></div><div><b>${att7?Math.round(cor7/att7*100)+'%':'--'}</b><span>直近7日正答率</span></div></div><div class="tiny">30日継続マップ</div><div class="aaHeat">${[...keys].reverse().map(k=>{const d=days[k],on=d&&(d.attempts>0||d.studyMs>0);return `<i class="${on?'on':''}" title="${k}"></i>`}).join('')}</div>${visible.map(k=>dayCard(days[k]||baseDay(k),today)).join('')}<div class="actions" style="margin-top:10px"><button class="btn ghost sm" type="button" data-aa-day-more>${showAll?'14日表示に戻す':'30日分を見る'}</button></div><div class="tiny" style="margin-top:10px">日付は別フレームのネイティブ Date で計算し、アプリ内の日時処理に影響されないよう保護しています。回答履歴・習熟度・復習進捗は削除しません。</div>`;
 const sig=[showAll,localStorage.getItem(LEDGER_KEY)||'',localStorage.getItem(STREAK_KEY)||'',lastRaw,today,storageInfo?.sig||''].join('|');if(sig!==lastRenderSig){lastRenderSig=sig;card.innerHTML=html;card.dataset.aaAnalyticsV3='PASS';card.dataset.aaToday=today}
}
function scheduleRender(delay=0){clearTimeout(renderTimer);renderTimer=setTimeout(renderDaily,delay)}
async function inspectStorage(){
 if(storageInspectBusy)return;storageInspectBusy=true;
 try{const api=window.AAStorageRecoveryV2;if(!api?.inspect)return;const rows=await api.inspect(),best=Math.max(0,...rows.map(x=>finite0(x.attempts)));storageInfo={candidates:rows.length,bestAttempts:best,sig:`${rows.length}:${best}`};const cur=Array.isArray(mainState()?.attempts)?mainState().attempts.length:0;if(best>cur&&!autoRecoveryTried&&api.recover){autoRecoveryTried=true;await api.recover();lastRaw='';sync()}}
 catch(e){storageInfo={candidates:0,bestAttempts:0,sig:'err'};console.warn('storage inspect failed',e)}finally{storageInspectBusy=false;lastRenderSig='';scheduleRender(0)}
}
function sync(){let raw='';try{raw=localStorage.getItem(MAIN_KEY)||''}catch(_){}if(raw!==lastRaw){lastRaw=raw;const s=safeJSON(raw,{});repairDayStats(s);captureSession(s);lastRenderSig='';scheduleRender(0)}}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-aa-day-more]')){showAll=!showAll;lastRenderSig='';scheduleRender(0);return}setTimeout(sync,0)});
document.addEventListener('companion7:study-streak',()=>{lastRenderSig='';scheduleRender(0)});
document.addEventListener('aa:storage-recovered',()=>{lastRaw='';storageInfo=null;autoRecoveryTried=false;setTimeout(()=>{sync();inspectStorage()},80)});
function start(){css();const repaired=repairAnalyticsState();installBaseAnalyticsGuard();sync();renderDaily();setTimeout(inspectStorage,250);setTimeout(inspectStorage,1800);if(repaired&&typeof state!=='undefined'&&state?.route==='analytics'&&typeof render==='function')setTimeout(()=>{try{render()}catch(e){console.warn('analytics recovery rerender failed',e)}},0);setInterval(sync,600);setInterval(()=>scheduleRender(0),2500);setInterval(inspectStorage,15000)}
window.AADailyAnalyticsV3={version:'3.0.0',dayKey,nowMs,inspect:()=>({today:dayKey(),nativeNow:NativeDate.now(),windowNow:Date.now(),storageInfo})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();