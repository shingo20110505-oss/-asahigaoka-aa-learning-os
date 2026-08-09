import fs from 'node:fs';
import path from 'node:path';

const sourcePath = process.argv[2];
const outputPath = process.argv[3] || path.resolve('chronologia.html');
if (!sourcePath) {
  console.error('Usage: node tools/integrate-chronologia.mjs /path/to/chronologia-6.1.html [output]');
  process.exit(2);
}

let html = fs.readFileSync(sourcePath, 'utf8');
const required = [
  '<title>Chronologia 6.1',
  'const DATA = [',
  'const VERSION = "6.1.0"',
  'const STORE_KEY = "chronologia-aichi-v3"',
  'DEEP_NOTES_V61',
  'Chronologia deep explanation patch 6.1 loaded'
];
const missing = required.filter(marker => !html.includes(marker));
if (missing.length) {
  console.error(JSON.stringify({ error: 'Chronologia 6.1 source is incomplete', missing }, null, 2));
  process.exit(1);
}

/*
 * DATA末尾の追補項目は互換性のためキー順が {sort,...,id} になっている。
 * JSONオブジェクトのキー順には依存せず、DATA宣言内のidを数える。
 */
const dataStart = html.indexOf('const DATA = [');
const dataEnd = html.indexOf('];', dataStart);
const dataSource = dataStart >= 0 && dataEnd > dataStart ? html.slice(dataStart, dataEnd + 2) : '';
const ids = [...dataSource.matchAll(/"id":(\d+)/g)].map(match => Number(match[1]));
const uniqueIds = new Set(ids);
const expectedIds = Array.from({ length: 385 }, (_, index) => index + 1);
const missingIds = expectedIds.filter(id => !uniqueIds.has(id));
if (uniqueIds.size !== 385 || Math.max(...uniqueIds) !== 385 || missingIds.length) {
  console.error(JSON.stringify({ error: 'Chronologia DATA appears truncated', records: uniqueIds.size, maxId: Math.max(0, ...uniqueIds) }, null, 2));
  process.exit(1);
}

const compatibilityStyle = `
<style id="aaos-chronologia-compat">
.aaos-back{position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(14px + env(safe-area-inset-bottom));z-index:80;display:inline-flex;align-items:center;min-height:46px;padding:9px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#24324f;color:#fff;text-decoration:none;font:800 .82rem -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic UI",sans-serif;box-shadow:0 12px 34px rgba(17,24,39,.25)}
.aaos-back:focus-visible{outline:3px solid rgba(68,88,200,.45);outline-offset:3px}
@media print{.aaos-back{display:none!important}}
@media(max-width:620px){.aaos-back{left:calc(9px + env(safe-area-inset-left));bottom:calc(11px + env(safe-area-inset-bottom));min-height:44px}.top{right:9px}}
</style>`;
const compatibilityLink = '<a class="aaos-back" href="./index.html" aria-label="旭丘AA Learning OSへ戻る">← AA OSへ戻る</a>';

if (!html.includes('id="aaos-chronologia-compat"')) html = html.replace('</head>', compatibilityStyle + '\n</head>');
if (!html.includes('class="aaos-back"')) html = html.replace('<body>', '<body>\n' + compatibilityLink);

fs.writeFileSync(outputPath, html);
console.log(JSON.stringify({ outputPath, records: uniqueIds.size, bytes: Buffer.byteLength(html), storageKeyPreserved: html.includes('const STORE_KEY = "chronologia-aichi-v3"') }));
