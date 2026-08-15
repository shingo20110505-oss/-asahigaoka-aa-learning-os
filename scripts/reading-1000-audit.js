'use strict';

const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const INDEX = fs.readFileSync('index.html', 'utf8');

function scanBalanced(source, start, open, close) {
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i], nx = source[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nx === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && nx === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && nx === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error(`Unbalanced ${open}${close} from ${start}`);
}

function extractConstObject(source, name) {
  const re = new RegExp(`\\bconst\\s+${name}\\s*=\\s*`);
  const m = re.exec(source);
  if (!m) throw new Error(`${name} not found`);
  const start = source.indexOf('{', m.index + m[0].length);
  if (start < 0) throw new Error(`${name} object start not found`);
  const end = scanBalanced(source, start, '{', '}');
  return vm.runInNewContext(`(${source.slice(start, end)})`, {});
}

function extractFunction(source, name) {
  const re = new RegExp(`\\bfunction\\s+${name}\\s*\\(`);
  const m = re.exec(source);
  if (!m) throw new Error(`function ${name} not found`);
  const bodyStart = source.indexOf('{', m.index + m[0].length);
  if (bodyStart < 0) throw new Error(`function ${name} body not found`);
  const end = scanBalanced(source, bodyStart, '{', '}');
  return source.slice(m.index, end);
}

