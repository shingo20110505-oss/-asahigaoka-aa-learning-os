import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base = new URL(process.argv[2]);
const version = process.argv[3];
const hash = raw => createHash('sha256').update(raw).digest('hex');
const manifest = JSON.parse(await fs.readFile('ai-reading-library/manifest.json', 'utf8'));
const paths = ['ai-reading-library-v1.js', 'ai-reading-library/manifest.json', 'ai-reading-library/generation-status.json', 'vocab.html', 'v23-english-main.js', ...manifest.entries.slice(-3).map(e => 'ai-reading-library/' + e.path)];
for (const file of paths) {
  const url = new URL(file, base); url.searchParams.set('verify', version);
  const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const actual = Buffer.from(await response.arrayBuffer());
  if (hash(actual) !== hash(await fs.readFile(file))) throw new Error(`${file}: public content mismatch`);
}
console.log(`Verified published Gemini library: ${manifest.entries.length} passages / ${manifest.entries.length * 5} questions; exact content hashes match.`);
