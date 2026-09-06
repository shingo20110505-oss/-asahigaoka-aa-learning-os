(()=>{
  'use strict';
  if(window.__AA_READING_EXAM_SCAFFOLD_V1__) return;

  const VERSION='1.1.0';
  const ENTRANCE_DIFFICULTY=9;
  const SUPPORT_ACTIONS=new Set(['ai-reading-scaffold','ai-reading-live-scaffold']);
  const EXAM_ACTIONS=new Set(['ai-reading-exam','start-reading-simulator','start-reading-exam']);

  function isAiScaffold(read){
    return !!(read?.aiGenerated && read?.assistMode==='scaffold');
  }

  function withEntranceDifficulty(fn){
    if(typeof state==='undefined'||!state?.ui) return fn();
    const previous=state.ui.subjectDifficulty;
    state.ui.subjectDifficulty=ENTRANCE_DIFFICULTY;
    try{return fn();}
    finally{state.ui.subjectDifficulty=previous;}
  }

  function stripPreteach(html){
    return String(html||'').replace(
      /<div class="notice"><b>先に確認する重要語（支援付き初読として記録）：<\/b>[\s\S]*?<\/div><div class="sp12"><\/div>/g,
      ''
    );
  }

  function stripChatGptDuringAttempt(html){
    return String(html||'').replace(
      /<button class="btn ghost" data-action="chatgpt-reading">ChatGPTに相談<\/button>/g,
      ''
    );
  }

  function transformStudyHtml(html,read){
    if(!isAiScaffold(read)) return html;
    let out=String(html||'');
    out=out.replace('<main>','<main class="aaReadingExamScaffold">');
    out=out.replace('初読｜英語長文','愛知県入試型｜補助長文');
    out=out.replace(/<div class="eyebrow">FIRST READ<\/div>/g,'<div class="eyebrow">AICHI EXAM READING</div>');
    out=out.replace(/<div class="eyebrow">LONG READING<\/div>/g,'<div class="eyebrow">AICHI EXAM READING</div>');
    out=out.replace('初読完了・設問へ','本文を読み終えた・設問へ');
    out=out.replace(/長文 (\d+)\/(\d+)｜英語/g,'愛知県入試型｜問 $1/$2');
    out=stripPreteach(out);
    out=stripChatGptDuringAttempt(out);

    const rule='<div class="aaExamScaffoldRule"><b>入試問題と同じ形式</b><span>本文・5問4択・採点・根拠解説は入試モードと共通。補助長文では、分からない単語だけ本文中で確認できます。</span></div>';
    const heading=/<h2 class="h2">[^<]*<\/h2>/;
    if(heading.test(out)&&!out.includes('aaExamScaffoldRule')) out=out.replace(heading,match=>match+rule);

    out=out.replace(
      /<div class="notice"><b>入試実戦：<\/b>解答中の語彙支援は使用しません。<\/div>/g,
      '<div class="notice"><b>補助ルール：</b>設問の答えや根拠は先に表示しません。分からない単語だけ本文タップで確認できます。</div>'
    );
    return out;
  }

  function transformSubjectsHtml(html){
    let out=String(html||'');
    out=out.replace('あなたの単語力から、次の長文へ。','入試問題を、補助つきで解く。');
    out=out.replace('習った文法の範囲で、単語の復習記録と読解の弱点に合う長文を選びます。','補助長文も入試モードと同じ愛知県入試型の長文・5問4択です。違いは、必要なときだけ本文中の単語を確認できることです。');
    out=out.replace('<b>サポート付きで読む</b><span>単語の意味を確認しながら · 5問</span>','<b>補助つき入試長文</b><span>入試と同じ5問 · 単語補助だけON</span>');
    out=out.replace('<b>実戦で解く</b><span>辞書を使わず力を試す · 5問</span>','<b>入試長文（補助なし）</b><span>同じ形式 · 辞書OFF · 5問</span>');
    return out;
  }

  function supportButton(className='btn ghost'){
    const button=document.createElement('button');
    button.type='button';
    button.className=className;
    button.dataset.action='ai-reading-scaffold';
    button.dataset.readingMode='scaffold-exam';
    button.textContent='補助つき入試長文';
    button.setAttribute('aria-label','補助つき入試長文。愛知県入試型5問、単語補助のみ利用できます');
    return button;
  }

  function decorateRiseSubjects(root=document){
    const scope=root?.querySelector?root:document;
    let support=scope.querySelector('.riseSubjectsV4 [data-action="ai-reading-scaffold"], .riseSubjectsV4 [data-action="start-custom"][data-kind="reading"][data-subject="english"], .riseSubjectsV4 [data-reading-mode="scaffold-exam"]');
    const exam=scope.querySelector('.riseSubjectsV4 [data-action="ai-reading-exam"], .riseSubjectsV4 [data-action="start-reading-exam"], .riseSubjectsV4 [data-reading-mode="exam"]');
    if(!support&&exam){
      const actions=exam.closest('.r6Actions,.rv4SubjectExtras,.actions');
      if(actions){
        support=supportButton(exam.classList.contains('primary')?'btn ghost':'btn primary');
        actions.insertBefore(support,exam);
      }
    }
    if(support){
      support.dataset.action='ai-reading-scaffold';
      support.dataset.readingMode='scaffold-exam';
      delete support.dataset.kind;
      delete support.dataset.subject;
      support.textContent='補助つき入試長文';
      support.setAttribute('aria-label','補助つき入試長文。愛知県入試型5問、単語補助のみ利用できます');
    }
    if(exam){
      exam.dataset.action='ai-reading-exam';
      exam.dataset.readingMode='exam';
      exam.textContent='入試長文（補助なし）';
      exam.setAttribute('aria-label','入試長文。補助なしで愛知県入試型5問を解きます');
    }
    const card=(support||exam)?.closest?.('.rv4SubjectCard,.r6Card');
    if(card){
      const desc=card.querySelector('.r6Subject p');
      if(desc)desc.textContent='Gemini生成・正答検査済み。補助あり／なしを選べます。';
      if(!card.querySelector('.aaReadingModeNote')){
        const note=document.createElement('p');
        note.className='tiny aaReadingModeNote';
        note.textContent='補助長文も愛知県入試型の5問4択。違いは、分からない単語だけ本文中で確認できることです。';
        card.appendChild(note);
      }
    }
    return !!support;
  }

  function decorateRiseLearning(root=document){
    const scope=root?.querySelector?root:document;
    const panel=scope.querySelector('.riseAnalyticsV4[data-rise-ia="learn-priority"], .riseAnalyticsV4');
    if(!panel)return false;
    if(panel.querySelector('[data-aa-support-reading-learning="1"]'))return true;
    const grid=panel.querySelector('.r6Grid.r6Learn');
    if(!grid)return false;
    const article=document.createElement('article');
    article.className='rv4Card r6Card aaSupportReadingLearning';
    article.dataset.aaSupportReadingLearning='1';
    article.innerHTML='<div class="r6Top"><div class="r6Subject"><i class="r6Icon">読</i><div><h3>補助つき英語長文</h3><p>愛知県入試型の本文・5問4択を、必要な単語補助だけ使って解きます。</p></div></div><span class="r6Badge">API・入試型</span></div><div class="r6Actions"><button class="btn primary" type="button" data-action="ai-reading-scaffold" data-reading-mode="scaffold-exam">補助つき入試長文</button><button class="btn ghost" type="button" data-action="ai-reading-exam" data-reading-mode="exam">入試長文（補助なし）</button></div><p class="tiny aaReadingModeNote">本文・設問・採点・根拠解説は入試モードと共通。補助ありでは分からない単語だけ本文中で確認できます。</p>';
    grid.prepend(article);
    return true;
  }

  function installStudyHook(){
    if(typeof studyHTML!=='function')return false;
    if(studyHTML.__aaReadingExamScaffoldWrapped===VERSION)return true;
    const base=studyHTML;
    const wrapped=function(){
      const read=typeof currentReading==='function'?currentReading():null;
      return transformStudyHtml(base.apply(this,arguments),read);
    };
    wrapped.__aaReadingExamScaffoldWrapped=VERSION;
    studyHTML=wrapped;
    return true;
  }

  function installSubjectsHook(){
    if(typeof subjectsHTML!=='function')return false;
    if(subjectsHTML.__aaReadingExamScaffoldWrapped===VERSION)return true;
    const base=subjectsHTML;
    const wrapped=function(){return transformSubjectsHtml(base.apply(this,arguments));};
    wrapped.__aaReadingExamScaffoldWrapped=VERSION;
    subjectsHTML=wrapped;
    return true;
  }

  function installSessionHook(){
    if(typeof startSession!=='function')return false;
    if(startSession.__aaReadingExamScaffoldWrapped===VERSION)return true;
    const base=startSession;
    const wrapped=function(opts={}){
      if(opts?.kind==='reading')return withEntranceDifficulty(()=>base.apply(this,arguments));
      return base.apply(this,arguments);
    };
    wrapped.__aaReadingExamScaffoldWrapped=VERSION;
    startSession=wrapped;
    return true;
  }

  function installHooks(){
    installStudyHook();
    installSubjectsHook();
    installSessionHook();
    decorateRiseSubjects(document);
    decorateRiseLearning(document);
    document.documentElement.dataset.readingScaffold=VERSION;
  }

  // Window capture runs before the legacy/document handlers. Convert the
  // current Rise English button into the verified AI entrance-reading route
  // before ai-reading-v1 decides which action to execute.
  window.addEventListener('click',event=>{
    const target=event.target?.closest?.('[data-action]');
    if(!target)return;
    let action=target.dataset.action;
    const legacySupport=action==='start-custom'&&target.dataset.kind==='reading'&&target.dataset.subject==='english';
    if(legacySupport){
      target.dataset.action='ai-reading-scaffold';
      target.dataset.readingMode='scaffold-exam';
      delete target.dataset.kind;
      delete target.dataset.subject;
      action='ai-reading-scaffold';
    }else if(action==='start-reading-exam'){
      target.dataset.action='ai-reading-exam';
      target.dataset.readingMode='exam';
      action='ai-reading-exam';
    }
    if(!SUPPORT_ACTIONS.has(action)&&!EXAM_ACTIONS.has(action))return;
    if(typeof state==='undefined'||!state?.ui)return;
    const previous=state.ui.subjectDifficulty;
    state.ui.subjectDifficulty=ENTRANCE_DIFFICULTY;
    queueMicrotask(()=>{if(typeof state!=='undefined'&&state?.ui)state.ui.subjectDifficulty=previous;});
  },true);

  let decorateQueued=false;
  const scheduleDecorate=()=>{
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>{
      decorateQueued=false;
      decorateRiseSubjects(document);
      decorateRiseLearning(document);
    });
  };
  const attachRiseObserver=()=>{
    const app=document.getElementById('app');
    if(!app||app.dataset.readingScaffoldObserver==='1')return;
    app.dataset.readingScaffoldObserver='1';
    new MutationObserver(scheduleDecorate).observe(app,{childList:true,subtree:true});
    scheduleDecorate();
  };

  const reinstall=()=>{installHooks();scheduleDecorate();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{attachRiseObserver();reinstall();},{once:true});
  else{attachRiseObserver();reinstall();}
  document.addEventListener('rise:navigation',reinstall);
  document.addEventListener('aa:v23ready',reinstall);
  for(const delay of [0,50,200,800,2000,5000])setTimeout(reinstall,delay);

  const style=document.createElement('style');
  style.id='aa-reading-exam-scaffold-style-v1';
  style.textContent=`
    .aaReadingExamScaffold .aaExamScaffoldRule{display:grid;gap:4px;margin:12px 0 14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent,#556ba9) 24%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent,#556ba9) 8%,var(--card,#fff));line-height:1.55}
    .aaReadingExamScaffold .aaExamScaffoldRule b{font-size:13px;letter-spacing:.02em}
    .aaReadingExamScaffold .aaExamScaffoldRule span{font-size:12px;color:var(--sub,#52617a)}
    .aaReadingExamScaffold .passage{font-size:clamp(16px,2.6vw,18px);line-height:1.9}
    .aaReadingExamScaffold .qstem{font-size:clamp(16px,2.6vw,18px);line-height:1.7;font-weight:800}
    .aaReadingExamScaffold .choice{min-height:52px;text-align:left;line-height:1.55}
    .riseSubjectsV4 .aaReadingModeNote,.riseAnalyticsV4 .aaReadingModeNote{margin:10px 2px 0;line-height:1.6;color:var(--sub,#52617a)}
    .aaSupportReadingLearning{border-color:color-mix(in srgb,#8aa4ff 38%,rgba(255,255,255,.14))!important;background:linear-gradient(145deg,rgba(66,91,156,.48),rgba(92,66,138,.34))!important}
    @media(max-width:560px){.aaReadingExamScaffold .aaExamScaffoldRule{padding:11px 12px}.aaReadingExamScaffold .passage{line-height:1.82}}
  `;
  document.head.appendChild(style);

  window.__AA_READING_EXAM_SCAFFOLD_V1__=Object.freeze({
    version:VERSION,
    entranceDifficulty:ENTRANCE_DIFFICULTY,
    transformStudyHtml,
    transformSubjectsHtml,
    decorateRiseSubjects,
    decorateRiseLearning,
    installHooks
  });
})();
