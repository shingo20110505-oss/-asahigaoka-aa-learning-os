(()=>{
  'use strict';
  if(window.__AA_READING_EXAM_SCAFFOLD_V1__) return;

  const VERSION='1.0.1';
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
    if(heading.test(out)) out=out.replace(heading,match=>match+rule);

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

  function decorateRiseSubjects(root=document){
    const scope=root?.querySelector?root:document;
    const support=scope.querySelector('.riseSubjectsV4 [data-action="start-custom"][data-kind="reading"][data-subject="english"], .riseSubjectsV4 [data-reading-mode="scaffold-exam"]');
    const exam=scope.querySelector('.riseSubjectsV4 [data-action="start-reading-exam"], .riseSubjectsV4 [data-reading-mode="exam"]');
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
    const card=support?.closest?.('.rv4SubjectCard');
    if(card&&!card.querySelector('.aaReadingModeNote')){
      const note=document.createElement('p');
      note.className='tiny aaReadingModeNote';
      note.textContent='補助長文も愛知県入試型の5問4択。違いは、分からない単語だけ本文中で確認できることです。';
      card.appendChild(note);
    }
    return !!support;
  }

  if(typeof studyHTML==='function'){
    const beforeStudy=studyHTML;
    studyHTML=function(){
      const read=typeof currentReading==='function'?currentReading():null;
      return transformStudyHtml(beforeStudy(),read);
    };
  }

  if(typeof subjectsHTML==='function'){
    const beforeSubjects=subjectsHTML;
    subjectsHTML=function(){return transformSubjectsHtml(beforeSubjects());};
  }

  if(typeof startSession==='function'){
    const beforeStartSession=startSession;
    startSession=function(opts={}){
      if(opts?.kind==='reading') return withEntranceDifficulty(()=>beforeStartSession(opts));
      return beforeStartSession(opts);
    };
  }

  // ai-reading-v1 handles these clicks on document capture. Window capture runs first,
  // so the request is built at the same entrance-exam difficulty for both modes.
  window.addEventListener('click',event=>{
    const action=event.target?.closest?.('[data-action]')?.dataset?.action;
    if(!SUPPORT_ACTIONS.has(action)&&!EXAM_ACTIONS.has(action)) return;
    if(typeof state==='undefined'||!state?.ui) return;
    const previous=state.ui.subjectDifficulty;
    state.ui.subjectDifficulty=ENTRANCE_DIFFICULTY;
    queueMicrotask(()=>{state.ui.subjectDifficulty=previous;});
  },true);

  let decorateQueued=false;
  const scheduleDecorate=()=>{
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>{decorateQueued=false;decorateRiseSubjects(document);});
  };
  const attachRiseObserver=()=>{
    const app=document.getElementById('app');
    if(!app||app.dataset.readingScaffoldObserver==='1')return;
    app.dataset.readingScaffoldObserver='1';
    new MutationObserver(scheduleDecorate).observe(app,{childList:true,subtree:true});
    scheduleDecorate();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachRiseObserver,{once:true});
  else attachRiseObserver();
  document.addEventListener('rise:navigation',scheduleDecorate);
  document.documentElement.dataset.readingScaffold=VERSION;

  const style=document.createElement('style');
  style.id='aa-reading-exam-scaffold-style-v1';
  style.textContent=`
    .aaReadingExamScaffold .aaExamScaffoldRule{display:grid;gap:4px;margin:12px 0 14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent,#556ba9) 24%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent,#556ba9) 8%,var(--card,#fff));line-height:1.55}
    .aaReadingExamScaffold .aaExamScaffoldRule b{font-size:13px;letter-spacing:.02em}
    .aaReadingExamScaffold .aaExamScaffoldRule span{font-size:12px;color:var(--sub,#52617a)}
    .aaReadingExamScaffold .passage{font-size:clamp(16px,2.6vw,18px);line-height:1.9}
    .aaReadingExamScaffold .qstem{font-size:clamp(16px,2.6vw,18px);line-height:1.7;font-weight:800}
    .aaReadingExamScaffold .choice{min-height:52px;text-align:left;line-height:1.55}
    .riseSubjectsV4 .aaReadingModeNote{margin:10px 2px 0;line-height:1.6;color:var(--sub,#52617a)}
    @media(max-width:560px){.aaReadingExamScaffold .aaExamScaffoldRule{padding:11px 12px}.aaReadingExamScaffold .passage{line-height:1.82}}
  `;
  document.head.appendChild(style);

  window.__AA_READING_EXAM_SCAFFOLD_V1__=Object.freeze({
    version:VERSION,
    entranceDifficulty:ENTRANCE_DIFFICULTY,
    transformStudyHtml,
    transformSubjectsHtml,
    decorateRiseSubjects
  });
})();