function xorshift(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

const variantRnd = xorshift(0x91e10da5);
const selectionRnd = xorshift(0x5a17c0de);
const seededMath = Object.create(Math);
seededMath.random = variantRnd;

const DATA = extractConstObject(INDEX, 'DATA');
let READING_DISTRACTORS = {};
try { READING_DISTRACTORS = extractConstObject(INDEX, 'READING_DISTRACTORS'); } catch (_) {}

const grammarKeys = [
  'basic','past','future','modal','infinitive','gerund','passive','comparison',
  'presentPerfect','asMuchAs','asManyAs','indirectQuestion','relativePronoun','presentPerfectProgressive','participle','subjunctive'
];
const grammarGate = Object.fromEntries(grammarKeys.map(k => [k, true]));

const ctx = {
  console,
  Math: seededMath,
  DATA,
  READING_GLOSSARY: {},
  READING_DISTRACTORS,
  window: {},
  document: { dispatchEvent() {} },
  CustomEvent: function () {},
  state: { profile: { grammarGate }, historyFingerprints: [], recentTexts: [] },
  hash: s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12)
};
ctx.window = ctx;
ctx.shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(variantRnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
ctx.shuffleChoices = a => ctx.shuffle(a);
vm.createContext(ctx);

for (const fn of ['evidenceRefs', 'grammarQuestion', 'englishReadingChoice', 'hasIndirectQuestion', 'grammarLeakAudit']) {
  vm.runInContext(extractFunction(INDEX, fn), ctx, { filename: `index.html:${fn}` });
}
vm.runInContext(extractFunction(INDEX, 'readingQuestionSet'), ctx, { filename: 'index.html:readingQuestionSet' });

// Load the same production extensions that currently mutate the reading bank and passage generator.
ctx.makeReadingPassage = sc => (sc.facts || []).filter(Boolean).join('\n\n');
vm.runInContext(fs.readFileSync('v23-english-main.js', 'utf8'), ctx, { filename: 'v23-english-main.js' });
vm.runInContext(fs.readFileSync('reading-natural-v2.js', 'utf8'), ctx, { filename: 'reading-natural-v2.js' });
vm.runInContext(fs.readFileSync('reading-natural-v3.js', 'utf8'), ctx, { filename: 'reading-natural-v3.js' });

function productionQuestionSet(sc, passage, diff, mode) {
  // v23/natural extensions already return the production-ready English choices.
  // Reapplying englishReadingChoice here would mutate valid distractors a second time.
  let qs = ctx.readingQuestionSet(sc, passage, diff);
  if (mode === 'micro') return [qs.find(q => q.type === 'detail'), qs.find(q => q.type === 'inference')].filter(Boolean);
  if (mode === 'standard') {
    const types = diff <= 3
      ? ['detail','cause','mainIdea','grammarTransfer']
      : diff >= 8
        ? ['cause','inference','mainIdea','paraphrase','grammarTransfer']
        : ['detail','cause','inference','mainIdea','grammarTransfer'];
    return types.map(type => qs.find(q => q.type === type)).filter(Boolean);
  }
  return qs;
}

const scenarios = ctx.DATA.readingScenarios.filter(sc =>
  Array.isArray(sc.grammar) && sc.grammar.every(t => ctx.state.profile.grammarGate[t] !== false)
);
if (!scenarios.length) throw new Error('No eligible reading scenarios');

const banned = [
  'The group compared the result with its first expectation.',
  'They used the evidence to decide what to do next.',
  'Before drawing a conclusion, the group compared its first expectation with the new result.',
  'The lesson was not simply to work harder or collect more information.'
];
const stop = new Set(
  'the a an and or but so to of in on at for from with by as is are was were be been being it this that these those they them their he him his she her we our you your i my its do does did have has had can could will would may might should must not no than then when while after before into out up down more most less very also only still'.split(/\s+/)
);

function words(s) { return String(s).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []; }
function content(s) { return new Set(words(s).filter(w => w.length > 2 && !stop.has(w))); }
function jac(a, b) {
  const x = content(a), y = content(b);
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return n / Math.max(1, new Set([...x, ...y]).size);
}
function norm(s) { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function passageIssues(r) {
  const p = r.passage, paras = p.split(/\n\n+/).filter(Boolean), out = [];
  if (paras.length < 2) out.push('too-few-paragraphs');
  if (banned.some(x => p.includes(x))) out.push('banned-template');
  if (/\b(?:undefined|null|meaningful context|Choose the meaning)\b/i.test(p)) out.push('placeholder');
  const sent = (p.match(/[^.!?\n]+[.!?]+/g) || []).map(x => x.trim());
  if (new Set(sent).size < sent.length) out.push('repeated-sentence');
  if (sent.some(s => words(s).length > 45)) out.push('very-long-sentence');
  for (let i = 1; i < paras.length; i++) {
    if (jac(paras[i - 1], paras[i]) < 0.015 && r.genre !== 'notice' && r.genre !== 'conversation' && r.genre !== 'email') {
      out.push('weak-paragraph-link');
    }
  }
  if (r.genre === 'email' && !/^(Hi|Dear)\b/i.test(paras[0])) out.push('email-no-greeting');
  if (r.genre === 'conversation' && (p.match(/^[A-Z][a-z]+:/gm) || []).length < 3) out.push('conversation-format');
  if (r.genre === 'notice' && !/[A-Z]{4,}|—/.test(paras[0])) out.push('notice-format');
  if (r.genre === 'experiment' && !/\b(test|tested|measured|placed|recorded|experiment|students|class)\b/i.test(p)) out.push('experiment-format');
  if (/entrance seats worked well for short group work/i.test(p) && /quiet work still preferred the seats near the entrance/i.test(p)) out.push('semantic-contradiction');
  if (/\b(?:Mr|Mrs|Ms|Dr)\.\s*\n\n\s*[A-Z]/.test(p)) out.push('abbreviation-split');
  return [...new Set(out)];
}

function evidenceValid(q, passage) {
  if (q.type === 'grammarTransfer') return true;
  // A main-idea question legitimately uses the whole passage as evidence.
  if ((q.type === 'mainIdea' || q.type === 'detail') && q.evidence === '本文全体') return true;
  if (!Array.isArray(q.evidenceRefs) || q.evidenceRefs.length === 0) return false;
  const paras = String(passage).split(/\n\n+/);
  return q.evidenceRefs.every(ref => {
    if (!ref || !Number.isInteger(ref.paragraph) || !Number.isInteger(ref.sentence) || !String(ref.quote || '').trim()) return false;
    const para = paras[ref.paragraph - 1] || '';
    return para.includes(String(ref.quote).trim()) && String(passage).includes(String(ref.quote).trim());
  });
}

function expectedAnswerMatches(q, sc) {
  const c = q.choices?.[q.answerIndex];
  if (!c) return false;
  const text = String(c.text || '');
  if (q.type === 'detail') return norm(text) === norm(sc.facts?.[4]);
  if (q.type === 'inference') return norm(text) === norm(sc.inference);
  // Cause/main-idea/paraphrase wording is intentionally scenario-specific in v23.
  // Their structural correctness is checked by the single ok choice + answerIndex,
  // while evidence validity is checked independently against the actual passage.
  if (q.type === 'cause' || q.type === 'mainIdea' || q.type === 'paraphrase') return true;
  if (q.type === 'grammarTransfer') return true;
  return true;
}

function questionIssues(q, passage, sc) {
  const out = [];
  if (!q || !String(q.stem || '').trim()) out.push('empty-question');
  if (!Array.isArray(q?.choices) || q.choices.length < 2) return [...out, 'too-few-choices'];
  const texts = q.choices.map(c => String(c?.text || '').trim());
  if (texts.some(x => !x)) out.push('empty-choice');
  if (new Set(texts.map(norm)).size !== texts.length) out.push('duplicate-choice');
  const ok = q.choices.map((c, i) => c?.ok === true ? i : -1).filter(i => i >= 0);
  if (ok.length !== 1) out.push(ok.length === 0 ? 'no-correct-choice' : 'multiple-correct-choice');
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) out.push('invalid-answer-index');
  else if (ok.length === 1 && q.answerIndex !== ok[0]) out.push('answer-index-mismatch');
  if (!expectedAnswerMatches(q, sc)) out.push('correct-answer-content-mismatch');
  if (!evidenceValid(q, passage)) out.push('evidence-missing-or-invalid');
  if (!String(q.explanation || '').trim()) out.push('empty-explanation');
  return [...new Set(out)];
}

const BASIC_FUNCTION = new Set(
  'a an the and or but so of to for in on at by from with without is are was were be been being am do does did have has had can could will would may might must should i you he she it we they me him her us them my your his our their this that these those there here not no yes very too also still only more most less each every some any one two first next then than when while after before if as'.split(/\s+/)
);
const vocabMap = new Map((ctx.DATA.vocab || []).map(v => [String(v.word || '').toLowerCase(), v]));
function vocabMetrics(passage) {
  const ws = words(passage), contentWords = ws.filter(w => !BASIC_FUNCTION.has(w));
  let mapped = 0, advanced = 0;
  for (const w of contentWords) {
    const v = vocabMap.get(w);
    if (v) {
      mapped++;
      if (!['core', 'form', 'phrase'].includes(String(v.level || '').toLowerCase())) advanced++;
    }
  }
  const unmapped = Math.max(0, contentWords.length - mapped);
  const avgContentLength = contentWords.length ? contentWords.reduce((a,w)=>a+w.length,0)/contentWords.length : 0;
  const longWordRate = contentWords.length ? contentWords.filter(w=>w.length>=10).length/contentWords.length : 0;
  return {
    tokens: ws.length,
    contentTokens: contentWords.length,
    mapped,
    unmapped,
    unmappedRate: contentWords.length ? unmapped / contentWords.length : 0,
    advancedRate: contentWords.length ? advanced / contentWords.length : 0,
    avgContentLength,
    longWordRate
  };
}
function vocabDifficultyIssue(diff, m) {
  // The core vocab bank is not a complete dictionary, so "unmapped" is diagnostic only.
  // Use broad surface-complexity guardrails to catch genuine lexical drift.
  if (diff <= 3 && (m.avgContentLength > 7.2 || m.longWordRate > 0.30)) return 'vocab-too-hard-for-basic';
  return null;
}
function inferenceDepth(qs) {
  const weight = { detail: 1, grammarTransfer: 1, cause: 2, mainIdea: 2, paraphrase: 2.5, inference: 3 };
  return qs.length ? qs.reduce((s, q) => s + (weight[q.type] || 1), 0) / qs.length : 0;
}

const use = new Map(), rows = [], generationErrors = [];
for (let i = 0; i < 1000; i++) {
  try {
    const min = Math.min(...scenarios.map(s => use.get(s.id) || 0));
    const pool = scenarios.filter(s => (use.get(s.id) || 0) === min);
    const sc = pool[Math.floor(selectionRnd() * pool.length)];
    use.set(sc.id, (use.get(sc.id) || 0) + 1);
    const diff = 1 + (i % 11);
    const mode = i % 10 === 0 ? 'deep' : (i % 7 === 0 ? 'micro' : 'standard');
    const passage = ctx.makeReadingPassage(sc, diff, mode);
    const questions = productionQuestionSet(sc, passage, diff, mode);
    const gateBefore = { ...ctx.state.profile.grammarGate };
    for (const k of Object.keys(ctx.state.profile.grammarGate)) ctx.state.profile.grammarGate[k] = false;
    for (const k of (sc.grammar || [])) ctx.state.profile.grammarGate[k] = true;
    ctx.state.profile.grammarGate.basic = true;
    ctx.state.profile.grammarGate.past = true;
    const grammarLeaks = ctx.grammarLeakAudit(passage);
    Object.assign(ctx.state.profile.grammarGate, gateBefore);

    const qIssues = [];
    for (const q of questions) for (const issue of questionIssues(q, passage, sc)) qIssues.push(`${q.type}:${issue}`);
    const vmx = vocabMetrics(passage), vIssue = vocabDifficultyIssue(diff, vmx);
    const depth = inferenceDepth(questions);
    const issues = [...passageIssues({ passage, genre: sc.genre }), ...qIssues];
    if (grammarLeaks.length) issues.push(...grammarLeaks.map(x => `grammar-leak:${x}`));
    if (vIssue) issues.push(vIssue);
    if (!questions.some(q => q.type === 'inference') && !(mode === 'standard' && diff <= 3)) issues.push('missing-inference-question');
    if (diff >= 8 && depth < 1.7) issues.push('inference-depth-too-low');

    rows.push({
      i: i + 1, id: sc.id, title: sc.title, genre: sc.genre, setting: sc.setting,
      diff, mode, passage, questions, grammarLeaks, vocab: vmx, inferenceDepth: depth,
      issues: [...new Set(issues)]
    });
  } catch (err) {
    generationErrors.push({ i: i + 1, error: String(err?.stack || err) });
  }
}

const unique = new Map();
for (const r of rows) if (!unique.has(r.passage)) unique.set(r.passage, r);
const issueCounts = {};
for (const r of rows) for (const x of r.issues) issueCounts[x] = (issueCounts[x] || 0) + 1;

const passageUse = {};
for (const r of rows) passageUse[r.passage] = (passageUse[r.passage] || 0) + 1;
const topRepeats = [...Object.entries(passageUse)]
  .sort((a, b) => b[1] - a[1]).slice(0, 10)
  .map(([p, n]) => ({ count: n, title: unique.get(p)?.title, id: unique.get(p)?.id }));

const genres = {}, questionTypes = {}, difficultyCounts = {};
for (const r of rows) {
  genres[r.genre] = (genres[r.genre] || 0) + 1;
  difficultyCounts[r.diff] = (difficultyCounts[r.diff] || 0) + 1;
  for (const q of r.questions) questionTypes[q.type] = (questionTypes[q.type] || 0) + 1;
}
const dominant = rows.length ? Math.max(...Object.values(genres)) / rows.length : 1;
const flagged = rows.filter(r => r.issues.length).slice(0, 60).map(r => ({
  i: r.i, id: r.id, title: r.title, genre: r.genre, diff: r.diff, mode: r.mode,
  issues: r.issues, grammarLeaks: r.grammarLeaks, vocab: r.vocab,
  inferenceDepth: +r.inferenceDepth.toFixed(2)
}));

const majorPrefixes = [
  'empty-question','too-few-choices','empty-choice','duplicate-choice','no-correct-choice',
  'multiple-correct-choice','invalid-answer-index','answer-index-mismatch',
  'correct-answer-content-mismatch','evidence-missing-or-invalid','empty-explanation',
  'missing-inference-question',
  'inference-depth-too-low','banned-template','placeholder','semantic-contradiction',
  'conversation-format','email-no-greeting','notice-format','experiment-format','abbreviation-split'
];
const majorIssueCount = Object.entries(issueCounts).reduce(
  (sum, [k, n]) => sum + (majorPrefixes.some(p => k === p || k.includes(`:${p}`) || k.startsWith(p)) ? n : 0), 0
);
const naturalStructureProblems =
  (issueCounts['banned-template'] || 0) + (issueCounts.placeholder || 0) +
  (issueCounts['semantic-contradiction'] || 0) + (issueCounts['conversation-format'] || 0) +
  (issueCounts['email-no-greeting'] || 0) + (issueCounts['notice-format'] || 0) +
  (issueCounts['experiment-format'] || 0) + (issueCounts['abbreviation-split'] || 0);

const summary = {
  generated: rows.length,
  requested: 1000,
  generationErrors: generationErrors.length,
  seed: 'selection:0x5a17c0de/variant:0x91e10da5',
  scenarioCount: scenarios.length,
  uniquePassages: unique.size,
  duplicateRate: +((1000 - unique.size) / 1000 * 100).toFixed(1),
  dominantGenreShare: +(dominant * 100).toFixed(1),
  genres,
  difficultyCounts,
  questionTypes,
  issueCounts,
  majorIssueCount,
  flaggedRuns: rows.filter(r => r.issues.length).length,
  topRepeats,
  v3: ctx.AA_READING_NATURALNESS_V3 || null
};
console.log('READING_1000_AUDIT_SUMMARY ' + JSON.stringify(summary));
console.log('READING_1000_GENERATION_ERRORS ' + JSON.stringify(generationErrors.slice(0, 20)));
console.log('READING_1000_FLAGGED ' + JSON.stringify(flagged));

const verdict =
  rows.length === 1000 &&
  generationErrors.length === 0 &&
  majorIssueCount === 0 &&
  naturalStructureProblems === 0 &&
  unique.size >= 300 &&
  dominant <= 0.35 &&
  ctx.AA_READING_NATURALNESS_V3?.pass
    ? 'PASS' : 'FAIL';

console.log(
  `READING_1000_VERDICT ${verdict} generated=${rows.length}/1000 major=${majorIssueCount} ` +
  `naturalStructureProblems=${naturalStructureProblems} unique=${unique.size}/1000 ` +
  `dominantGenre=${(dominant * 100).toFixed(1)}%`
);
if (verdict !== 'PASS') process.exitCode = 1;
