(()=>{'use strict';
if(window.__AA_QUALITY_REPAIR_V1__)return;
window.__AA_QUALITY_REPAIR_V1__={version:'1.0.0'};

const REPAIR=window.AA_QUALITY_REPAIR={version:'1.0.0',installedAt:Date.now(),fallbackWords:new Set()};
const shuffleLocal=input=>{const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const text=v=>String(v??'').trim();

/* Reading vocabulary: cover words introduced by the expanded/curated reading banks.
   Residual words receive a conservative non-learnable context marker instead of being treated as known. */
const EXTRA_GLOSS={
 accuracy:'正確さ',adapter:'アダプター',adapters:'アダプター',afterward:'その後',alternatives:'代替案',arrive:'到着する',arrival:'到着',available:'利用できる',badminton:'バドミントン',bakery:'パン屋',balancing:'バランスを取ること',batteries:'電池',battery:'電池',bottleneck:'ボトルネック・最も詰まる箇所',cable:'ケーブル',cables:'ケーブル',charged:'充電された',charging:'充電',checkout:'会計場所',committee:'委員会',completion:'完了',concrete:'具体的な',connections:'つながり',correlation:'相関関係',criteria:'基準',crossing:'横断地点',crossings:'横断地点',crowded:'混雑した',damaged:'傷んだ',decision:'判断・決定',departure:'出発',destinations:'目的地',digital:'デジタルの',directly:'直接',distributed:'配布された・分散した',documents:'文書',effectively:'効果的に',fertilizer:'肥料',folding:'折りたたみ式の',gym:'体育館',habitat:'生息地',habitats:'生息地',highlighting:'蛍光ペンなどで強調すること',hydration:'水分補給',ineffective:'効果がない',inexpensive:'安価な',installation:'設置',instruction:'指示・説明',interruptions:'中断',librarian:'司書',leakage:'液漏れ',margin:'余白',maintenance:'保守・点検',moderate:'適度な',nearly:'ほとんど',online:'オンラインの',operating:'作動している',parking:'駐車',paved:'舗装された',payment:'支払い',peak:'ピーク・最大点',printer:'プリンター',reminder:'通知・リマインダー',reminders:'通知・リマインダー',resident:'住民',residents:'住民',reusable:'再利用できる',runoff:'流出水',safer:'より安全な',sensory:'感覚に関する',server:'提供担当者',species:'種',steadily:'安定して',storm:'嵐・強い雨',storms:'嵐・強い雨',sunlight:'日光',symptom:'症状',symptoms:'症状',thirsty:'のどが渇いた',voltage:'電圧',worksheet:'ワークシート',worksheets:'ワークシート',
 seedling:'苗',seedlings:'苗',planting:'植えること',tomato:'トマト',tomatoes:'トマト',shadier:'より日陰の',slowly:'ゆっくり',impossible:'不可能な',degree:'程度',completely:'完全に',preventing:'防ぐこと',Saturday:'土曜日',schedule:'予定',leaves:'出発する・葉',train:'電車',minutes:'分',risk:'危険性',delay:'遅れ',reliability:'信頼性',avoiding:'避けること',print:'印刷する',printing:'印刷',paper:'紙',single:'片面の・単一の',sided:'面のある',recycling:'リサイクル',suggestion:'提案',selective:'選択的な',twelve:'12',thirteen:'13',signed:'申し込んだ',extra:'追加の',friend:'友人',immediately:'すぐに',uncertainty:'不確実さ',Thursday:'木曜日',reference:'参考用の',search:'検索',lesson:'説明・授業',coins:'硬貨',printed:'印刷された',guide:'案内',desk:'受付・机',late:'遅い',prevent:'妨げる',session:'時間・セッション',
 owner:'店主',opened:'開けた',temporary:'一時的な',reopened:'再開した',condition:'条件',nearby:'近くの',preferred:'希望する',realistic:'現実的な',adjust:'調整する',court:'コート',members:'メンバー',speaker:'話し手',factual:'事実に関する',station:'駅',prepared:'準備した',facts:'事実',meaningful:'意味のある',relationships:'関係',revealed:'明らかにした',gap:'不足・隔たり',explanation:'説明',
 seating:'座席',quiet:'静かな',outlet:'コンセント',sorting:'分別',mistake:'誤り',bins:'ごみ箱',unfinished:'未完了の',fiction:'物語・小説',biography:'伝記',commute:'通学',route:'経路',routes:'経路',notice:'掲示・通知',notices:'掲示・通知',followup:'追加の',unclaimed:'引き取られていない',umbrella:'傘',stationery:'文房具',clothing:'衣類',transportation:'交通手段',departures:'退出・出発',flexible:'柔軟な',finishing:'終了すること',
 layout:'配置',interruption:'中断',quietly:'静かに',transfer:'乗り換え',traffic:'交通',labels:'ラベル',bin:'ごみ箱',instruction:'説明',arrow:'矢印',visits:'訪問',strongest:'最も強い',relation:'関係',scores:'得点',proven:'証明された',heat:'熱',island:'島',streets:'通り',designs:'設計',leaked:'漏れた',queue:'行列',service:'提供・サービス',highlighting:'強調表示',links:'リンク',brand:'ブランド',assumptions:'思い込み',vegetable:'野菜',dish:'料理',description:'説明',maps:'地図',unusual:'通常でない',phones:'携帯電話',participation:'参加',scheduled:'予定された',
 aya:'アヤ（人名）',ken:'ケン（人名）',yuta:'ユウタ（人名）',sota:'ソウタ（人名）',nao:'ナオ（人名）',mao:'マオ（人名）',riku:'リク（人名）',lee:'リー（人名）',brown:'ブラウン（人名）'
};
try{if(typeof READING_GLOSSARY!=='undefined')Object.assign(READING_GLOSSARY,EXTRA_GLOSS)}catch(_){}
try{if(typeof LEXICAL_FUNCTION_WORDS!=='undefined')for(const w of ['s','t','re','ve','ll','d','m'])LEXICAL_FUNCTION_WORDS.add(w)}catch(_){}

function morphologyCandidates(w){
 const out=[];const add=x=>{if(x&&x!==w&&!out.includes(x))out.push(x)};
 const irregular={busiest:'busy',better:'good',best:'good',worse:'bad',worst:'bad',children:'child',men:'man',women:'woman',people:'people',feet:'foot',mice:'mouse',thought:'think',brought:'bring',bought:'buy',caught:'catch',taught:'teach',went:'go',gone:'go',came:'come',became:'become',made:'make',took:'take',taken:'take',gave:'give',given:'give',saw:'see',seen:'see',wrote:'write',written:'write',spoke:'speak',spoken:'speak',drove:'drive',driven:'drive',grew:'grow',grown:'grow',knew:'know',known:'know',chose:'choose',chosen:'choose'};
 add(irregular[w]);
 if(w.endsWith("'s"))add(w.slice(0,-2));
 if(w.endsWith('ies')&&w.length>4)add(w.slice(0,-3)+'y');
 if(w.endsWith('ied')&&w.length>4)add(w.slice(0,-3)+'y');
 if(w.endsWith('ing')&&w.length>5){const b=w.slice(0,-3);add(b);add(b+'e');if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b))add(b.slice(0,-1))}
 if(w.endsWith('ed')&&w.length>4){const b=w.slice(0,-2);add(b);add(b+'e');if(/([bcdfghjklmnpqrstvwxyz])\1$/.test(b))add(b.slice(0,-1))}
 if(w.endsWith('est')&&w.length>5){const b=w.slice(0,-3);add(b);add(b+'e');if(b.endsWith('i'))add(b.slice(0,-1)+'y')}
 if(w.endsWith('er')&&w.length>4){const b=w.slice(0,-2);add(b);add(b+'e');if(b.endsWith('i'))add(b.slice(0,-1)+'y')}
 if(w.endsWith('ly')&&w.length>4){const b=w.slice(0,-2);add(b);if(b.endsWith('i'))add(b.slice(0,-1)+'y')}
 if(w.endsWith('es')&&w.length>4){add(w.slice(0,-2));add(w.slice(0,-1))}
 if(w.endsWith('s')&&w.length>3)add(w.slice(0,-1));
 return out;
}

if(typeof glossLookup==='function'){
 const baseGlossLookup=glossLookup;
 glossLookup=function(raw){
   const first=baseGlossLookup(raw);if(first?.meaning)return first;
   const original=String(raw||''),w=original.toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g,'');
   for(const c of morphologyCandidates(w)){
     const info=baseGlossLookup(c);
     if(info?.meaning)return Object.assign({},first,{raw:original,word:w,lemma:info.lemma||c,meaning:info.meaning,source:info.source||'derived',learnable:info.learnable!==false,data:info.data||null,verbForms:info.verbForms||[]});
   }
   const m=EXTRA_GLOSS[w]||(typeof READING_GLOSSARY!=='undefined'?READING_GLOSSARY[w]:null);
   if(m)return Object.assign({},first,{raw:original,word:w,lemma:w,meaning:m,source:'quality-gloss',learnable:true,data:null});
   if(w){REPAIR.fallbackWords.add(w);return Object.assign({},first,{raw:original,word:w,lemma:w,meaning:`文脈語「${w}」（自動補完）`,source:'context-fallback',learnable:false,data:null})}
   return first;
 };
 if(typeof lexicalKnowledgeProbability==='function'){
   const baseLexicalKnowledgeProbability=lexicalKnowledgeProbability;
   lexicalKnowledgeProbability=function(info){if(info?.source==='context-fallback')return .35;return baseLexicalKnowledgeProbability(info)};
 }
}

