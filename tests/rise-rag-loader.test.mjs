import test from 'node:test';
import assert from 'node:assert/strict';
import { splitGGUF } from '../experiments/rag/gguf-parts.mjs';
import { probeModelSource, loadFailure } from '../experiments/rag/load-checks.mjs';

function fixture(alignment = 32) {
  const header = Buffer.alloc(1024); let p = 0;
  const u32 = n => { header.writeUInt32LE(n, p); p += 4; };
  const u64 = n => { header.writeBigUInt64LE(BigInt(n), p); p += 8; };
  const string = s => { u64(Buffer.byteLength(s)); p += header.write(s, p); };
  u32(0x46554747); u32(3); u64(3); u64(alignment === 32 ? 1 : 2);
  string('general.architecture'); u32(8); string('test');
  if (alignment !== 32) { string('general.alignment'); u32(4); u32(alignment); }
  for (let i = 0; i < 3; i++) { string('tensor' + i); u32(1); u64(256); u32(0); u64(i * 1024); }
  const padded = header.subarray(0, Math.ceil(p / alignment) * alignment);
  return new Blob([padded, ...[1, 2, 3].map(n => new Uint8Array(1024).fill(n))]);
}

test('GGUF parts keep raw F32 tensor bytes and emit valid per-part indices and offsets', async () => {
  const source = fixture(), result = await splitGGUF(source, { maxPartBytes: 1024 });
  assert.equal(result.parts.length, 3); assert.equal(result.tensorCount, 3);
  for (let i = 0; i < 3; i++) {
    const b = Buffer.from(await result.parts[i].arrayBuffer());
    assert.equal(b.readUInt32LE(0), 0x46554747); assert.equal(b.readBigUInt64LE(8), 1n);
    let p = 24; const str = () => { const n = Number(b.readBigUInt64LE(p)); p += 8; const s = b.toString('utf8', p, p + n); p += n; return s; };
    const metadata = {};
    for (let k = 0; k < Number(b.readBigUInt64LE(16)); k++) {
      const name = str(), type = b.readUInt32LE(p); p += 4;
      if (type === 8) metadata[name] = str();
      else if (type === 2) { metadata[name] = b.readUInt16LE(p); p += 2; }
      else if (type === 5) { metadata[name] = b.readInt32LE(p); p += 4; }
      else assert.fail('unexpected metadata type');
    }
    assert.deepEqual(metadata, { ...(i === 0 ? { 'general.architecture': 'test' } : {}), 'split.no': i, 'split.count': 3, 'split.tensors.count': 3 });
    assert.equal(str(), 'tensor' + i); assert.equal(b.readUInt32LE(p), 1); p += 4;
    assert.equal(b.readBigUInt64LE(p), 256n); p += 8;
    assert.equal(b.readUInt32LE(p), 0); p += 4;
    assert.equal(b.readBigUInt64LE(p), 0n); p += 8;
    assert.deepEqual(b.subarray(Math.ceil(p / 32) * 32), Buffer.alloc(1024, i + 1));
  }
  assert.equal(source.size, result.sourceBytes);
  assert.equal(result.metadataBytesWritten, result.sourceMetadataBytes);
  assert.equal(result.metadataBytesSaved, result.sourceMetadataBytes * 2);
  assert.equal(result.method, 'gguf-v3-blob-parts-v2');
});

test('Later GGUF shards retain non-default alignment without duplicating model metadata', async () => {
  const result = await splitGGUF(fixture(64), { maxPartBytes: 1024 });
  for (let i = 1; i < result.parts.length; i++) {
    const b = Buffer.from(await result.parts[i].arrayBuffer());
    assert.equal(Number(b.readBigUInt64LE(16)), 4);
    assert.ok(b.includes(Buffer.from('general.alignment')));
    assert.ok(!b.includes(Buffer.from('general.architecture')));
    assert.equal((b.length - 1024) % 64, 0);
    assert.deepEqual(b.subarray(b.length - 1024), Buffer.alloc(1024, i + 1));
  }
});

test('GGUF corrupt, truncated and unbounded inputs fail before model initialization', async () => {
  await assert.rejects(splitGGUF(new Blob(['not a model'])), /GGUF/);
  await assert.rejects(splitGGUF(fixture().slice(0, 40)), /GGUF/);
  await assert.rejects(splitGGUF(fixture(), { maxPartBytes: Infinity }), /size/);
  const b = Buffer.from(await fixture().arrayBuffer()); b.writeBigUInt64LE(9007199254740992n, 8);
  await assert.rejects(splitGGUF(new Blob([b])), /safe integer/);
});

test('Connection probe checks GGUF bytes and cancels even if a server ignores Range', async () => {
  let cancelled = false, calls = 0;
  const result = await probeModelSource('https://models.example/model.gguf', { fetchFn: async (_, init) => {
    calls++; assert.equal(init.headers.Range, 'bytes=0-31');
    return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('GGUFsample')); }, cancel() { cancelled = true; } }), { status: 200 });
  } });
  assert.equal(result.ggufHeader, true); assert.equal(calls, 1); assert.equal(cancelled, true);
});

test('Connection probe identifies block pages, failed HTTP and stalled responses', async () => {
  await assert.rejects(probeModelSource('https://models.example/m.gguf', { fetchFn: async () => new Response('<html>blocked</html>') }), /制限ページ/);
  await assert.rejects(probeModelSource('https://models.example/m.gguf', { fetchFn: async () => new Response('', { status: 403 }) }), /403/);
  await assert.rejects(probeModelSource('https://models.example/m.gguf', { timeoutMs: 5, fetchFn: () => new Promise(() => {}) }), /終わりません/);
});

test('An abort is not diagnosed as OOM without supporting evidence', () => {
  assert.match(loadFailure('(ABORT)', []), /互換処理/);
  assert.doesNotMatch(loadFailure('(ABORT)', []), /確保でき/);
  assert.match(loadFailure('(ABORT)', ['llama_model_load: error loading model: mmap failed: Out of memory']), /メモリを確保/);
});
