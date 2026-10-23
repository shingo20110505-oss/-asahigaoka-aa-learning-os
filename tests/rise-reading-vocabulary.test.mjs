import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/domain.mjs';
import {saveReadingWord,backfillReadingWordCards,readingWordSource} from '../src/reading-vocabulary.mjs';
const selection={lemma:'look',token:{text:'looking'},meaning:'見る',phrases:[{label:'look for',meaning:'〜を探す'}],sentence:{text:'She was looking for a book.'},paragraph:2};
test('saving a reading word also creates an English card with its meaning, phrase and source sentence',()=>{
  const state=freshState();saveReadingWord(state,'book-1',selection);
  assert.equal(state.reading['book-1'].words.length,1);assert.equal(state.cards.length,1);
  const card=state.cards[0];assert.equal(card.question,'looking');assert.equal(card.subject,'英語');
  assert.match(card.answer,/見る/);assert.match(card.answer,/look for：〜を探す/);
  assert.equal(card.context,selection.sentence.text);assert.equal(card.source,readingWordSource('book-1','look'));
});
test('repeated saves reuse a legacy card and preserve its manual edits and review progress',()=>{
  const state=freshState(),source=readingWordSource('book-1','look');
  const card={id:'existing',source,title:'自分の見出し',question:'自分の問い',answer:'自分の意味',context:'自分の例文'};
  state.cards.push(card);state.review.existing={due:123,interval:7};
  saveReadingWord(state,'book-1',selection);saveReadingWord(state,'book-1',selection);
  assert.equal(state.cards.length,1);assert.equal(state.cards[0],card);
  assert.equal(state.reading['book-1'].words.length,1);assert.deepEqual(state.review.existing,{due:123,interval:7});
});
test('previously saved unknown words are backfilled once without re-adding known words',()=>{
  const state=freshState();state.reading.book={seconds:90,words:[
    {id:'old',key:'look',word:'looking',meaning:'見る',sentence:'Look here.',known:false},
    {id:'known',key:'book',word:'book',meaning:'本',known:true}
  ]};
  assert.equal(backfillReadingWordCards(state),1);assert.equal(backfillReadingWordCards(state),0);
  assert.equal(state.cards.length,1);assert.equal(state.reading.book.seconds,90);assert.equal(state.reading.book.words.length,2);
});
test('missing dictionary meanings remain explicit and separate book contexts are preserved',()=>{
  const state=freshState();saveReadingWord(state,'a',{...selection,meaning:'',phrases:[]});
  assert.equal(state.cards[0].answer,'意味を確認して入力してください。');
  saveReadingWord(state,'b',{...selection,sentence:{text:'Look at the sky.'}});
  assert.equal(state.cards.length,2);assert.equal(state.cards[0].context,'Look at the sky.');
});
