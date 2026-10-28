export function loadFailure(message, logs = []) {
  const evidence = logs.findLast(s => /error loading model|mmap failed|out of memory|memory access out of bounds/i.test(s));
  if (/out of memory|mmap failed/i.test(evidence || message)) return 'モデルの読み込みに必要なメモリを確保できませんでした。' + (evidence ? '\n' + evidence : '');
  if (/abort|memory access out of bounds/i.test(message)) return 'モデルの互換処理が中断されました。結果JSONに直前の状態を保存しました。\n' + message + (evidence ? '\n' + evidence : '');
  return message;
}

export async function probeModelSource(url, { fetchFn = fetch, timeoutMs = 15000 } = {}) {
  const controller = new AbortController(), start = performance.now();
  let reader, timer;
  const work = (async () => {
    const response = await fetchFn(url, { headers: { Range: 'bytes=0-31' }, signal: controller.signal });
    if (!response.ok || !response.body) throw Error('モデル配信元に接続できません（HTTP ' + response.status + '）。');
    reader = response.body.getReader();
    const first = [];
    while (first.length < 4) { const { done, value } = await reader.read(); if (done) break; first.push(...value.subarray(0, 4 - first.length)); }
    if (String.fromCharCode(...first) !== 'GGUF') throw Error('配信元からモデルを取得できません。制限ページなどが返っている可能性があります。');
    return { status: response.status, host: new URL(response.url || url).hostname, ggufHeader: true, ms: performance.now() - start };
  })();
  try {
    return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('モデル配信元の確認が15秒で終わりませんでした。')); }, timeoutMs); })]);
  } finally { clearTimeout(timer); controller.abort(); reader?.cancel().catch(() => {}); }
}
