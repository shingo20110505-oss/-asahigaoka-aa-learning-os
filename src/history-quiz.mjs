// Quiz choices reuse the canonical timeline. These deliberately broad bounds
// only keep distractors apart; they are not historical confidence intervals.
const MODES = new Set(['date', 'event', 'mixed']);
const normalize = value => String(value ?? '').normalize('NFKC').replace(/[\s、。・「」『』（）()]/g, '').toLowerCase();
const dateText = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, '').replace(/[～~–—−-]/g, '〜');
const finiteRange = value => value && Number.isFinite(value.start) && Number.isFinite(value.end) && value.start <= value.end
  ? { start: value.start, end: value.end } : null;

/** Conservative exclusion bounds, never the displayed answer. Unknown dates
 * have no bounds and are skipped, rather than converting sort into a fact. */
export function historyQuizDateBounds(row) {
  if (!row || typeof row.date !== 'string') return null;
  const explicit = finiteRange(row.dateRange);
  const text = dateText(row.date).replace(/[（(][^）)]*[）)]/g, '');
  const approximate = /約|ごろ|頃|およそ/.test(text);
  const bce = text.includes('紀元前');
  const body = text.replace(/^(?:約|およそ)?(?:紀元前|紀元後|西暦)?(?:約|およそ)?/, '');
  let parsed = null;
  if (!text.includes('年前')) {
    const century = body.match(/^(\d+)(?:〜(\d+))?世紀(?:ごろ|頃|前半|後半|初め|初頭|半ば|中ごろ|末|末ごろ)*$/);
    const year = body.match(/^(\d+)(?:〜(\d+))?年((?:\d+月(?:\d+日)?)?(?:代)?(?:ごろ|頃|前半|後半|初め|初頭|半ば|末)*)$/);
    if (century && Number(century[1]) > 0 && Number(century[2] || century[1]) > 0) {
      const lo = Math.min(Number(century[1]), Number(century[2] || century[1]));
      const hi = Math.max(Number(century[1]), Number(century[2] || century[1]));
      // Keep the whole century even for 'early', 'late' and 'middle'.
      parsed = bce ? { start: -hi * 100, end: -(lo - 1) * 100 - 1 }
        : { start: (lo - 1) * 100 + 1, end: hi * 100 };
    } else if (year && Number(year[1]) > 0 && Number(year[2] || year[1]) > 0) {
      const lo = Math.min(Number(year[1]), Number(year[2] || year[1]));
      const hi = Math.max(Number(year[1]), Number(year[2] || year[1]));
      const decade = year[3].startsWith('代') ? 9 : 0;
      parsed = bce ? { start: -(hi + decade), end: -lo }
        : { start: lo, end: hi + decade };
    }
    if (parsed && approximate) {
      const guard = Math.max(25, Math.ceil(Math.max(Math.abs(parsed.start), Math.abs(parsed.end)) * .05));
      parsed = { start: parsed.start - guard, end: parsed.end + guard };
    }
  }
  // The written label can be broader than a curated range. Keep both, since a
  // broad label must not become a supposedly wrong choice for a nearby event.
  if (parsed && explicit) return { start: Math.min(parsed.start, explicit.start), end: Math.max(parsed.end, explicit.end) };
  return parsed || explicit;
}

