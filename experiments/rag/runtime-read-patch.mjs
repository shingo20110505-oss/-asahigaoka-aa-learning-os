// Applied only to the SRI-verified wllama 3.6.1 Safari bundle. Keep tensor
// bytes and native fread semantics; bound the transient JS transfer buffer.
export const READ_PATCH_VERSION = 'bounded-read-v1';
export const MAX_READ_BYTES = 8 * 1024 * 1024;
export const BOUNDED_READ_SOURCE = `const _wllama_js_file_read = async (path, offset, req_size, out_ptr) => {
  const name = _stripModelsPrefix(path);
  let copied = 0;
  isAwaitReading = true;
  try {
    while (copied < req_size) {
      const size = Math.min(${MAX_READ_BYTES}, req_size - copied);
      pendingReadPromise = new Promise((res, rej) => {
        pendingReadResolve = res;
        pendingReadReject = rej;
      });
      postMessage({ verb: 'fs.read_req', args: [name, offset + copied, size] });
      const data = await pendingReadPromise;
      const bytes = new Uint8Array(data);
      if (bytes.length > size) throw Error('File read exceeded requested length');
      // A wasm memory growth can replace the view: obtain it for each chunk.
      getHeapU8().set(bytes, out_ptr + copied);
      copied += bytes.length;
      if (req_size > ${MAX_READ_BYTES} && (copied === req_size || copied % (128 * 1024 * 1024) === 0)) {
        console.debug('RISE bounded file read', copied, '/', req_size, 'bytes; transfer limit ${MAX_READ_BYTES}');
      }
      if (bytes.length < size) break;
    }
    return toSizeT(copied);
  } finally {
    isAwaitReading = false;
    pendingReadResolve = null;
    pendingReadReject = null;
    pendingReadPromise = null;
  }
};`;

export function patchSafariReads(source) {
  const pattern = /^var LLAMA_CPP_WORKER_CODE = (".*");$/m;
  const match = source.match(pattern);
  if (!match) throw Error('Pinned wllama worker source not found');
  const code = JSON.parse(match[1]);
  const start = code.indexOf('const _wllama_js_file_read = async');
  const end = code.indexOf('\n};', start) + 3;
  if (start < 0 || end < start || !code.slice(start, end).includes('args: [name, offset, req_size]') || !code.slice(start, end).includes('return toSizeT(bytes.length)')) {
    throw Error('Pinned wllama file read changed; patch requires review');
  }
  const patched = code.slice(0, start) + BOUNDED_READ_SOURCE + code.slice(end);
  return source.replace(pattern, () => 'var LLAMA_CPP_WORKER_CODE = ' + JSON.stringify(patched) + ';');
}
