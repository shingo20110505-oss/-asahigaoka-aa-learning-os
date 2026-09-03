import { starterPacks as generatedStarterPacks } from './starter-packs.generated.mjs';

const clone = value => JSON.parse(JSON.stringify(value));

const PACK_ID = 'aichi-ja-20260902-boundaries';
const QUESTION_ID = `${PACK_ID}-q1-5`;

function applyEditorialReview(pack) {
  if (pack.id !== PACK_ID) return pack;

  const reviewed = clone(pack);
  reviewed.quality = {
    ...reviewed.quality,
    checkedAt: '2026-09-03',
    note: `${reviewed.quality.note} 接続語設問は独立クロス検証で曖昧性を再点検し、X・Y・Zの談話関係が一意になるよう本文を編集確認済み。`
  };

  const logic = reviewed.passages.find(passage => passage.id === 'logic' && passage.major === 1);
  if (!logic || !Array.isArray(logic.paragraphs) || logic.paragraphs.length < 6) {
    throw new Error('editorial_logic_passage_missing');
  }

  logic.paragraphs[4] = '【X】分類とは、線を引くことで何かを見やすくする一方、別の何かを見えにくくする営みだといえる。分類の便利さは、何も見落とさないことにあるのではない。【Y】目的に照らして情報を選び、必要なら選び方を修正できるところにある。修正のためには、決めた結果だけでなく、判断に迷った箇所も残しておかなければならない。迷いの記録は、作業の不十分さを示す傷ではなく、後の問いを受け止める余地なのである。';
  logic.paragraphs[5] = '私たちは、整った棚や表を見ると、それが対象の全てを語っているように感じることがある。しかし、線を引いた目的が変われば、同じ分類の有効性も変わりうる。必要なのは、まず、どの問いに答えるための線なのかを説明できることだ。【Z】線からこぼれた事柄に出会ったとき、その問い自体を見直せる態度も必要なのだ。';

  const question = reviewed.questions.find(item => item.id === QUESTION_ID);
  if (!question || question.skill !== 'connective_relation' || question.format !== 'multi_slot_choice') {
    throw new Error('editorial_connective_question_missing');
  }

  const choiceById = new Map(question.choices.map(choice => [choice.id, choice]));
  choiceById.get('c1').explanation = '前段落までの議論を受け、「分類とは〜営みだ」とまとめ直すXに合う。';
  choiceById.get('c3').explanation = '「まず、〜説明できることだ」という第一の必要条件に、もう一つの必要な態度を加えるZに合う。';

  question.evidence = [
    { sourceId: 'logic', paragraph: 5, quote: '分類の便利さは、何も見落とさないことにあるのではない' },
    { sourceId: 'logic', paragraph: 6, quote: '必要なのは、まず、どの問いに答えるための線なのかを説明できることだ' }
  ];
  question.proposition = {
    ...question.proposition,
    paraphrase: 'X＝つまり、Y＝むしろ、Z＝それに加えて。Xは前段落までの内容のまとめ直し、Yは便利さの捉え直し、Zは二つ目の必要条件の追加。'
  };
  question.explanation = question.proposition.paraphrase;

  return reviewed;
}

export const starterPacks = generatedStarterPacks.map(applyEditorialReview);