function randomUnit(random) {
  const value = Number(random());
  return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
}
function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const at = Math.floor(randomUnit(random) * (i + 1));
    [result[i], result[at]] = [result[at], result[i]];
  }
  return result;
}
const separate = (a, b) => a.end < b.start || b.end < a.start;
function grams(text) { return new Set(Array.from({ length: Math.max(0, text.length - 1) }, (_, i) => text.slice(i, i + 2))); }
function metadata(row) {
  if (!row || !['number', 'string'].includes(typeof row.id) || !String(row.id).trim()
    || typeof row.event !== 'string' || !row.event.trim() || typeof row.date !== 'string' || !row.date.trim()) return null;
  const bounds = historyQuizDateBounds(row);
  if (!bounds || !Number.isFinite(bounds.start) || !Number.isFinite(bounds.end)) return null;
  const event = normalize(row.event);
  return { row, id: String(row.id), bounds, event, grams: grams(event), date: dateText(row.date),
    related: new Set((Array.isArray(row.relatedIds) ? row.relatedIds : []).map(String)),
    japan: String(row.area || '').includes('日本'), center: (bounds.start + bounds.end) / 2 };
}
function equivalent(a, b) {
  if (a.id === b.id || a.event === b.event || a.related.has(b.id) || b.related.has(a.id)) return true;
  // Catch a repeated event with a short addition or slightly changed wording.
  const shorter = Math.min(a.event.length, b.event.length), longer = Math.max(a.event.length, b.event.length);
  if (shorter >= 6 && shorter / longer >= .6 && (a.event.includes(b.event) || b.event.includes(a.event))) return true;
  if (shorter < 8) return false;
  const intersection = [...a.grams].filter(part => b.grams.has(part)).length;
  return intersection / Math.min(a.grams.size, b.grams.size) >= .72
    && intersection / Math.max(a.grams.size, b.grams.size) >= .52;
}
function optionsFor(target, bank, mode, random) {
  const eligible = bank.filter(other => separate(target.bounds, other.bounds) && !equivalent(target, other));
  eligible.sort((a, b) =>
    Number(a.row.period !== target.row.period) - Number(b.row.period !== target.row.period)
    || Number(a.japan !== target.japan) - Number(b.japan !== target.japan)
    || Math.abs(a.center - target.center) - Math.abs(b.center - target.center));
  const selected = [target], labels = new Set([mode === 'date' ? target.date : target.event]);
  // Draw from nearby candidates first, then widen only if the choices overlap.
  for (const candidate of [...shuffled(eligible.slice(0, 20), random), ...eligible]) {
    const label = mode === 'date' ? candidate.date : candidate.event;
    if (labels.has(label) || selected.some(other => !separate(other.bounds, candidate.bounds) || equivalent(other, candidate))) continue;
    labels.add(label); selected.push(candidate);
    if (selected.length === 4) break;
  }
  if (selected.length !== 4) return null;
  return shuffled(selected, random).map(item => ({ id: `${mode}:${item.id}`, label: item.row[mode], row: item.row }));
}

/** `items` alone supplies correct answers; `pool` may supply extra distractors.
 * Source rows and their legacy progress are never changed. */
export function createHistoryQuiz(items, { mode = 'mixed', count = 10, pool = items, random = Math.random } = {}) {
  if (!Array.isArray(items)) return [];
  if (!MODES.has(mode)) mode = 'mixed';
  if (typeof random !== 'function') random = Math.random;
  const requested = Number.isFinite(Number(count)) ? Math.max(0, Math.min(50, Math.floor(Number(count)))) : 10;
  if (!requested) return [];
  const original = new Map();
  for (const row of Array.isArray(pool) ? pool : []) if (row && row.id !== undefined) original.set(String(row.id), row);
  // Prefer the filtered canonical item when a pool repeats its ID.
  for (const row of items) if (row && row.id !== undefined) original.set(String(row.id), row);
  const prepared = new Map();
  for (const [id, row] of original) { const item = metadata(row); if (item) prepared.set(id, item); }
  const candidates = [...new Set(items.filter(Boolean).map(row => String(row.id)))].map(id => prepared.get(id)).filter(Boolean);
  const bank = [...prepared.values()], questions = [], firstMode = randomUnit(random) < .5 ? 'date' : 'event';
  for (const item of shuffled(candidates, random)) {
    const kind = mode === 'mixed' ? (questions.length % 2 ? (firstMode === 'date' ? 'event' : 'date') : firstMode) : mode;
    const choices = optionsFor(item, bank, kind, random);
    if (!choices) continue;
    questions.push({ id: `${kind}:${item.id}`, mode: kind, row: item.row, choices, answerId: `${kind}:${item.id}` });
    if (questions.length === requested) break;
  }
  return questions;
}
