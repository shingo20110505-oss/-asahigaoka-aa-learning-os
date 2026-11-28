import {esc,heading,button,empty,toast,link} from '../ui.mjs';
import {stageLabels,posLabels,posLabel,eikenBandLabels,selectEnglishWords,wordProgress,rateEnglishWord,toggleEnglishFavorite} from '../english-words.mjs';
import {createSpeechController} from '../speech.mjs';

const PAGE=40,RATES=[.6,.75,.9,1,1.15,1.3],SIZES=[10,20,30];
const wordIndexes=new WeakMap();
function wordIndex(words){let index=wordIndexes.get(words);if(!index){index=new Map(words.map(w=>[w.id,w]));wordIndexes.set(words,index);}return index;}
const sensePosLabels={noun:'名詞',verb:'動詞',adjective:'形容詞',adverb:'副詞',preposition:'前置詞',conjunction:'接続詞',pronoun:'代名詞',interjection:'間投詞',article:'冠詞',determiner:'限定詞',particle:'不変化詞',phrase:'熟語','prepositional phrase':'前置詞句','adverbial phrase':'副詞句',proverb:'ことわざ','proper noun':'固有名詞',numeral:'数詞',prefix:'接頭辞',suffix:'接尾辞',abbreviation:'略語',contraction:'短縮形'};

