import {esc, icon, heading, button, link, badge, empty, dialog, field, area, select, toast} from '../ui.mjs';
import {uid, dayKey} from '../domain.mjs';
import {paragraphs, readingItems, isReadingDue, planReadingReview, readingNoteBody, ReadingClock} from '../reading-domain.mjs';
import {readingGuide, paragraphRoles} from '../reading-guide.mjs';

export async function mount(ctx) {
  const {main, store, data, tail} = ctx, index = await data('reading/index');
  if (!ctx.active()) return;
  const options = {level:'全部', filter:'すべて', query:'', sort:'標準'};
  let current = null, clock = new ReadingClock(), paused = false, reveal = false, parallel = false, signals = false;
  let draft = '', memoVersion = 0, savedMemoVersion = 0, selection = '', selectionParagraph = null;
  let openTicket = 0, memoTimer, scrollTimer, disposed = false, page = 1, audioState = '停止中';
  const record = () => store.state.reading[current?.id] || {};
  const items = () => readingItems(index, store.state.reading, options);
  const totalTime = () => (Number(record().seconds) || 0) + clock.value() / 1000;
  const duration = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
  const date = value => value ? dayKey(value).replaceAll('-', '/') : '';
  const pressed = value => `aria-pressed="${Boolean(value)}"`;

  async function save() {
    if (!current) return;
    const id = current.id, savedClock = clock, elapsed = savedClock.take(), memo = draft, version = memoVersion;
    const writeMemo = version !== savedMemoVersion;
    if (!elapsed && !writeMemo) return;
    try {
      await store.change(s => {
        const old = s.reading[id] || {};
        s.reading[id] = {...old, seconds:(Number(old.seconds) || 0) + elapsed / 1000, ...(writeMemo ? {memo} : {})};
      });
      if (current?.id === id) { if (writeMemo) savedMemoVersion = version; memoStatus(); }
    } catch (error) {
      savedClock.restore(elapsed);
      if (current?.id === id) memoStatus('保存できませんでした。メモを保存し直してください。');
      throw error;
    }
  }
  function memoStatus(message) {
    if (!ctx.active()) return;
    const el = main.querySelector('#memo-status');
    if (el) el.textContent = message || (memoVersion === savedMemoVersion ? '保存済み' : '未保存の変更があります');
  }
  function stopSpeech() { window.speechSynthesis?.cancel(); audioState = '停止中'; audioStatus(); }
  function audioStatus() { const el = main.querySelector('#reading-audio-status'); if (el) el.textContent = audioState; }
  function library() {
    ++openTicket; clearTimeout(scrollTimer); stopSpeech(); clock.pause(); current = null; selection = '';
    if (location.hash.startsWith('#/reading/')) history.pushState(null, '', '#/reading');
    const last = index.find(x => x.id === store.state.settings.lastReading);
    const due = index.filter(x => isReadingDue(store.state.reading[x.id])).length;
    const completed = index.filter(x => store.state.reading[x.id]?.completedAt).length;
    main.innerHTML = heading('ENGLISH READER', '読んで、つなげて、思い出す。', `${index.length}本の英文と和訳。読む途中の疑問から、読み返す日まで。`, button('未読を選んで読む', 'random', 'primary')) +
      `<section class="reader-library-intro panel"><div><p class="eyebrow">YOUR READING LIBRARY</p><h2>${completed}<small> / ${index.length} 本を読了</small></h2><p>最初は英文だけで要点をつかむ。次に、段落・指示語・根拠を確かめる。最後に和訳と比べて、読み違いを残しましょう。</p></div><div class="reader-next">${last ? `<span class="small muted">前回の英文</span><h3 lang="en">${esc(last.title)}</h3>${button('続きから読む', 'open', 'secondary', `data-id="${last.id}"`)}` : '<h3>自分のペースで1本から</h3><p class="small muted">Levelはライブラリ内の目安です。入試の合否や学年を表すものではありません。</p>'}${button(`復習する ${due} 本`, 'due-list', 'ghost small')}</div></section>` +
      `<div class="toolbar"><input class="search" data-search aria-label="英文タイトル・メモを検索" placeholder="タイトル・自分のメモを検索" value="${esc(options.query)}">${select('並び順','readingSort',['標準','短い順','最近開いた順','復習日順'],options.sort)}${link('自分の単語カード','memory','secondary')}</div>` +
      `<div class="chips" aria-label="難度">${['全部',1,2,3,4,5].map(n => button(n === '全部' ? n : 'Level '+n,'level','chip '+(String(options.level)===String(n)?'active':''),`data-value="${n}" ${pressed(String(options.level)===String(n))}`)).join('')}</div>` +
      `<div class="chips" aria-label="読書状況">${['すべて','未読','読みかけ','読了','復習する','お気に入り'].map(n => button(n,'filter','chip '+(options.filter===n?'active':''),`data-value="${n}" ${pressed(options.filter===n)}`)).join('')}</div><p class="small muted" id="reading-count" role="status"></p><div id="reading-list" class="reading-grid"></div><div class="reader-pagination" id="reading-pagination"></div>` +
      `<details class="reader-library-help panel"><summary>旭丘を目指す長文の読み方</summary><p>愛知県の2024〜2026年度の筆記では、大問2で英文とグラフ、大問3で長文、大問4で会話と表などの条件を読む構成が見られます。RISEの英文を読む際も、根拠・比較・指示語を自分の言葉で確かめます。</p><p class="small muted">この130本は既存のRISE教材です。公式過去問の転載ではありません。出題構成は今後の予告ではありません。</p><div class="actions">${link('英文とデータを照合する','explore/data','secondary small')}${link('根拠を整理する','evidence?subject=英語','secondary small')}${link('公式問題と対策を見る','exam','ghost small')}</div></details>`;
    updateList();
  }
  function updateList() {
    const all = items(); page = Math.max(1, Math.min(page, Math.ceil(all.length / 24) || 1));
    main.querySelector('#reading-count').textContent = `${all.length}本${all.length ? ` · ${(page-1)*24+1}〜${Math.min(page*24,all.length)}本を表示` : ''}`;
    main.querySelector('#reading-list').innerHTML = all.slice((page-1)*24,page*24).map(x => {
      const p = store.state.reading[x.id] || {}, due = isReadingDue(p);
      return `<button class="reading-entry" data-action="open" data-id="${x.id}"><div class="card-meta">${badge('LEVEL '+x.level,'green')}${badge(x.words+' words')}${p.favorite ? badge('★') : ''}${due ? badge('復習する','orange') : p.completedAt ? badge('読了','green') : p.lastOpened ? badge('読みかけ') : ''}</div><h2 lang="en">${esc(x.title)}</h2>${p.memo ? `<p class="reading-entry-memo">${esc(p.memo.slice(0,90))}</p>` : ''}<span class="entry-footer">${due?'要点を思い出す':p.lastOpened?'続き・読み返し':'読みはじめる'} ${icon('arrow',17)}</span>${p.review?.due ? `<small class="muted">復習日 ${date(p.review.due)}</small>` : ''}</button>`;
    }).join('') || empty('該当する英文がありません','検索語・難度・読書状況を変えてみてください。');
    main.querySelector('#reading-pagination').innerHTML = all.length > 24 ? `${button('前の24本','previous','secondary small',page===1?'disabled':'')}<span>${page} / ${Math.ceil(all.length/24)}</span>${button('次の24本','next','secondary small',page*24>=all.length?'disabled':'')}` : '';
  }
  async function open(id) {
    const ticket = ++openTicket;
    clock.pause();
    try { await save(); } catch (error) { if (!paused && !document.hidden) clock.start(); throw error; }
    clearTimeout(memoTimer); clearTimeout(scrollTimer);
    let book;
    try { book = await data('reading/'+id); } catch (error) { if (!paused && !document.hidden && current && ctx.active()) clock.start(); throw error; }
    if (!ctx.active() || ticket !== openTicket) return;
    // Opening a book must succeed in storage before replacing the current book or its draft.
    await store.change(s => {s.settings.lastReading=id;s.reading[id]={...s.reading[id],lastOpened:Date.now()};});
    if (!ctx.active() || ticket !== openTicket) return;
    stopSpeech(); clock.pause(); current = book; clock = new ReadingClock(); paused = false;
    if (!document.hidden) clock.start();
    draft = record().memo || ''; memoVersion = savedMemoVersion = 0; selection = ''; selectionParagraph = null; reveal = parallel = false;
    if (location.hash !== '#/reading/'+id) history.pushState(null,'','#/reading/'+id);
    draw(); main.querySelector('h1')?.focus({preventScroll:true}); window.scrollTo({top:0});
  }
  const marked = text => signals ? esc(text).replace(/\b(on the other hand|for example|for instance|however|although|therefore|because|instead|finally|but|so)\b/gi,'<mark class="reading-signal">$1</mark>') : esc(text);
  function draw() {
    if (!current || !ctx.active()) return;
    const x = current, p = record(), paras = paragraphs(x.passage), extrasOpen=main.querySelector('#reader-extra')?.open||false;
    const font = Math.max(16,Math.min(30,Number(store.state.settings.fontSize)||19));
    const speed = Number(store.state.settings.readerSpeechRate)||.9;
    main.innerHTML = `<div class="reader-top">${button('← ライブラリ','back','ghost')}<div class="actions">${badge('LEVEL '+x.level,'green')}${badge((index.find(i=>i.id===x.id)?.words || x.passage.trim().split(/\s+/).length)+' words')}${button(p.favorite?'★ お気に入り':'☆ お気に入り','favorite','ghost small',pressed(p.favorite))}</div></div>` +
      `<article class="reader panel${parallel?' is-parallel':''}" style="--reading-size:${font}px"><p class="eyebrow">READ • UNDERSTAND • REVISIT</p><h1 lang="en" tabindex="-1">${esc(x.title)}</h1><div class="reader-session"><span>表示中の累計 <b id="read-time">${duration(totalTime())}</b></span>${button(paused?'計測を再開':'計測を止める','pause-clock','ghost small',pressed(paused))}</div>` +
      `<p class="reader-reading-steps">英文を読む → 根拠を確認 → 和訳と照合</p>` +
      `${p.paragraph>0 && p.paragraph<paras.length ? button('しおりの段落 '+(p.paragraph+1)+' へ','resume','secondary small') : ''}<div class="reader-tools">${button(parallel?'英文だけで読む':'英文・訳を並べる','parallel','secondary small',pressed(parallel))}${button(signals?'接続表現の目印を消す':'接続表現に目印','signals','ghost small',pressed(signals))}${button('読み方のヒント','guide','ghost small')}</div>` +
      `<details class="reader-extra" id="reader-extra" ${extrasOpen?'open':''}><summary>音読・文字サイズ・選択メモ</summary><div class="reader-tools">${button('文字 −','smaller','secondary small',font<=16?'disabled':'')}${button('文字 ＋','larger','secondary small',font>=30?'disabled':'')}<span class="small muted">${font}px</span>${button('選択した語をカードに','capture','secondary small')}${button('選択部分にメモ','annotate','secondary small')}</div><div class="reader-audio">${button('全文を聴く','speak','secondary small')}${button('一時停止 / 再開','pause-speech','ghost small')}${button('停止','stop-speech','ghost small')}<label>速度 <select name="speechRate" aria-label="読み上げ速度">${[.6,.75,.9,1,1.15,1.3].map(n=>`<option value="${n}" ${speed===n?'selected':''}>${n}倍</option>`).join('')}</select></label><span class="small muted" id="reading-audio-status" role="status">${esc(audioState)}</span></div></details>` +
      `${signals?'<p class="small muted">色は接続表現の候補です。so などは別の使い方もあるため、前後の文で役割を確かめます。</p>':''}<div class="reader-columns ${parallel?'parallel':''}"><div class="passage" id="passage" lang="en">${paras.map((t,i)=>`<section class="reading-paragraph"><div class="paragraph-heading"><span>PARAGRAPH ${i+1}</span>${p.paragraphRoles?.[i] && p.paragraphRoles[i]!=='未分類'?badge(p.paragraphRoles[i]):''}${button('聴く','speak-paragraph','ghost small',`data-paragraph-index="${i}" aria-label="段落 ${i+1} を聴く"`)}${button('役割をメモ','paragraph-note','ghost small',`data-paragraph-index="${i}" aria-label="段落 ${i+1} の役割をメモ"`)}${button('しおり','bookmark','ghost small',`data-paragraph-index="${i}" aria-label="段落 ${i+1} にしおり"`)}</div><p data-paragraph="${i}" tabindex="-1">${marked(t)}</p>${p.paragraphNotes?.[i]?`<p class="paragraph-memo" lang="ja">${esc(p.paragraphNotes[i])}</p>`:''}</section>`).join('')}</div>${parallel?`<aside class="reader-translation-column" lang="ja"><h2>日本語訳</h2><p class="small muted">訳の段落区切りは英文と異なる場合があります。</p>${paragraphs(x.translation).map(t=>`<p>${esc(t)}</p>`).join('')}</aside>`:''}</div>` +
      `<div class="actions">${!parallel?button(reveal?'日本語訳を閉じる':'日本語訳を確認する','translation','secondary',pressed(reveal)):''}${button(p.completedAt?'読了を記録済み':'読了として記録','complete','primary',p.completedAt?'disabled':'')}</div>${reveal&&!parallel?`<section class="translation"><h2>日本語訳</h2><div class="prose">${esc(x.translation)}</div></section>`:''}` +
      `<section class="reader-note"><p class="eyebrow">MAKE IT YOUR OWN</p><h2>要点と根拠を、自分の言葉で。</h2><p class="small muted">中心となる内容を一文で。次に「なぜそう言えるか」を本文から確かめましょう。</p>${area('要約・わからなかった部分・気づき','readingMemo',draft,'id="reading-memo" placeholder="要点：\n根拠となる段落：\n読み違えた箇所："')}<div class="actions">${button('メモを保存','memo','secondary small')}${button(p.linkedNoteId?'学習ノートを更新':'学習ノートにまとめる','note','ghost small')}</div><p class="small muted" id="memo-status" role="status">${memoVersion===savedMemoVersion?'保存済み':'未保存の変更があります'}</p><div class="reader-annotations">${(p.annotations||[]).map(n=>`<article class="answer-panel"><blockquote lang="en">${esc(n.quote)}</blockquote><p>${esc(n.note)}</p>${button('注釈を編集','edit-annotation','ghost small',`data-id="${esc(n.id)}"`)}</article>`).join('')}</div></section>` +
      `<section class="reader-review"><p class="eyebrow">COME BACK TO IT</p><h2>次は、要点を思い出す。</h2><p>読み返す日は、本文を見る前に内容を説明してから、曖昧だった段落を確かめましょう。</p>${p.reflection?`<p class="paragraph-memo">${esc(p.reflection)}</p>`:''}<div class="actions">${button('読み返しの記録','reflection','secondary small')}${[1,3,7,14].map(n=>button(n+'日後に復習','schedule','ghost small',`data-days="${n}"`)).join('')}</div><p class="small muted">${p.review?.due?'次の復習日：'+date(p.review.due)+' · ライブラリの「復習する」に表示します。':'復習日は自分で調整できます。通知ではなく、このアプリ内の一覧に表示します。'}${p.review?.due?button('予定を解除','unschedule','ghost small'):''}</p></section></article>`;
  }
  function chosen() {
    const s=window.getSelection(), host=main.querySelector('#passage');
    if (s?.anchorNode && s.focusNode && host?.contains(s.anchorNode) && host.contains(s.focusNode) && s.toString().trim()) {
      selection=s.toString().trim().slice(0,4000);
      selectionParagraph=(s.anchorNode.nodeType===1?s.anchorNode:s.anchorNode.parentElement)?.closest('[data-paragraph]')?.dataset.paragraph ?? null;
    }
  }
  function scroll() {
    clearTimeout(scrollTimer); const id=current?.id;
    scrollTimer=setTimeout(()=>{
      if (!id || current?.id!==id || disposed) return;
      const found=[...main.querySelectorAll('[data-paragraph]')].find(x=>x.getBoundingClientRect().bottom>90);
      if (found) {const paragraph=Number(found.dataset.paragraph);store.change(s=>{s.reading[id]={...s.reading[id],paragraph};}).catch(()=>{});}
    },500);
  }
  function pagehide() { clock.pause(); save().catch(()=>{}); }
  function visibility() {
    if (!current) return;
    if (document.hidden) {clock.pause();stopSpeech();} else if (!paused) clock.start();
    save().catch(()=>{});
  }
  async function speak(texts) {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance==='undefined') return toast('このブラウザは読み上げに対応していません',true);
    stopSpeech();const id=current.id;
    for (let i=0;i<texts.length;i++) {
      const u=new SpeechSynthesisUtterance(texts[i]);u.lang='en-US';u.rate=Number(store.state.settings.readerSpeechRate)||.9;
      u.onstart=()=>{if(current?.id===id){audioState=`読み上げ中 ${i+1}/${texts.length}`;audioStatus();}};
      u.onend=()=>{if(i===texts.length-1&&current?.id===id){audioState='読み上げ完了';audioStatus();}};
      u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error)&&current?.id===id){audioState='再生できません。端末の英語音声設定を確認してください。';audioStatus();}};
      window.speechSynthesis.speak(u);
    }
  }
  function editAnnotation(existing) {
    const id=current.id;
    dialog(existing?'注釈を編集':'選択部分に注釈を残す',area('英文の引用部分','quote',existing?.quote||selection,'required')+area('気づき・文構造・疑問','note',existing?.note||'','required'),{onSubmit:async f=>{
      await store.change(s=>{const p=s.reading[id]||{},list=[...(p.annotations||[])],item={...existing,id:existing?.id||uid(),quote:String(f.get('quote')),note:String(f.get('note')),at:Date.now()};const at=list.findIndex(n=>n.id===item.id);at<0?list.push(item):list.splice(at,1,item);s.reading[id]={...p,annotations:list};});if(current?.id===id)draw();toast('注釈を保存しました');
    }});
  }
  main.oninput=e=>{
    if(e.target.matches('[data-search]')){options.query=e.target.value;page=1;updateList();}
    if(e.target.id==='reading-memo'){draft=e.target.value;++memoVersion;memoStatus('保存中…');clearTimeout(memoTimer);memoTimer=setTimeout(()=>save().catch(e=>toast(e.message,true)),600);}
  };
  main.onchange=async e=>{try{
    if(e.target.name==='readingSort'){options.sort=e.target.value;page=1;updateList();}
    if(e.target.name==='speechRate'){const rate=Number(e.target.value);stopSpeech();await store.change(s=>{s.settings.readerSpeechRate=rate;});}
  }catch(error){toast(error.message,true);}};
  main.onclick=async e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    try {
      const a=b.dataset.action;
      if(a==='open')return await open(b.dataset.id);
      if(a==='back'){await save();return library();}
      if(a==='random'){const pool=items().filter(x=>!store.state.reading[x.id]?.lastOpened&&!store.state.reading[x.id]?.completedAt);return pool.length?await open(pool[Math.floor(Math.random()*pool.length)].id):toast('現在の検索条件に未読の英文がありません。条件を「すべて」に戻すと選べます。');}
      if(a==='level'||a==='filter'){options[a]=b.dataset.value;page=1;return library();}
      if(a==='due-list'){options.filter='復習する';options.sort='復習日順';page=1;return library();}
      if(a==='previous'||a==='next'){page+=a==='next'?1:-1;updateList();main.querySelector('#reading-count')?.scrollIntoView({block:'start'});return;}
      if(!current)return;
      const id=current.id;
      if(a==='resume')main.querySelector(`[data-paragraph="${record().paragraph}"]`)?.scrollIntoView({block:'start',behavior:'instant'});
      if(a==='translation'){reveal=!reveal;draw();}
      if(a==='parallel'){parallel=!parallel;draw();}
      if(a==='signals'){signals=!signals;draw();}
      if(a==='pause-clock'){paused=!paused;paused?clock.pause():!document.hidden&&clock.start();await save();draw();}
      if(a==='favorite'){await store.change(s=>{s.reading[id]={...s.reading[id],favorite:!s.reading[id]?.favorite};});draw();}
      if(a==='bookmark'){clearTimeout(scrollTimer);await store.change(s=>{s.reading[id]={...s.reading[id],paragraph:Number(b.dataset.paragraphIndex)};});toast('段落 '+(Number(b.dataset.paragraphIndex)+1)+' にしおりを保存しました');}
      if(a==='paragraph-note'){const i=Number(b.dataset.paragraphIndex);dialog('段落 '+(i+1)+' のつながりを整理',select('段落の役割','role',paragraphRoles,record().paragraphRoles?.[i]||'未分類')+area('要点・指示語の参照先・前後とのつながり','note',record().paragraphNotes?.[i]||'','placeholder="例：theyは前段落の生徒たち。前段落の意見に対する具体例。"'),{onSubmit:async f=>{await store.change(s=>{s.reading[id]={...s.reading[id],paragraphRoles:{...s.reading[id]?.paragraphRoles,[i]:String(f.get('role'))},paragraphNotes:{...s.reading[id]?.paragraphNotes,[i]:String(f.get('note'))}};});if(current?.id===id)draw();}});}
      if(a==='speak'||a==='speak-paragraph')await speak(a==='speak'?paragraphs(current.passage):[paragraphs(current.passage)[Number(b.dataset.paragraphIndex)]]);
      if(a==='stop-speech')stopSpeech();
      if(a==='pause-speech'&&window.speechSynthesis){if(window.speechSynthesis.paused){window.speechSynthesis.resume();audioState='読み上げ中';}else if(window.speechSynthesis.speaking){window.speechSynthesis.pause();audioState='一時停止中';}audioStatus();}
      if(a==='smaller'||a==='larger'){await store.change(s=>{s.settings.fontSize=Math.max(16,Math.min(30,(Number(s.settings.fontSize)||19)+(a==='larger'?1:-1)));});draw();}
      if(a==='complete'){await save();await store.change(s=>{s.reading[id]={...s.reading[id],completedAt:s.reading[id]?.completedAt||new Date().toISOString()};});draw();toast('読了を記録しました。次に読み返す日も選べます。');}
      if(a==='memo'){await save();toast('メモを保存しました');}
      if(a==='note'){await save();const book=current,body=readingNoteBody(book,record(),draft);await store.change(s=>{const p=s.reading[id]||{},old=s.notes.find(n=>n.id===p.linkedNoteId&&!n.archived),noteId=old?.id||uid(),now=Date.now();if(old){old.body=body;old.updatedAt=now;}else s.notes.unshift({id:noteId,title:book.title,body,subject:'英語',tags:['英文'],links:[],source:'reading/'+id,createdAt:now,updatedAt:now});s.reading[id]={...p,linkedNoteId:noteId};});draw();toast('要約・段落メモ・注釈を学習ノートにまとめました');}
      if(a==='capture'){const context=selectionParagraph!==null?paragraphs(current.passage)[Number(selectionParagraph)]||'':'';dialog('英文から単語カードを作る',field('語句','question',selection,'text','required maxlength="500"')+area('意味・使い方（自分で確認して入力）','answer','','required')+area('文脈・例文','context',context),{onSubmit:async f=>{await store.change(s=>s.cards.unshift({id:uid(),title:String(f.get('question')),question:String(f.get('question')),answer:String(f.get('answer')),context:String(f.get('context')),subject:'英語',tags:['英文から'],source:'reading/'+id,createdAt:Date.now()}));toast('文脈と一緒に暗記スタジオへ追加しました');}});}
      if(a==='annotate')editAnnotation();
      if(a==='edit-annotation')editAnnotation(record().annotations?.find(n=>n.id===b.dataset.id));
      if(a==='schedule'){await store.change(s=>{s.reading[id]={...s.reading[id],review:planReadingReview(s.reading[id]?.review,Number(b.dataset.days))};});draw();toast(date(record().review.due)+' に読み返す予定を入れました');}
      if(a==='unschedule'){await store.change(s=>{s.reading[id]={...s.reading[id],review:{...s.reading[id]?.review,due:null}};});draw();}
      if(a==='reflection')dialog('読み返して理解を確かめる','<p class="small muted">本文を見る前に思い出せた要点、読み違えた表現、次に確認する箇所を記録します。</p>'+area('読み返しの記録','reflection',record().reflection||'','required'),{onSubmit:async f=>{await store.change(s=>{s.reading[id]={...s.reading[id],reflection:String(f.get('reflection')),lastRevisited:Date.now()};});if(current?.id===id)draw();}});
      if(a==='guide')dialog('長文を読む8つの手がかり',`<div class="reading-guide">${readingGuide.map((g,i)=>`<details ${i===0?'open':''}><summary>${i+1}. ${esc(g.title)}</summary><p lang="en" class="guide-example">${esc(g.example)}</p><p>${esc(g.meaning)}</p><p>${esc(g.explanation)}</p></details>`).join('')}</div><p class="small muted">例文は読み方を説明するための独自例です。本文の自動解析・採点ではありません。</p>`);
    }catch(error){toast(error.message,true);}
  };
  document.addEventListener('selectionchange',chosen);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);window.addEventListener('scroll',scroll,{passive:true});
  const ticker=setInterval(()=>{const el=main.querySelector('#read-time');if(el)el.textContent=duration(totalTime());},1000);
  const persist=setInterval(()=>{if(!disposed)save().catch(()=>{});},15000);
  const dispose=()=>{disposed=true;++openTicket;clock.pause();clearTimeout(memoTimer);clearTimeout(scrollTimer);clearInterval(ticker);clearInterval(persist);document.removeEventListener('selectionchange',chosen);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);window.removeEventListener('scroll',scroll);stopSpeech();save().catch(()=>{});main.onclick=null;main.oninput=null;main.onchange=null;};
  dispose.refresh=()=>{if(current){if(memoVersion===savedMemoVersion){draft=record().memo||'';const el=main.querySelector('#reading-memo');if(el)el.value=draft;}}else updateList();};
  try {if(tail&&index.some(x=>x.id===tail))await open(tail);else library();} catch(error) {dispose();throw error;}
  return dispose;
}
