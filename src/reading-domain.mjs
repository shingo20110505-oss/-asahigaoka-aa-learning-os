import {dayKey, DAY} from './domain.mjs';

export const paragraphs = text => String(text || '').trim().split(/\n\s*\n/).filter(Boolean);
export const wordCount = text => String(text || '').match(/[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*/g)?.length || 0;
export const normalized = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
export const isReadingDue = (record, now = Date.now()) => Boolean(record?.review?.due && dayKey(record.review.due) <= dayKey(now));
export function readingItems(index, records, {level = '全部', filter = 'すべて', query = '', sort = '標準', now = Date.now()} = {}) {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  const result = index.filter(item => {
    const p = records[item.id] || {};
    const haystack = normalized([item.title, item.topic, p.memo, ...Object.values(p.paragraphNotes || {})].join(' '));
    return (level === '全部' || item.level === Number(level)) && terms.every(t => haystack.includes(t)) &&
      (filter !== '未読' || !p.lastOpened && !p.completedAt) &&
      (filter !== '読みかけ' || p.lastOpened && !p.completedAt) &&
      (filter !== '読了' || p.completedAt) &&
      (filter !== 'お気に入り' || p.favorite) &&
      (filter !== '追加教材' || item.addedAt) &&
      (filter !== '復習する' || isReadingDue(p, now));
  });
  if (sort === '短い順') result.sort((a, b) => a.words - b.words || a.id.localeCompare(b.id));
  if (sort === '最近開いた順') result.sort((a, b) => (records[b.id]?.lastOpened || 0) - (records[a.id]?.lastOpened || 0));
  if (sort === '追加が新しい順') result.sort((a,b)=>(b.addedAt||'').localeCompare(a.addedAt||''));
  if (sort === '復習日順') result.sort((a, b) => (records[a.id]?.review?.due || Infinity) - (records[b.id]?.review?.due || Infinity));
  return result;
}
export function planReadingReview(previous = {}, days, now = Date.now()) {
  if (![1, 3, 7, 14].includes(days)) throw Error('復習間隔を選び直してください');
  return {...previous, due: now + days * DAY, last: now, interval: days, repetitions: (Number(previous.repetitions) || 0) + 1};
}
// One record owns the review date. The calendar reads it instead of copying tasks.
export function completeReading(previous = {}, now = Date.now()) {
  if (previous.completedAt) return previous;
  const hasPlan = Object.hasOwn(previous.review || {}, 'due');
  return {...previous, completedAt:new Date(now).toISOString(),
    review:hasPlan ? previous.review : planReadingReview({}, 1, now)};
}
export function finishReadingReview(previous = {}, now = Date.now()) {
  const interval = [1,3,7,14].find(n=>n>(previous.review?.interval || 1)) || 14;
  return {...previous, lastRevisited:now, review:{...planReadingReview(previous.review, interval, now),
    completedReviews:(Number(previous.review?.completedReviews)||0)+1}};
}
export function readingNoteBody(book, progress, memo = progress.memo || '') {
  const blocks = ['英文：' + book.title, '要約・気づき：\n' + memo];
  for (const [i, note] of Object.entries(progress.paragraphNotes || {})) {
    if (note.trim()) blocks.push(`段落 ${Number(i) + 1}${progress.paragraphRoles?.[i] ? '（' + progress.paragraphRoles[i] + '）' : ''}：\n${note}`);
  }
  for (const note of progress.annotations || []) blocks.push('引用：' + note.quote + '\nメモ：' + note.note);
  if (progress.reflection) blocks.push('読み返して気づいたこと：\n' + progress.reflection);
  return blocks.join('\n\n');
}

// Only visible, unpaused reading time is counted. Draining allows atomic additive saves across tabs.
export class ReadingClock {
  constructor(now = () => performance.now()) { this.now = now; this.pending = 0; this.started = null; }
  start() { if (this.started === null) this.started = this.now(); }
  pause() { if (this.started !== null) { this.pending += Math.max(0, this.now() - this.started); this.started = null; } }
  value() { return this.pending + (this.started === null ? 0 : Math.max(0, this.now() - this.started)); }
  take() { const elapsed = this.value(); this.pending = 0; if (this.started !== null) this.started = this.now(); return elapsed; }
  restore(milliseconds) { this.pending += milliseconds; }
}