function safeBlank(v){
 const answer=text(v?.word),meaning=text(v?.meaning),raw=text(v?.cloze||v?.example);
 let sentence=raw;
 if(sentence.includes('_____')&&!clozeLeaksAnswer(sentence,answer))return sentence;
 if(answer){
   const esc=answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const re=new RegExp(`(^|[^A-Za-z0-9])${esc}(?=$|[^A-Za-z0-9])`,'gi');
   sentence=raw.replace(re,(m,prefix)=>prefix+'_____');
 }
 if(!sentence.includes('_____')||clozeLeaksAnswer(sentence,answer))sentence=`「${meaning||'文脈に合う語句'}」になるように空所を補いなさい。\n\n_____`;
 return sentence;
}
function clozeDistractors(v){
 const answer=text(v.word).toLowerCase(),pos=text(v.pos);
 const pool=(typeof vocabPool==='function'?vocabPool():DATA.vocab).filter(x=>x&&text(x.word)&&text(x.word).toLowerCase()!==answer);
 const same=pool.filter(x=>pos&&text(x.pos)===pos),rest=pool.filter(x=>!same.includes(x));
 const out=[],seen=new Set([answer]);
 for(const x of [...shuffleLocal(same),...shuffleLocal(rest)]){const k=text(x.word).toLowerCase();if(!k||seen.has(k))continue;seen.add(k);out.push(x);if(out.length===3)break}
 return out;
}
function buildCloze(v,template=null){
 const answer=text(v.word),wrong=clozeDistractors(v);
 const choices=shuffleLocal([{text:answer,ok:true,reason:`文脈と意味の両方に合う語句は ${answer} です。`,error:null,distractorType:null},...wrong.map(x=>({text:text(x.word),ok:false,reason:'意味・品詞・語句の組合せが文脈に合いません。',error:'cloze_confusion',distractorType:'cloze_confusion'}))]);
 return Object.assign({},template||{},{id:`vocab:${v.id}:cloze:${typeof uid==='function'?uid('q'):Math.random().toString(36).slice(2)}`,reviewKey:v.srsId||('v:'+v.id),type:'vocab',stem:`空所に最も適切な語句を選びなさい。\n\n${safeBlank(v)}`,choices,answerIndex:choices.findIndex(c=>c.ok),explanation:`${answer} = ${text(v.meaning)}`,skills:[{id:'en.vocab.recall',role:'primary'}],expectedMs:18000,context:'cloze',srsId:v.srsId||('v:'+v.id),format:'cloze',source:v});
}
if(typeof makeVocabQ==='function'){
 const baseMakeVocabQ=makeVocabQ;
 makeVocabQ=function(forced=null,forcedFormat=null){
   const q=baseMakeVocabQ(forced,forcedFormat);
   if((forcedFormat==='cloze'||q?.format==='cloze')&&(forced||q?.source))return buildCloze(forced||q.source,q);
   if(q?.choices)for(const c of q.choices)if(!c.ok&&!c.distractorType)c.distractorType=c.error||'vocab_confusion';
   return q;
 };
}

