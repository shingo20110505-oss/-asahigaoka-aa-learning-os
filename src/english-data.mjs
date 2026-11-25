// 英単語・熟語データ（data/english/words.json）の読み込み。
// 初回だけ一括ダウンロードして IndexedDB に保存し、2回目以降は小さな
// data/english/version.json と照合して、版が同じなら端末内コピーを使う。
// version.json が取得できない場合は従来どおり words.json を直接読む。
const VERSION_URL = './data/english/version.json';
const WORDS_URL = './data/english/words.json';
const DB_NAME = 'rise-english-dict', STORE = 'kv', KEY = 'english-words';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function readCache() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}
async function writeCache(value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* 保存できなくても表示は続行する */ }
}
async function fetchVersion() {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const doc = await res.json();
    return doc.version || null;
  } catch { return null; }
}
async function fetchWords(onProgress) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 180000);
  try {
    const res = await fetch(WORDS_URL, { signal: controller.signal });
    if (!res.ok) throw Error('データを読み込めませんでした。通信を確認してください。');
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body?.getReader) return await res.json();
    const reader = res.body.getReader(), chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); received += value.length;
      onProgress?.(`辞書データをダウンロードしています… ${Math.round(received / 1048576)} MB${total ? ` / ${Math.round(total / 1048576)} MB` : ''}（初回のみ）`);
    }
    const buf = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }
    return JSON.parse(new TextDecoder().decode(buf));
  } finally { clearTimeout(timer); }
}
export async function loadEnglishWords(onProgress) {
  const version = await fetchVersion();
  const cached = await readCache();
  if (version && cached?.version === version && Array.isArray(cached.words)) return cached.words;
  onProgress?.('辞書データをダウンロードしています…（初回のみ）');
  const words = await fetchWords(onProgress);
  if (version && Array.isArray(words)) await writeCache({ version, words, savedAt: Date.now() });
  return words;
}
