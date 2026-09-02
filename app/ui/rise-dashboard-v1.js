(()=>{'use strict';
if(window.__RISE_DASHBOARD_V1__)return;
window.__RISE_DASHBOARD_V1__={version:'1.0.0',brand:'Rise'};

const RISE_THEME_MIGRATION_KEY='aa_rise_theme_migrated_v1';
try{
  if(!localStorage.getItem(RISE_THEME_MIGRATION_KEY)){
    if(typeof state==='object'&&state&&state.theme==='light'){
      state.theme='dark';
      if(typeof save==='function')save();
    }
    localStorage.setItem(RISE_THEME_MIGRATION_KEY,'1');
  }
}catch(_){ }

const riseClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const risePct=(v)=>riseClamp(Math.round(Number(v)||0),0,100);
const riseMedian=(a)=>{const b=[...a].filter(Number.isFinite).sort((x,y)=>x-y);if(!b.length)return 0;const m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2};
const riseDateKey=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const riseDay=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return riseDateKey(d)};
const riseMinutes=(ms)=>Math.round((Number(ms)||0)/60000);
const riseFormatHours=(ms)=>{const h=(Number(ms)||0)/3600000;return h<10?h.toFixed(1):Math.round(h).toString()};
const riseEsc=(v)=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

function riseTodayStats(){
  const d=state?.stats?.days?.[riseDay(0)]||{};
  return {attempts:Number(d.attempts)||0,correct:Number(d.correct)||0,ms:Number(d.ms)||0};
}
function riseActiveDays(limit=14,includeToday=false){
  const out=[];
  for(let i=includeToday?0:-1;i>=-limit;i--){
    const k=riseDay(i),d=state?.stats?.days?.[k];
    if(d&&(Number(d.attempts)>0||Number(d.ms)>0))out.push({key:k,...d});
  }
  return out;
}
function riseDailyTargets(){
  const hist=riseActiveDays(14,false).slice(-7);
  const mins=hist.map(x=>riseMinutes(x.ms)).filter(x=>x>0);
  const qs=hist.map(x=>Number(x.attempts)||0).filter(x=>x>0);
  const minTarget=riseClamp(Math.round((mins.length?riseMedian(mins)*1.08:30)/5)*5,25,90);
  const qTarget=riseClamp(Math.round(qs.length?riseMedian(qs)*1.08:15),12,45);
  return {minutes:minTarget,attempts:qTarget};
}
function riseStreak(){
  const days=state?.stats?.days||{};
  let start=(days[riseDay(0)]?.attempts||days[riseDay(0)]?.ms)?0:-1,count=0;
  for(let i=start;i>-400;i--){
    const d=days[riseDay(i)];
    if(d&&(Number(d.attempts)>0||Number(d.ms)>0))count++;else break;
  }
  return count;
}
function riseWeekStats(){
  let ms=0,attempts=0,correct=0,active=0;
  for(let i=0;i>-7;i--){const d=state?.stats?.days?.[riseDay(i)];if(!d)continue;const a=Number(d.attempts)||0,m=Number(d.ms)||0;if(a||m)active++;ms+=m;attempts+=a;correct+=Number(d.correct)||0}
  return {ms,attempts,correct,active,accuracy:attempts?Math.round(correct/attempts*100):null};
}
function riseRetentionStats(){
  const list=Object.values(state?.items||{}).filter(x=>x&&((Number(x.seen)||0)>0||Number(x.lastReviewAt)>0));
  if(!list.length)return {total:0,strong:0,learning:0,review:0,strongPct:0,learnPct:0,reviewPct:0,average:null,due:0};
  let strong=0,learning=0,review=0,due=0,sum=0;
  const t=Date.now();
  for(const it of list){
    let r=0;
    try{r=typeof retention==='function'?retention(it,t):Number(it.retrievability)||0}catch(_){r=Number(it.retrievability)||0}
    r=riseClamp(r,0,1);sum+=r;if(Number(it.dueAt)>0&&Number(it.dueAt)<=t)due++;
    if(r>=.82)strong++;else if(r>=.62)learning++;else review++;
  }
  const total=list.length;
  return {total,strong,learning,review,strongPct:Math.round(strong/total*100),learnPct:Math.round(learning/total*100),reviewPct:Math.max(0,100-Math.round(strong/total*100)-Math.round(learning/total*100)),average:Math.round(sum/total*100),due};
}
function riseCandidateTitle(c){
  if(!c)return '学習を開始';
  if(c.title)return c.title;
  if(c.kind==='vocabDiagnostic')return '英単語チェック（20語）';
  if(c.kind==='reading')return '英語・長文読解';
  if(c.kind==='vocab')return '英語・語彙復習';
  if(c.kind==='kanji')return '国語・漢字語彙';
  if(c.kind==='subject')return `${SUBJECTS?.[c.subject]||'教科'}・重点演習`;
  return SUBJECTS?.[c.subject]||'重点演習';
}
function riseCandidates(n=3){
  let raw=[];try{raw=typeof missionCandidates==='function'?missionCandidates():[]}catch(_){raw=[]}
  const seen=new Set(),out=[];
  for(const c of raw){const key=`${c.kind}:${c.subject}:${c.skillId||''}`;if(seen.has(key))continue;seen.add(key);out.push(c);if(out.length>=n)break}
  if(!out.length&&typeof pickMission==='function')out=[pickMission()];
  return out;
}
function riseStartAttrs(c,mode='standard'){
  return `data-rise-start="1" data-kind="${riseEsc(c?.kind||'subject')}" data-subject="${riseEsc(c?.subject||'english')}" data-mode="${riseEsc(mode)}"`;
}
function riseSubjectMeta(sub){
  const map={
    english:{icon:'Aa',accent:'#56bfff',desc:'長文・語彙・根拠'},
    math:{icon:'√x',accent:'#59e3ed',desc:'関数・図形・戦略'},
    japanese:{icon:'国',accent:'#b979ff',desc:'読解・語彙・論理'},
    science:{icon:'⚗',accent:'#66e98d',desc:'実験・資料・計算'},
    social:{icon:'◎',accent:'#ffc56b',desc:'資料・因果・公民'}
  };return map[sub]||{icon:'•',accent:'#61a8ff',desc:''};
}
function riseSubjectStartKind(sub){return sub==='english'?'reading':sub==='japanese'?'kanji':'subject'};
function riseSubjectCard(sub){
  const s=subjectStatus(sub),m=riseSubjectMeta(sub),score=s?.score;
  return `<button class="riseSubject" style="--accent:${m.accent}" ${riseStartAttrs({kind:riseSubjectStartKind(sub),subject:sub})} aria-label="${riseEsc(SUBJECTS[sub])}を開始"><div class="riseSubjectIcon">${m.icon}</div><strong>${riseEsc(SUBJECTS[sub])}</strong><div class="riseSubjectScore"><span>理解度</span><b>${score==null?'測定中':`${score}%`}</b></div><div class="riseGoalBar"><i style="width:${score==null?0:risePct(score)}%"></i></div><span class="riseSubjectMeta">${riseEsc(m.desc)}${s?.totalAttempts?` ・ ${s.totalAttempts}回答`:''}</span></button>`;
}
function riseGoalPanel(){
  const t=riseTodayStats(),target=riseDailyTargets(),minute=riseMinutes(t.ms),pMin=risePct(minute/target.minutes*100),pQ=risePct(t.attempts/target.attempts*100),goal=Math.round((pMin+pQ)/2);
  return `<section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">◎</span>今日の学習量</div><span class="risePanelMeta">過去の学習量から自動調整</span></div><div class="riseGoalGrid"><div class="riseMiniRing" style="--rise-goal:${goal}"><div><b>${goal}%</b><span>達成度</span></div></div><div class="riseGoalRows"><div><div class="riseGoalRowTop"><span>学習時間</span><b>${minute} / ${target.minutes}分</b></div><div class="riseGoalBar"><i style="width:${pMin}%"></i></div></div><div><div class="riseGoalRowTop"><span>演習回答</span><b>${t.attempts} / ${target.attempts}問</b></div><div class="riseGoalBar"><i style="width:${pQ}%"></i></div></div><div><div class="riseGoalRowTop"><span>今日の正答率</span><b>${t.attempts?Math.round(t.correct/t.attempts*100)+'%':'--'}</b></div><div class="riseGoalBar"><i style="width:${t.attempts?risePct(t.correct/t.attempts*100):0}%"></i></div></div></div></div></section>`;
}
function riseRetentionPanel(){
  const r=riseRetentionStats();
  return `<section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">◌</span>記憶の定着度</div><span class="risePanelMeta">${r.due?`復習時期 ${r.due}件`:'SRS実測'}</span></div><div class="riseRetention"><div class="riseDonut" style="--strong:${r.strongPct};--learn:${r.learnPct}"><div><b>${r.average==null?'--':r.average+'%'}</b><span>${r.total?`${r.total}項目`:'測定前'}</span></div></div><div class="riseLegend"><div class="riseLegendRow"><i style="background:var(--rise-green)"></i><span>強く保持</span><b>${r.strong}</b></div><div class="riseLegendRow"><i style="background:var(--rise-blue)"></i><span>定着途中</span><b>${r.learning}</b></div><div class="riseLegendRow"><i style="background:var(--rise-violet)"></i><span>要再想起</span><b>${r.review}</b></div><a class="btn ghost sm" href="./review/">専用の復習ページへ</a></div></div></section>`;
}
function riseTasksPanel(){
  const cs=riseCandidates(3);
  return `<section class="riseGlass riseTasks"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">✓</span>今日のFocus</div><button class="btn ghost sm" data-route="mission">優先度の根拠</button></div><div class="riseTaskList">${cs.map((c,i)=>`<div class="riseTask"><span class="riseTaskNo">${i+1}</span><div class="riseTaskText"><strong>${riseEsc(riseCandidateTitle(c))}</strong><span>${riseEsc(c.why||'現在の学習履歴から優先度を計算')}</span></div><button ${riseStartAttrs(c,i===0?'standard':'micro')}>開始</button></div>`).join('')}</div></section>`;
}
function riseWeekPanel(){
  const w=riseWeekStats(),streak=riseStreak();
  return `<section class="riseGlass riseWeek"><div class="riseWeekLead"><span class="riseSpark">✦</span><div><strong>直近7日の学習状況</strong><span>${w.active}日学習 ・ ${w.attempts}回答</span></div></div><div class="riseWeekMetric"><span>総学習時間</span><b>${riseFormatHours(w.ms)}<small> 時間</small></b><small>${w.accuracy==null?'正答率は学習後に表示':`正答率 ${w.accuracy}%`}</small></div><div class="riseWeekMetric"><span>連続学習日数</span><b>${streak}<small> 日</small></b><small>${streak>=2?'継続中':'今日から積み上げ'}</small></div></section>`;
}
function riseWeakPanel(){
  let weak=[];try{weak=weakSkills(5)}catch(_){weak=[]}
  return `<section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">◇</span>合格力を伸ばすポイント</div><button class="btn ghost sm" data-route="analytics">分析へ</button></div><div class="riseWeakList">${weak.map(w=>{const mastery=risePct((w.mastery||0)*100);return `<div class="riseWeakItem"><div class="riseWeakItemTop"><span>${riseEsc(w.label)}</span><b>${w.attempts?mastery+'%':'測定中'}</b></div><div class="riseGoalBar"><i style="width:${w.attempts?mastery:0}%"></i></div></div>`}).join('')||'<div class="sub">演習データがたまると、技能単位の優先順位を表示します。</div>'}</div></section>`;
}
function riseQuickPanel(){
  return `<section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">↗</span>入試モードへ</div><span class="risePanelMeta">目的別ショートカット</span></div><div class="actions"><button class="btn primary" data-action="start-mixed">5教科ミックス</button><button class="btn soft" data-action="start-review">間違い直し</button><button class="btn ghost" data-action="start-reading-exam">英語実戦</button><a class="btn ghost" href="./japanese-exam/">国語実戦</a><a class="btn ghost" href="./review/">復習</a></div><div class="tiny" style="margin-top:10px">Readinessはアプリ内の個人指標です。合格率・偏差値・学校公表値ではありません。</div></section>`;
}

const riseLegacyLayout=layout;
header=function(){return `<header class="top"><div class="riseTopInner"><div class="riseBrand"><div class="riseBrandMark">R</div><div class="riseBrandText"><strong>RISE</strong><span>旭丘合格のための学習OS</span></div></div><div class="riseTopActions"><button class="riseIconBtn" data-route="analytics" aria-label="学習分析">⌁</button><button class="riseIconBtn" data-action="theme" aria-label="テーマ切替">${state.theme==='dark'?'☼':'☾'}</button><button class="riseIconBtn" data-route="settings" aria-label="設定">≡</button></div></div></header>`};
nav=function(){const tabs=[['home','⌂','HOME'],['mission','◎','今日'],['subjects','▦','教科'],['analytics','▥','分析'],['settings','⚙','設定']];return `<nav class="nav"><div class="navin">${tabs.map(([r,i,t])=>`<button class="${state.route===r?'active':''}" data-route="${r}" aria-label="${t}"><b>${i}</b>${t}</button>`).join('')}</div></nav>`};
layout=function(content,showNav=true){return riseLegacyLayout(content,showNav).replaceAll('旭丘AA Learning OS','Rise').replaceAll('旭丘AA OS','Rise')};

homeHTML=function(){
  const m=typeof pickMission==='function'?pickMission():{title:'学習を開始',why:'現在地を測定します'},r=overallReadiness(),score=r.score==null?0:risePct(r.score),status=r.score==null?'測定中':r.status;
  return layout(`${storageWarningHTML()}<div class="riseDashboard"><section class="riseGlass riseHero"><div class="riseHeroCopy"><div class="riseKicker"><span class="risePill risePillAccent">TARGET 旭丘</span><span class="risePill">DATA-DRIVEN LEARNING</span></div><h1>Rise<small>学びを、未来の自分の力に。</small></h1><p class="riseHeroLead">弱点・忘却・転移・入試重要度をまとめて判断し、今やる価値が高い学習へ最短でつなぎます。</p><div class="riseMissionBox"><div class="riseMissionBoxText"><span>NEXT BEST ACTION</span><strong>${riseEsc(m.title)}</strong></div><button class="riseMissionButton" data-action="start-mission" aria-label="おすすめ学習を開始">›</button></div></div><div class="riseReadiness"><div class="riseRing" style="--rise-p:${score}"><div class="riseRingCore"><span>旭丘 Readiness</span><b>${r.score==null?'--':r.score}<small>${r.score==null?'':' /100'}</small></b></div></div><div class="riseReadinessStatus"><i class="riseStatusDot"></i>${riseEsc(status)}${r.confidence!=null?` ・ 信頼度 ${Math.round(r.confidence*100)}%`:''}</div></div></section><div class="riseGrid2">${riseGoalPanel()}${riseRetentionPanel()}</div>${state.session?.active?`<section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">▶</span>前回の学習を再開</div><span class="risePanelMeta">回答・問題順・時間を保存済み</span></div><button class="btn primary" data-route="study">続きから始める</button></section>`:''}${riseTasksPanel()}<section><div class="risePanelHead"><div class="risePanelTitle">5教科</div><button class="btn ghost sm" data-route="subjects">すべて表示</button></div><div class="riseSubjects">${['english','math','japanese','science','social'].map(riseSubjectCard).join('')}</div></section>${riseWeekPanel()}<div class="riseInsights">${riseWeakPanel()}${riseQuickPanel()}</div></div>`);
};

missionHTML=function(){
  const c=riseCandidates(8),m=c[0];
  return layout(`<section class="riseGlass riseHero" style="min-height:220px"><div class="riseHeroCopy"><div class="riseKicker"><span class="risePill risePillAccent">TODAY</span><span class="risePill">PRIORITY ENGINE</span></div><h1 style="font-size:clamp(34px,6vw,54px)">Focus<small>今やる価値が高い順に。</small></h1><p class="riseHeroLead">単純な「苦手順」ではなく、入試重要度・忘却・改善余地・転移価値・最近の偏りを統合しています。</p></div><div class="riseReadiness"><span class="riseSpark">✦</span><div class="riseReadinessStatus"><i class="riseStatusDot"></i>自動最適化</div></div></section><div class="sp12"></div><section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">1</span>${riseEsc(riseCandidateTitle(m))}</div><span class="risePanelMeta">推奨1位</span></div><p class="sub">${riseEsc(m?.why||'現在の履歴から選択しました。')}</p><div class="actions"><button class="btn ghost" ${riseStartAttrs(m,'micro')}>短く 1〜3分</button><button class="btn primary" ${riseStartAttrs(m,'standard')}>標準 8〜12分</button><button class="btn soft" ${riseStartAttrs(m,'deep')}>本格</button></div></section><div class="sp12"></div><section class="riseGlass riseTasks"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">≋</span>優先候補</div><span class="risePanelMeta">リアルタイム再計算</span></div><div class="riseTaskList">${c.map((x,i)=>`<div class="riseTask"><span class="riseTaskNo">${i+1}</span><div class="riseTaskText"><strong>${riseEsc(riseCandidateTitle(x))}</strong><span>${riseEsc(x.why||'学習履歴から算出')}</span></div><button ${riseStartAttrs(x,i<3?'standard':'micro')}>開始</button></div>`).join('')}</div></section>`);
};

subjectsHTML=function(){
  const level=riseClamp(Math.round(Number(state.ui.subjectDifficulty)||7),1,11);
  return layout(`<section class="riseGlass risePanel"><div class="riseKicker"><span class="risePill">SUBJECTS</span><span class="risePill">LEVEL ${level}</span></div><h2 class="h2">教科別トレーニング</h2><p class="sub">ホームでは自動最適化。ここでは狙って補強したい教科と実戦モードを選べます。</p><div class="sp12"></div><div class="riseSubjects">${['english','math','japanese','science','social'].map(riseSubjectCard).join('')}</div></section><div class="sp12"></div><section class="riseGlass risePanel"><div class="risePanelHead"><div class="risePanelTitle"><span class="risePanelIcon">↗</span>実戦ショートカット</div></div><div class="actions"><button class="btn primary" data-action="start-mixed">5教科ミックス 25問</button><button class="btn soft" data-action="start-review">間違い直し</button><button class="btn ghost" data-action="start-reading-exam">英語・支援なし長文</button><button class="btn ghost" data-action="start-reading-simulator">愛知県英語・筆記40分</button><a class="btn ghost" href="./japanese-exam/">愛知県型 国語</a><button class="btn ghost" data-route="timeline">歴史年表</button></div></section><div class="sp12"></div><section class="riseGlass risePanel"><div class="field"><label>演習難度 Level <span id="diffVal">${level}</span> <span id="diffBand" class="chip">${typeof readingDifficultyLabel==='function'?riseEsc(readingDifficultyLabel(level)):''}</span></label><input type="range" min="1" max="11" value="${level}" data-action="difficulty"></div><div class="tiny">難度と未履修文法ゲートは別管理。難しくしても未習範囲を勝手に解禁しません。</div></section>`);
};

analyticsHTML=function(){
  const r=overallReadiness(),w=riseWeekStats(),ret=riseRetentionStats(),weak=weakSkills(10),days=[];
  for(let i=0;i>-7;i--){const k=riseDay(i),d=state.stats.days?.[k]||{};days.push({k,attempts:Number(d.attempts)||0,correct:Number(d.correct)||0,ms:Number(d.ms)||0})}
  return layout(`<section class="riseGlass risePanel"><div class="riseKicker"><span class="risePill">ANALYTICS</span><span class="risePill">PERSONAL EVIDENCE</span></div><h2 class="h2">学習分析</h2><div class="metricRow"><div class="metric"><b>${r.score??'--'}</b><span>旭丘 Readiness</span></div><div class="metric"><b>${Math.round((r.confidence||0)*100)}%</b><span>測定信頼度</span></div><div class="metric"><b>${state.attempts.length}</b><span>総回答数</span></div><div class="metric"><b>${riseFormatHours(state.stats.totalMs)}h</b><span>完了学習時間</span></div><div class="metric"><b>${ret.average==null?'--':ret.average+'%'}</b><span>記憶保持</span></div><div class="metric"><b>${w.accuracy==null?'--':w.accuracy+'%'}</b><span>直近7日正答率</span></div></div><div class="sp12"></div><div class="notice">Readinessは公式合格率・偏差値ではありません。実際の回答証拠が不足する教科は「測定中」のまま表示します。</div></section><div class="sp12"></div><div class="riseGrid2"><section class="riseGlass risePanel"><div class="risePanelTitle">5教科の現在地</div><div class="sp12"></div>${Object.keys(SUBJECTS).map(sub=>{const s=subjectStatus(sub),p=s.score==null?0:s.score;return `<div class="riseWeakItem"><div class="riseWeakItemTop"><span>${SUBJECTS[sub]}</span><b>${s.score==null?'測定中':s.score+'%'}</b></div><div class="riseGoalBar"><i style="width:${p}%"></i></div></div>`}).join('')}</section><section class="riseGlass risePanel"><div class="risePanelTitle">優先技能</div><div class="sp12"></div><div class="riseWeakList">${weak.map(x=>`<div class="riseWeakItem"><div class="riseWeakItemTop"><span>${riseEsc(x.label)}</span><b>${x.attempts?Math.round(x.mastery*100)+'%':'測定中'}</b></div><div class="riseGoalBar"><i style="width:${x.attempts?Math.round(x.mastery*100):0}%"></i></div></div>`).join('')}</div></section></div><div class="sp12"></div><section class="riseGlass riseTasks"><div class="risePanelHead"><div class="risePanelTitle">直近7日</div><span class="risePanelMeta">端末内の実測履歴</span></div><div class="riseTaskList">${days.map(d=>`<div class="riseTask"><span class="riseTaskNo">${d.k.slice(5)}</span><div class="riseTaskText"><strong>${d.attempts}回答 ・ ${riseMinutes(d.ms)}分</strong><span>${d.attempts?`正答率 ${Math.round(d.correct/d.attempts*100)}%`:'学習記録なし'}</span></div><span class="risePanelMeta">${d.correct}/${d.attempts}</span></div>`).join('')}</div></section>`);
};

document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-rise-start]');if(!el)return;
  e.preventDefault();e.stopPropagation();
  const kind=el.dataset.kind||'subject',subject=el.dataset.subject||'english',mode=el.dataset.mode||'standard';
  try{
    if(kind==='vocabDiagnostic'&&typeof startVocabDiagnostic==='function')startVocabDiagnostic();
    else if(typeof startSession==='function')startSession({kind,subject,mode,readingAssist:kind==='reading'?'scaffold':undefined});
  }catch(err){console.error('Rise start failed',err);alert('学習を開始できませんでした。再読み込みしてもう一度お試しください。')}
},{capture:true});

try{render()}catch(err){console.error('Rise initial render failed',err)}
})();
