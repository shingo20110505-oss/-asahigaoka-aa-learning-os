import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { BOUNDED_READ_SOURCE, MAX_READ_BYTES, patchSafariReads } from '../experiments/rag/runtime-read-patch.mjs';

function reader({ length, fail = false, oversized = false }) {
  let heap = new Uint8Array(length + 16).fill(211);
  const requests = [], context = vm.createContext({ Uint8Array, Math, Promise, Error,
    console: { debug() {} }, _stripModelsPrefix: p => p.replace('/models/', ''),
    getHeapU8: () => heap, toSizeT: n => n,
    postMessage({ args: [name, offset, size] }) {
      requests.push({ name, offset, size });
      // Simulate replacement of the wasm heap while awaiting file data.
      heap = heap.slice();
      queueMicrotask(() => {
        if (fail) return vm.runInContext('pendingReadReject(Error("read failed"))', context);
        const count = oversized ? size + 1 : Math.max(0, Math.min(size, length - offset));
        const bytes = Uint8Array.from({ length: count }, (_, i) => (offset + i) % 251);
        context.response = bytes.buffer;
        vm.runInContext('pendingReadResolve(response)', context);
      });
    }
  });
  vm.runInContext('let pendingReadPromise, pendingReadResolve, pendingReadReject, isAwaitReading = false;\n' + BOUNDED_READ_SOURCE + '\nglobalThis.read = _wllama_js_file_read;', context);
  return { context, requests, heap: () => heap, clean: () => vm.runInContext('!isAwaitReading && pendingReadResolve === null && pendingReadReject === null && pendingReadPromise === null', context) };
}

test('Native large reads use bounded transfers and preserve exact offsets and bytes', async () => {
  const length = MAX_READ_BYTES * 2 + 123, r = reader({ length });
  assert.equal(await r.context.read('/models/a.gguf', 0, length, 8), length);
  assert.deepEqual(r.requests.map(x => x.size), [MAX_READ_BYTES, MAX_READ_BYTES, 123]);
  assert.deepEqual(r.requests.map(x => x.offset), [0, MAX_READ_BYTES, MAX_READ_BYTES * 2]);
  assert.ok(r.requests.every(x => x.name === 'a.gguf'));
  for (let i = 0; i < length; i++) assert.equal(r.heap()[8 + i], i % 251);
  assert.ok(r.heap().subarray(0, 8).every(x => x === 211));
  assert.ok(r.heap().subarray(length + 8).every(x => x === 211));
  assert.equal(r.clean(), true);
});

test('Short reads, zero-size reads and failures retain fread semantics and release the guard', async () => {
  const r = reader({ length: 17 });
  assert.equal(await r.context.read('/models/a', 5, 30, 0), 12);
  assert.deepEqual([...r.heap().slice(0, 12)], [...Array(12)].map((_, i) => i + 5));
  assert.equal(await r.context.read('/models/a', 17, 30, 0), 0);
  const count = r.requests.length;
  assert.equal(await r.context.read('/models/a', 0, 0, 0), 0);
  assert.equal(r.requests.length, count); assert.equal(r.clean(), true);
  for (const opts of [{ fail: true }, { oversized: true }]) {
    const bad = reader({ length: 12, ...opts });
    await assert.rejects(bad.context.read('/models/a', 0, 12, 0));
    assert.equal(bad.clean(), true);
  }
});

test('Patch rejects changed upstream source and can only be applied once', () => {
  const original = `const _wllama_js_file_read = async () => {\n  args: [name, offset, req_size];\n  return toSizeT(bytes.length);\n};`;
  const patched = patchSafariReads('var LLAMA_CPP_WORKER_CODE = ' + JSON.stringify(original) + ';');
  assert.ok(patched.includes('transfer limit 8388608'));
  assert.throws(() => patchSafariReads(patched), /requires review/);
  assert.throws(() => patchSafariReads('new upstream structure'), /not found/);
});
