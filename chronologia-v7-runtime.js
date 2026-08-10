(function(){
'use strict';
if(window.__CHRONOLOGIA_V7_RUNTIME__) return;
window.__CHRONOLOGIA_V7_RUNTIME__ = true;

const PACK_FILES = [
  './chronologia-v7-data-1.js?v=7.0.0',
  './chronologia-v7-data-2a.js?v=7.0.0',
  './chronologia-v7-data-2b.js?v=7.0.0',
  './chronologia-v7-overrides.js?v=7.0.0'
];
const VIEW_OPTIONS = [
  ['all','すべての視点'],['culture-all','文化・文学・芸術'],['文学','文学'],['文化・芸術','美術・芸能・建築・工芸'],['宗教・思想','宗教・思想'],['政治・制度','政治・制度'],['外交・戦争','外交・戦争'],['経済・産業','経済・産業'],['社会・民衆','社会・民衆'],['生活・教育','暮らし・教育'],['科学・技術','科学・技術'],['人権・ジェンダー','人権・ジェンダー'],['環境・災害','環境・災害'],['愛知・地域','愛知・地域'],['世界とのつながり','世界とのつながり']
];
function loadScript(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"]`)){resolve();return}const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('Chronologia pack load failed: '+src));document.head.appendChild(s)})}
function textOf(item){return [item.event,item.detail,item.area,item.period,...(item.tags||[])].join(' ')}
function inferViews(item){
  const s=textOf(item),v=new Set(),has=r=>r.test(s);
  if((item.area||'').includes('愛知')||has(/愛知|名古屋|尾張|三河|常滑|瀬戸|有松|トヨタ|豊田/))v.add('愛知・地域');
  if(has(/戦争|戦い|乱\b|一揆|事変|軍|侵攻|襲来|出兵|講和|条約|同盟|外交|開国|鎖国|貿易|使節|遣唐使|遣隋使|国際|植民地|帝国主義/))v.add('外交・戦争');
  if(has(/天皇|幕府|将軍|政府|内閣|憲法|法律|令|制度|改革|政治|議会|選挙|律令|守護|地頭|摂政|関白|中央集権|国会|条規|勅諭|勅語|法典/))v.add('政治・制度');
  if(has(/農業|商業|工業|産業|経済|貿易|市場|貨幣|税|年貢|地租|工場|鉄道|会社|製糸|製鉄|株仲間|商品作物|荘園|二毛作|座\b|城下町|三都|街道|宿場/))v.add('経済・産業');
  if(has(/農民|民衆|町人|庶民|武士|御家人|労働|社会|自治|惣村|差別|女性|人々|生活|都市|農村|身分/))v.add('社会・民衆');
  if(has(/生活|教育|学校|学制|寺子屋|藩校|住居|住宅|旅|出版|貸本|ラジオ|テレビ|郵便|暦|社会保障|保険|年金|衣食|宿場/))v.add('生活・教育');
  if(has(/文化|美術|芸術|絵|画|彫刻|像|建築|寺|城|御殿|庭園|能\b|歌舞伎|浄瑠璃|茶の湯|茶道|浮世絵|工芸|陶器|焼|絞り|屏風|書院造|寝殿造|金閣|銀閣|正倉院|大仏/))v.add('文化・芸術');
  if(has(/和歌|文学|物語|随筆|俳諧|俳句|短歌|小説|歌集|古事記|日本書紀|万葉集|古今和歌集|源氏物語|枕草子|平家物語|方丈記|徒然草|おくのほそ道|学問のすゝめ|羅生門|舞姫|青鞜|印刷|出版/))v.add('文学');
  if(has(/仏教|宗教|神道|キリスト教|イスラム|儒教|国学|蘭学|思想|啓蒙|社会契約|人民主権|三権分立|法華|浄土|禅宗|天台|真言|神社|寺院|信仰/))v.add('宗教・思想');
  if(has(/科学|技術|蒸気|地動説|望遠鏡|万有引力|進化論|医学|解剖|測量|地図|鉄道|自動車|飛行|航空|原子|核|宇宙|印刷|暦|ペニシリン/))v.add('科学・技術');
  if(has(/人権|女性|差別|解放|参政|選挙権|水平社|労働者|労働基準|基本的人権|平等|奴隷|アイヌ/))v.add('人権・ジェンダー');
  if(has(/災害|震災|台風|公害|鉱毒|環境|飢饉|ききん|原子力発電所事故/))v.add('環境・災害');
  if((item.area||'')!=='日本'&&!(item.area||'').includes('愛知'))v.add('世界とのつながり');
  if(has(/中国|朝鮮|唐|宋|明|清|百済|新羅|高麗|欧米|ロシア|アメリカ|イギリス|フランス|ドイツ|ポルトガル|オランダ|スペイン|シルクロード|大航海|世界|国際|海外/))v.add('世界とのつながり');
  if(v.size===0)v.add('社会・民衆');return [...v]
}
function viewsOf(item){if(!Array.isArray(item.views)||!item.views.length)item.views=inferViews(item);return item.views}
function viewMatches(item,value){if(value==='all')return true;const views=viewsOf(item);if(value==='culture-all')return views.includes('文化・芸術')||views.includes('文学');return views.includes(value)}
function injectCSS(){if(document.getElementById('chrono-v7-css'))return;const s=document.createElement('style');s.id='chrono-v7-css';s.textContent=`.chrono-v7-view{grid-column:span 3}.chrono-v7-perspectives .chrono-v7-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 10px}.chrono-v7-chip{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:var(--soft);color:var(--ink);font-size:.72rem;font-weight:800}.chrono-v7-perspectives ul{margin:8px 0 0;padding-left:1.15rem;color:var(--sub)}.chrono-v7-perspectives li+li{margin-top:5px}.chrono-v7-badge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:3px 8px;border:1px solid rgba(183,138,61,.5);border-radius:999px;background:color-mix(in srgb,var(--gold) 10%,var(--card-solid));font-size:.72rem;font-weight:900;color:var(--ink)}@media(max-width:760px){.chrono-v7-view{grid-column:span 6}}@media(max-width:540px){.chrono-v7-view{grid-column:1/-1}}`;document.head.appendChild(s)}
function installViewFilter(){
  if(document.getElementById('viewSelect'))return;const controls=document.querySelector('#timelineView .controls')||document.querySelector('.controls');if(!controls)return;
  const wrap=document.createElement('div');wrap.className='control chrono-v7-view';wrap.innerHTML=`<label for="viewSelect">歴史の視点</label><select id="viewSelect" class="input">${VIEW_OPTIONS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select>`;controls.appendChild(wrap);const viewSelect=wrap.querySelector('#viewSelect');viewSelect.addEventListener('change',()=>renderTimeline());
  getTimelineItems=function(){const q=($('searchInput')?.value||'').trim().toLowerCase(),period=$('periodSelect')?.value||'all',area=$('areaSelect')?.value||'all',level=$('levelSelect')?.value||'all',target=$('targetSelect')?.value||'all',view=viewSelect.value||'all';let data=state.order.map(id=>byId.get(id)).filter(Boolean);return data.filter(x=>{const text=[x.date,x.event,x.detail,x.area,x.period,...(x.tags||[]),...viewsOf(x)].join(' ').toLowerCase();return (!q||text.includes(q))&&(period==='all'||x.period===period)&&(area==='all'||groupArea(x.area)===area)&&(level==='all'||x.level===level)&&(target==='all'||(target==='fav'&&state.favorites.has(x.id))||(target==='weak'&&isWeak(x.id)))&&viewMatches(x,view)})};
  if(typeof resetTimelineFiltersSilently==='function'){const oldReset=resetTimelineFiltersSilently;resetTimelineFiltersSilently=function(){oldReset();viewSelect.value='all'}}
  const clear=$('clearFilterBtn');if(clear){const old=clear.onclick;clear.onclick=function(e){viewSelect.value='all';if(old)return old.call(this,e);renderTimeline()}}
  const jp=$('jpSBtn');if(jp){const old=jp.onclick;jp.onclick=function(e){viewSelect.value='all';if(old)return old.call(this,e)}}
}
function perspectiveTips(item){const views=viewsOf(item),tips=[],tags=(item.tags||[]).slice(0,4).join('・'),add=(key,text)=>{if(views.includes(key))tips.push(text)};add('文学',`文学：作者・作品名だけでなく、${tags||'作品'}が生まれた社会背景、文字・出版、読み手や語り手まで結び付ける。`);add('文化・芸術','芸術：建築・絵画・彫刻・芸能・工芸は、作品写真の特徴と「誰が文化を支えたか」を時代背景と結び付ける。');add('宗教・思想','宗教・思想：教えの内容だけでなく、なぜその時代の人々に受け入れられ、政治や文化に何を残したかを見る。');add('社会・民衆','社会・民衆：支配者だけでなく、農民・町人・武士・労働者など普通の人々の生活や行動から時代の変化を読む。');add('生活・教育','暮らし・教育：交通・住居・教育・メディアなど、制度の変化が日常生活をどう変えたかを押さえる。');add('経済・産業','経済・産業：生産・流通・市場・技術の変化が、政治や社会の変化をどう支えたかを見る。');add('人権・ジェンダー','人権：法制度の変化だけでなく、実際の差別・権利・社会運動の変化を長い時間軸で比較する。');add('科学・技術','科学・技術：発明や発見そのものに加え、交通・医療・情報・戦争・生活への影響までつなぐ。');add('環境・災害','環境・災害：被害だけでなく、産業化や都市化との関係、災害・公害後に制度がどう変わったかを見る。');add('愛知・地域','愛知・地域：全国史の出来事を、尾張・三河・知多の産業・交通・文化と結び付けて位置付ける。');add('世界とのつながり','世界とのつながり：日本史と世界史を別々に覚えず、同時代の交流・交易・思想・技術移転として見る。');return tips.slice(0,4)}
function installDeepExplanationPatch(){
  if(typeof v61BuildDeep==='function'){const oldBuild=v61BuildDeep;v61BuildDeep=function(item,note){if(note&&note.__chronoV7)return [note.summary,note.background,note.result].filter(Boolean).join('\n\n');return oldBuild(item,note)}}
  if(typeof openDetail==='function'){const oldOpen=openDetail;openDetail=function(id,options={}){const result=oldOpen(id,options),item=byId.get(Number(id)),body=$('modalBody');if(!item||!body||body.querySelector('.chrono-v7-perspectives'))return result;const section=document.createElement('section');section.className='detail-section chrono-v7-perspectives';const tips=perspectiveTips(item);section.innerHTML=`<h4>多角的に見る</h4><div class="chrono-v7-chips">${viewsOf(item).map(v=>`<span class="chrono-v7-chip">${esc(v)}</span>`).join('')}</div>${tips.length?`<ul>${tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}`;const exam=body.querySelector('.detail-exam-note');if(exam)exam.insertAdjacentElement('beforebegin',section);else body.appendChild(section);return result}}
}
function rebuildSyncSelect(){const sel=$('syncSelect');if(!sel)return;const old=Number(sel.value);sel.innerHTML='';[...DATA].sort((a,b)=>a.sort-b.sort||a.id-b.id).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=`${x.date}｜${x.event}`;sel.appendChild(o)});if(byId.has(old))sel.value=String(old)}
function markContentVersion(){const status=document.querySelector('#timelineView .statusbar');if(status&&!status.querySelector('.chrono-v7-badge')){const b=document.createElement('span');b.className='chrono-v7-badge';b.textContent=`多角史 ${DATA.length}件`;status.appendChild(b)}document.documentElement.dataset.chronologiaContent='7'}
function applyPacks(){
  if(typeof DATA==='undefined'||typeof byId==='undefined'||typeof RICH_NOTES==='undefined')throw new Error('Chronologia core not ready');const packs=window.CHRONO_V7_PACKS||[];
  for(const pack of packs){for(const item of(pack.items||[])){if(byId.has(item.id))continue;item.views=viewsOf(item);DATA.push(item);byId.set(item.id,item);if(typeof exactYearItems!=='undefined'&&/^(紀元前)?\d+年$/.test(item.date)&&!exactYearItems.some(x=>x.id===item.id))exactYearItems.push(item)}for(const[key,note]of Object.entries(pack.notes||{}))RICH_NOTES[key]={...note,__chronoV7:true}}
  for(const item of DATA)viewsOf(item);state.order=[...DATA].sort((a,b)=>a.sort-b.sort||a.id-b.id).map(x=>x.id);injectCSS();installViewFilter();installDeepExplanationPatch();rebuildSyncSelect();if(typeof updateStats==='function')updateStats();if(typeof renderTimeline==='function')renderTimeline();if(typeof renderSync==='function')renderSync();if(typeof renderWeak==='function')renderWeak();if(typeof updateResumeButton==='function')updateResumeButton();markContentVersion();document.dispatchEvent(new CustomEvent('chronologia:content-updated',{detail:{items:DATA.length,version:'7.0'}}));console.info(`Chronologia content 7 loaded: ${DATA.length} items`)
}
(async()=>{try{for(const f of PACK_FILES)await loadScript(f);applyPacks()}catch(e){console.error('Chronologia content 7 failed',e)}})();
})();