function dueRank(pool,keyFn){
 return pool.map(v=>{const key=keyFn(v);let score=0;try{score=dueScore(itemState(key))-recentCorrectPenaltyForKey(key)}catch(_){score=Math.random()}return{v,score}}).sort((a,b)=>b.score-a.score);
}
function takeAdaptive(pool,n,keyFn){
 const ranked=dueRank(pool,keyFn),out=[];let work=ranked.slice(0,Math.min(ranked.length,Math.max(n*5,24)));
 while(work.length&&out.length<n){const width=Math.min(work.length,Math.max(5,n*2)),i=Math.floor(Math.random()*width);out.push(work.splice(i,1)[0].v)}
 return out;
}
if(typeof planVocabQueue==='function'){
 const basePlanVocabQueue=planVocabQueue;
 planVocabQueue=function(count=8){
   count=Math.max(0,Math.floor(Number(count)||0));if(count<4)return basePlanVocabQueue(count);
   const phraseN=Math.min(2,count),normalN=count-phraseN;
   const all=typeof vocabPool==='function'?vocabPool():DATA.vocab;
   const phrases=all.filter(v=>v&&v.pos==='phrase'&&text(v.word).includes(' '));
   const normals=all.filter(v=>v&&v.pos!=='phrase'&&!text(v.word).includes(' '));
   const normalChosen=takeAdaptive(normals,normalN,v=>v.srsId||('v:'+v.id));
   const phraseChosen=takeAdaptive(phrases,phraseN,v=>'phrase:'+v.id);
   const qs=[];
   for(const v of normalChosen){let f='meaning';try{f=nextVocabFormat(v)||'meaning'}catch(_){}qs.push(makeVocabQ(v,f))}
   phraseChosen.forEach((v,i)=>{const format=i%2?'cloze':'meaning',q=makeVocabQ(v,format),key='phrase:'+v.id;q.id=`phrase:${v.id}:${format}:${typeof uid==='function'?uid('q'):Math.random().toString(36).slice(2)}`;q.srsId=key;q.reviewKey=key;q.skills=[{id:'en.vocab.collocation',role:'primary'}];q.context=format==='cloze'?'phrase-cloze':'phrase-meaning';qs.push(q)});
   return shuffleLocal(qs).slice(0,count);
 };
}

