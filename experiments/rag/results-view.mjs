// Presentation is versioned separately from the fixed inference protocol.
export const VIEW_VERSION = '2026-10-28.9';
export const ARM_LABELS = {
  none: '検索なし',
  verbatim: '検索結果そのまま',
  rag: '検索＋LLM',
  assisted: '教材・計算を優先する実用方式',
};
export const formatMs = ms => Number.isFinite(ms) ? (ms / 1000).toFixed(3) + ' 秒' : '未測定';

export function deviceMismatch(label, userAgent = navigator.userAgent) {
  return label.startsWith('iPad') && /Windows|Android|CrOS|X11/.test(userAgent);
}

export function createResultsView(doc = document) {
  const selector = doc.querySelector('#run-history');
  const panel = doc.querySelector('#generation');
  const answer = doc.querySelector('#answer');
  let selectedId = null, previousLatest = null, active = null, signature = '';
  const element = (tag, text, className) => {
    const el = doc.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function clearGeneration() { active = null; answer.textContent = ''; panel.hidden = true; }
  function beginGeneration(runId, question, arm) {
    const token = {}; active = token;
    panel.dataset.runId = runId;
    doc.querySelector('#generation-label').textContent = question.id + ' · ' + ARM_LABELS[arm];
    doc.querySelector('#generation-question').textContent = question.prompt;
    answer.textContent = ''; panel.hidden = false;
    return chunk => { if (active === token) answer.textContent += chunk; };
  }
  function render(report, busy) {
    const latest = report.runs.at(-1);
    if (latest?.id !== previousLatest) { selectedId = latest?.id; previousLatest = latest?.id; }
    const run = report.runs.find(r => r.id === selectedId) || latest;
    if (!busy) clearGeneration();
    selector.disabled = busy || !latest;
    if (selector.options.length !== report.runs.length) {
      selector.replaceChildren(...report.runs.map((r, i) => {
        const option = element('option', `${i + 1}回目 · ${new Date(r.startedAt).toLocaleString('ja-JP')} · ${r.searchOnly ? '検索のみ' : r.model?.name || r.model?.id || 'モデル測定'}`);
        option.value = r.id; return option;
      }).reverse());
    }
    selector.value = run?.id || '';
    const root = doc.querySelector('#answers');
    const nextSignature = JSON.stringify([run?.id, run?.questions, run?.failedPartial, run?.status]);
    if (signature === nextSignature) return run;
    signature = nextSignature;
    root.replaceChildren();
    doc.querySelector('#run-device').textContent = run ? '端末の申告：' + (run.environment?.label || '未記録') + (deviceMismatch(run.environment?.label || '', run.environment?.userAgent || '') ? '（ブラウザ情報と一致しません。iPadの測定値には使えません）' : '') : '';
    for (const q of run?.questions || []) {
      const card = element('article', undefined, 'question-result'); card.dataset.questionId = q.id;
      card.append(element('h3', q.id + ' · ' + q.subject), element('p', q.prompt, 'question-prompt'));
      const grid = element('div', undefined, 'answer-grid');
      for (const [arm, label] of Object.entries(ARM_LABELS)) {
        const data = q.arms[arm];
        if (!data) continue;
        const box = element('div', undefined, 'answer-card'); box.dataset.arm = arm;
        const kind = arm === 'verbatim' ? '教材の抜粋・生成なし' : arm === 'assisted' ? (data.modelUsed ? '検索＋LLMを使用' : '教材・計算・回答保留（LLM未使用）') : 'LLMの回答';
        box.append(element('h4', label), element('small', kind, 'answer-kind'), element('p', data.answer, 'answer-text'), element('p', '回答開始 ' + formatMs(data.firstVisibleMs) + ' / 完了 ' + formatMs(data.totalMs), 'answer-timing'));
        grid.append(box);
      }
      card.append(grid); root.append(card);
    }
    if (run?.failedPartial) {
      const box = element('article', undefined, 'question-result');
      box.append(element('h3', '中断した回答（未完了）'), element('p', run.failedPartial.phase), element('p', run.failedPartial.answer, 'answer-text'));
      root.append(box);
    }
    return run;
  }
  selector.addEventListener('change', () => { selectedId = selector.value; window.dispatchEvent(new Event('lab-update')); });
  return { render, clearGeneration, beginGeneration };
}
