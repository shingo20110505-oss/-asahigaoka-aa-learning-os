import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {lookupWord,tokenize,inspectToken,sentences,phraseMatches,matchGrammar} from '../src/reading-language.mjs';
import {readingPhrases,readingGrammar,sentenceGuides} from '../src/reading-explanations.mjs';
import {contextualMessage,normalizeChatContext,canSendQuickQuestion} from '../src/chat-context.mjs';
const lexicon={...JSON.parse(await fs.readFile(new URL('../data/reading-dictionary.json',import.meta.url))),...JSON.parse(await fs.readFile(new URL('../data/reading-lexicon.json',import.meta.url)))};
test('Dictionary lookup handles short inflections, irregulars and contractions without changing text',()=>{
 for(const [word,lemma] of [['using','use'],['used','use'],['hurried','hurry'],['carrying','carry'],['meant','mean'],['stood','stand']]){const entry=lookupWord(word,lexicon);assert.ok(entry.meaning,word);assert.ok(entry.lemma===word||entry.lemma===lemma,word);}
 assert.equal(lookupWord('couldn’t',lexicon).meaning,'could not');
 const text='“I’m re-reading it,” she said.';const parts=tokenize(text);assert.equal(parts[0].text,'I’m');assert.equal(parts[1].text,'re-reading');for(const p of parts)assert.equal(text.slice(p.start,p.end),p.text);
});
test('Phrase lookup includes every token, respects punctuation and prefers longer phrases',()=>{
 const text='I am looking forward to seeing you. On the other side, she sat down.';
 const info=inspectToken(text,text.indexOf('forward'),lexicon,readingPhrases);assert.equal(info.phrases[0].label,'look forward to ～');assert.equal(info.sentence.text,'I am looking forward to seeing you.');
 assert.ok(phraseMatches(text,readingPhrases).some(p=>p.label==='on the other side'));assert.ok(!phraseMatches('He looked. Forward to the next room.',readingPhrases).some(p=>p.label.startsWith('look forward')));
 const longer=phraseMatches('in addition to the book',readingPhrases)[0];assert.equal(longer.label,'in addition to ～');
});
test('Grammar patterns avoid treating every had as past perfect and preserve sentence boundaries',()=>{
 assert.ok(!matchGrammar('She had a bag.',readingGrammar).some(r=>r.id==='past-perfect'));
 assert.ok(matchGrammar('He had never stopped there.',readingGrammar).some(r=>r.id==='past-perfect'));
 assert.ok(matchGrammar('She was carrying a bag.',readingGrammar).some(r=>r.id==='progressive'));
 assert.deepEqual(sentences('First. “Second?” Last!').map(x=>x.text),['First.','“Second?”','Last!']);
 assert.ok(sentenceGuides['It had not changed, but Nao had.'].explanation.includes('省略'));
});
test('Context contains only the requested excerpt and quick send never consumes an existing draft',()=>{
 const reference={title:'Book',quote:'Chosen sentence.',context:'Only the selected paragraph.'};
 const text=contextualMessage('Explain this.',reference);for(const part of Object.values(reference))assert.ok(text.includes(part));
 assert.equal(contextualMessage('Plain text',null),'Plain text');assert.equal(normalizeChatContext({context:'x'.repeat(9000)}).context.length,8000);
 assert.ok(canSendQuickQuestion({session:true}));for(const patch of [{draft:'unsent'}, {files:[{}]}, {busy:true}, {preparing:true}, {offline:true}, {session:false}])assert.ok(!canSendQuickQuestion({session:true,...patch}));
});

test('Progressive taking uses take while a separate dictionary noun entry remains available',()=>{
 const dictionary={take:{meaning:'取る',pos:'v'},taking:{meaning:'取ること／魅力的な',source:'ejdict'},paint:{meaning:'描く',pos:'v'},painting:{meaning:'絵画',source:'ejdict'}};
 const text='Students were taking off their shoes in a hurry.';
 const info=inspectToken(text,text.indexOf('taking'),dictionary,readingPhrases);
 assert.equal(info.lemma,'take');assert.equal(info.meaning,'取る');assert.equal(info.otherMeaning,'取ること／魅力的な');assert.equal(info.phrases[0].label,'take off');
 const noun=inspectToken('A painting was missing.',2,dictionary,readingPhrases);assert.equal(noun.meaning,'絵画');assert.equal(noun.verbForm.lemma,'paint');
});