function tagReadingQuestion(q){
 if(!q||!Array.isArray(q.choices))return q;
 const byType={detail:'detail_mismatch',inference:'unsupported_inference',mainIdea:'scope_shift',cause:'cause_confusion',grammarTransfer:'grammar_confusion',paraphrase:'paraphrase_mismatch'};
 for(const c of q.choices){if(c.ok)continue;const kind=c.distractorType||c.error||byType[q.type]||'content_mismatch';c.error=c.error||kind;c.distractorType=kind}
 q.distractorTypes=q.choices.filter(c=>!c.ok).map(c=>c.distractorType);
 return q;
}
if(typeof readingQuestionSet==='function'){
 const baseReadingQuestionSet=readingQuestionSet;
 readingQuestionSet=function(...args){const qs=baseReadingQuestionSet(...args);if(Array.isArray(qs))qs.forEach(tagReadingQuestion);return qs};
}
if(typeof generateReading==='function'){
 const baseGenerateReading=generateReading;
 generateReading=function(diff=7,mode='standard',requestedType=null){
   const wanted=String(requestedType||state?.ui?.readingType||'mixed');
   const needGenre=wanted==='narrative'?'narrative':wanted==='argument'?'expository':null;
   const oldType=state?.ui?.readingType;
   if(requestedType&&state?.ui)state.ui.readingType=requestedType;
   let r=null;
   try{
     for(let i=0;i<(needGenre?6:1);i++){const candidate=baseGenerateReading(diff,mode);r=candidate;if(!needGenre||candidate?.sourceGenre===needGenre||DATA.readingScenarios.find(sc=>sc.id===candidate?.scenarioId)?.genre===needGenre)break}
   }finally{if(requestedType&&state?.ui)state.ui.readingType=oldType}
   if(!r)return r;
   if(Array.isArray(r.questions))r.questions.forEach(tagReadingQuestion);
   if(wanted==='argument'){
     const q=r.questions?.find(x=>x.type==='mainIdea')||r.questions?.find(x=>x.skills?.some(s=>s.id==='en.read.mainIdea'));
     if(q)q.stem='筆者の中心的な主張として最も適切なものを選びなさい。';
   }
   return r;
 };
}

