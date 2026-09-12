(()=>{'use strict';
if(window.__RISE_RESUME_V1__)return;
window.__RISE_RESUME_V1__={version:'1.0.1'};
const app=document.getElementById('app');
if(!app)return;
const SUBJECTS={english:'英語',japanese:'国語',math:'数学',science:'理科',social:'社会',mixed:'5教科'};
const KIND_LABELS={reading:'英語長文',vocab:'英単語',kanji:'国語',mixed:'5教科ミックス',subject:'教科演習',vocabDiagnostic:'語彙診断',wrongReview:'間違い直し',review:'間違い直し'};
let raf=0;
function getState(){try{return window.AA_APP?.get?.('state')?.get?.()||null}catch(_){return null}}
function activeSession(state){const s=state?.session;return !!(s?.active&&Array.isArray(s.queue)&&s.queue.length&&Number.isFinite(s.index)&&s.index>=0&&s.index<s.queue.length)}
function labelFor(s){if(!s)return '前回の学習';if(KIND_LABELS[s.kind])return KIND_LABELS[s.kind];return SUBJECTS[s.subject]||'前回の学習'}
function progressFor(s){const total=Math.max(1,s.queue.length),current=Math.min(total,Math.max(1,Number(s.index||0)+1)),item=s.queue[s.index];if(item?.type==='readingSet'&&Array.isArray(item.questions)&&item.questions.length){const q=Math.min(item.questions.length,Math.max(1,Number(s.subIndex||0)+1));return `${current}/${total}セット・設問 ${q}/${item.questions.length}`}return `${current}/${total}問目`}
function elapsedFor(s){const ms=Math.max(0,Number(s.accumulatedMs||0));const min=Math.floor(ms/60000);if(!min)return '';if(min<60)return `${min}分学習済み`;const h=Math.floor(min/60),m=min%60;return `${h}時間${m?`${m}分`:''}学習済み`}
function ensureStyle(){if(document.getElementById('riseResumeV1Style'))return;const style=document.createElement('style');style.id='riseResumeV1Style';style.textContent=`
.rv4ResumeCard{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid color-mix(in srgb,#8c7cff 34%,transparent);background:linear-gradient(120deg,color-mix(in srgb,#7d8dff 12%,var(--card,#fff)),color-mix(in srgb,#ef9bd2 10%,var(--card,#fff)));box-shadow:0 12px 32px rgba(59,68,130,.10)}
.rv4ResumeCopy{min-width:0}.rv4ResumeBadge{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border-radius:999px;background:rgba(104,92,220,.10);color:#5b55b6;font-size:11px;font-weight:800;letter-spacing:.08em}.rv4ResumeCopy h3{margin:7px 0 3px;font-size:18px;line-height:1.35}.rv4ResumeCopy p{margin:0;color:var(--muted,#667085);font-size:13px;line-height:1.55}.rv4ResumeBtn{flex:0 0 auto;min-width:148px;min-height:46px}.riseSubjectsV4>.rv4ResumeCard{margin-bottom:16px}
@media(max-width:680px){.rv4ResumeCard{align-items:stretch;flex-direction:column;padding:16px}.rv4ResumeBtn{width:100%;min-width:0}.rv4ResumeCopy h3{font-size:17px}}
`;document.head.appendChild(style)}
function cardHTML(s){const elapsed=elapsedFor(s),details=[labelFor(s),progressFor(s),elapsed].filter(Boolean).join(' · ');return `<article class="rv4ResumeCard rv4Card" data-rise-resume="1" aria-label="保存した学習の続き"><div class="rv4ResumeCopy"><span class="rv4ResumeBadge">保存済み</span><h3>前回の学習の続き</h3><p>${details}</p></div><button type="button" class="btn primary rv4ResumeBtn" data-rise-resume-action="resume">続きからやる</button></article>`}
function removeCards(){for(const el of app.querySelectorAll('[data-rise-resume="1"]'))el.remove()}
function resumeSession(){const state=getState();if(!activeSession(state)){schedule();return false}const shell=window.AA_APP?.get?.('appShell');if(typeof shell?.navigate!=='function')return false;const root=document.documentElement;root.dataset.riseRoute='study';const ok=shell.navigate('study');document.dispatchEvent(new CustomEvent('rise:navigation',{detail:{route:'study',source:'resume-saved-session'}}));return ok!==false}
function sync(){raf=0;const state=getState();if(!activeSession(state)){removeCards();return}ensureStyle();const s=state.session,home=app.querySelector('.riseHomeV4 .rv4Dashboard'),subjects=app.querySelector('.riseSubjectsV4');const hosts=[];if(home)hosts.push({host:home,before:home.querySelector('.rv4Metrics')||home.firstElementChild});if(subjects)hosts.push({host:subjects,before:subjects.querySelector('.rv4StudyHero')||subjects.firstElementChild});for(const {host,before} of hosts){let card=host.querySelector(':scope > [data-rise-resume="1"]');const html=cardHTML(s);if(!card){if(before)before.insertAdjacentHTML('beforebegin',html);else host.insertAdjacentHTML('afterbegin',html)}else if(card.outerHTML!==html)card.outerHTML=html}for(const card of app.querySelectorAll('[data-rise-resume="1"]')){if(!home?.contains(card)&&!subjects?.contains(card))card.remove()}}
function schedule(){if(raf)return;raf=requestAnimationFrame(sync)}
document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-rise-resume-action="resume"]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();resumeSession()},true);
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
document.addEventListener('aa:v23ready',schedule);
document.addEventListener('rise:navigation',schedule);
addEventListener('pageshow',schedule);
schedule();
})();
