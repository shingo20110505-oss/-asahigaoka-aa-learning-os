import {uid} from './domain.mjs';

export const readingWordSource = (bookId, key) => 'reading-word/'+bookId+'/'+key;
export const readingWordCard = (state, bookId, word) => state.cards.find(card=>card.source===readingWordSource(bookId,word.key));

// Called inside the same Store transaction as saving the word. Keep the legacy
// source key so cards previously added by hand are reused without overwriting edits.
export function ensureReadingWordCard(state, bookId, word) {
  const existing=readingWordCard(state,bookId,word);
  if(existing)return {card:existing,created:false};
  const phrases=(word.phrases||[]).filter(p=>p.label&&p.meaning).map(p=>p.label+'：'+p.meaning);
  const card={id:uid(),title:word.word,question:word.word,
    answer:[word.meaning||'意味を確認して入力してください。',...phrases].join('\n'),
    context:word.sentence||'',subject:'英語',tags:['長文の語句'],
    source:readingWordSource(bookId,word.key),createdAt:Date.now()};
  state.cards.unshift(card);return {card,created:true};
}

export function saveReadingWord(state,bookId,selection) {
  const old=state.reading[bookId]||{},words=[...(old.words||[])];
  let word=words.find(w=>w.key===selection.lemma);
  if(!word){word={id:uid(),key:selection.lemma,word:selection.token.text,meaning:selection.meaning,
    phrases:(selection.phrases||[]).map(p=>({label:p.label,meaning:p.meaning})),
    sentence:selection.sentence?.text||'',paragraph:selection.paragraph,createdAt:Date.now(),known:false};words.push(word);}
  state.reading[bookId]={...old,words};
  return {word,...ensureReadingWordCard(state,bookId,word)};
}

export function backfillReadingWordCards(state) {
  let added=0;
  for(const [bookId,record] of Object.entries(state.reading)){
    for(const word of Array.isArray(record?.words)?record.words:[]){
      if(word&&!word.known&&typeof word.key==='string'&&typeof word.word==='string'&&word.key&&word.word&&ensureReadingWordCard(state,bookId,word).created)added++;
    }
  }
  return added;
}
