/* Rise Vocabulary Recommendation Signals v1
 * Foundation only. Produces deterministic ranking signals from canonical records +
 * read-only progress snapshots. It does not select quiz formats or write learner state.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RISE_VOCABULARY_RECOMMENDATION_SIGNALS_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const SUBJECTS = Object.freeze(['english', 'japanese', 'social']);
  const MODES = Object.freeze(['today', 'weak', 'due', 'new']);
  const text = (value) => value == null ? '' : String(value).trim();
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const list = (value) => Array.isArray(value) ? value : [];

  function identity(record) {
    return `${text(record && record.subject)}:${text(record && record.id)}`;
  }

  function rankWeight(record) {
    const raw = text(record && record.examRank).toUpperCase();
    if (raw === 'S') return 30;
    if (raw === 'A') return 24;
    if (raw === 'B') return 14;
    if (raw === 'C') return 6;
    const importance = number(record && record.importance);
    return Math.max(0, Math.min(30, importance));
  }

  function statusBand(progress) {
    const status = text(progress && progress.status);
    if (status === 'weak') return 700;
    if (status === 'new') return 500;
    if (status === 'learning') return 300;
    if (status === 'mastered') return 100;
    return 0;
  }

  function englishSignal(record, progress) {
    const p = progress || {};
    const reasons = [];
    let tier = 'learning';
    let score = statusBand(p);

    if (p.fromReading) {
      tier = 'reading_unknown';
      score = 1000;
      reasons.push('reading_unknown');
    } else if (p.currentWrong) {
      tier = 'current_wrong';
      score = 900;
      reasons.push('current_wrong');
    } else if (p.due) {
      tier = 'due';
      score = 800;
      reasons.push('due');
    } else if (text(p.status) === 'weak') {
      tier = 'srs_weak';
      score = 700;
      reasons.push('srs_weak');
    } else if (text(p.status) === 'new') {
      tier = 'new';
      score = 500;
      reasons.push('new');
    } else if (text(p.status) === 'mastered') {
      tier = 'mastered';
      score = 100;
      reasons.push('mastered');
    } else {
      reasons.push('learning');
    }

    score += Math.min(70, Math.max(0, number(p.lapses)) * 14);
    if (Number.isFinite(Number(p.retention)) && number(p.seen) > 0) {
      score += Math.round(Math.max(0, 1 - Number(p.retention)) * 40);
    }
    score += rankWeight(record);
    return { tier, score, reasons };
  }

  function japaneseSignal(record, progress) {
    const p = progress || {};
    const reasons = [];
    let tier = 'new';
    let score = statusBand(p);

    if (p.currentWrong) {
      tier = 'current_wrong';
      score = 900;
      reasons.push('current_wrong');
    } else if (text(p.status) === 'weak') {
      tier = 'review';
      score = 800;
      reasons.push('review');
    } else if (text(p.status) === 'new') {
      tier = 'new';
      score = 500;
      reasons.push('new');
    } else if (text(p.status) === 'mastered') {
      tier = 'mastered';
      score = 100;
      reasons.push('mastered');
    } else {
      tier = 'learning';
      score = 300;
      reasons.push('learning');
    }

    score += rankWeight(record);
    return { tier, score, reasons };
  }

  function socialSignal(record, progress) {
    const p = progress || {};
    const reasons = [];
    let tier = 'learning';
    let score = 300;

    if (text(p.status) === 'weak' || p.currentWrong) {
      tier = 'native_weak';
      score = 900;
      reasons.push('native_weak');
    } else if (text(p.status) === 'new') {
      tier = 'new';
      score = 500;
      reasons.push('new');
    } else if (p.due) {
      // Chronologia intentionally does not call a never-wrong due item "weak".
      tier = 'due_nonweak';
      score = 400;
      reasons.push('due_nonweak');
    } else {
      reasons.push('learning');
    }

    score += rankWeight(record);
    return { tier, score, reasons };
  }

  function signal(record, progress, options) {
    const subject = text(record && record.subject);
    if (!SUBJECTS.includes(subject)) throw new Error(`unsupported vocabulary subject: ${subject || '(missing)'}`);
    const opts = options || {};
    const avoid = new Set(list(opts.avoidIds).map(text));
    const key = identity(record);

    let nativeSignal;
    if (subject === 'english') nativeSignal = englishSignal(record, progress);
    else if (subject === 'japanese') nativeSignal = japaneseSignal(record, progress);
    else nativeSignal = socialSignal(record, progress);

    let score = nativeSignal.score;
    const reasons = [...nativeSignal.reasons];
    if (avoid.has(key) || avoid.has(text(record && record.id))) {
      score -= 80;
      reasons.push('recently_seen_penalty');
    }

    return Object.freeze({
      subject,
      id: text(record && record.id),
      identity: key,
      tier: nativeSignal.tier,
      score,
      reasons: Object.freeze(reasons),
      status: text(progress && progress.status) || 'new',
      due: Boolean(progress && progress.due),
      currentWrong: Boolean(progress && progress.currentWrong),
      fromReading: Boolean(progress && progress.fromReading)
    });
  }

  function modeAccepts(progress, mode) {
    const p = progress || {};
    if (mode === 'weak') return text(p.status) === 'weak' || Boolean(p.currentWrong) || Boolean(p.fromReading);
    if (mode === 'due') return Boolean(p.due);
    if (mode === 'new') return text(p.status) === 'new';
    return text(p.status) !== 'mastered';
  }

  function rankCandidates(candidates, options) {
    const opts = options || {};
    const mode = MODES.includes(opts.mode) ? opts.mode : 'today';
    const subject = text(opts.subject);
    const limit = Math.max(1, Math.min(1000, number(opts.limit) || 10));
    const rows = list(candidates)
      .filter((entry) => entry && entry.record && entry.progress)
      .filter((entry) => !subject || text(entry.record.subject) === subject)
      .filter((entry) => modeAccepts(entry.progress, mode))
      .map((entry, index) => ({
        record: entry.record,
        progress: entry.progress,
        signal: signal(entry.record, entry.progress, opts),
        index
      }));

    rows.sort((a, b) => {
      if (b.signal.score !== a.signal.score) return b.signal.score - a.signal.score;
      const ai = a.signal.identity;
      const bi = b.signal.identity;
      const idCompare = ai.localeCompare(bi, 'ja');
      if (idCompare) return idCompare;
      return a.index - b.index;
    });

    return rows.slice(0, limit).map((entry) => Object.freeze({
      record: entry.record,
      progress: entry.progress,
      signal: entry.signal
    }));
  }

  return Object.freeze({
    VERSION,
    SUBJECTS,
    MODES,
    identity,
    signal,
    englishSignal,
    japaneseSignal,
    socialSignal,
    modeAccepts,
    rankCandidates
  });
});
