(() => {
  'use strict';
  if (window.AAReadingLibrary) return;
  const base = new URL('./ai-reading-library/', document.currentScript?.src || location.href);
  const CACHE_KEY = 'aa_verified_reading_catalog_v1';
  let manifest = null, status = null, loading = null;
  const payloads = new Map();
  const validEntry = e => e && /^[a-f0-9]{64}$/.test(e.id) && e.sha256 === e.id && e.path === `items/${e.id}.json` &&
    Number.isInteger(e.difficulty) && e.difficulty >= 1 && e.difficulty <= 11 && e.questionCount === 5 &&
    ['narrative', 'argument'].includes(e.readingType) && Array.isArray(e.requiredGrammar);
  function checkManifest(data) {
    if (data?.schemaVersion !== 1 || !Array.isArray(data.entries) || !data.entries.every(validEntry) ||
        new Set(data.entries.map(e => e.id)).size !== data.entries.length) throw new Error('教材一覧を確認できませんでした。');
    return data;
  }
  async function get(path) {
    const url = new URL(path, base);
    if (url.origin !== location.origin || !url.href.startsWith(base.href)) throw new Error('教材のURLが正しくありません。');
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      const r = await fetch(url.href, {credentials: 'omit', cache: 'no-cache', ...(controller ? {signal: controller.signal} : {})});
      if (!r.ok) throw new Error('教材を取得できませんでした。通信を確認して再試行してください。');
      return await r.text();
    } finally { if (timer) clearTimeout(timer); }
  }
  function snapshot() {
    return {total: manifest?.entries.length || 0, questions: (manifest?.entries.length || 0) * 5,
      updatedAt: manifest?.updatedAt || null, loaded: !!manifest, status};
  }
  async function load(refresh = false) {
    if (loading) return loading;
    if (manifest && !refresh) return manifest;
    loading = (async () => {
      try {
        const [catalog, run] = await Promise.all([get('manifest.json'), get('generation-status.json').catch(() => null)]);
        manifest = checkManifest(JSON.parse(catalog));
        status = run ? JSON.parse(run) : null;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({manifest, status})); } catch (_) { /* learning can continue */ }
      } catch (error) {
        if (!manifest) {
          try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY)); manifest = checkManifest(cached.manifest); status = cached.status; }
          catch (_) { throw error; }
        }
      }
      return manifest;
    })();
    try { return await loading; } finally { loading = null; }
  }
  function rank(entries, request, seen = {}, vocabularyScore = () => 0) {
    const allowed = new Set(request.allowedGrammar || []), skills = new Set((request.weakSkills || []).map(s => s.id));
    const compatible = entries.filter(e => validEntry(e) && e.requiredGrammar.every(g => allowed.has(g)) &&
      (request.readingType === 'mixed' || e.readingType === request.readingType));
    if (!compatible.length) return [];
    const minimumDistance = Math.min(...compatible.map(e => Math.abs(e.difficulty - request.difficulty)));
    // Keep difficulty honest; unseen very advanced passages must not displace suitable review.
    if (minimumDistance > 2) return [];
    return compatible.filter(e => Math.abs(e.difficulty - request.difficulty) <= Math.min(2, minimumDistance + 1))
      .map(e => ({e, score: (seen[e.id] ? 0 : 1000) - Math.abs(e.difficulty - request.difficulty) * 40 +
        (e.skills || []).filter(s => skills.has(s)).length * 5 + Math.max(-20, Math.min(20, vocabularyScore(e)))}))
      .sort((a, b) => b.score - a.score || (seen[a.e.id] || 0) - (seen[b.e.id] || 0) || a.e.id.localeCompare(b.e.id))
      .map(x => x.e);
  }
  async function fetchEntry(entry) {
    if (!validEntry(entry)) throw new Error('教材情報を確認できませんでした。');
    if (payloads.has(entry.id)) return payloads.get(entry.id);
    const raw = await get(entry.path);
    if (globalThis.crypto?.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const hash = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== entry.sha256) throw new Error('教材の更新を確認できませんでした。再読み込みしてください。');
    }
    const payload = JSON.parse(raw);
    if (payload?.quality?.verified !== true || payload.quality.method !== 'independent-blind-answer-check' ||
        payload?.reading?.questions?.length !== 5 || payload.reading.difficulty !== entry.difficulty ||
        payload.reading.readingType !== entry.readingType ||
        JSON.stringify(payload.curriculum?.allowedGrammar) !== JSON.stringify(entry.requiredGrammar)) throw new Error('検査済み教材を取得できませんでした。');
    payloads.set(entry.id, payload);
    return payload;
  }
  async function select(request, seen, vocabularyScore, validate = () => {}) {
    const data = await load();
    const candidates = rank(data.entries, request, seen, vocabularyScore);
    if (!candidates.length) throw new Error(data.entries.length
      ? '今の文法範囲・難度に合う教材を補充中です。単語学習を進めながら、次の補充をお待ちください。'
      : '最初の長文を作成・検査しています。補充後にここから開始できます。');
    let error;
    for (const entry of candidates.slice(0, 3)) {
      try { const payload = await fetchEntry(entry); validate(payload); return {entry, payload}; } catch (e) { error = e; }
    }
    throw error;
  }
  window.AAReadingLibrary = Object.freeze({load, snapshot, rank, fetchEntry, select, checkManifest,
    cached: () => (manifest?.entries || []).filter(e => payloads.has(e.id)).map(entry => ({entry, payload: payloads.get(entry.id)}))});
})();