export async function mount({main,store,data,active,query}){
 const [words,meta]=await Promise.all([data('english/words'),data('english/metadata')]);
 if(!active())return;
 const byId=wordIndex(words);
 let settings={query:query?.get('q')||'',stage:'all',kind:'all',pos:'all',filter:'all',band:'all',favoriteOnly:false,exampleOnly:false};
 let page=0,revealed=new Set(query?.get('word')?[query.get('word')]:[]),session=null,index=0,answer=false,saving=false,disposed=false,composing=false,searchTimer;
 let cachedRows=null,cachedState=null,cachedKey='',cachedAt=0;
 let audio=readAudio(),studySize=readSize(),studyOrder=store.state.settings.englishStudyOrder==='shuffle'?'shuffle':'review';
 const speech=createSpeechController({onChange:state=>{
  if(disposed)return;
  updateAudio(state);
  if(state.status==='error'&&active())toast(state.message,true);
 },onVoicesChange:()=>updateVoices()});
 function readAudio(){const s=store.state.settings;return {rate:RATES.includes(Number(s.speechRate??s.readerSpeechRate))?Number(s.speechRate??s.readerSpeechRate):.9,voiceURI:typeof s.speechVoiceURI==='string'?s.speechVoiceURI:'',repeat:[1,2,3].includes(Number(s.speechRepeat))?Number(s.speechRepeat):1};}
 function readSize(){const n=Number(store.state.settings.englishStudySize);return SIZES.includes(n)?n:10;}
 function invalidate(){cachedRows=null;}
 function rows(){
  const key=JSON.stringify(settings),now=Date.now();
  if(cachedRows&&cachedState===store.state&&cachedKey===key&&now-cachedAt<30000)return cachedRows;
  const found=selectEnglishWords(words,store.state,settings,now),id=query?.get('word'),pinned=id?found.findIndex(w=>w.id===id):-1;
  if(pinned>0)found.unshift(...found.splice(pinned,1));
  cachedRows=found;cachedState=store.state;cachedKey=key;cachedAt=now;return found;
 }
 const status=w=>{const p=wordProgress(store.state,w.id);return !p.repetitions?'未学習':['again','hard'].includes(p.rating)?'苦手':p.due<=Date.now()?'復習日':'学習済み';};
 const favoriteButton=w=>{const saved=Boolean(wordProgress(store.state,w.id).favorite);return button(saved?'★':'☆','favorite','secondary small english-favorite',`data-id="${w.id}" aria-pressed="${saved}" aria-label="${esc(w.word)}をお気に入り${saved?'から外す':'に登録'}" title="${saved?'お気に入りから外す':'お気に入りに登録'}" ${saving?'disabled':''}`);};
 const speakButton=w=>button('読み上げ','speak','secondary small',`data-text="${esc(w.word)}" aria-label="${esc(w.word)} を読み上げ"`);
 const exampleButton=text=>button('例文を聞く','speak-example','secondary small',`data-text="${esc(text)}"`);
 const sourceHTML=w=>(w.sources||[]).map(id=>{const s=meta.sources.find(s=>s.id===id);return s?.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:esc(s?.title||id);}).join(' · ');
 const exampleHTML=(en,ja,source)=>`<blockquote class="english-example"><p lang="en">${esc(en)}</p>${ja?`<p>${esc(ja)}</p>${source==='mt'?'<small class="muted">和訳は機械翻訳です</small>':''}`:'<small class="muted">和訳は準備中</small>'}${exampleButton(en)}</blockquote>`;
 const sensesHTML=w=>w.senses?.length?`<div class="english-senses"><h3>辞書の語義・例文</h3>${w.senses.map(s=>`<div class="english-sense"><p class="english-sense-pos">${esc(sensePosLabels[s.pos]||posLabel(s.pos))}</p><ol>${(s.definitions||[]).map(d=>`<li><span lang="en">${esc(d.definitionEn)}</span>${d.example?.en?exampleHTML(d.example.en,d.example.ja,d.example.source):''}</li>`).join('')}</ol>${s.synonyms?.length?`<p class="small"><b>類義語</b> ${esc(s.synonyms.join(' · '))}</p>`:''}${s.antonyms?.length?`<p class="small"><b>反義語</b> ${esc(s.antonyms.join(' · '))}</p>`:''}</div>`).join('')}</div>`:'';
 const formsHTML=w=>{
  const labels={past:'過去形',participle:'過去分詞',present:w.word==='be'?'現在形':'三人称単数現在形',ing:'現在分詞・動名詞'};
  const forms=w.verbForms||{};
  const labeled=new Set(Object.values(forms).flat());
  const other=(w.forms||[]).filter(form=>!labeled.has(form));
  return Object.entries(forms).map(([key,values])=>`<p class="small"><b>${labels[key]}</b> <span lang="en">${esc(values.join(' / '))}</span></p>`).join('')+
    (other.length?`<p class="small"><b>${labeled.size?'その他の別形':'活用・別のつづり'}</b> <span lang="en">${esc(other.join(' · '))}</span></p>`:'');
 };
 const details=(w,withAudio=true)=>`${w.meaning?`<p class="english-meaning">${esc(w.meaning)}</p>`:'<p class="english-meaning muted">日本語の意味は準備中です。下の英語の語義を見てください。</p>'}<div class="english-ipa">${w.pronunciation?.ipa?`<span lang="en">${esc(w.pronunciation.ipa)}</span>`:''}${w.eikenBand?`<span class="small muted">レベル：${esc(eikenBandLabels[w.eikenBand]||w.eikenBand)}</span>`:''}${withAudio?speakButton(w):''}</div>${w.explanation?`<p>${esc(w.explanation)}</p>`:''}${w.example?exampleHTML(w.example,w.exampleJa,w.exampleSource):''}${sensesHTML(w)}${!w.example&&!w.senses?.length?'<p class="small muted">例文は準備中</p>':''}${formsHTML(w)}${w.related?.length?`<p class="small"><b>関連語</b> ${esc(w.related.join(' · '))}</p>`:''}<details class="english-provenance"><summary>出典・確認状況</summary><p class="small">${sourceHTML(w)}</p><p class="small muted">${w.quality==='dictionary-import'?'公開辞書から収録。語義・品詞の個別校閲は未完了。':w.quality==='authored'?'RISE独自の補足。':w.quality==='dictionary-expansion'?'辞書拡張で追加した見出し。語義・例文はWiktionary由来、和訳の一部は機械翻訳。':'RISEの既存教材から収録。'}${w.rank?' NGSL頻度順位 '+w.rank+'。':''}</p></details>`;
 const optionsHTML=(options,value)=>options.map(([v,t])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(t)}</option>`).join('');
 const controls=(label,key,options)=>`<label class="field"><span>${label}</span><select data-select="${key}" aria-label="${label}">${optionsHTML(options,settings[key])}</select></label>`;
 function voiceOptions(){
  const options=[['','自動（端末内の英語音声）'],...speech.voices.map(v=>[v.voiceURI,`${v.name} · ${v.lang}`])];
  if(audio.voiceURI&&!speech.voices.some(v=>v.voiceURI===audio.voiceURI))options.push([audio.voiceURI,'保存した音声（利用できません）']);
  return optionsHTML(options,audio.voiceURI);
 }
 function audioHTML(){return `<section class="english-audio" aria-labelledby="english-audio-title"><div class="english-audio-heading"><h2 id="english-audio-title">音声で覚える</h2><span class="badge">端末内の英語音声</span></div><div class="english-audio-settings"><label class="field english-voice-field"><span>英語の音声</span><select data-audio="voiceURI" aria-label="英語の音声">${voiceOptions()}</select></label><label class="field"><span>読み上げ速度</span><select data-audio="rate" aria-label="読み上げ速度">${optionsHTML(RATES.map(n=>[n,n+'倍']),audio.rate)}</select></label><label class="field"><span>繰り返し</span><select data-audio="repeat" aria-label="読み上げの繰り返し">${optionsHTML([1,2,3].map(n=>[n,n+'回']),audio.repeat)}</select></label></div><div class="actions">${button('音声を試す','audio-test','secondary small')}${button('一時停止','audio-pause','secondary small','disabled')}${button('停止','audio-stop','secondary small','disabled')}${button('音声を再確認','audio-refresh','ghost small')}</div><p id="english-audio-status" class="small" role="status" aria-live="polite">${esc(speech.state.message)}</p><p class="small muted">英語音声を端末に入れておけば、オフラインで読み上げられます。音声・速度と学習記録はこの端末に保存します。</p></section>`;}
 function updateAudio(state=speech.state){
  const el=main.querySelector('#english-audio-status');if(el){el.textContent=state.message;el.dataset.status=state.status;}
  const pause=main.querySelector('[data-action=audio-pause]'),stop=main.querySelector('[data-action=audio-stop]');
  if(pause){pause.disabled=!['speaking','paused'].includes(state.status);pause.textContent=state.status==='paused'?'再開':'一時停止';}
  if(stop)stop.disabled=!['loading','speaking','paused'].includes(state.status);
 }
 function updateVoices(){const select=main.querySelector('[data-audio=voiceURI]');if(select)select.innerHTML=voiceOptions();}
 function listHTML(){
  const list=rows(),pages=Math.max(1,Math.ceil(list.length/PAGE));page=Math.max(0,Math.min(page,pages-1));
  return `<div class="english-result"><p role="status">${list.length.toLocaleString()}件 · ${page+1} / ${pages}ページ</p><div class="actions">${button('前へ','prev','secondary small',page?'':'disabled')}${button('次へ','next','secondary small',page+1<pages?'':'disabled')}</div></div>`+(list.length?`<div class="english-word-list">${list.slice(page*PAGE,(page+1)*PAGE).map(w=>`<article class="english-word-card"><div class="english-word-header"><button class="english-word-toggle" data-action="word" data-id="${w.id}" aria-expanded="${revealed.has(w.id)}" aria-controls="detail-${w.id}"><span><strong lang="en">${esc(w.display||w.word)}</strong><small>${esc(posLabel(w.pos))} · ${esc(stageLabels[w.stage])}</small></span><span class="english-word-status">${status(w)}<small>${revealed.has(w.id)?'意味を隠す':'意味を見る'}</small></span></button>${favoriteButton(w)}</div><div id="detail-${w.id}" class="english-word-detail" ${revealed.has(w.id)?'':'hidden'}>${revealed.has(w.id)?details(w):''}</div></article>`).join('')}</div>`:empty('この条件の単語はありません','検索語や絞り込みを変えて、もう一度探してください。',button('絞り込みをリセット','reset','secondary')));
 }
 function scopeHTML(){return `<details class="english-method"><summary>収録範囲・数え方・出典</summary><p>${esc(meta.scope)}</p><p>基本 ${meta.counts.stage.basic.toLocaleString()}件 ／ 入試準備 ${meta.counts.stage.entrance.toLocaleString()}件 ／ 発展 ${meta.counts.stage.extension.toLocaleString()}件。活用・別綴り ${meta.counts.forms.toLocaleString()}件は見出し数に含めません。</p><p>NGSL頻度付きリスト ${meta.counts.ngslCovered} / ${meta.counts.ngslRanked}見出しを収録。例文 ${meta.counts.examples}件、和訳付き ${meta.counts.translatedExamples}件。品詞未分類 ${meta.counts.unclassifiedPOS.toLocaleString()}件。</p><ul>${meta.limitations.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>レベルは学習の目安です。英検の公式出題範囲や、各級の完全収録を示すものではありません。</p><p><a href="https://www.mext.go.jp/content/20260121-mxt_kyoiku01-000046777_03.pdf" target="_blank" rel="noopener">文科省の語彙に関する資料</a>：小学校600〜700語、中学校では新たに1,600〜1,800語が目安。全教科書共通の指定単語リストではありません。</p><p>${meta.sources.filter(s=>s.url).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>（${esc(s.license)}）`).join('<br>')}</p><p>NGSL由来の選定・順位を含む本データベースは <a href="${esc(meta.licenseURL)}" target="_blank" rel="noopener">CC BY-SA 4.0</a>。出典の結合・分類・別形整理・RISE語義の追加を行いました。</p></details>`;}
 function draw(){
  if(disposed)return;
  let learned=0,favorites=0;for(const [id,p] of Object.entries(store.state.vocabulary)){if(!byId.has(id))continue;if(p.repetitions)learned++;if(p.favorite)favorites++;}
  main.innerHTML=heading('ENGLISH WORD BANK','英単語・熟語','語句を調べる、発音を聞く、お気に入りから繰り返し学ぶ。',link('英語リーダー','reading','secondary'))+`<div class="metric-strip english-metrics"><div><b>${meta.counts.kind.word.toLocaleString()}</b><span>単語の見出し</span></div><div><b>${meta.counts.kind.phrase.toLocaleString()}</b><span>熟語・連語</span></div><div><b>${learned.toLocaleString()}</b><span>学習した見出し</span></div><div><b>${favorites.toLocaleString()}</b><span>お気に入り</span></div></div>`+scopeHTML()+audioHTML();
  if(session){
   const w=session[index];
   main.innerHTML+=`<div class="session-bar"><span>${Math.min(index+1,session.length)} / ${session.length}語</span>${button('一覧に戻る','end','secondary small')}</div>`+(w?`<section class="panel english-study"><p class="eyebrow">${esc(stageLabels[w.stage])} · ${esc(posLabel(w.pos))}</p><h2 lang="en">${esc(w.display||w.word)}</h2><div class="actions">${button(answer?'意味を隠す':'意味を表示','flip','primary',`aria-expanded="${answer}"`)}${speakButton(w)}${favoriteButton(w)}</div>${answer?details(w,false)+`<div class="english-ratings">${[['again','まだ覚えていない'],['hard','迷った'],['good','覚えた']].map(([r,t])=>button(t,'rate','secondary',`data-rating="${r}" ${saving?'disabled':''}`)).join('')}</div>`:'<p class="muted">意味を思い出してから、答えを開こう。</p>'}</section>`:empty('今回の学習が終わりました','覚え具合と次の復習日を、この端末に保存しました。',button('一覧に戻る','end','primary')));
  }else{
   main.innerHTML+=`<label class="field english-search-field"><span>英単語・意味・活用形を検索</span><input class="search" type="search" data-search aria-label="英単語・意味・活用形を検索" value="${esc(settings.query)}" placeholder="例：学校、arisen、fell through" autocomplete="off"></label><div class="english-filters">${controls('学習段階','stage',[['all','すべて'],...Object.entries(stageLabels)])}${controls('種類','kind',[['all','単語＋熟語'],['word','単語'],['phrase','熟語・連語']])}${controls('レベルの目安','band',[['all','すべて'],...Object.entries(eikenBandLabels)])}${controls('品詞','pos',[['all','すべて'],...Object.entries(posLabels).filter(([v])=>v!=='mixed')])}${controls('学習状況','filter',[['all','すべて'],['new','未学習'],['due','今日の復習'],['weak','苦手'],['learned','学習済み']])}</div><div class="english-checks"><label><input type="checkbox" data-toggle="favoriteOnly" ${settings.favoriteOnly?'checked':''}> お気に入りだけ</label><label><input type="checkbox" data-toggle="exampleOnly" ${settings.exampleOnly?'checked':''}> 例文付きだけ</label>${button('絞り込みをリセット','reset','ghost small')}</div><div class="english-practice-options"><label class="field"><span>1回の学習量</span><select data-pref="studySize" aria-label="1回の学習量">${optionsHTML(SIZES.map(n=>[n,n+'語']),studySize)}</select></label><label class="field"><span>出題順</span><select data-pref="studyOrder" aria-label="出題順">${optionsHTML([['review','復習日・未学習を優先'],['shuffle','ランダム']],studyOrder)}</select></label><div class="actions english-actions">${button('この条件で学ぶ','start','primary',rows().length?'':'disabled')}${button('このページを聞く','listen-page','secondary',rows().length?'':'disabled')}</div></div><div class="actions english-actions">${button('表示中の意味を見る','show','secondary small')}${button('意味を隠す','hide','ghost small')}</div><div id="english-results">${listHTML()}</div>`;
  }
  updateAudio();
 }
 function list(){const host=main.querySelector('#english-results');if(!host)return;host.innerHTML=listHTML();for(const action of ['start','listen-page']){const b=main.querySelector(`[data-action=${action}]`);if(b)b.disabled=!rows().length;}}
 function search(){clearTimeout(searchTimer);searchTimer=undefined;settings.query=main.querySelector('[data-search]')?.value||'';page=0;invalidate();list();}
 function flushSearch(){clearTimeout(searchTimer);searchTimer=undefined;const input=main.querySelector('[data-search]');if(input&&input.value!==settings.query)search();}
 function speak(texts,repeat=audio.repeat){speech.speak(texts,{...audio,repeat});}
 async function saveSetting(key,value){try{await store.change(s=>{s.settings[key]=value;});}catch(error){toast('設定を保存できませんでした。'+error.message,true);}}
 main.oninput=e=>{if(e.target.matches('[data-search]')&&!composing&&!e.isComposing){clearTimeout(searchTimer);searchTimer=setTimeout(search,140);}};
 main.oncompositionstart=e=>{if(e.target.matches('[data-search]')){composing=true;clearTimeout(searchTimer);}};
 main.oncompositionend=e=>{if(e.target.matches('[data-search]')){composing=false;clearTimeout(searchTimer);searchTimer=setTimeout(search,140);}};
 main.onkeydown=e=>{if(e.key==='Enter'&&!composing&&!e.isComposing&&e.keyCode!==229&&e.target.matches('[data-search]')){e.preventDefault();search();}};
 main.onchange=async e=>{
  const key=e.target.dataset.select,toggle=e.target.dataset.toggle,pref=e.target.dataset.pref,audioKey=e.target.dataset.audio;
  if(key&&['stage','kind','pos','filter','band'].includes(key)){flushSearch();settings[key]=e.target.value;page=0;invalidate();draw();}
  if(toggle&&['favoriteOnly','exampleOnly'].includes(toggle)){clearTimeout(searchTimer);settings.query=main.querySelector('[data-search]')?.value||'';settings[toggle]=e.target.checked;page=0;invalidate();list();}
  if(pref==='studySize'){studySize=SIZES.includes(Number(e.target.value))?Number(e.target.value):10;await saveSetting('englishStudySize',studySize);}
  if(pref==='studyOrder'){studyOrder=e.target.value==='shuffle'?'shuffle':'review';await saveSetting('englishStudyOrder',studyOrder);}
  if(audioKey&&['rate','voiceURI','repeat'].includes(audioKey)){
   speech.stop();audio[audioKey]=audioKey==='voiceURI'?e.target.value:Number(e.target.value);
   await saveSetting({rate:'speechRate',voiceURI:'speechVoiceURI',repeat:'speechRepeat'}[audioKey],audio[audioKey]);
  }
 };
 main.onclick=async e=>{
  const b=e.target.closest('[data-action]');if(!b||!main.contains(b))return;const a=b.dataset.action;
  try{
   if(a==='speak'||a==='speak-example'){speak([b.dataset.text||'']);return;}
   if(a==='audio-test'){speak(['Hello. Let us practice English together.'],1);return;}
   if(a==='audio-refresh'){speech.refreshVoices();updateVoices();updateAudio();return;}
   if(a==='audio-pause'){speech.togglePause();return;}
   if(a==='audio-stop'){speech.stop();return;}
   if(a==='listen-page'){flushSearch();speak(rows().slice(page*PAGE,(page+1)*PAGE).map(w=>w.word));return;}
   if(saving)return;
   if(['favorite','prev','next','show','hide','start'].includes(a))flushSearch();
   if(a==='favorite'){
    if(!byId.has(b.dataset.id))return;
    saving=true;b.disabled=true;await store.change(s=>toggleEnglishFavorite(s,b.dataset.id));saving=false;invalidate();draw();
   }
   if(a==='word'){
    const w=byId.get(b.dataset.id);if(!w)return;const show=!revealed.has(w.id);show?revealed.add(w.id):revealed.delete(w.id);
    b.setAttribute('aria-expanded',String(show));b.querySelector('.english-word-status small').textContent=show?'意味を隠す':'意味を見る';
    const detail=main.querySelector('#detail-'+w.id);detail.hidden=!show;detail.innerHTML=show?details(w):'';
   }
   if(a==='prev'||a==='next'){speech.stop();page+=a==='next'?1:-1;list();main.querySelector('#english-results').scrollIntoView({block:'start'});}
   if(a==='show'||a==='hide'){revealed=a==='show'?new Set(rows().slice(page*PAGE,(page+1)*PAGE).map(w=>w.id)):new Set();list();}
   if(a==='reset'){clearTimeout(searchTimer);settings={query:'',stage:'all',kind:'all',pos:'all',filter:'all',band:'all',favoriteOnly:false,exampleOnly:false};page=0;invalidate();draw();}
   if(a==='start'){
    const pool=[...rows()];if(!pool.length)return;speech.stop();
    if(studyOrder==='shuffle'){for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}}
    else{const now=Date.now(),priority=w=>{const p=wordProgress(store.state,w.id);return p.repetitions&&p.due<=now?0:!p.repetitions?1:2;};pool.sort((a,b)=>priority(a)-priority(b));}
    session=pool.slice(0,studySize);index=0;answer=false;draw();main.querySelector('.english-study')?.scrollIntoView({block:'start'});
   }
   if(a==='flip'){answer=!answer;draw();}
   if(a==='end'){speech.stop();session=null;answer=false;draw();}
   if(a==='rate'&&answer&&session?.[index]){
    speech.stop();saving=true;draw();const id=session[index].id;await store.change(s=>rateEnglishWord(s,id,b.dataset.rating));
    index++;answer=false;saving=false;invalidate();draw();
   }
  }catch(error){saving=false;draw();toast(error.message,true);}
 };
 const stop=()=>{clearTimeout(searchTimer);speech.stop();};
 const visibility=()=>{if(document.hidden){if(!session)flushSearch();stop();}};
 window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',visibility);
 draw();
 const dispose=()=>{disposed=true;clearTimeout(searchTimer);speech.dispose();window.removeEventListener('pagehide',stop);document.removeEventListener('visibilitychange',visibility);main.onclick=main.oninput=main.onchange=main.oncompositionstart=main.oncompositionend=main.onkeydown=null;};
 dispose.suspend=()=>{if(!session)flushSearch();stop();};
 dispose.resume=()=>{audio=readAudio();studySize=readSize();studyOrder=store.state.settings.englishStudyOrder==='shuffle'?'shuffle':'review';speech.refreshVoices();draw();};
 dispose.refresh=()=>{audio=readAudio();studySize=readSize();studyOrder=store.state.settings.englishStudyOrder==='shuffle'?'shuffle':'review';invalidate();draw();};
 return dispose;
}
