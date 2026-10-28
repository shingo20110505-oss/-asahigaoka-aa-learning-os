// Repackage existing GGUF tensor bytes as file-backed Blob slices. No requantization,
// whole-model ArrayBuffer, second model download, or persisted duplicate is needed.
const MAX_HEADER = 64 * 1024 * 1024;
const encoder = new TextEncoder(), decoder = new TextDecoder();
const uint = (value, bytes) => {
  const out = new Uint8Array(bytes), view = new DataView(out.buffer);
  if (bytes === 8) view.setBigUint64(0, BigInt(value), true);
  else if (bytes === 4) view.setUint32(0, value, true);
  else view.setUint16(0, value, true);
  return out;
};
const string = text => { const b = encoder.encode(text); return [uint(b.length, 8), b]; };
const key = (name, type, value, bytes) => [...string(name), uint(type, 4), uint(value, bytes)];

export async function splitGGUF(blob, { maxPartBytes = 512_000_000 } = {}) {
  if (!Number.isSafeInteger(maxPartBytes) || maxPartBytes < 1024) throw Error('Invalid GGUF part size');
  const raw = new Uint8Array(await blob.slice(0, MAX_HEADER).arrayBuffer());
  const view = new DataView(raw.buffer), length = raw.length;
  let pos = 0, alignment = 32;
  const need = n => { if (!Number.isSafeInteger(n) || n < 0 || pos + n > length) throw Error('GGUFヘッダーが不正、または対応サイズを超えています。'); };
  const u32 = () => { need(4); const n = view.getUint32(pos, true); pos += 4; return n; };
  const u64 = () => { need(8); const n = Number(view.getBigUint64(pos, true)); pos += 8; if (!Number.isSafeInteger(n)) throw Error('GGUF value exceeds safe integer'); return n; };
  const skipString = (decode = false) => { const n = u64(); need(n); const text = decode ? decoder.decode(raw.subarray(pos, pos + n)) : null; pos += n; return text; };
  const fixed = [1, 1, 2, 2, 4, 4, 4, 1, 0, 0, 8, 8, 8];
  const skipValue = (type, depth = 0) => {
    if (depth > 8 || type >= fixed.length) throw Error('Unsupported GGUF value');
    if (type === 8) skipString();
    else if (type === 9) {
      const child = u32(), count = u64();
      if (child >= fixed.length || count > 10_000_000) throw Error('Invalid GGUF array');
      if (fixed[child]) { const n = fixed[child] * count; need(n); pos += n; }
      else for (let i = 0; i < count; i++) skipValue(child, depth + 1);
    } else { need(fixed[type]); pos += fixed[type]; }
  };
  if (u32() !== 0x46554747 || u32() !== 3) throw Error('分割読込はGGUF v3に対応しています。');
  const tensorCount = u64(), kvCount = u64();
  if (!tensorCount || tensorCount > 100_000 || kvCount > 100_000) throw Error('Invalid GGUF counts');
  const metadata = [];
  for (let i = 0; i < kvCount; i++) {
    const start = pos, name = skipString(true), type = u32(), valueStart = pos;
    skipValue(type);
    if (name.startsWith('split.')) throw Error('このモデルはすでに分割されています。');
    if (name === 'general.alignment') {
      if (type !== 4) throw Error('Invalid GGUF alignment type');
      alignment = view.getUint32(valueStart, true);
    }
    metadata.push(raw.subarray(start, pos));
  }
  if (!alignment || alignment > 4096 || (alignment & (alignment - 1))) throw Error('Invalid GGUF alignment');
  const align = n => Math.ceil(n / alignment) * alignment;
  const tensors = [];
  for (let i = 0; i < tensorCount; i++) {
    const start = pos;
    skipString(); const dimensions = u32();
    if (!dimensions || dimensions > 4) throw Error('Invalid GGUF tensor dimensions');
    for (let d = 0; d < dimensions; d++) if (!u64()) throw Error('Empty GGUF tensor');
    u32(); const offset = u64();
    tensors.push({ descriptor: raw.subarray(start, pos - 8), offset });
  }
  const dataStart = align(pos), sorted = [...tensors].sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i], end = sorted[i + 1]?.offset ?? blob.size - dataStart;
    t.size = end - t.offset;
    if (t.offset % alignment || t.size <= 0 || dataStart + end > blob.size) throw Error('Invalid GGUF tensor extent');
  }
  const groups = []; let group = [], size = 0;
  for (const tensor of tensors) {
    if (group.length && size + align(tensor.size) > maxPartBytes) { groups.push(group); group = []; size = 0; }
    group.push(tensor); size += align(tensor.size);
  }
  if (group.length) groups.push(group);
  if (groups.length > 65535) throw Error('Too many GGUF parts');
  const parts = groups.map((items, index) => {
    const header = [uint(0x46554747, 4), uint(3, 4), uint(items.length, 8), uint(kvCount + 3, 8), ...metadata,
      ...key('split.no', 2, index, 2), ...key('split.count', 2, groups.length, 2), ...key('split.tensors.count', 5, tensorCount, 4)];
    let offset = 0;
    for (const t of items) { header.push(t.descriptor, uint(offset, 8)); offset += align(t.size); }
    const headerBytes = header.reduce((n, b) => n + b.byteLength, 0);
    const content = [new Blob(header), new Uint8Array(align(headerBytes) - headerBytes)];
    for (const t of items) { content.push(blob.slice(dataStart + t.offset, dataStart + t.offset + t.size)); if (align(t.size) !== t.size) content.push(new Uint8Array(align(t.size) - t.size)); }
    const part = new Blob(content);
    if (part.size >= 2 ** 31) throw Error('モデル内の一つのテンソルが大きすぎて互換処理で読めません。');
    return part;
  });
  return { parts, tensorCount, sourceBytes: blob.size, largestPartBytes: Math.max(...parts.map(p => p.size)), method: 'gguf-v3-blob-parts-v1' };
}