(function isolateFormulaRoute(){
 const bank=window.AA_V2_TEST_API?.banks?.math;if(!Array.isArray(bank))return;
 for(const row of bank){const m=String(row?.id||'').match(/^m(\d+)$/),n=m?Number(m[1]):null;if(n==null||n>57)row.area='extension'}
 REPAIR.mathBankCount=bank.length;
 try{const formula=window.AA_V2_TEST_API.subjectRows('math');REPAIR.mathFormulaCount=formula.length;REPAIR.mathAdvancedCount=formula.filter(r=>r.area==='advanced').length}catch(_){}
})();

REPAIR.audit=function(){
 const result={version:REPAIR.version,clozeBad:0,plan:false,unmapped:0,distractorBad:0,mathFormulaCount:REPAIR.mathFormulaCount||0,mathAdvancedCount:REPAIR.mathAdvancedCount||0,readingTypes:false,fallbackWords:[...REPAIR.fallbackWords]};
 try{for(const v of DATA.vocab){const q=makeVocabQ(v,'cloze');if(!q.stem.includes('_____')||clozeLeaksAnswer(q.stem,v.word)||q.choices[q.answerIndex]?.text!==v.word||new Set(q.choices.map(c=>c.text)).size!==4)result.clozeBad++}}catch(_){result.clozeBad++}
 try{const p=planVocabQueue(8);result.plan=p.length===8&&p.filter(q=>q.srsId?.startsWith('phrase:')).length===2&&new Set(p.map(q=>q.id)).size===8}catch(_){}
 try{for(let i=0;i<8;i++){const r=generateReading(7,'standard');result.unmapped+=lexicalCoverageProfile(r.passage).unmapped.length;result.distractorBad+=r.questions.filter(q=>q.choices.some(c=>!c.ok&&!c.distractorType)).length}}catch(_){result.unmapped++}
 try{const old=state.ui.readingType;state.ui.readingType='narrative';const n=generateReading(7,'standard');state.ui.readingType='argument';const a=generateReading(7,'standard');state.ui.readingType=old;result.readingTypes=n.sourceGenre==='narrative'&&a.sourceGenre==='expository'&&a.questions.some(q=>q.stem.includes('筆者の中心的な主張'))}catch(_){}
 result.pass=result.clozeBad===0&&result.plan&&result.unmapped===0&&result.distractorBad===0&&result.mathFormulaCount===57&&result.mathAdvancedCount===24&&result.readingTypes;
 result.fallbackWords=[...REPAIR.fallbackWords];return result;
};

document.dispatchEvent(new CustomEvent('aa:quality-repair-ready',{detail:{version:REPAIR.version,mathFormulaCount:REPAIR.mathFormulaCount,mathAdvancedCount:REPAIR.mathAdvancedCount}}));
})();
