import {esc, icon, safeURL, toast} from './ui.mjs';
import {createHistoryQuiz} from './history-quiz.mjs';

const modeLabels = {mixed:'ミックス', date:'年代を答える', event:'出来事を答える'};
const quizButton = (label, action, style='secondary', extra='') =>
  `<button type="button" class="button ${style}" data-quiz-action="${action}" ${extra}>${label}</button>`;

let stylesheetReady;
function loadQuizStyles() {
  if (stylesheetReady) return stylesheetReady;
  stylesheetReady = new Promise((resolve, reject) => {
    let sheet = document.getElementById('rise-history-quiz-style');
    if (sheet?.sheet) { resolve(); return; }
    const created = !sheet;
    if (!sheet) {
      sheet = document.createElement('link');
      sheet.id = 'rise-history-quiz-style';
      sheet.rel = 'stylesheet';
      // A new path also works with a previously cached app shell. The existing
      // worker can serve it online or cache it with the rest of the new build.
      sheet.href = new URL('./history-quiz.css', import.meta.url).href;
    }
    const finish = success => {
      clearTimeout(timer);
      sheet.removeEventListener('load', loaded);
      sheet.removeEventListener('error', failed);
      if (success) resolve();
      else {
        sheet.remove();
        stylesheetReady = null;
        reject(Error('クイズの表示を読み込めませんでした。もう一度「クイズ」を押してください。'));
      }
    };
    const loaded = () => finish(true), failed = () => finish(false);
    const timer = setTimeout(failed, 12000);
    sheet.addEventListener('load', loaded, {once:true});
    sheet.addEventListener('error', failed, {once:true});
    if (created) document.head.append(sheet);
  });
  return stylesheetReady;
}

