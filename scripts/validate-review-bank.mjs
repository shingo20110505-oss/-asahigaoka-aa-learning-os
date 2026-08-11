import fs from 'node:fs';
import vm from 'node:vm';

const path = 'review-bank-v1.js';
const source = fs.readFileSync(path, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: path });

const bank = sandbox.window.AA_REVIEW_BANK;
const version = sandbox.window.AA_REVIEW_BANK_VERSION;

if (!Array.isArray(bank)) throw new Error('AA_REVIEW_BANK must be an array');
if (!/^\d+\.\d+\.\d+$/.test(String(version || ''))) throw new Error('AA_REVIEW_BANK_VERSION must be semver');

const required = ['id', 'subject', 'unit', 'title', 'question', 'answer', 'memory', 'createdAt'];
const ids = new Set();
for (const [i, item] of bank.entries()) {
  for (const key of required) {
    if (!item || typeof item[key] !== 'string' || !item[key].trim()) {
      throw new Error(`item ${i} is missing required string: ${key}`);
    }
  }
  if (ids.has(item.id)) throw new Error(`duplicate review id: ${item.id}`);
  ids.add(item.id);
  if (!Array.isArray(item.examples)) throw new Error(`${item.id}: examples must be an array`);
  if (!Array.isArray(item.tags)) throw new Error(`${item.id}: tags must be an array`);
}

console.log(`review bank OK: version=${version}, items=${bank.length}`);
