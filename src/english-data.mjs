// 英単語・熟語データ（data/english/words.json）の読み込み。
// 初回だけ一括ダウンロードして IndexedDB に保存し、2回目以降は小さな
// data/english/version.json と照合して、版が同じなら端末内コピーを使う。
// 通信できない場合は最後に保存した辞書を使い、学習履歴には触れない。
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
    return typeof doc.version === 'string' && doc.version ? doc : null;
  } catch { return null; }
}
const usableWords = words => Array.isArray(words) && words.length > 0 &&
  words.every(word => word && typeof word.id === 'string' && typeof word.word === 'string');
const expectedHash = version => /^[a-f0-9]{64}$/i.test(version?.words?.sha256 || '') ? version.words.sha256.toLowerCase() : null;
const expectedCount = version => Number.isSafeInteger(version?.words?.entries) && version.words.entries > 0 ? version.words.entries : null;
async function fetchWords(onProgress, version) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 180000);
  try {
    const res = await fetch(WORDS_URL, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw Error('データを読み込めませんでした。通信を確認してください。');
    const total = Number(res.headers.get('content-length')) || 0;
    let buf;
    if (!res.body?.getReader) {
      buf = new Uint8Array(await res.arrayBuffer());
    } else {
      const reader = res.body.getReader(), chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.length;
        onProgress?.(`辞書データをダウンロードしています… ${Math.round(received / 1048576)} MB${total ? ` / ${Math.round(total / 1048576)} MB` : ''}（初回のみ）`);
      }
      buf = new Uint8Array(received);
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }
    }
    const hash = expectedHash(version);
    const sha256 = hash && globalThis.crypto?.subtle ?
      [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('') : null;
    if (hash && sha256 && sha256 !== hash) throw Error('辞書データが更新情報と一致しません。最新版を開いてから再試行してください。');
    const words = JSON.parse(new TextDecoder().decode(buf)), count = expectedCount(version);
    if (!usableWords(words) || count && words.length !== count) throw Error('辞書の件数が更新情報と一致しません。最新版を開いてから再試行してください。');
    return { words, sha256 };
  } finally { clearTimeout(timer); }
}
export async function loadEnglishWords(onProgress) {
  const [version, cached] = await Promise.all([fetchVersion(), readCache()]);
  const usableCache = usableWords(cached?.words);
  if (!version && usableCache) return cached.words;
  const count = expectedCount(version), hash = expectedHash(version);
  if (version && usableCache && cached.version === version.version &&
      (!count || cached.words.length === count) && (!hash || cached.sha256 === hash)) return cached.words;
  onProgress?.('辞書データをダウンロードしています…（初回のみ）');
  const { words, sha256 } = await fetchWords(onProgress, version);
  if (version) await writeCache({ version: version.version, words, sha256, savedAt: Date.now() });
  return words;
}