// A quiz is a temporary practice session. Existing history, review progress,
// personal ranks, notes and favorites are never written by this controller.
export function openHistoryQuiz({items, pool=items, scope='', onClose=()=>{}}) {
  const eligible = [...items];
  const trigger = document.activeElement;
  const host = document.createElement('dialog');
  host.className = 'history-quiz-dialog';
  host.setAttribute('aria-labelledby', 'history-quiz-title');
  document.body.append(host);

  let mode = 'mixed', count = 10, phase = 'setup', queue = [], index = 0;
  let answers = new Map(), retry = false, error = '', closed = false;

  function cleanup() {
    if (closed) return;
    closed = true;
    window.removeEventListener('hashchange', close);
    host.remove();
    onClose();
    if (trigger?.isConnected) trigger.focus({preventScroll:true});
  }
  function close() {
    if (host.open) host.close();
    cleanup();
  }
  host.addEventListener('close', cleanup, {once:true});
  host.addEventListener('cancel', event => { event.preventDefault(); close(); });
  window.addEventListener('hashchange', close);

  const header = () => `<div class="dialog-heading"><div><p class="eyebrow">CHRONOLOGIA / QUIZ</p><h2 id="history-quiz-title">社会年表クイズ</h2></div><button type="button" class="icon-button" data-quiz-action="close" aria-label="クイズを閉じる">${icon('close')}</button></div>`;
  const scopeHTML = () => `<p class="history-quiz-scope"><span>出題範囲</span> ${esc(scope || '現在の年表の条件')} <b>${eligible.length.toLocaleString()}件</b></p>`;
  const questionText = question => question.mode === 'date'
    ? `「${question.row.event}」の年代は？`
    : `「${question.row.date}」の出来事は？`;
  const correctCount = () => queue.filter(question => answers.get(question.id) === question.answerId).length;

  function explanation(row) {
    const references = [...new Set(row.sources || [])].map(safeURL).filter(Boolean);
    return `<p class="history-quiz-explanation">${esc(row.note?.summary || row.detail)}</p>${row.note?.exam ? `<p class="history-quiz-tip"><b>覚えるポイント</b>${esc(row.note.exam)}</p>` : ''}${references.length ? `<div class="history-quiz-sources">${references.map((url, i) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">確認資料${references.length > 1 ? ' '+(i+1) : ''} ↗</a>`).join('')}</div>` : ''}`;
  }

  function renderSetup() {
    phase = 'setup';
    host.innerHTML = header() + scopeHTML() + `
      <div class="history-quiz-intro"><h3>年表を、思い出す力に。</h3><p>4つの選択肢から回答。1問ごとに答えと解説を確認できます。</p></div>
      <fieldset class="history-quiz-modes"><legend>出題モード</legend>
        ${Object.entries(modeLabels).map(([value, label]) => `<label><input type="radio" name="history-quiz-mode" value="${value}" ${value === mode ? 'checked' : ''}><span><b>${label}</b><small>${value === 'mixed' ? '年代と出来事を両方' : value === 'date' ? '出来事から年代を選ぶ' : '年代から出来事を選ぶ'}</small></span></label>`).join('')}
      </fieldset>
      <label class="field history-quiz-count"><span>問題数</span><select name="history-quiz-count">${[5,10,20].map(value => `<option value="${value}" ${count === value ? 'selected' : ''}>${value}問</option>`).join('')}</select></label>
      <p class="small muted">絞り込んだ出来事から出題します。選択肢には範囲外の出来事も含みます。範囲が少ないときは、出題できる問題数で始めます。</p>
      ${!eligible.length ? '<p class="notice">この条件に合う出来事がありません。年表に戻って、ランクや検索条件を変えてください。</p>' : ''}
      <p class="form-error" role="alert">${esc(error)}</p>
      <div class="history-quiz-footer actions">${quizButton('年表へ戻る','close')}${quizButton('クイズを始める '+icon('arrow',17),'start','primary',eligible.length ? '' : 'disabled')}</div>`;
    focus('[data-quiz-action="start"]:not(:disabled)', false);
  }

  function focus(selector, scroll=true) {
    if (scroll) host.scrollTop = 0;
    host.querySelector(selector)?.focus({preventScroll:true});
  }

  function renderQuestion() {
    phase = 'question';
    const question = queue[index], answered = answers.has(question.id);
    const selected = answers.get(question.id), correct = selected === question.answerId;
    const answer = question.choices.find(choice => choice.id === question.answerId);
    host.innerHTML = header() + `
      <div class="history-quiz-progress"><span>${retry ? '間違えた問題に再挑戦' : modeLabels[mode]}</span><b>${index+1} / ${queue.length}問</b></div>
      <progress class="history-quiz-meter" max="${queue.length}" value="${index+(answered?1:0)}" aria-label="クイズの進み具合"></progress>
      <p class="small muted history-quiz-instruction">${question.mode === 'date' ? '出来事に合う年代を1つ選んでください。' : 'この年代に合う出来事を1つ選んでください。'}</p>
      <h3 class="history-quiz-question" tabindex="-1">${esc(questionText(question))}</h3>
      <div class="history-quiz-choices" role="group" aria-label="回答の選択肢">${question.choices.map((choice, i) => {
        const right = answered && choice.id === question.answerId;
        const wrong = answered && choice.id === selected && !right;
        return `<button type="button" class="history-quiz-choice ${right ? 'is-correct' : wrong ? 'is-incorrect' : ''}" data-quiz-action="answer" data-choice="${esc(choice.id)}" ${answered ? 'disabled' : ''}><span class="history-quiz-choice-index">${i+1}</span><span class="history-quiz-choice-label">${esc(choice.label)}</span>${right ? '<b class="history-quiz-choice-state">○ 正解</b>' : wrong ? '<b class="history-quiz-choice-state">× 回答</b>' : ''}</button>`;
      }).join('')}</div>
      ${answered ? `<section class="history-quiz-feedback ${correct ? 'is-correct' : 'is-incorrect'}" tabindex="-1" role="status"><p class="history-quiz-feedback-label">${correct ? '○ 正解！' : selected === null ? '答えを確認しよう' : 'もう一度、確認しよう'}</p><p class="history-quiz-answer"><b>${esc(question.row.date)}</b> ${esc(question.row.event)}</p>${!correct ? `<p class="small">正解：${esc(answer.label)}</p>` : ''}${explanation(question.row)}</section>` : ''}
      <div class="history-quiz-footer actions"><span class="small muted">${correctCount()}問正解</span>${answered ? quizButton(index+1 === queue.length ? '結果を見る' : '次の問題へ '+icon('arrow',17),'next','primary') : quizButton('わからない・答えを見る','skip','ghost')}</div>`;
    focus(answered ? '.history-quiz-feedback' : '.history-quiz-question');
    if (answered) host.querySelector('.history-quiz-feedback')?.scrollIntoView({block:'nearest'});
  }

  function renderResult() {
    phase = 'result';
    const score = correctCount(), missed = queue.filter(question => answers.get(question.id) !== question.answerId);
    host.innerHTML = header() + `
      <section class="history-quiz-result" tabindex="-1"><p class="eyebrow">${retry ? 'RETRY RESULT' : 'RESULT'}</p><h3>今回の結果</h3><p class="history-quiz-score"><strong>${score}</strong><span> / ${queue.length}問正解</span></p><p class="history-quiz-rate">正答率 ${Math.round(score / queue.length * 100)}%</p><p>${missed.length ? '間違えた問題を、もう一度思い出してみよう。' : '全問正解！ 年表のつながりも確かめてみよう。'}</p></section>
      <div class="history-quiz-result-actions actions">${missed.length ? quizButton(`間違えた${missed.length}問に再挑戦`,'retry','primary') : ''}${quizButton('同じ範囲でもう一度','again',missed.length ? 'secondary' : 'primary')}${quizButton('出題設定を変える','setup','ghost')}${quizButton('年表へ戻る','close','secondary')}</div>
      <h3 class="history-quiz-review-title">答えを振り返る</h3>
      <div class="history-quiz-review">${queue.map(question => {
        const selected = answers.get(question.id), correct = selected === question.answerId;
        const label = question.choices.find(choice => choice.id === selected)?.label || 'わからない';
        return `<details><summary><span class="history-quiz-mark ${correct ? 'is-correct' : 'is-incorrect'}">${correct ? '○' : '×'}</span><span><b>${esc(question.row.date)}</b>${esc(question.row.event)}</span><span class="sr-only">${correct ? '正解' : '要確認'}。解説を開く</span></summary><div class="history-quiz-review-body"><p class="small muted">${esc(modeLabels[question.mode])} · あなたの回答：${esc(label)}</p>${explanation(question.row)}</div></details>`;
      }).join('')}</div>`;
    focus('.history-quiz-result');
  }

  function begin(questions, isRetry=false) {
    if (!questions.length) {
      error = 'この範囲では4択の問題を作れませんでした。年表に戻って、出題範囲を広げてください。';
      renderSetup();
      return;
    }
    queue = questions;
    index = 0;
    answers = new Map();
    retry = isRetry;
    error = '';
    renderQuestion();
  }

  host.onchange = event => {
    if (event.target.name === 'history-quiz-mode') mode = event.target.value;
    if (event.target.name === 'history-quiz-count') count = Number(event.target.value);
  };
  host.onclick = event => {
    const target = event.target.closest('[data-quiz-action]');
    if (!target || target.disabled || !host.contains(target)) return;
    const action = target.dataset.quizAction;
    if (action === 'close') { close(); return; }
    if ((action === 'start' && phase === 'setup') || (action === 'again' && phase === 'result')) {
      begin(createHistoryQuiz(eligible, {mode, count, pool}));
      return;
    }
    if (action === 'setup' && phase === 'result') { renderSetup(); return; }
    if (action === 'retry' && phase === 'result') {
      const missed = queue.filter(question => answers.get(question.id) !== question.answerId);
      begin(missed, true);
      return;
    }
    if (phase !== 'question') return;
    const question = queue[index];
    if ((action === 'answer' || action === 'skip') && !answers.has(question.id)) {
      const chosen = action === 'skip' ? null : question.choices.find(choice => String(choice.id) === target.dataset.choice)?.id;
      if (chosen === undefined) return;
      answers.set(question.id, chosen);
      renderQuestion();
    } else if (action === 'next' && answers.has(question.id)) {
      index++;
      if (index === queue.length) renderResult();
      else renderQuestion();
    }
  };
  loadQuizStyles().then(() => {
    if (closed) return;
    renderSetup();
    host.showModal();
    focus('[data-quiz-action="start"]:not(:disabled)', false);
  }).catch(error => {
    if (closed) return;
    close();
    toast(error.message, true);
  });
  return close;
}
