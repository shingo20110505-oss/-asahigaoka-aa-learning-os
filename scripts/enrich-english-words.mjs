import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const sources = new URL('./english-sources/', import.meta.url);
const readSource = file => fs.readFile(new URL(file, sources), 'utf8');
const [phraseData, irregularData, doublingData] = await Promise.all([
  readSource('pre1-phrases.tsv'), readSource('irregular-verbs.json'), readSource('consonant-doubled.json')
]);
const irregular = new Map(Object.entries(JSON.parse(irregularData)));
const doubled = new Set(JSON.parse(doublingData));
const unique = values => [...new Set(values)];
const modals = new Set(['can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'ought']);
const variants = new Map([
  ['age', {ing:['aging','ageing']}],
  ['benefit', {past:['benefited','benefitted'], participle:['benefited','benefitted'], ing:['benefiting','benefitting']}],
  ['be', {present:['am','is','are'], ing:['being']}],
  ['awake', {past:['awoke','awaked'], participle:['awoken','awaked']}],
  ['lie', {past:['lay','lied'], participle:['lain','lied']}],
  ['bus', {present:['buses','busses'], past:['bused','bussed'], participle:['bused','bussed'], ing:['busing','bussing']}],
  ['quiz', {present:['quizzes']}],
  ['combat', {past:['combated','combatted'], participle:['combated','combatted'], ing:['combating','combatting']}],
  ['focus', {present:['focuses','focusses'], past:['focused','focussed'], participle:['focused','focussed'], ing:['focusing','focussing']}],
  ['dye', {ing:['dyeing']}],
  ['get', {participle:['got','gotten']}],
  ['have', {present:['has']}],
  ['singe', {ing:['singeing']}],
  ['tie', {ing:['tying']}],
  ['travel', {past:['traveled','travelled'], participle:['traveled','travelled'], ing:['traveling','travelling']}]
]);

function verbForms(verb, attested = []) {
  const hyphen = verb.lastIndexOf('-');
  if (hyphen !== -1) {
    const prefix = verb.slice(0,hyphen+1);
    const last = verbForms(verb.slice(hyphen+1), attested.filter(form=>form.startsWith(prefix)).map(form=>form.slice(prefix.length)));
    return Object.fromEntries(Object.entries(last).map(([key, values]) => [key, values.map(form => prefix+form)]));
  }
  const double = doubled.has(verb) || attested.includes(verb + verb.at(-1) + 'ing') ||
    /^(?:run|set|put|get|sit|begin|spin|bid|fit|hit|cut|shut|split|quit|rid|let|knit|wet|reset|upset|outfit|offset|forget|overrun|rerun|forbid|shed|pet|quiz|recur|resubmit)$/.test(verb);
  const stem = double ? verb + verb.at(-1) : verb;
  const consonantY = /[^aeiou]y$/.test(verb);
  const past = consonantY ? verb.slice(0,-1)+'ied' : verb.endsWith('e') ? verb+'d' : stem+'ed';
  const ing = /ie$/.test(verb) ? verb.slice(0,-2)+'ying' : /[^eoy]e$/.test(verb) ? verb.slice(0,-1)+'ing' : /c$/.test(verb) ? verb+'king' : stem+'ing';
  const regularPast = /c$/.test(verb) ? verb+'ked' : past;
  const known = irregular.get(verb);
  const present = consonantY ? verb.slice(0,-1)+'ies' : /(?:go|do|[sxz]|[cs]h)$/.test(verb) ? verb+'es' : verb+'s';
  const forms = {
    past: known ? unique(known.map(pair => pair[0])) : [regularPast],
    participle: known ? unique(known.map(pair => pair[1])) : [regularPast],
    present: [present],
    ing: [ing],
    ...variants.get(verb)
  };
  // Keep attested British spellings, including final-l doubling.
  if (/l$/.test(verb)) {
    for (const [key, ending] of [['past','ed'],['participle','ed'],['ing','ing']]) {
      forms[key] = unique([...forms[key], ...attested.filter(form =>
        form === verb+ending || form === verb+'l'+ending)]);
    }
  }
  return forms;
}

function attachForms(entry, forms) {
  entry.verbForms = forms;
  entry.sources = unique([...(entry.sources || []), 'english-verbs-irregular']);
  entry.forms = unique([...(entry.forms || []), ...Object.values(forms).flat()]).filter(form => form !== entry.word);
}

const isVerb = entry => entry.pos.split('/').some(pos => ['v','verb'].includes(pos)) ||
  entry.senses?.some(sense => ['v','verb'].includes(sense.pos));

export function enrichEnglishWords(words) {
  const byWord = new Map(words.map(entry => [entry.word, entry]));
  const nominations = byWord.get('nomination');
  if (nominations) nominations.forms = unique([...nominations.forms, 'nominations']);
  if (!byWord.has('bouncer')) {
    const bouncer = {
      id: 'en-' + createHash('sha256').update('bouncer').digest('hex').slice(0,16),
      word: 'bouncer', display: 'bouncer', meaning: 'クラブなどの入口で入場を管理する警備員',
      kind: 'word', pos: 'n', stage: 'extension', rank: null, eikenBand: 'pre1',
      quality: 'authored', forms: ['bouncers'], sources: ['rise-original']
    };
    words.push(bouncer);
    byWord.set(bouncer.word, bouncer);
  }
  for (const entry of words) {
    if (entry.kind === 'word' && /^[a-z]+(?:-[a-z]+)*$/.test(entry.word) &&
        (isVerb(entry) || irregular.has(entry.word) || ['be','have','do','panic','quiz'].includes(entry.word)) && !modals.has(entry.word)) {
      attachForms(entry, verbForms(entry.word, entry.forms));
    }
  }
  for (const line of phraseData.trimEnd().split('\n')) {
    const [word, meaning, verb] = line.split('\t');
    const existing = byWord.get(word);
    const entry = existing || {
      id: 'en-' + createHash('sha256').update(word).digest('hex').slice(0,16),
      word, display: word, kind: 'phrase', stage: 'extension', rank: null, forms: []
    };
    // Preserve an existing translation if it covers additional senses.
    entry.meaning = existing && !entry.meaningPending && !entry.meaning.includes('準備中') && entry.meaning !== meaning
      ? meaning + '。' + entry.meaning : meaning;
    delete entry.meaningPending;
    entry.pos = 'phrase';
    entry.eikenBand = 'pre1';
    entry.sources = unique([...(entry.sources || []), 'rise-original']);
    if (!existing) {
      entry.quality = 'authored';
      words.push(entry);
    }
    if (verb) {
      const tail = word.slice(verb.length);
      const forms = byWord.get(verb)?.verbForms || verbForms(verb);
      attachForms(entry, Object.fromEntries(Object.entries(forms).map(([key, values]) =>
        [key, values.filter(form => !(verb === 'bear' && form === 'born')).map(form => form + tail)])));
    }
  }
  // Inflect previously imported verb phrases when their first word has a verified
  // verb paradigm. Leave other expressions and ambiguous constructions untouched.
  for (const entry of words) {
    if (entry.kind !== 'phrase' || entry.verbForms || !isVerb(entry)) continue;
    const space = entry.word.indexOf(' ');
    const forms = byWord.get(entry.word.slice(0,space))?.verbForms;
    if (forms) attachForms(entry, Object.fromEntries(Object.entries(forms).map(([key, values]) =>
      [key, values.filter(form => !(entry.word.startsWith('bear ') && form === 'born')).map(form => form + entry.word.slice(space))])));
  }
  return words;
}

export async function buildEnglishDictionary(directory, baseBytes) {
  const readJSON = async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
  const writeJSON = (name, value) => fs.writeFile(path.join(directory, name), JSON.stringify(value) + '\n');
  const [metadata, version] = await Promise.all([readJSON('metadata.json'), readJSON('version.json')]);
  const words = enrichEnglishWords(JSON.parse(baseBytes));
  const counts = metadata.counts;
  counts.headwords = words.length;
  for (const key of ['kind','stage']) {
    for (const label of Object.keys(counts[key])) counts[key][label] = words.filter(word => word[key] === label).length;
  }
  counts.forms = words.reduce((total, word) => total + word.forms.length, 0);
  counts.verbParadigms = words.filter(word => word.verbForms).length;
  counts.pre1Phrases = words.filter(word => word.eikenBand === 'pre1' && word.kind === 'phrase').length;
  counts.meaningPending = words.filter(word => word.meaningPending).length;
  metadata.sources.push({
    id: 'english-verbs-irregular', title: 'RosaeNLG english-verbs-irregular 3.4.0',
    url: 'https://www.npmjs.com/package/english-verbs-irregular/v/3.4.0', license: 'Apache-2.0'
  });
  metadata.scope += ' 準1級対策の句動詞・慣用表現・連語を追加し、動詞の過去形・過去分詞・現在形・ing形からも検索できます。';
  const bytes = Buffer.from(JSON.stringify(words));
  const hash = createHash('sha256').update(bytes).digest('hex');
  version.version += '+' + hash.slice(0,12);
  metadata.version = version.version;
  Object.assign(version.words, {entries:words.length, bytes:bytes.length, sha256:hash});
  await Promise.all([fs.writeFile(path.join(directory,'words.json'), bytes), writeJSON('metadata.json',metadata), writeJSON('version.json',version)]);
}
