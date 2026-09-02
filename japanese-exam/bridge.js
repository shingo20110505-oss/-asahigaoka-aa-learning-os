(() => {
  'use strict';
  if(window.AAJapaneseExamBridge)return;
  const base=new URL('./',document.currentScript?.src||new URL('./japanese-exam/bridge.js',location.href));
  const route=(config,practice=false)=>{
    const map={modern:'modern_logical',discussion:'modern_logical',literary:'literary_or_essay_reading',kanji:'kanji_vocabulary',idiom:'kanji_vocabulary',classical:'classical',kanbun:'classical'};
    const units=practice?config.unitsBySubject?.japanese:config.units;
    const custom=practice||config.scope!=='full'||config.length!=='full';
    const url=new URL('./index.html',base);url.searchParams.set('mode',custom?'practice':'full');
    if(custom&&Array.isArray(units))url.searchParams.set('domains',[...new Set(units.map(u=>map[u]).filter(Boolean))].join(','));
    if(custom&&units?.includes('classical')&&!units.includes('kanbun'))url.searchParams.set('classicalGenre','kobun');
    if(custom&&units?.includes('kanbun')&&!units.includes('classical'))url.searchParams.set('classicalGenre','kanbun');
    url.searchParams.set('minutes',String(config.timeMin||45));location.assign(url.href);
  };
  function intercept(event){const el=event.target?.closest?.('[data-action]');if(!el)return;
    const action=el.dataset.action;let config,practice=false;
    if(['start-exam-v22','start-aichi-test','repeat-aichi-test'].includes(action))config=typeof state!=='undefined'?(action==='repeat-aichi-test'?state.session?.examConfig:state.ui.examConfig):null;
    if(action==='start-unit-practice'){config=typeof state!=='undefined'?state.ui.practiceConfig:null;practice=true;}
    if(config?.subject!=='japanese')return;
    event.preventDefault();event.stopImmediatePropagation();route(config,practice);
  }
  // Installed before the later classical-practice compatibility interceptor.
  document.addEventListener('click',intercept,true);
  window.AAJapaneseExamBridge={version:'1.0.0',route};
  let installed=false;
  async function install(){if(installed)return;installed=true;
    try{
      const [{starterPacks},{assertPack,shuffleChoices}]=await Promise.all([import(new URL('./starter-packs.mjs',base)),import(new URL('./core.mjs',base))]);
      const packs=starterPacks.map(assertPack);let next=0;
      const pool=packs.flatMap(p=>p.questions.filter(q=>q.format==='single_choice'&&[1,3].includes(q.major)).map(q=>({p,q})));
      function originalReading(){const {p,q:original}=pool[next++%pool.length],q=shuffleChoices(original),answerIndex=q.choices.findIndex(c=>q.answers.includes(c.id));
        const passage=p.passages.filter(t=>t.major===q.major&&t.role!=='answer_only').map(t=>'【'+t.title+'】\n'+t.paragraphs.map((x,i)=>`${i+1} ${x}`).join('\n\n')).join('\n\n');
        return {id:q.id+':'+Date.now(),reviewKey:q.id,type:'japanese',subject:'japanese',stem:passage+'\n\n'+q.stem,
          choices:q.choices.map(c=>({text:c.text,ok:q.answers.includes(c.id),reason:c.explanation,error:c.operator||null,distractorType:c.operator||null})),answerIndex,
          explanation:q.explanation+'\n根拠：'+q.evidence.map(e=>e.quote).join('／'),evidence:q.evidence.map(e=>e.quote).join('／'),
          points:1,selectCount:1,skills:[{id:'ja.read.logic',role:'primary'}],expectedMs:180000,context:'aichi-japanese-original-v1',source:{area:q.major===1?'modern':'literary',origin:'editorial-evidence-check',title:p.title,rightsLabel:'本アプリ作成オリジナル'},nonOfficial:true};
      }
      if(typeof makeJapaneseQ==='function')makeJapaneseQ=originalReading;
      if(window.AA_V23_GENERATORS)window.AA_V23_GENERATORS.japanese=originalReading;
      if(typeof subjectsHTML==='function'){const previous=subjectsHTML;subjectsHTML=function(){return previous().replace('<h3>国語</h3>','<h3>国語</h3><p><a class="btn primary" href="'+new URL('./index.html',base).href+'">国語・愛知県型22点</a></p>');};}
      if(window.AA_V22_TEST_API){const api=window.AA_V22_TEST_API,oldExam=api.startExam,oldPractice=api.startUnitPractice;
        api.startExam=function(config){return config?.subject==='japanese'?route(config):oldExam.apply(this,arguments);};
        api.startUnitPractice=function(config){return config?.subject==='japanese'?route(config,true):oldPractice.apply(this,arguments);};
      }
      if(typeof render==='function'&&typeof state!=='undefined'&&!state.session?.active)render();
      window.AAJapaneseExamBridge.originalReading=originalReading;
    }catch(error){console.error('Japanese exam module unavailable',error?.name);}
  }
  document.addEventListener('aa:v23ready',install,{once:true});
  if(window.AA_V23_STATS)install();
})();
