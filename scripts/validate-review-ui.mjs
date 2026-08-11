import fs from 'node:fs';

const mustExist = [
  'review/index.html',
  'review-bank-v1.js',
  'review.html',
  'review-page-v1.js',
  'aa-companion-v2.js'
];
for (const path of mustExist) {
  if (!fs.existsSync(path)) throw new Error(`missing required review file: ${path}`);
}

const review = fs.readFileSync('review/index.html', 'utf8');
const legacyHtml = fs.readFileSync('review.html', 'utf8');
const legacyJs = fs.readFileSync('review-page-v1.js', 'utf8');
const companion = fs.readFileSync('aa-companion-v2.js', 'utf8');

if (!review.includes("fetch('../review-bank-v1.js'")) {
  throw new Error('Review v2 must load the canonical review-bank-v1.js');
}
if (!review.includes("asahi_review_progress_v1")) {
  throw new Error('Review v2 must preserve the existing progress storage key');
}
if (!legacyHtml.includes("./review/")) {
  throw new Error('review.html must forward to ./review/');
}
if (!legacyJs.includes("./review/")) {
  throw new Error('review-page-v1.js must forward to ./review/');
}
if (!companion.includes("a.href='./review/'")) {
  throw new Error('aa-companion-v2.js must point the Review button to ./review/');
}
if (legacyJs.includes('ChatGPTで指定した内容をここに蓄積')) {
  throw new Error('legacy integrated Review UI must not remain active');
}

console.log('Review v2 routing OK');
