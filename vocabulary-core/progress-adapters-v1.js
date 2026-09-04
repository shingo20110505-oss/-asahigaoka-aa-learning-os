/* Rise Vocabulary Progress Adapters v1
 * Foundation only. Pure read functions: no browser-storage API access and no writes.
 * Native systems remain the source of truth.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RISE_VOCABULARY_PROGRESS_ADAPTERS_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const STATUSES = Object.freeze(['new', 'learning', 'weak', 'mastered']);
  const text = (value) => value == null ? '' : String(value).trim();
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const array = (value) => Array.isArray(value) ? value : [];

  function base(record, status) {
    return {
      subject: text(record && record.subject),
      id: text(record && record.id),
      status: STATUSES.includes(status) ? status : 'new',
      seen: 0,
      correct: 0,
      wrong: 0,
      lapses: 0,
      retention: null,
      stage: null,
      lastReviewAt: null,
      nextReviewAt: null,
      due: false,
      currentWrong: false,
      fromReading: false,
      nativeIds: [],
      native: null
    };
  }

  function englishWrongId(record) {
    return text(record && record.source && record.source.nativeId) || text(record && record.id);
  }

  function readEnglish(record, nativeCatalogItem, options) {
    const opts = options || {};
    const now = number(opts.now) || Date.now();
    const p = nativeCatalogItem && nativeCatalogItem.progress ? nativeCatalogItem.progress : (nativeCatalogItem || {});
    const seen = number(p.seen);
    const correct = number(p.correct);
    const lapses = number(p.lapses);
    const retention = Number.isFinite(Number(p.retention)) ? Number(p.retention) : 0;
    const lastReviewAt = number(p.lastReviewAt);
    const dueAt = number(p.dueAt);
    const fromReading = Boolean(p.fromReading);
    const wrongBank = opts.wrongBank && typeof opts.wrongBank === 'object' && !Array.isArray(opts.wrongBank) ? opts.wrongBank : {};
    const wrongId = englishWrongId(record);
    const currentWrong = Boolean(wrongId && Object.prototype.hasOwnProperty.call(wrongBank, wrongId));
    const due = typeof p.due === 'boolean' ? p.due : Boolean(lastReviewAt && dueAt && dueAt <= now);

    let status = 'learning';
    if (!seen && !fromReading && !currentWrong) status = 'new';
    else if (fromReading || currentWrong || due || (lapses >= 2 && retention < 0.85)) status = 'weak';
    else if (seen >= 2 && correct / seen >= 0.84 && retention >= 0.72) status = 'mastered';

    const out = base(record, status);
    out.seen = seen;
    out.correct = correct;
    out.wrong = Math.max(0, seen - correct);
    out.lapses = lapses;
    out.retention = retention;
    out.lastReviewAt = lastReviewAt || null;
    out.nextReviewAt = dueAt || null;
    out.due = due;
    out.currentWrong = currentWrong;
    out.fromReading = fromReading;
    out.nativeIds = [text(record && record.progressRef && record.progressRef.nativeId)].filter(Boolean);
    out.native = p;
    return out;
  }

  function japaneseIds(record) {
    const progressRef = record && record.progressRef || {};
    return [...new Set([text(progressRef.nativeId), ...array(progressRef.aliases).map(text)].filter(Boolean))];
  }

  function japaneseWrongMatch(record, wrongQueue) {
    const ids = new Set(japaneseIds(record));
    const term = text(record && record.term);
    const reading = text(record && record.reading);
    return array(wrongQueue).some((item) => {
      if (!item || typeof item !== 'object') return false;
      const itemId = text(item.id);
      if (itemId && ids.has(itemId)) return true;
      return Boolean(term && text(item.word) === term && (!reading || !text(item.reading) || text(item.reading) === reading));
    });
  }

  function readJapanese(record, nativeState, options) {
    const state = nativeState && typeof nativeState === 'object' && !Array.isArray(nativeState) ? nativeState : {};
    const opts = options || {};
    const ids = japaneseIds(record);
    const states = ids.map((id) => text(state[id])).filter(Boolean);
    const currentWrong = japaneseWrongMatch(record, opts.wrongQueue);
    const hasReview = states.includes('review');
    const hasLearned = states.includes('learned');

    let status = 'new';
    if (currentWrong || hasReview) status = 'weak';
    else if (hasLearned) status = 'mastered';

    const out = base(record, status);
    out.seen = states.length || (currentWrong ? 1 : 0);
    out.correct = hasLearned ? 1 : 0;
    out.wrong = currentWrong || hasReview ? 1 : 0;
    out.currentWrong = currentWrong;
    out.nativeIds = ids;
    out.native = Object.fromEntries(ids.map((id) => [id, state[id]]).filter(([, value]) => value != null));
    return out;
  }

  function socialProgressRecord(record, nativeState) {
    const id = text(record && record.progressRef && record.progressRef.nativeId) || text(record && record.source && record.source.nativeId) || text(record && record.id);
    const progress = nativeState && nativeState.progress && typeof nativeState.progress === 'object' ? nativeState.progress : nativeState;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return { id, value: {} };
    return { id, value: progress[id] || progress[Number(id)] || {} };
  }

  function readSocial(record, nativeState, options) {
    const opts = options || {};
    const now = number(opts.now) || Date.now();
    const found = socialProgressRecord(record, nativeState);
    const p = found.value || {};
    const seen = number(p.seen);
    const correct = number(p.correct);
    const wrong = number(p.wrong);
    const stage = number(p.stage);
    const nextReview = number(p.nextReview);
    const last = number(p.last);
    const weak = Boolean(seen && wrong > 0 && (wrong >= correct || nextReview <= now));
    const status = !seen ? 'new' : weak ? 'weak' : 'learning';

    const out = base(record, status);
    out.seen = seen;
    out.correct = correct;
    out.wrong = wrong;
    out.stage = stage;
    out.lastReviewAt = last || null;
    out.nextReviewAt = nextReview || null;
    out.due = Boolean(seen && nextReview && nextReview <= now);
    out.currentWrong = weak;
    out.nativeIds = [found.id].filter(Boolean);
    out.native = p;
    return out;
  }

  function read(record, native, options) {
    const subject = text(record && record.subject);
    if (subject === 'english') return readEnglish(record, native, options);
    if (subject === 'japanese') return readJapanese(record, native, options);
    if (subject === 'social') return readSocial(record, native, options);
    throw new Error(`unsupported vocabulary subject: ${subject || '(missing)'}`);
  }

  return Object.freeze({
    VERSION,
    STATUSES,
    read,
    readEnglish,
    readJapanese,
    readSocial,
    japaneseIds,
    japaneseWrongMatch
  });
});
