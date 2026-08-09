import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const csvPath = process.argv[2] || '/tmp/kyoikukihongoi_2009B.csv';
const outputPath = process.argv[3] || new URL('../japanese-vocabulary-10000.js', import.meta.url).pathname;

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const utf8 = execFileSync('iconv', ['-f', 'CP932', '-t', 'UTF-8', csvPath], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const rows = parseCSV(utf8).slice(1);
const clean = s => String(s || '').replace(/[（(].*?[）)]/g, '').trim();
const candidates = [];
for (const row of rows) {
  const allocation = Number(row[0]);
  if (![1, 2].includes(allocation)) continue;
  const reading = clean(row[2]);
  const surface = clean(row[3]) || reading;
  if (!surface || surface.length > 18 || /[A-Za-z0-9]/.test(surface)) continue;
  const support = [5, 6, 7, 8, 9, 10, 11].reduce((n, i) => n + (row[i] ? 1 : 0), 0);
  candidates.push({ surface, reading, pos: clean(row[4]), allocation, support, sourceNo: Number(row[1]) || 0, classCode: clean(row[14]) });
}

candidates.sort((a, b) => a.allocation - b.allocation || b.support - a.support || a.sourceNo - b.sourceNo);
const seen = new Set(), selected = [];
for (const x of candidates) {
  if (seen.has(x.surface)) continue;
  seen.add(x.surface); selected.push(x);
  if (selected.length === 10000) break;
}
if (selected.length !== 10000) throw new Error(`Expected 10000 unique entries, got ${selected.length}`);

const packed = selected.map(x => [x.surface, x.reading === x.surface ? '' : x.reading, x.pos, x.allocation, x.support, x.classCode]);
const out = `/* Generated from NINJAL Database of Basic Vocabulary for Educational Purposes (2009B), CC BY 4.0.\n` +
  `   This is a 10,000-entry curriculum-oriented index, not an official MEXT word-count requirement. */\n` +
  `(function(){'use strict';window.AA_JA_VOCAB_10000={version:'2009B-aa-10000-v1',count:10000,license:'CC BY 4.0',source:'https://mmsrv.ninjal.ac.jp/brfvep/',fields:['word','reading','pos','allocation','support','classCode'],entries:${JSON.stringify(packed)}}})();\n`;
fs.writeFileSync(outputPath, out);
console.log(JSON.stringify({ outputPath, count: selected.length, level1: selected.filter(x => x.allocation === 1).length, level2: selected.filter(x => x.allocation === 2).length, bytes: Buffer.byteLength(out) }));
