(()=>{'use strict';
if(window.__AA_DIFFICULTY_ENGINE_V1__)return;
window.__AA_DIFFICULTY_ENGINE_V1__=true;
const API=window.AA_V2_TEST_API;
if(!API?.banks||typeof state==='undefined')return;
const clampD=n=>Math.max(1,Math.min(11,Math.round(Number(n)||7)));
const currentD=n=>clampD(n??state?.ui?.subjectDifficulty??7);
const courseLevel=d=>d<=4?1:d<=8?2:3;
const BAND_LABELS=['','基礎1','基礎2','基礎3','標準4','標準5','標準6','難関7','難関8','旭丘9','旭丘10','旭丘11'];
const UNIT_AREAS={
 japanese:{modern:['modern'],literary:['literary'],discussion:['discussion','modern','literary'],kanji:['kanji'],idiom:['idiom','yojijukugo'],classical:['classical'],kanbun:['kanbun']},
 math:{number:['number'],algebra:['algebra'],equation:['equation'],function:['function'],geometry:['geometry','measure'],probability:['probability'],statistics:['statistics'],advanced:['advanced']},
 science:{biology:['biology'],chemistry:['chemistry'],physics:['physics'],earth:['earth'],experiment:['biology','chemistry','physics','earth']},
 social:{history:['history'],geography:['geography'],civics:['civics'],economy:['economy'],international:['international'],data:['history','geography','civics','economy','international']}
};
function rowPool(subject,d,areas=null,exclude=new Set()){
 const base=(typeof API.subjectRows==='function'?API.subjectRows(subject):API.banks[subject])||[];
 let rows=base.filter(r=>!exclude.has(String(r.id))&&(!areas||areas.includes(r.area))&&!(subject==='math'&&r.area==='advanced'&&d<9));
 if(!rows.length)return[];
 let radius=0,pool=[];
 while(radius<=5){pool=rows.filter(r=>Math.abs((Number(r.difficulty)||6)-d)<=radius);if(pool.length>=Math.min(8,rows.length))break;radius++}
 if(!pool.length){const min=Math.min(...rows.map(r=>Math.abs((Number(r.difficulty)||6)-d)));pool=rows.filter(r=>Math.abs((Number(r.difficulty)||6)-d)===min)}
 return pool;
}
function rowScore(row,d,subject){
 const actual=Number(row.difficulty)||6,dist=Math.abs(actual-d),fit=Math.exp(-Math.pow(dist/1.2,2));
 let adaptive=0;try{adaptive=Number(API.priority?.(row,courseLevel(d)))||0}catch(_){}
 let format=0;const text=`${row.prompt||''} ${row.explanation||''}`;
 if(d>=9&&/理由|注意|資料|根拠|比較|因果|証明|考察|統合|発展|条件/.test(text))format+=.35;
 if(d<=3&&/意味|用語|基本|読み/.test(text))format+=.20;
 if(subject==='math'&&d>=9&&row.area==='advanced')format+=.28;
 return fit*3+adaptive*.8+format+Math.random()*.035;
}
function rankedRows(subject,d,areas=null,exclude=new Set()){
 d=currentD(d);return rowPool(subject,d,areas,exclude).map(r=>({r,s:rowScore(r,d,subject)})).sort((a,b)=>b.s-a.s).map(x=>x.r);
}
function chooseRow(subject,d,areas=null,exclude=new Set()){return rankedRows(subject,d,areas,exclude)[0]||null}
function exactQuestion(subject,d,areas=null,exclude=new Set()){
 d=currentD(d);const rows=rankedRows(subject,d,areas,exclude);if(!rows.length)return null;const valid=window.AA_QUESTION_QUALITY?.validQuestion;
 for(const row of rows.slice(0,Math.min(14,rows.length))){
   const q=API.makeQuestion(row,false);if(!q)continue;if(typeof valid==='function'&&!valid(q))continue;
   q.requestedDifficulty=d;q.actualDifficulty=Number(row.difficulty)||6;q.difficulty=q.actualDifficulty;q.courseLevel=courseLevel(d);q.difficultyLabel=BAND_LABELS[d];
   q.source=Object.assign({},q.source||{},{area:row.area,rowId:String(row.id),difficulty:q.actualDifficulty,requestedDifficulty:d,difficultyEngine:'exact-1-11-v1'});
   q.reviewKey=q.reviewKey||`v2:${subject}:${row.id}`;return q;
 }
 return null;
}
const originals={
 math:typeof makeMathQ==='function'?makeMathQ:null,science:typeof makeScienceQ==='function'?makeScienceQ:null,
 social:typeof makeSocialQ==='function'?makeSocialQ:null,japanese:typeof makeJapaneseQ==='function'?makeJapaneseQ:null,
 vocab:typeof makeVocabQ==='function'?makeVocabQ:null,planVocab:typeof planVocabQueue==='function'?planVocabQueue:null,
 kanji:typeof makeKanjiQ==='function'?makeKanjiQ:null,planKanji:typeof planKanjiQueue==='function'?planKanjiQueue:null,
 subject:typeof makeSubjectQ==='function'?makeSubjectQ:null,handle:typeof handleAction==='function'?handleAction:null
};
if(originals.math)makeMathQ=(d=currentD())=>exactQuestion('math',d)||originals.math(d);
if(originals.science)makeScienceQ=(d=currentD())=>exactQuestion('science',d)||originals.science(d);
if(originals.social)makeSocialQ=(d=currentD())=>exactQuestion('social',d)||originals.social(d);
if(originals.japanese)makeJapaneseQ=(d=currentD())=>exactQuestion('japanese',d)||originals.japanese(d);
if(originals.subject)makeSubjectQ=function(subject,d=currentD()){
 d=currentD(d);if(subject==='math')return makeMathQ(d);if(subject==='science')return makeScienceQ(d);if(subject==='social')return makeSocialQ(d);if(subject==='japanese')return makeJapaneseQ(d);return makeVocabQ();
};
function vocabDifficulty(v){
 let d=5,l=String(v?.level||'').toLowerCase(),src=String(v?.source||''),word=String(v?.word||'');
 if(/basic|starter|elementary/.test(l))d=2;else if(/core/.test(l))d=4;else if(/form/.test(l))d=5;else if(/phrase/.test(l))d=7;else if(/entrance|upper/.test(l))d=8;else if(/advanced|high/.test(l))d=10;
 if(src==='aa24-curated')d=v?.pos==='phrase'?8:7;if(word.includes(' '))d++;if(word.length>=12)d++;return clampD(d);
}
function vocabWords(n,d){
 d=currentD(d);const pool=(typeof vocabPool==='function'?vocabPool():DATA?.vocab||[]).filter(Boolean),seen=new Set(),out=[];
 const scored=pool.map(v=>{const vd=vocabDifficulty(v),key=v.srsId||('v:'+v.id);let recent=0,due=0;try{recent=recentCorrectPenaltyForKey(key)||0;due=dueScore(itemState(key))||0}catch(_){}return{v,score:Math.exp(-Math.pow((vd-d)/1.45,2))*3+due*.35-recent*.8+Math.random()*.04,vd}}).sort((a,b)=>b.score-a.score);
 for(const x of scored){const k=String(x.v.word||x.v.id);if(seen.has(k))continue;seen.add(k);out.push(x.v);if(out.length>=n)break}return out;
}
function vocabFormat(v,d,i=0){d=currentD(d);if(d<=3)return'meaning';if(d<=5)return i%2?'context':'meaning';if(d<=8)return i%3===0?'cloze':'context';return v?.syn&&i%3===2?'synonym':(i%2?'cloze':'context')}
if(originals.vocab)makeVocabQ=function(forced=null,forcedFormat=null){const d=currentD(),v=forced||vocabWords(1,d)[0];return v?originals.vocab(v,forcedFormat||vocabFormat(v,d,0)):originals.vocab(forced,forcedFormat)};
if(originals.planVocab)planVocabQueue=function(count=8){const d=currentD(),poolLen=typeof vocabPool==='function'?vocabPool().length:(DATA?.vocab||[]).length,words=vocabWords(Math.min(count,poolLen),d);return words.map((v,i)=>originals.vocab(v,vocabFormat(v,d,i))).slice(0,count)};
function kanjiDifficulty(k){let d=String(k?.level||'').toLowerCase()==='upper'?8:5;if(String(k?.word||'').length>=4)d++;return clampD(d)}
function kanjiWords(n,d){d=currentD(d);const pool=(DATA?.kanji||[]).filter(Boolean);return pool.map(k=>{let recent=0,due=0;try{recent=recentCorrectPenaltyForKey('k:'+k.id)||0;due=dueScore(itemState('k:'+k.id))||0}catch(_){}return{k,score:Math.exp(-Math.pow((kanjiDifficulty(k)-d)/1.6,2))*3+due*.35-recent*.8+Math.random()*.04}}).sort((a,b)=>b.score-a.score).slice(0,n).map(x=>x.k)}
function kanjiFormat(k,d,i=0){d=currentD(d);if(d<=3)return'reading';if(d<=5)return i%2?'meaning':'reading';if(d<=8)return i%2?'context':'meaning';return k?.syn?(i%2?'synonym':'context'):'context'}
if(originals.kanji)makeKanjiQ=function(forced=null,forcedFormat=null){const d=currentD(),k=forced||kanjiWords(1,d)[0];return k?originals.kanji(k,forcedFormat||kanjiFormat(k,d,0)):originals.kanji(forced,forcedFormat)};
if(originals.planKanji)planKanjiQueue=function(count=8){const d=currentD(),words=kanjiWords(Math.min(count,(DATA?.kanji||[]).length),d);return words.map((k,i)=>originals.kanji(k,kanjiFormat(k,d,i))).slice(0,count)};
function exactUnitQueue(config){
 const subject=config?.subject,d=currentD(),units=(config?.unitsBySubject?.[subject]||[]).filter(Boolean);if(!UNIT_AREAS[subject]||!units.length)return null;
 const count=config.length==='micro'?3:config.length==='deep'?15:8,exclude=new Set(),out=[];
 for(let i=0;i<count;i++){
   const unit=units[i%units.length],areas=UNIT_AREAS[subject][unit]||[unit],q=exactQuestion(subject,d,areas,exclude);if(!q)continue;
   if(q.source?.rowId)exclude.add(String(q.source.rowId));q.examUnit=unit;q.testMode=false;q.points=1;q.context=`unit-practice-${subject}-${unit}`;out.push(q);
 }
 return out;
}
function startExactUnitPractice(config){
 const V22=window.AA_V22_TEST_API;if(!V22||!API?.startPractice)return false;config=V22.normalizePracticeConfig(config||state.ui.practiceConfig||{});if(config.subject==='english')return false;
 const queue=exactUnitQueue(config);if(!queue?.length)return false;const d=currentD();state.ui.practiceConfig=config;API.startPractice(config.subject,config.length,courseLevel(d),queue);
 if(state.session){state.session.kind='unitPractice';state.session.practiceConfig={subject:config.subject,length:config.length,units:[...(config.unitsBySubject[config.subject]||[])],level:courseLevel(d),difficulty:d,exactDifficulty:true};state.session.practiceUnits=[...(config.unitsBySubject[config.subject]||[])];}
 try{save();render()}catch(_){}return true;
}
if(originals.handle)handleAction=function(el,e){
 const action=el?.dataset?.action;
 if(action==='start-unit-practice'&&state?.ui?.practiceConfig?.subject!=='english'){if(startExactUnitPractice(state.ui.practiceConfig))return}
 if(action==='another-set'&&state?.session?.practiceConfig?.exactDifficulty){const p=state.session.practiceConfig,cfg=Object.assign({},state.ui.practiceConfig||{},{subject:p.subject,length:p.length,unitsBySubject:Object.assign({},state.ui.practiceConfig?.unitsBySubject||{},{[p.subject]:[...p.units]})});if(startExactUnitPractice(cfg))return}
 return originals.handle(el,e);
};
function audit(){
 const bySubject={};for(const s of ['japanese','math','science','social']){const rows=(API.subjectRows?.(s)||API.banks[s]||[]);bySubject[s]={rows:rows.length,levels:{}};for(let d=1;d<=11;d++){const p=rowPool(s,d);const nearest=p.length?Math.min(...p.map(r=>Math.abs((Number(r.difficulty)||6)-d))):99;bySubject[s].levels[d]={candidates:p.length,nearestDistance:nearest}}}
 const english={vocab:(DATA?.vocab||[]).length,kanji:(DATA?.kanji||[]).length,readingExact:typeof generateReadingForLearner==='function'};
 const pass=Object.values(bySubject).every(x=>x.rows>100&&Object.values(x.levels).every(y=>y.candidates>0&&y.nearestDistance<=3))&&english.vocab>100&&english.kanji>0&&english.readingExact;
 return{version:'1.0.1',currentDifficulty:currentD(),bySubject,english,unitPracticeExact:['japanese','math','science','social'],pass};
}
window.AA_DIFFICULTY_ENGINE={version:'1.0.1',currentDifficulty:currentD,courseLevel,rowPool,chooseRow,exactQuestion,vocabDifficulty,vocabWords,vocabFormat,kanjiDifficulty,kanjiWords,kanjiFormat,exactUnitQueue,startExactUnitPractice,audit};
try{window.AA_DIFFICULTY_AUDIT=audit()}catch(e){window.AA_DIFFICULTY_AUDIT={version:'1.0.1',pass:false,error:String(e?.message||e)}}
document.dispatchEvent(new CustomEvent('aa:difficulty-engine',{detail:window.AA_DIFFICULTY_AUDIT}));
})();