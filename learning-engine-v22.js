/* 旭丘AA Learning OS v2.2.5
   独立「入試対策」ページ・愛知県最新公開問題の大問構成・国語原創問題 */
(function () {
  'use strict';

  const API = globalThis.AA_V2_TEST_API;
  const OFFICIAL_YEAR = 2026;
  const OFFICIAL_URL = 'https://www.pref.aichi.jp/soshiki/kotogakko/r08nyuushimonndai.html';
  const LEVELS = API.levels;
  const DEFAULT_TIMES = { english: 40, japanese: 45, math: 45, science: 45, social: 45 };
  const EXAM_UNITS = {
    english: [
      ['reading', '長文読解'], ['dialogue', '会話文'], ['data', '図表・案内'],
      ['vocab', '語彙・語句'], ['grammar', '文法・語順']
    ],
    japanese: [
      ['modern', '説明的文章'], ['literary', '文学的文章'], ['discussion', '対話・資料統合'],
      ['kanji', '漢字・語彙'], ['idiom', '慣用句・四字熟語'], ['classical', '古文'], ['kanbun', '漢文']
    ],
    math: [
      ['number', '数と計算の公式・法則'], ['algebra', '展開・因数分解の公式'], ['equation', '方程式の法則'],
      ['function', '関数の公式'], ['geometry', '図形の定理・面積・体積'], ['probability', '確率の公式'],
      ['statistics', 'データの公式'], ['advanced', '高校公式（入試の時短・検算）']
    ],
    science: [
      ['biology', '生命'], ['chemistry', '化学'], ['physics', '物理'], ['earth', '地学'], ['experiment', '実験・資料統合']
    ],
    social: [
      ['history', '歴史'], ['geography', '地理'], ['civics', '公民'], ['economy', '経済'],
      ['international', '国際'], ['data', '地図・統計・資料統合']
    ]
  };
  const UNIT_AREAS = {
    japanese: {
      modern: ['modern'], literary: ['literary'], discussion: ['discussion'], kanji: ['kanji'],
      idiom: ['idiom', 'yojijukugo'], classical: ['classical'], kanbun: ['kanbun']
    },
    math: {
      number: ['number'], algebra: ['algebra'], equation: ['equation'], function: ['function'],
      geometry: ['geometry', 'measure'], probability: ['probability'], statistics: ['statistics'], advanced: ['advanced']
    },
    science: {
      biology: ['biology'], chemistry: ['chemistry'], physics: ['physics'], earth: ['earth'],
      experiment: ['biology', 'chemistry', 'physics', 'earth']
    },
    social: {
      history: ['history'], geography: ['geography'], civics: ['civics'], economy: ['economy'],
      international: ['international'], data: ['history', 'geography', 'civics', 'economy', 'international']
    }
  };

  function aa22DefaultConfig(subject = 'japanese') {
    return {
      subject, level: 1, scope: 'full', units: EXAM_UNITS[subject].map(x => x[0]),
      timeMin: DEFAULT_TIMES[subject], length: 'full'
    };
  }
  function aa22NormalizeConfig(input) {
    const subject = ['english', 'japanese', 'math', 'science', 'social'].includes(input?.subject) ? input.subject : 'japanese';
    const level = clamp(Number(input?.level) || 1, 1, 3);
    const scope = ['full', 'current', 'custom'].includes(input?.scope) ? input.scope : 'full';
    const validUnits = EXAM_UNITS[subject].map(x => x[0]).filter(x => level === 3 || x !== 'advanced');
    const valid = new Set(validUnits);
    let units = safeArray(input?.units).filter(x => valid.has(x));
    if (scope === 'full' || !units.length) units = validUnits;
    return {
      subject,
      level,
      scope,
      units,
      timeMin: clamp(Number(input?.timeMin) || DEFAULT_TIMES[subject], 5, 90),
      length: ['mini', 'half', 'full'].includes(input?.length) ? input.length : 'full'
    };
  }
  function aa22Config() {
    state.ui.examConfig = aa22NormalizeConfig(state.ui.examConfig || aa22DefaultConfig(state.ui.testSubject));
    state.ui.testSubject = state.ui.examConfig.subject;
    state.ui.testCourseLevel = state.ui.examConfig.level;
    return state.ui.examConfig;
  }

  function aa22DefaultPracticeConfig(subject = 'japanese') {
    const unitsBySubject = {};
    for (const [id, units] of Object.entries(EXAM_UNITS)) {
      unitsBySubject[id] = units.map(x => x[0]).filter(unit => !(id === 'math' && unit === 'advanced'));
    }
    return { subject, length: 'standard', unitsBySubject };
  }
  function aa22NormalizePracticeConfig(input) {
    const subject = ['english', 'japanese', 'math', 'science', 'social'].includes(input?.subject) ? input.subject : 'japanese';
    const defaults = aa22DefaultPracticeConfig(subject), source = plainObj(input?.unitsBySubject) ? input.unitsBySubject : {};
    const unitsBySubject = {};
    for (const [id, units] of Object.entries(EXAM_UNITS)) {
      const valid = new Set(units.map(x => x[0]));
      const selected = safeArray(source[id]).filter(unit => valid.has(unit));
      unitsBySubject[id] = selected.length ? selected : defaults.unitsBySubject[id];
    }
    return { subject, length: ['micro', 'standard', 'deep'].includes(input?.length) ? input.length : 'standard', unitsBySubject };
  }
  function aa22PracticeConfig() {
    state.ui.practiceConfig = aa22NormalizePracticeConfig(state.ui.practiceConfig || aa22DefaultPracticeConfig());
    return state.ui.practiceConfig;
  }

  const aa22PrevDefaultState = defaultState;
  defaultState = function () {
    const s = aa22PrevDefaultState();
    s.ui.examConfig = aa22DefaultConfig('japanese');
    s.ui.practiceConfig = aa22DefaultPracticeConfig('japanese');
    s.ui.vocabIndexQuery = '';
    return s;
  };
  const aa22PrevMigrate = migrate;
  migrate = function (input) {
    const s = aa22PrevMigrate(input);
    s.ui.examConfig = aa22NormalizeConfig(s.ui.examConfig || aa22DefaultConfig(s.ui.testSubject));
    s.ui.practiceConfig = aa22NormalizePracticeConfig(s.ui.practiceConfig || aa22DefaultPracticeConfig());
    s.ui.vocabIndexQuery = String(s.ui.vocabIndexQuery || '').slice(0, 80);
    return s;
  };
  state.ui.examConfig = aa22NormalizeConfig(state.ui.examConfig || aa22DefaultConfig(state.ui.testSubject));
  state.ui.practiceConfig = aa22NormalizePracticeConfig(state.ui.practiceConfig || aa22DefaultPracticeConfig());
  state.ui.vocabIndexQuery = String(state.ui.vocabIndexQuery || '');

  function aa22Question(spec) {
    const answers = safeArray(spec.answers ?? [spec.answer]);
    const choices = spec.choices.map((choice, index) => {
      const value = typeof choice === 'string' ? { text: choice } : choice;
      const ok = answers.includes(index);
      return {
        text: String(value.text), ok,
        reason: value.reason || (ok ? (spec.explanation || '本文・資料の条件と一致します。') : '本文・資料の条件と一致しません。'),
        error: ok ? null : (value.error || 'aichi_distractor'),
        distractorType: ok ? null : (value.error || 'aichi_distractor')
      };
    });
    return {
      id: 'aa22:' + spec.subject + ':' + spec.code + ':' + uid('q'),
      code: spec.code,
      type: spec.subject, subject: spec.subject, stem: spec.stem, choices,
      answerIndex: answers[0], answerIndices: answers.length > 1 ? answers : undefined,
      selectCount: answers.length, points: Number(spec.points || 1), partialPoints: Number(spec.partialPoints || 0),
      explanation: spec.explanation || choices[answers[0]]?.reason || '',
      skills: spec.skills || [{ id: spec.subject === 'english' ? 'en.read.inference' : spec.subject === 'japanese' ? 'ja.aichi.integration' : spec.subject === 'math' ? 'math.formula.recall' : spec.subject === 'science' ? 'sci.aichi.integration' : 'soc.aichi.integration', role: 'primary' }],
      expectedMs: Number(spec.expectedMs || 65000), context: 'aichi-r8-' + spec.subject,
      format: spec.format || 'aichi-mark', testMode: true, courseLevel: Number(spec.level || 1),
      bigQuestion: spec.bigQuestion, bigTitle: spec.bigTitle, officialSmallLabel: spec.officialSmallLabel,
      evidence: spec.evidence || '', reasoningTag: spec.reasoningTag || '',
      examUnit: spec.unit || spec.source?.area || 'integration',
      aichiPassage: spec.passage || '', source: spec.source || { area: spec.unit || 'integration', difficulty: Number(spec.level || 1) * 3 }
    };
  }

  const JA_PASSAGE_I = `【説明的文章・本アプリ作成】
「分かりやすい案内」と聞くと、必要な情報を一枚にできるだけ多く載せることだと考えがちである。確かに、地図、施設名、所要時間をまとめて見られれば、利用者は別の資料を探さずに済む。しかし、情報を持っていることと、その場で情報を使えることとは同じではない。

ある公共施設で、中学生の調査班が二種類の案内板を比べた。Aは建物全体の地図に全施設名を記し、Bは現在地から次の曲がり角までに必要な情報だけを大きく示した。人の少ない時間帯では、Aを見た利用者の方が行き先を間違える割合はわずかに低かった。ところが混雑時には、Aの前で立ち止まる人が重なり、後ろの人が地図へ近づけないことが増えた。Bでは一度に得られる情報は少ないが、利用者は歩みを止めず、次の表示へ移ることができた。目的地までの平均時間はBの方が短かった。

この結果は、Aが詳しすぎて無価値だったことを意味しない。建物全体の関係を確かめたい人や、めったに使わない施設を探す人には、Aの情報が役立つ。問題は、情報の量だけを案内の質と見なしたことである。移動中の利用者が判断できる時間、表示を見る位置、周囲の混雑まで含めて考えなければ、詳しさがかえって次の行動を遅らせることがある。

案内に必要な「余白」とは、単なる空白ではない。利用者が現在地と次の行動を結び付けるための余裕である。情報を減らせば必ず分かりやすくなるのでも、増やせば必ず正確になるのでもない。何を伝えるかと同時に、いつ、どこで、どのように使われるかを設計して初めて、情報は行動を支える。`;
  const JA_PASSAGE_III = `【対話と資料】\n文化祭実行委員会は、校内案内を改善するため、二つの方法を試した。A週は廊下の矢印表示を増やし、B週は案内係が声をかける場所を増やした。\n\n〔調査結果〕\nA週：目的地まで迷わなかった人 78％／案内を「自分で確かめやすい」と答えた人 84％\nB週：目的地まで迷わなかった人 86％／案内を「自分で確かめやすい」と答えた人 61％\n\n美咲「迷わなかった割合だけなら、B週の方法がよさそうだね。」\n陸「でも、混雑する時間は案内係が足りなくなる。A週の『自分で確かめやすい』という結果も無視できないよ。」\n美咲「では、入口と分岐点には矢印を置き、特に迷いやすい場所だけ案内係を配置したらどうかな。」\n陸「二つの方法を組み合わせた後、同じ質問で再調査すれば、改善したか比べられるね。」`;
  const JA_PASSAGE_IV = `【古文・本アプリ作成】\nある人、朝ごとに庭の梅を見て、「まだ咲かず」と言ひけり。友来たりて、「花のみ待たば、日々は同じに見ゆべし。枝の色、鳥の声にも春は近づく」と言ふ。その人、翌朝より小さき変はりを記しければ、花の咲く前より春を知りぬ。\n\n〔注〕見ゆべし＝見えるだろう。変はり＝変化。`;

  function aa22JapaneseExam(level) {
    const shared = { subject: 'japanese', level };
    return [
      aa22Question({ ...shared, code: 'I-1', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問1', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '指示内容', evidence: '第二段落の「Aの前で立ち止まる人が重なり」「Bでは…歩みを止めず」と、平均時間の比較。', stem: '第二段落の調査結果から直接言えることとして最も適切なものを選びなさい。', choices: [{text:'Aは情報が多いため、どの時間帯でもBより早く目的地へ着けた。',error:'overgeneralization',reason:'人の少ない時間帯でAは誤りがやや少ないものの、混雑時の平均時間はBの方が短いので「どの時間帯でも」は言い過ぎです。'},{text:'Bは全体地図を省いたため、行き先を間違える人が一人もいなかった。',error:'overgeneralization',reason:'Bで誤りがゼロになったとは書かれていません。'},{text:'案内の有効性は、情報量だけでなく利用時の混雑や移動のしやすさでも変わった。',reason:'AとBの結果が時間帯・混雑・立ち止まり方で変化したことをまとめています。'},{text:'混雑時には、利用者が案内板を見ないほど目的地へ早く着いた。',error:'causal_overreach',reason:'Bの表示は見ており、「見ないこと」が速さの原因だとは述べていません。'}], answer: 2, explanation: '情報量だけではなく、使われる状況が案内の働きを変えたという結果です。' }),
      aa22Question({ ...shared, code: 'I-2', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問2', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '因果', evidence: '混雑時、Aの前で立ち止まる人が重なり、後ろの人が地図へ近づけなかった。', stem: '混雑時にAの案内板が「次の行動を遅らせる」場合があったのはなぜか。最も適切なものを選びなさい。', choices: [{text:'情報が不足し、利用者が建物全体の位置関係をまったく確認できなかったから。',error:'opposite',reason:'Aは情報が不足したのではなく、全体地図と全施設名を載せていました。'},{text:'詳しい情報を確かめるために人が滞留し、後ろの利用者が表示を使いにくくなったから。',reason:'本文の「立ち止まる人が重なり」「後ろの人が地図へ近づけない」に対応します。'},{text:'施設名が多かったため、利用者が別の建物へ移動するよう案内されたから。',error:'outside_information',reason:'別の建物へ案内されたとは書かれていません。'},{text:'人の少ない時間帯にも、Aを見た利用者の間違いがBより大幅に増えたから。',error:'opposite',reason:'人の少ない時間帯ではAの方が間違いの割合はわずかに低いとあります。'}], answer: 1, explanation: '詳しさそのものではなく、詳しい表示を読む行動が混雑下で滞留を生んだ点が因果の中心です。' }),
      aa22Question({ ...shared, code: 'I-3', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問3', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '言い換え', evidence: '「利用者が現在地と次の行動を結び付けるための余裕」と定義している。', stem: '第四段落の「余白」の意味として最も適切なものを選びなさい。', choices: [{text:'案内から具体的な情報をすべて取り除き、利用者の判断だけに任せること。',error:'overgeneralization',reason:'必要な情報を取り除くことではありません。'},{text:'表示面に文字のない部分を広く作り、案内板を目立たせること。',error:'literal_only',reason:'本文は「単なる空白ではない」と明確に否定しています。'},{text:'利用者がその場で必要な情報を処理し、現在地から次の行動へ移れる状態。',reason:'本文中の定義を、判断と行動のつながりとして言い換えています。'},{text:'施設全体の情報を一度に記憶し、案内を二度と見なくてよい状態。',error:'overgeneralization',reason:'一度にすべて記憶することを求めていません。'}], answer: 2, explanation: 'ここでの余白は物理的な空きではなく、情報を行動へ結び付ける認知上の余裕です。' }),
      aa22Question({ ...shared, code: 'I-4', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問4（二つ選択）', passage: JA_PASSAGE_I, points: 2, partialPoints: 1, unit: 'modern', reasoningTag: '内容一致', evidence: '第三段落でAの用途を認め、第四段落で量の多少だけによる判断をともに否定している。', stem: '本文の内容に一致するものを二つ選びなさい。', choices: [{text:'Aの案内板は混雑時に遅れを生んだため、どの利用者にも不要である。',error:'overgeneralization',reason:'建物全体を確かめたい人などには役立つとあります。'},{text:'Bの案内板は一度の情報量を絞り、次の表示へ移りやすくしていた。',reason:'第二段落の説明と一致します。'},{text:'案内の質は、目的地までの平均時間だけを測れば十分に判断できる。',error:'single_metric',reason:'筆者は利用状況を含めて考える必要を述べています。'},{text:'詳しい情報が有効かどうかは、利用目的や使われる状況によって変わる。',reason:'Aの価値を残しつつ、混雑時との違いを論じた内容に一致します。'},{text:'情報を減らすほど、案内は必ず正確で分かりやすくなる。',error:'overgeneralization',reason:'第四段落で「減らせば必ず分かりやすくなる」のではないと否定しています。'}], answers: [1, 3], explanation: 'Bの段階的表示と、用途・状況によるAの価値の変化が本文に一致します。' }),
      aa22Question({ ...shared, code: 'I-5a', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5①', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '要約', evidence: '最終段落の「何を伝えるか」と「いつ、どこで、どのように使われるか」。', stem: '本文の要約の空欄に入る語句として最も適切なものを選びなさい。\n「案内は情報の【　】だけで評価せず、利用者が判断し行動する状況に合わせて設計する必要がある。」', choices: [{text:'新しさ',error:'focus_shift',reason:'新旧は論点ではありません。'},{text:'量',reason:'本文全体で「情報量だけ」を質と見なす考えを検討しています。'},{text:'入手費用',error:'outside_information',reason:'費用は扱われていません。'},{text:'作成者',error:'outside_information',reason:'作成者の属性は論点ではありません。'}], answer: 1, explanation: '中心対立は、情報量の多寡だけで見る評価と、使用状況を含む評価です。' }),
      aa22Question({ ...shared, code: 'I-5b', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5②', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '論の構成', evidence: '一般的な見方→比較調査→調査の限定的解釈→概念の再定義、の順。', stem: '本文全体の論の進め方として最も適切なものを選びなさい。', choices: [{text:'案内に関する一般的な考えを示し、比較調査で問い直した後、両者の用途を整理して考えを深めている。',reason:'各段落の役割を順に捉えています。'},{text:'二種類の案内板の優劣を最初に決め、その結論に合う結果だけを後から示している。',error:'logic_reversal',reason:'最初に優劣を決めず、調査結果を受けて条件を整理しています。'},{text:'混雑の原因を施設の構造だけに求め、案内板の情報量とは無関係だと結論づけている。',error:'focus_shift',reason:'案内板の情報量と使われ方が中心です。'},{text:'Aの欠点を列挙した後、Bへ全面的に置き換える方法だけを提案している。',error:'overgeneralization',reason:'Aが役立つ利用者もいると明示しています。'}], answer: 0, explanation: '単純な二者択一ではなく、調査結果の条件を整理し「余白」を再定義する構成です。' }),
      aa22Question({ ...shared, code: 'I-5c', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5③', passage: JA_PASSAGE_I, points: 1, unit: 'modern', reasoningTag: '主張', evidence: '末文「何を伝えるかと同時に、いつ、どこで、どのように使われるかを設計して初めて、情報は行動を支える」。', stem: '筆者の考えに最も近いものを選びなさい。', choices: [{text:'正確な情報をすべて示せば、利用者の置かれた状況にかかわらず行動は速くなる。',error:'overgeneralization',reason:'状況にかかわらず、とは述べていません。'},{text:'案内では誤りを減らすことより、移動時間を短くすることだけを優先すべきだ。',error:'single_metric',reason:'一つの指標だけで評価する立場ではありません。'},{text:'情報の内容と、その情報が使われる場面の条件を結び付けて設計することが大切だ。',reason:'末文の主張を過不足なく言い換えています。'},{text:'利用者ごとの差をなくすには、すべての案内板を同じ情報量に統一すべきだ。',error:'outside_information',reason:'統一を求めておらず、むしろ用途と状況への適合を重視しています。'}], answer: 2, explanation: '情報の量ではなく、内容と使用状況の適合が行動を支えるという主張です。' }),

      aa22Question({ ...shared, code: 'II-1a', bigQuestion: '大問二', bigTitle: '漢字・語句', officialSmallLabel: '問1①', points: .5, unit: 'kanji', stem: '傍線部「補う」の読みとして最も適切なものを選びなさい。', choices: ['おぎなう', 'つぐなう', 'そこなう', 'ともなう'], answer: 0, explanation: '「補う」は「おぎなう」と読み、不足を満たす意味です。' }),
      aa22Question({ ...shared, code: 'II-1b', bigQuestion: '大問二', bigTitle: '漢字・語句', officialSmallLabel: '問1②', points: .5, unit: 'kanji', stem: '傍線部「顕著」の読みとして最も適切なものを選びなさい。', choices: ['けんしょ', 'げんちょ', 'けんちょ', 'げんしょ'], answer: 2, explanation: '「顕著」は「けんちょ」と読み、際立って明らかな様子を表します。' }),
      aa22Question({ ...shared, code: 'II-2', bigQuestion: '大問二', bigTitle: '漢字・語句', officialSmallLabel: '問2', points: 1, unit: 'kanji', stem: '「成果を収める」の「収」と同じ漢字を用い、意味の関係も最も近いものを選びなさい。', choices: ['成功を収める', '学問を修める', '税を納める', '国を治める'], answer: 0, explanation: '「成果を収める」「成功を収める」は、よい結果を得る意味です。「修める」「納める」「治める」と書き分けます。' }),
      aa22Question({ ...shared, code: 'II-3', bigQuestion: '大問二', bigTitle: '漢字・語句', officialSmallLabel: '問3', points: 1, unit: 'idiom', stem: '次の文の空欄に入る語句として最も適切なものを選びなさい。\n「一つの結果だけで決めず、複数の資料を比べて【　】判断した。」', choices: ['早合点して', '念には念を入れて', '手を焼いて', '水に流して'], answer: 1, explanation: '「念には念を入れる」は、十分注意したうえでさらに注意することです。' }),

      aa22Question({ ...shared, code: 'III-1', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問1', passage: JA_PASSAGE_III, points: 1, unit: 'discussion', stem: '美咲が初めにB週をよいと考えた根拠を選びなさい。', choices: ['自分で確かめやすい割合が高かったから', '迷わなかった人の割合が高かったから', '案内係が不要だったから', '矢印表示が多かったから'], answer: 1, explanation: '美咲は「迷わなかった割合だけなら」と述べ、B週86％を根拠にしています。' }),
      aa22Question({ ...shared, code: 'III-2', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問2', passage: JA_PASSAGE_III, points: 1, unit: 'discussion', stem: '陸がA週の結果も無視できないと述べた理由として最も適切なものを選びなさい。', choices: ['A週は迷わなかった割合が最も高いから', '案内係は必ず全ての場所に置けるから', '混雑時の人員制約と、自分で確認できる利点があるから', 'A週には調査結果がないから'], answer: 2, explanation: '陸は案内係不足の可能性と、A週の「自分で確かめやすい」84％を重視しています。' }),
      aa22Question({ ...shared, code: 'III-3', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問3', passage: JA_PASSAGE_III, points: 1, unit: 'discussion', stem: '美咲の最終案の特徴を選びなさい。', choices: ['A週だけを全面採用する。', 'B週だけを全面採用する。', '二つの方法の長所と運用条件を組み合わせる。', '案内を全てなくす。'], answer: 2, explanation: '矢印と案内係を場所に応じて組み合わせる提案です。' }),
      aa22Question({ ...shared, code: 'III-4a', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問4①', passage: JA_PASSAGE_III, points: 1, unit: 'discussion', stem: '再調査で同じ質問を用いる主な利点を選びなさい。', choices: ['結果を以前と比較しやすい。', '必ず100％になる。', '回答者を減らせる。', '人員配置を隠せる。'], answer: 0, explanation: '条件をそろえた質問により、改善前後を比較しやすくなります。' }),
      aa22Question({ ...shared, code: 'III-4b', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問4②', passage: JA_PASSAGE_III, points: 1, unit: 'discussion', stem: 'この対話から分かる、資料の扱い方として最も適切なものを選びなさい。', choices: ['最も大きい数値だけで決める。', '複数の指標と実施条件を合わせて考える。', '数値と発言を別々にして関連付けない。', '最初の意見を変えない。'], answer: 1, explanation: '迷いにくさ、自力確認、人員制約を統合して判断しています。' }),
      aa22Question({ ...shared, code: 'III-5', bigQuestion: '大問三', bigTitle: '対話・資料統合', officialSmallLabel: '問5（二つ選択）', passage: JA_PASSAGE_III, points: 2, partialPoints: 1, unit: 'discussion', stem: '対話と資料の内容に一致するものを二つ選びなさい。', choices: ['A週は「自分で確かめやすい」の割合がB週より高い。', 'B週は迷わなかった人がA週より少ない。', '最終案は全ての場所に案内係を置く。', '改善後も同じ質問で再調査する提案がある。', '二人は資料を見る前に結論を固定した。'], answers: [0, 3], explanation: 'A週84％対B週61％、および同じ質問での再調査が一致します。' }),

      aa22Question({ ...shared, code: 'IV-1', bigQuestion: '大問四', bigTitle: '古文', officialSmallLabel: '問1（二つ選択）', passage: JA_PASSAGE_IV, points: 1, unit: 'classical', stem: '古文の内容に合うものを二つ選びなさい。', choices: ['ある人は毎朝、梅を見ていた。', '友は花だけを見れば春が分かると言った。', '友は枝の色や鳥の声にも注目するよう勧めた。', 'ある人は記録をやめた。', '梅は友が来る前に満開だった。'], answers: [0, 2], explanation: '冒頭の行動と、友の助言が本文に合います。' }),
      aa22Question({ ...shared, code: 'IV-2', bigQuestion: '大問四', bigTitle: '古文', officialSmallLabel: '問2', passage: JA_PASSAGE_IV, points: 1, unit: 'classical', stem: '「花のみ待たば」の意味として最も適切なものを選びなさい。', choices: ['花だけを待つならば', '花を待たないならば', '花が散ったならば', '花を人に渡すならば'], answer: 0, explanation: '「のみ」は限定、「待たば」は「待つならば」です。' }),
      aa22Question({ ...shared, code: 'IV-3', bigQuestion: '大問四', bigTitle: '古文', officialSmallLabel: '問3', passage: JA_PASSAGE_IV, points: 1, unit: 'classical', stem: 'ある人が「花の咲く前より春を知りぬ」とあるのはなぜか。', choices: ['友が梅を持ってきたから', '小さな変化を記録し、春の接近に気づいたから', '毎朝寝ていたから', '庭から鳥がいなくなったから'], answer: 1, explanation: '枝の色や鳥の声などの小さな変化を記録した結果です。' }),
      aa22Question({ ...shared, code: 'IV-4', bigQuestion: '大問四', bigTitle: '古文', officialSmallLabel: '問4', passage: JA_PASSAGE_IV, points: 1, unit: 'classical', stem: 'この話の主題として最も適切なものを選びなさい。', choices: ['結果だけでなく、途中の小さな変化にも目を向ける大切さ', '友人を庭へ入れない大切さ', '毎日同じ言葉を言う楽しさ', '花が咲く日を正確に予言する方法'], answer: 0, explanation: '花という結果だけでなく、そこへ至る兆しに気づくことが中心です。' })
    ];
  }

  function aa22AllowedAreas(subject, config) {
    let units = config.scope === 'full' ? EXAM_UNITS[subject].map(x => x[0]) : config.units;
    if (config.level < 3) units = units.filter(x => x !== 'advanced');
    const mapping = UNIT_AREAS[subject];
    return [...new Set(units.flatMap(unit => mapping?.[unit] || [unit]))];
  }

  function aa22UnitForArea(subject, area, selectedUnits) {
    if (selectedUnits.includes(area)) return area;
    return selectedUnits.find(unit => safeArray(UNIT_AREAS[subject]?.[unit]).includes(area)) || area;
  }

  function aa22BankQuestion(subject, level, allowed, index, big, label, points) {
    const bank = API.banks[subject];
    const cap = level === 1 ? 7 : level === 2 ? 9 : 11;
    let candidates = bank.filter(row => allowed.includes(row.area) && row.difficulty <= cap && !(row.area === 'advanced' && level < 3));
    if (!candidates.length) return null;
    candidates.sort((a, b) => Math.abs((a.difficulty || 5) - (LEVELS[level].target || 5)) - Math.abs((b.difficulty || 5) - (LEVELS[level].target || 5)));
    const row = candidates[index % candidates.length];
    const q = API.makeQuestion(row, true);
    q.subject = subject; q.testMode = true; q.courseLevel = level; q.points = points;
    q.bigQuestion = big.name; q.bigTitle = big.title; q.officialSmallLabel = label;
    q.aichiPassage = subject === 'science'
      ? `【実験・観察資料】\n調べる対象：${row.prompt}\n条件を一つずつ確認し、用語だけでなく結果を説明できる選択肢を選ぶ。`
      : subject === 'social'
        ? `【資料】\n主題：${row.prompt}\n年代・地域・制度・因果のうち、設問が求める観点を資料と対応させる。`
        : subject === 'math'
          ? `【公式暗記】${row.prompt}\n計算はせず、公式・法則と使う条件を正確に選ぶ。`
          : '';
    q.context = 'aichi-r8-' + subject + '-' + big.name;
    return q;
  }

  function aa22UnitLabel(subject, unit) {
    return EXAM_UNITS[subject].find(x => x[0] === unit)?.[1] || unit;
  }

  function aa22TagUnit(q, subject, unit) {
    q.examUnit = unit;
    q.subject = subject;
    q.testMode = true;
    q.source = { ...(q.source || {}), area: q.source?.area || unit };
    return q;
  }

  const JA_LITERARY_PASSAGE = `【文学的文章・本アプリ作成】
理科室の窓際で、紗季は発表用の模造紙を筒のように丸めた。返された紙の右上には、先生の字で「観察したことは多い。でも、あなたが確かめたかった問いはどこだろう」とあった。写真の順番も、測った時刻も間違ってはいない。それだけに、全部を否定されたような気がして、紗季は輪ゴムを二重にかけた。

片付けをしていた透が、「直すところ、多かった？」と尋ねた。紗季が返事をせず紙を机の奥へ押すと、透は先生の言葉を読み、「最初の予想と違ったのは、どの写真？」と言った。直し方を教えようとする口調ではなかった。

紗季はしばらく黙ってから、三枚目の写真を指した。日当たりのよい場所ほど早く花が開くと思っていたのに、その鉢だけは、日が陰ってから開き始めていた。「ここから測る時間を変えたんだ」と言うと、透は「じゃあ、この写真より前と後で、見ていたものが変わったんだね」とだけ言って、流し台へ戻った。

紗季は輪ゴムを外した。時刻順にまっすぐ並べた写真の列が、今度は三枚目で向きを変える矢印に見えた。先生の赤い字も、終点を示す線ではなく、その矢印をどこから描き始めるか尋ねる印のように思えた。紗季は題名の「日光と開花の観察」を消し、「予想が外れたとき、何を測り直すか」と書いた。紙の端は丸まったままだったが、紗季は手のひらでそこを押さえ、最初の写真の下に短い一文を書き始めた。`;
  function aa22JapaneseLiterary(level) {
    const shared = { subject: 'japanese', level, unit: 'literary', bigQuestion: '単元別', bigTitle: '文学的文章', passage: JA_LITERARY_PASSAGE };
    return [
      aa22Question({ ...shared, code: 'LIT-1', officialSmallLabel: '問1', reasoningTag: '行動と心情', evidence: '紗季は内容が間違いではないのに「全部を否定されたような気」がして、輪ゴムを二重にかけた。', stem: '冒頭で紗季が模造紙に「輪ゴムを二重にかけた」行動から読み取れる心情として最も適切なものを選びなさい。', choices: [{text:'観察記録に誤りがないため、先生へすぐ反論できると自信を深めている。',error:'opposite',reason:'自信ではなく、全部を否定されたように感じています。'},{text:'指摘の意味をまだ整理できず、発表資料と向き合うことをいったん避けようとしている。',reason:'紙を閉じて机の奥へ押す後の行動ともつながります。'},{text:'透に直してもらうつもりで、資料を持ち運びやすい形に整えている。',error:'outside_information',reason:'透へ頼む意図は示されていません。'},{text:'観察を終えた満足感から、資料を傷めないよう丁寧に保管しようとしている。',error:'surface_reading',reason:'二重の輪ゴムは心理的に閉じる動作として描かれています。'}], answer: 1, explanation: '紙を閉じる動作が、指摘を拒絶と受け止めて資料から距離を置く心情を表します。' }),
      aa22Question({ ...shared, code: 'LIT-2', officialSmallLabel: '問2', reasoningTag: '発言の働き', evidence: '透は「直し方」ではなく「最初の予想と違ったのは、どの写真？」と尋ねた。', stem: '透の問いかけが紗季に与えた働きとして最も適切なものを選びなさい。', choices: [{text:'先生の指摘が誤りだと証明する材料を選ばせ、資料を元の形で提出させた。',error:'outside_information',reason:'先生の指摘を否定せず、資料も元の形には戻していません。'},{text:'修正方法を具体的に指示し、紗季が考えなくても題名を決められるようにした。',error:'overgeneralization',reason:'透は答えを与えず、問いを返しています。'},{text:'予想と観察のずれへ注意を戻し、紗季自身が発表の中心となる問いを見つけるきっかけを作った。',reason:'三枚目を境に「見ていたものが変わった」と気づく流れにつながります。'},{text:'写真の時刻順が間違っていると気づかせ、並べ替えだけで問題を解決させた。',error:'focus_shift',reason:'時刻順は間違っておらず、論点は問いの見え方です。'}], answer: 2, explanation: '透は正解を教えず、紗季が自分の観察の転換点を言葉にする問いを置きました。' }),
      aa22Question({ ...shared, code: 'LIT-3', officialSmallLabel: '問3', reasoningTag: '比喩と心情変化', evidence: '写真の列が「三枚目で向きを変える矢印」に、赤字が「終点」ではなく描き始めを尋ねる印に見えた。', stem: '「写真の列が、今度は三枚目で向きを変える矢印に見えた」という表現の効果として最も適切なものを選びなさい。', choices: [{text:'同じ写真の並びを、失敗の記録ではなく問いが変化した過程として捉え直したことを表す。',reason:'三枚目を転換点として、観察の意味を再構成した心情を示します。'},{text:'写真を矢印の形に貼り直す必要があると理解し、見た目の修正を優先したことを表す。',error:'literal_only',reason:'物理的な貼り方ではなく、資料の意味の捉え直しです。'},{text:'三枚目以後の観察は誤りなので削除し、最初の予想だけを残そうとしたことを表す。',error:'opposite',reason:'予想と違った三枚目以後を発表の中心にしています。'},{text:'透の考えをそのまま借りれば発表が完成すると安心し、自分で考えるのをやめたことを表す。',error:'outside_information',reason:'最後は紗季自身が題名と一文を書いています。'}], answer: 0, explanation: '比喩は、指摘を「失敗の終点」から「問いを描き直す始点」へ変えたことを示します。' }),
      aa22Question({ ...shared, code: 'LIT-4', officialSmallLabel: '問4', reasoningTag: '結末', evidence: '紙の端は丸まったままだが、紗季は押さえて新しい題名と最初の一文を書き始めた。', stem: '結末の紗季の様子として最も適切なものを選びなさい。', choices: [{text:'不安が完全に消えたため、先生の助言を使わず最初から別の研究を始めている。',error:'overgeneralization',reason:'紙の端が丸まったままという描写から、不安が完全に消えたとは言えません。'},{text:'資料の欠点を隠すため、見栄えだけを整えて提出しようとしている。',error:'surface_reading',reason:'題名と説明の中心を問い直しています。'},{text:'先生と透に認められることだけを目標に、二人の言葉をそのまま書き写している。',error:'outside_information',reason:'書き写したとはなく、自分の問いに言い換えています。'},{text:'まだためらいを残しながらも、指摘を手掛かりに自分の問いを立て直し、修正へ踏み出している。',reason:'丸まりを押さえつつ書き始める動作が、ためらいと前進の両方を示します。'}], answer: 3, explanation: '心情を単純な克服にせず、残るためらいと主体的な再出発を同時に読むのが適切です。' })
    ];
  }

  function aa22JapaneseUnitQueue(level, config) {
    const selected = config.units;
    const queue = aa22JapaneseExam(level).filter(q => selected.includes(q.source?.area)).map(q => aa22TagUnit(q, 'japanese', q.source.area));
    if (selected.includes('literary')) queue.push(...aa22JapaneseLiterary(level));
    for (const unit of selected) {
      if (['modern', 'literary', 'discussion'].includes(unit)) continue;
      const existing = queue.filter(q => q.examUnit === unit).length;
      const allowed = safeArray(UNIT_AREAS.japanese[unit]);
      const cap = level === 1 ? 7 : level === 2 ? 9 : 11;
      const available = API.banks.japanese.filter(row => allowed.includes(row.area) && row.difficulty <= cap).length;
      const addCount = Math.max(0, Math.min(6 - existing, available));
      const big = { name: '単元別', title: aa22UnitLabel('japanese', unit) };
      for (let i = 0; i < addCount; i++) {
        const q = aa22BankQuestion('japanese', level, allowed, i, big, '問' + (existing + i + 1), 1);
        if (q) queue.push(aa22TagUnit(q, 'japanese', unit));
      }
    }
    return queue;
  }

  const EN_DIALOGUE = `【会話文】\nMika: The science club will meet at four today. Can you come?\nLeo: I have piano practice until four fifteen.\nMika: We will begin with the report, and the experiment starts at four thirty.\nLeo: Then I can join the experiment. I will send my report before practice.`;
  const EN_DATA = `【Graph 1】Main Reason for Leaving School Lunch (%)\nReason                         Grade 1  Grade 2  Grade 3\nToo much rice                     20       10       30\nVegetables were difficult to eat  15       30       20\nNot enough time                   40       20       25\nThe first portion was too large   25       40       25\n\n【Graph 2】Number of Leftover Servings\nFood / Period        Apr-Jun  Jul-Sep  Oct-Dec  Jan-Mar\nRice                    30       25       20       18\nVegetables              45       70       50       35\nFish                    20       15       30       45\nSoup                    25       35       40       55\n\n【Report】\nI researched food waste from school lunches last year. The reasons were divided into four groups.\n\nLook at Graph 1. The biggest reason was different in each grade. In Grade 2, the first portion being too large was the biggest reason. In Grade 3, too much rice was the biggest reason. In Grade 1, the percentage for not having enough time was about [ 1 ] as high as the percentage for too much rice.\n\nNext, look at Graph 2. It shows the number of leftover servings during the year. Leftover vegetables were highest [ 2 ]. Fish showed a different pattern: the number increased after September and reached 45 from January to March.\n\nThe two graphs suggest that one fixed solution may not work for every grade or every food. I think [ 3 ]. Students still need enough food, so the school should allow them to take more after choosing a smaller first portion.\n\nI hope this research will help our school reduce food waste.`;
  function aa22EnglishFixedUnit(unit, level) {
    const shared = { subject: 'english', level, unit, bigQuestion: '単元別', bigTitle: aa22UnitLabel('english', unit), points: 1 };
    if (unit === 'dialogue') return [
      aa22Question({ ...shared, code: 'EN-D1', officialSmallLabel: '問1', passage: EN_DIALOGUE, stem: 'Why can Leo not come at four?', choices: ['He has piano practice.', 'He must write a new report.', 'The club room is closed.', 'He has a science test.'], answer: 0, explanation: 'Leo says, “I have piano practice until four fifteen.”' }),
      aa22Question({ ...shared, code: 'EN-D2', officialSmallLabel: '問2', passage: EN_DIALOGUE, stem: 'What will the club do first?', choices: ['Start the experiment.', 'Practice the piano.', 'Listen to the report.', 'Clean the room.'], answer: 2, explanation: 'Mika says that they will begin with the report.' }),
      aa22Question({ ...shared, code: 'EN-D3', officialSmallLabel: '問3', passage: EN_DIALOGUE, stem: 'Which activity can Leo join?', choices: ['The report at four.', 'The experiment at four thirty.', 'Piano practice at four thirty.', 'A meeting tomorrow.'], answer: 1, explanation: 'His practice ends at 4:15, so he can join the 4:30 experiment.' }),
      aa22Question({ ...shared, code: 'EN-D4', officialSmallLabel: '問4', passage: EN_DIALOGUE, stem: 'What will Leo do before piano practice?', choices: ['Send his report.', 'Do the experiment.', 'Meet Mika at four.', 'Cancel the club meeting.'], answer: 0, explanation: 'Leo says, “I will send my report before practice.”' })
    ];
    if (unit === 'data') {
      const questions = [
        aa22Question({ ...shared, code: 'EN-T1', officialSmallLabel: '問1', passage: EN_DATA, stem: '空欄[ 1 ]・[ 2 ]に入る語句の組合せとして最も適切なものを選びなさい。', choices: ['twice / from July to September', 'half / from July to September', 'twice / from January to March', 'half / from January to March'], answer: 0, explanation: 'Graph 1は40%対20%なのでtwice、Graph 2の野菜の最大値70はJuly–Septemberです。' }),
        aa22Question({ ...shared, code: 'EN-T2', officialSmallLabel: '問2', passage: EN_DATA, stem: 'Which statement about Graph 1 is correct?', choices: ['Not enough time is the biggest reason in Grade 1.', 'Too much rice is the biggest reason in Grade 2.', 'Vegetables are the biggest reason in Grade 3.', 'The first portion is the smallest reason in Grade 2.'], answer: 0, explanation: 'Grade 1のnot enough timeは40%で最大です。' }),
        aa22Question({ ...shared, code: 'EN-T3', officialSmallLabel: '問3', passage: EN_DATA, stem: 'Which statement about Graph 2 is correct?', choices: ['Leftover rice increased in every period.', 'Leftover fish was lowest from July to September.', 'Leftover soup was highest from April to June.', 'Leftover vegetables reached 70 from January to March.'], answer: 1, explanation: 'Fishは20→15→30→45で、最小はJuly–Septemberの15です。' }),
        aa22Question({ ...shared, code: 'EN-T4', officialSmallLabel: '問4', passage: EN_DATA, stem: 'Why does the writer say that one fixed solution may not work?', choices: ['The main reason changes by grade, and the leftover pattern changes by food and period.', 'Every grade gives exactly the same reason for leaving food.', 'Graph 2 contains no information about different foods.', 'Students never need more food after the first portion.'], answer: 0, explanation: '二つの資料は、学年別の理由と食品・時期別の変化が一様でないことを示しています。' }),
        aa22Question({ ...shared, code: 'EN-T5', officialSmallLabel: '問5', passage: EN_DATA, stem: '空欄[ 3 ]に students / can / reduce / food / waste / by / choosing / carefully を並べるとき、2番目・4番目・6番目の語の組合せを選びなさい。', choices: ['can / food / by', 'students / reduce / waste', 'can / waste / choosing', 'reduce / food / carefully'], answer: 0, explanation: 'students can reduce food waste by choosing carefully の語順なので、2番目can・4番目food・6番目byです。' }),
        aa22Question({ ...shared, code: 'EN-T6', officialSmallLabel: '問6', passage: EN_DATA, stem: 'Which action best follows from both graphs and the report?', choices: ['Let students choose a smaller first portion and take more later if needed.', 'Give every student the same large portion throughout the year.', 'Remove vegetables only from Grade 1 lunches.', 'Shorten lunch time because speed is the only cause of waste.'], answer: 0, explanation: '理由や残食傾向の違いに対応しながら、必要量を確保できる提案です。' })
      ];
      return questions.slice(0, level === 1 ? 4 : level === 2 ? 5 : 6);
    }
    if (unit === 'grammar') return [
      aa22Question({ ...shared, code: 'EN-G1', officialSmallLabel: '問1', stem: 'If I _____ enough time, I will help you.', choices: ['have', 'had', 'will have', 'having'], answer: 0, explanation: 'A future condition uses the present tense in the if-clause.' }),
      aa22Question({ ...shared, code: 'EN-G2', officialSmallLabel: '問2', stem: 'This book _____ by many students last year.', choices: ['reads', 'read', 'was read', 'is reading'], answer: 2, explanation: 'The passive in the past is “was read.”' }),
      aa22Question({ ...shared, code: 'EN-G3', officialSmallLabel: '問3', stem: 'I _____ in Nagoya for three years.', choices: ['live', 'lived now', 'have lived', 'am live'], answer: 2, explanation: 'A continuing situation with “for three years” uses the present perfect.' }),
      aa22Question({ ...shared, code: 'EN-G4', officialSmallLabel: '問4', stem: 'Choose the correct sentence.', choices: ['Do you know where is the station?', 'Do you know where the station is?', 'Do you know is where the station?', 'Do you where know the station is?'], answer: 1, explanation: 'An indirect question uses statement word order: where the station is.' })
    ];
    return [];
  }

  function aa22GraphReadingSet(difficulty = 7, assist = 'exam') {
    const diff = clamp(Math.round(Number(difficulty) || 7), 1, 11);
    const level = diff <= 3 ? 1 : diff <= 7 ? 2 : 3;
    const questions = aa22EnglishFixedUnit('data', level).map((q, index) => ({
      ...q, id: q.id + ':graph:' + uid('q'), type: 'dataReading', subject: 'english',
      testMode: assist === 'exam', aichiPassage: '', context: 'aichi-graph-report',
      skills: [{ id: index === 4 ? 'en.grammar.transfer' : index >= 3 ? 'en.read.inference' : 'en.read.detail', role: 'primary' }]
    }));
    const lexicalProfile = lexicalCoverageProfile(EN_DATA);
    const target = assist === 'exam' ? null : lexicalTarget('standard', 'scaffold');
    const plan = assist === 'exam' ? { words: [], assistedCoverage: lexicalProfile.coverage } : preteachPlan(lexicalProfile, target, 14);
    return {
      id: 'reading:graph-food-waste:' + uid('set'), type: 'readingSet', scenarioId: 'graph-food-waste',
      title: 'Food Waste Survey — Two Graphs and a Report', passage: EN_DATA, questions,
      skills: [{ id: 'en.read.detail', role: 'primary' }, { id: 'en.read.inference', role: 'secondary' }],
      expectedMs: (level === 1 ? 6 : level === 2 ? 8 : 10) * 60000, context: 'aichi-graph-report',
      wordCount: tokens(EN_DATA).length, difficulty: diff, requestedDifficulty: diff,
      difficultyLabel: readingDifficultyLabel(diff), readingMode: 'standard', grammarTags: ['comparison'],
      lesson: '二つのグラフの割合・最大値・時期変化を英文レポートの空欄、語順、提案と結び付ける。',
      openingJa: '', firstReadDone: false, firstReadMs: null, wpm: null, paceScored: false,
      assistMode: assist, lexicalProfile, lexicalTarget: target, preteachPlan: plan, lexicalScaffold: plan.words.length > 0
    };
  }

  function aa22StartGraphPractice() {
    const read = aa22GraphReadingSet(state.ui.subjectDifficulty || 7, 'scaffold');
    registerReading(read);
    state.session = {
      id: uid('graphPractice'), active: true, mode: 'standard', trackType: 'practice',
      kind: 'reading', subject: 'english', queue: [read], index: 0, subIndex: 0,
      answers: {}, feedback: null, startedAt: now(), accumulatedMs: 0, lastActiveAt: now(),
      itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false, pausedAt: null
    };
    state.stats.sessions++; state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  function aa22AdvancedMathQueue(count = 15) {
    return shuffle(API.banks.math.filter(row => row.area === 'advanced'))
      .slice(0, Math.max(1, Math.min(Number(count) || 15, 24)))
      .map(row => {
        const q = API.makeQuestion(row, false);
        q.courseLevel = 3;
        q.context = 'advanced-entrance-formula';
        q.examUnit = 'advanced';
        return q;
      });
  }

  function aa22StartAdvancedMathFormulas() {
    return API.startPractice('math', 'deep', 3, aa22AdvancedMathQueue(15));
  }

  function aa22EnglishUnitQueue(config) {
    const queue = [];
    for (const unit of config.units) {
      if (unit === 'reading') {
        const read = generateReading(clamp(config.level * 3 + 2, 3, 11), 'standard');
        for (const [index, original] of read.questions.entries()) {
          const q = aa22TagUnit({ ...original, id: original.id + ':' + uid('q'), subject: 'english', points: 1, testMode: true,
            bigQuestion: '単元別', bigTitle: aa22UnitLabel('english', unit), officialSmallLabel: '問' + (index + 1),
            aichiPassage: read.passage, source: { area: unit, scenarioId: read.scenarioId } }, 'english', unit);
          queue.push(q);
        }
      } else if (unit === 'vocab') {
        for (const q of planVocabQueue(8)) {
          q.bigQuestion = '単元別'; q.bigTitle = aa22UnitLabel('english', unit); q.officialSmallLabel = '問' + (queue.length + 1); q.points = 1;
          queue.push(aa22TagUnit(q, 'english', unit));
        }
      } else queue.push(...aa22EnglishFixedUnit(unit, config.level));
    }
    return queue;
  }

  const BLUEPRINTS = {
    math: [
      { name: '公式I', title: '数・式・方程式の公式', count: 5 },
      { name: '公式II', title: '関数・確率・データの公式', count: 5 },
      { name: '公式III', title: '図形の定理・面積・体積', count: 5 }
    ],
    science: [
      { name: '大問一', title: '粒子モデル・光', count: 2 }, { name: '大問二', title: '生物実験', count: 4 },
      { name: '大問三', title: '溶解度・化学資料', count: 4 }, { name: '大問四', title: '電気・磁界', count: 4 },
      { name: '大問五', title: '地震・地球資料', count: 4 }, { name: '大問六', title: '圧力・分類統合', count: 2 }
    ],
    social: [
      { name: '大問一', title: '日本史・世界史統合', count: 3 }, { name: '大問二', title: '歴史資料・年代', count: 3 },
      { name: '大問三', title: '日本地理・地図', count: 4 }, { name: '大問四', title: '世界地理・統計', count: 4 },
      { name: '大問五', title: '公民・政治', count: 3 }, { name: '大問六', title: '経済・国際・資料統合', count: 3 }
    ]
  };

  function aa22StructuredQueue(subject, level, config) {
    if (subject === 'japanese') return config.scope === 'full' ? aa22JapaneseExam(level) : aa22JapaneseUnitQueue(level, config);
    if (subject === 'english') return aa22EnglishUnitQueue(config);
    const blueprint = BLUEPRINTS[subject];
    const allowed = aa22AllowedAreas(subject, config);
    const queue = [];
    if (config.scope !== 'full') {
      const cap = level === 1 ? 7 : level === 2 ? 9 : 11;
      const available = API.banks[subject].filter(row => allowed.includes(row.area) && row.difficulty <= cap && !(row.area === 'advanced' && level < 3)).length;
      const target = Math.min(blueprint.reduce((sum, big) => sum + big.count, 0), available);
      const title = config.units.map(unit => aa22UnitLabel(subject, unit)).join('・');
      const big = { name: '単元別', title };
      for (let i = 0; i < target; i++) {
        const q = aa22BankQuestion(subject, level, allowed, i, big, '問' + (i + 1), 1);
        if (q) queue.push(aa22TagUnit(q, subject, aa22UnitForArea(subject, q.source?.area, config.units)));
      }
      return queue;
    }
    let globalIndex = 0;
    for (const big of blueprint) {
      for (let i = 0; i < big.count; i++, globalIndex++) {
        let points = 1;
        if (subject === 'math') points = (globalIndex >= 8 ? 2 : 1);
        if ((subject === 'science' || subject === 'social') && globalIndex >= 18) points = 2;
        let questionAreas = allowed;
        if (subject === 'math') {
          const coreGroups = [
            ['number', 'algebra', 'equation'],
            ['function', 'probability', 'statistics'],
            ['geometry', 'measure']
          ];
          const advancedSlots = new Set([4, 9, 13, 14]);
          const useAdvanced = level === 3 && allowed.includes('advanced') && advancedSlots.has(globalIndex);
          questionAreas = useAdvanced
            ? ['advanced']
            : coreGroups[blueprint.indexOf(big)].filter(area => allowed.includes(area));
          if (!questionAreas.length) questionAreas = allowed.filter(area => area !== 'advanced');
          if (!questionAreas.length) questionAreas = allowed;
        }
        const q = aa22BankQuestion(subject, level, questionAreas, globalIndex, big, '問' + (i + 1), points);
        if (q) queue.push(aa22TagUnit(q, subject, aa22UnitForArea(subject, q.source?.area, config.units)));
      }
    }
    return queue;
  }

  function aa22ApplyLength(queue, length) {
    if (length === 'full') return queue;
    const target = length === 'mini' ? Math.min(8, queue.length) : Math.max(10, Math.ceil(queue.length * .58));
    const picked = [];
    for (let i = 0; i < target; i++) picked.push(queue[Math.round(i * (queue.length - 1) / Math.max(1, target - 1))]);
    return [...new Map(picked.map(q => [q.id, q])).values()];
  }

  function aa22PracticeLevel(config) {
    let difficulty = clamp(Math.round(Number(state.ui.subjectDifficulty) || 7), 1, 11);
    let level = difficulty <= 4 ? 1 : difficulty <= 8 ? 2 : 3;
    if (config.subject === 'math' && safeArray(config.unitsBySubject.math).includes('advanced')) level = 3;
    return level;
  }
  function aa22BalancedPracticeSlice(queue, units, count) {
    const groups = new Map(units.map(unit => [unit, shuffle(queue.filter(q => q.examUnit === unit))]));
    const picked = [];
    let changed = true;
    while (picked.length < count && changed) {
      changed = false;
      for (const unit of units) {
        const group = groups.get(unit) || [], q = group.shift();
        if (!q) continue;
        picked.push(q); changed = true;
        if (picked.length >= count) break;
      }
    }
    return picked;
  }
  function aa22PracticeQueue(configInput = aa22PracticeConfig()) {
    const config = aa22NormalizePracticeConfig(configInput), subject = config.subject;
    const units = safeArray(config.unitsBySubject[subject]);
    const level = aa22PracticeLevel(config);
    const custom = aa22NormalizeConfig({ subject, level, scope: 'custom', units, timeMin: 20, length: 'full' });
    let queue = aa22StructuredQueue(subject, level, custom)
      .filter(q => !q.answerIndices)
      .map(q => ({ ...q, choices: q.choices.map(c => ({ ...c })), testMode: false, points: 1,
        context: 'unit-practice-' + subject + '-' + q.examUnit }));
    const count = config.length === 'micro' ? 3 : config.length === 'deep' ? 15 : 8;
    queue = aa22BalancedPracticeSlice(queue, units, count);
    if (queue.some(q => !units.includes(q.examUnit))) return [];
    return queue;
  }
  function aa22StartUnitPractice(configInput = aa22PracticeConfig()) {
    const config = aa22NormalizePracticeConfig(configInput), subject = config.subject;
    const units = safeArray(config.unitsBySubject[subject]), queue = aa22PracticeQueue(config);
    if (!queue.length || queue.some(q => !units.includes(q.examUnit))) {
      alert('選択単元だけの演習問題を作成できませんでした。単元設定を確認してください。');
      return false;
    }
    const level = aa22PracticeLevel(config);
    state.ui.practiceConfig = config;
    API.startPractice(subject, config.length, level, queue);
    state.session.kind = 'unitPractice';
    state.session.practiceConfig = { subject, length: config.length, units: [...units], level, difficulty: Number(state.ui.subjectDifficulty) || 7 };
    state.session.practiceUnits = [...units];
    save(); render();
    return true;
  }

  function aa22StartEnglish(config) {
    if (config.scope !== 'full') {
      const queue = aa22ApplyLength(aa22EnglishUnitQueue(config), config.length);
      return aa22StartQuestionSession(config, queue);
    }
    aa22PrevHandleAction({ dataset: { action: 'start-reading-simulator' } }, null);
    const s = state.session;
    if (!s) return;
    if (config.length === 'mini') s.queue = s.queue.slice(0, 1);
    if (config.length === 'half') s.queue = s.queue.slice(0, 2);
    for (const item of s.queue) for (const q of safeArray(item.questions)) { q.points = Number(q.points || 1); q.testMode = true; }
    s.trackType = 'test'; s.courseLevel = config.level; s.testPending = {}; s.testFinalized = {};
    s.examConfig = { ...config }; s.limitMs = config.timeMin * 60000; s.officialModelYear = OFFICIAL_YEAR;
    s.officialSource = OFFICIAL_URL; s.nonOfficial = true; s.kind = 'aichiEnglish40';
    save(); render(); startTicker();
  }

  function aa22StartQuestionSession(config, queue) {
    if (!queue.length) {
      alert('選択した単元の問題を作成できませんでした。別の単元を選んでください。');
      return;
    }
    state.session = {
      id: uid('aichiR8'), active: true, mode: 'aichi-test', trackType: 'test', kind: 'aichiTestV22',
      subject: config.subject, courseLevel: config.level, examConfig: { ...config, units: [...config.units] }, queue, index: 0, subIndex: 0,
      answers: {}, feedback: null, testPending: {}, testFinalized: {}, startedAt: now(), accumulatedMs: 0,
      lastActiveAt: now(), itemStartedAt: now(), scrollY: 0, minimumDone: false, clockPaused: false,
      pausedAt: null, limitMs: config.timeMin * 60000, officialModelYear: OFFICIAL_YEAR,
      officialSource: OFFICIAL_URL, nonOfficial: true,
      blueprintExact: config.length === 'full' && config.scope === 'full'
    };
    state.stats.sessions++; state.route = 'study'; save(); render(); window.scrollTo(0, 0); startTicker();
  }

  function aa22StartExam(configInput = aa22Config()) {
    const config = aa22NormalizeConfig(configInput);
    state.ui.examConfig = config; state.ui.testSubject = config.subject; state.ui.testCourseLevel = config.level;
    if (config.subject === 'english') return aa22StartEnglish(config);
    let queue = aa22StructuredQueue(config.subject, config.level, config);
    queue = aa22ApplyLength(queue, config.length);
    return aa22StartQuestionSession(config, queue);
  }

  const aa22PrevSelectAnswer = selectAnswer;
  selectAnswer = function (idx) {
    const s = state.session, q = currentQ();
    if (s?.trackType !== 'test' || !q?.answerIndices) return aa22PrevSelectAnswer(idx);
    if (s.feedback || s.testFinalized?.[q.id]) return;
    const previous = safeArray(s.testPending?.[q.id]?.indices);
    let indices = previous.includes(idx) ? previous.filter(x => x !== idx) : [...previous, idx];
    if (indices.length > q.selectCount) indices = indices.slice(1);
    const answerSet = new Set(q.answerIndices), chosenSet = new Set(indices);
    const correct = indices.length === q.selectCount && q.answerIndices.every(x => chosenSet.has(x));
    const responseMs = Math.max(1, now() - s.itemStartedAt);
    const pending = { indices, correct, responseMs, pending: true };
    s.answers[q.id] = pending; s.testPending[q.id] = pending; save(); render();
  };

  function aa22Earned(q, pending) {
    const points = Number(q.points || 1);
    if (!q.answerIndices) return pending.correct ? points : 0;
    const selected = new Set(safeArray(pending.indices));
    const hits = q.answerIndices.filter(x => selected.has(x)).length;
    if (pending.correct) return points;
    if (q.partialPoints && safeArray(pending.indices).length === q.selectCount && hits > 0) return Math.min(Number(q.partialPoints), points);
    return 0;
  }
  function aa22FinalizeCurrent(advance = true) {
    const s = state.session, q = currentQ();
    if (!s || s.trackType !== 'test' || !q) return false;
    const pending = s.testPending?.[q.id];
    const selectedCount = q.answerIndices ? safeArray(pending?.indices).length : (pending ? 1 : 0);
    if (!pending || selectedCount !== Number(q.selectCount || 1)) {
      if (advance) alert(q.answerIndices ? q.selectCount + 'つ選んでください。' : '選択肢を選んでください。');
      return false;
    }
    s.testFinalized = s.testFinalized || {};
    if (!s.testFinalized[q.id]) {
      const answer = q.answerIndices ? [...pending.indices] : pending.idx;
      const earnedPoints = aa22Earned(q, pending);
      s.answers[q.id] = { ...pending, pending: false, earnedPoints };
      recordAttempt(q, answer, pending.correct, pending.responseMs, {
        errorType: pending.correct ? null : 'aichi_test_error', partial: earnedPoints / Number(q.points || 1), transfer: 1.12
      });
      const last = state.attempts[state.attempts.length - 1];
      if (last?.sessionId === s.id && last.itemId === q.id) last.earnedPoints = earnedPoints;
      s.testFinalized[q.id] = true; save();
    }
    if (advance) nextQuestion();
    return true;
  }

  const aa22PrevStartTicker = startTicker;
  startTicker = function () {
    const s = state.session;
    if (s?.trackType !== 'test') return aa22PrevStartTicker();
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const live = state.session;
      if (!live?.active || live.trackType !== 'test') return;
      const elapsed = (live.accumulatedMs || 0) + (live.clockPaused ? 0 : now() - live.lastActiveAt);
      const left = Math.max(0, Number(live.limitMs || 0) - elapsed);
      const el = document.querySelector('[data-timer]'); if (el) el.textContent = '残り ' + fmtTime(left);
      if (left <= 0) {
        aa22FinalizeCurrent(false); live.timedOut = true; finishSession();
      }
    }, 1000);
  };

  function aa22AllQuestions(s) {
    return safeArray(s?.queue).flatMap(item => item?.type === 'readingSet' ? safeArray(item.questions) : [item]).filter(Boolean);
  }
  const aa22PrevFinishSession = finishSession;
  finishSession = function () {
    const s = state.session;
    if (s?.trackType === 'test' && !s.v2TestRecorded) {
      const qs = aa22AllQuestions(s);
      const finalized = Object.keys(s.testFinalized || {}).filter(k => s.testFinalized[k]);
      const earned = qs.reduce((sum, q) => {
        const answer = s.answers?.[q.id];
        return sum + Number(answer?.earnedPoints ?? (answer?.correct ? Number(q.points || 1) : 0));
      }, 0);
      const maxPoints = qs.reduce((sum, q) => sum + Number(q.points || 1), 0);
      const correct = qs.filter(q => s.answers?.[q.id]?.correct).length;
      const elapsed = (s.accumulatedMs || 0) + (s.clockPaused ? 0 : now() - s.lastActiveAt);
      state.stats.aichiTests.push({
        at: now(), subject: s.subject, courseLevel: s.courseLevel, durationMs: Math.min(s.limitMs || elapsed, elapsed),
        answered: finalized.length, correct, totalQuestions: qs.length, earned, maxPoints,
        converted22: maxPoints ? Math.round(earned / maxPoints * 220) / 10 : 0,
        timedOut: !!s.timedOut, officialModelYear: OFFICIAL_YEAR, nonOfficial: true,
        examConfig: s.examConfig || null, blueprintExact: !!s.blueprintExact
      });
      state.stats.aichiTests = state.stats.aichiTests.slice(-100); s.v2TestRecorded = true; save();
    }
    return aa22PrevFinishSession();
  };

  function aa22CourseCards() {
    const config = aa22Config();
    return '<div class="courseGrid">' + Object.entries(LEVELS).map(([level, x]) =>
      '<button class="courseCard ' + (config.level === Number(level) ? 'selected' : '') + '" data-action="exam-level" data-level="' + level + '">' +
      '<span class="courseNo">LEVEL ' + level + '</span><h4>' + esc(x.name) + '</h4><p>' + esc(x.description) + '</p></button>'
    ).join('') + '</div>';
  }

  function aa22BlueprintRows(subject) {
    if (subject === 'japanese') return [
      ['大問一', '説明的文章', '8点'], ['大問二', '漢字・語句（画像と同型の3系統）', '3点'],
      ['大問三', '対話・資料統合', '7点'], ['大問四', '古文', '4点']
    ];
    if (subject === 'english') return [['筆記', '会話・図表・長文・案内統合（語彙支援OFF）', '40分モデル']];
    return BLUEPRINTS[subject].map(x => [x.name, x.title, x.count + '解答欄']);
  }

  function aa22VocabIndexHTML() {
    const db = window.AA_JA_VOCAB_10000;
    if (!db) return '';
    const q = String(state.ui.vocabIndexQuery || '').normalize('NFKC').toLowerCase().trim();
    const rows = q ? db.entries.filter(x => (x[0] + ' ' + x[1]).normalize('NFKC').toLowerCase().includes(q)).slice(0, 60) : db.entries.slice(0, 24);
    return '<div class="sp12"></div><section class="card"><div class="eyebrow">JAPANESE VOCABULARY INDEX</div><h3 class="h3">国語・教育基本語彙 10,000語索引</h3>' +
      '<p class="sub">中学校までの読解・教科学習に広く関係する語を検索できます。意味を自動生成した問題には使わず、意味問題は監修済み語彙だけから出題します。</p>' +
      '<div class="field"><label>語・読みを検索</label><input value="' + esc(state.ui.vocabIndexQuery || '') + '" data-action="vocab-index-search" placeholder="例：比較、ひかく"></div>' +
      '<div class="vocabIndexResults">' + rows.map(x => '<div class="vocabIndexRow"><strong>' + esc(x[0]) + '</strong><span>' + esc(x[1] || '—') + '</span><span>' + esc(x[2]) + '</span><span>配当群 ' + esc(x[3]) + '</span></div>').join('') + '</div>' +
      '<div class="tiny">国立国語研究所「教育基本語彙データベース 2009B」（CC BY 4.0）を基にしたアプリ内10,000語索引です。「文科省が1万語を必修指定」という意味ではありません。</div></section>';
  }

  function examHTML() {
    const c = aa22Config(), rows = aa22BlueprintRows(c.subject);
    const units = EXAM_UNITS[c.subject].filter(x => c.level === 3 || x[0] !== 'advanced');
    const selectedLabels = c.scope === 'full' ? ['全単元'] : c.units.map(unit => aa22UnitLabel(c.subject, unit));
    const blueprintHeading = c.subject === 'math' ? '数学・公式暗記の構成' : '令和8年度公開問題を基準にした構成';
    const blueprintNote = c.subject === 'math'
      ? '数学は公式・法則の暗記専用で、計算問題・文章題は出題しません。レベル1・2は中学公式のみ、レベル3では高校入試の時短・検算に使える高校公式も選べます。高校公式は中学校の正式な学習範囲外なので、記述や証明では中学知識からの説明もできるようにしてください。点数は非公式の22点換算です。'
      : '問題文・文章・資料はすべて本アプリ作成。公開問題の転載ではなく、最新の大問構成・解答形式・時間条件を学習用にモデル化しています。';
    return layout('<section class="card examHero"><div class="eyebrow">AICHI EXAM LAB</div><h2 class="h2">入試対策</h2><p class="sub">通常演習とは完全に分離。試験中は正誤・解説を出さず、終了後に配点・誤答理由・単元をまとめて確認します。</p></section>' +
      '<div class="sp12"></div><section class="card"><h3 class="h3">1. 難度</h3>' + aa22CourseCards() + '</section>' +
      '<div class="sp12"></div><section class="card"><h3 class="h3">2. 出題設定</h3><div class="examSettings">' +
      '<div class="field"><label>教科</label><select data-action="exam-subject">' + Object.entries(SUBJECTS).map(([id, name]) => '<option value="' + id + '" ' + (c.subject === id ? 'selected' : '') + '>' + name + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>出題範囲</label><select data-action="exam-scope"><option value="full" ' + (c.scope === 'full' ? 'selected' : '') + '>中1〜中3・全範囲</option><option value="current" ' + (c.scope === 'current' ? 'selected' : '') + '>現在の既習範囲</option><option value="custom" ' + (c.scope === 'custom' ? 'selected' : '') + '>選択単元のみ</option></select></div>' +
      '<div class="field"><label>試験時間</label><select data-action="exam-time">' + [10, 20, 30, 35, 40, 45, 50, 60].map(v => '<option value="' + v + '" ' + (c.timeMin === v ? 'selected' : '') + '>' + v + '分</option>').join('') + '</select></div>' +
      '<div class="field"><label>問題量</label><select data-action="exam-length"><option value="mini" ' + (c.length === 'mini' ? 'selected' : '') + '>ミニ（8問）</option><option value="half" ' + (c.length === 'half' ? 'selected' : '') + '>ハーフ</option><option value="full" ' + (c.length === 'full' ? 'selected' : '') + '>本番構成</option></select></div>' +
      '<div class="wide"><label class="strong">単元</label><div class="unitGrid">' + units.map(([id, label]) => '<label class="unitCheck"><input type="checkbox" data-action="exam-unit" value="' + id + '" ' + (c.units.includes(id) ? 'checked' : '') + '><span>' + esc(label) + '</span></label>').join('') + '</div><div class="tiny">単元を変更すると、出題範囲は自動で「選択単元のみ」になります。</div></div></div>' +
      '<div class="notice"><b>現在の出題対象：</b>' + selectedLabels.map(esc).join('・') + '</div>' +
      '<div class="sp12"></div><div class="actions"><button class="btn primary" data-action="start-exam-v22">この設定で試験開始</button></div>' +
      '<div class="tiny">「現在の既習範囲」「選択単元のみ」は、上のチェックだけを出題範囲として使います。単元別では本番の大問配列より選択単元を優先します。' + (c.subject === 'math' ? '数学は公式暗記だけです。レベル1・2は中学公式、旭丘レベルでは高校公式を追加します。高校公式は入試の時短・検算用で、中学校の正式範囲外です。' : '') + '</div></section>' +
      '<div class="sp12"></div><section class="card"><h3 class="h3">' + blueprintHeading + '</h3><div class="tableWrap"><table class="blueprintTable"><thead><tr><th>区分</th><th>処理する力</th><th>構成</th></tr></thead><tbody>' + rows.map(r => '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="tiny">' + blueprintNote + '</p><a class="btn ghost" href="' + OFFICIAL_URL + '" target="_blank" rel="noopener">愛知県公式問題ページ</a></section>' +
      (c.subject === 'japanese' ? aa22VocabIndexHTML() : ''));
  }

  const aa22PrevNav = nav;
  nav = function () {
    const tabs = [['home', '⌂', 'HOME'], ['mission', '◎', '今日'], ['subjects', '▦', '演習'], ['exam', '▣', '入試'], ['analytics', '▥', '分析']];
    return '<nav class="nav"><div class="navin">' + tabs.map(([r, i, t]) => '<button class="' + (state.route === r ? 'active' : '') + '" data-route="' + r + '"><b>' + i + '</b>' + t + '</button>').join('') + '</div></nav>';
  };

  const aa22PrevRender = render;
  render = function () {
    if (state.route !== 'exam') return aa22PrevRender();
    document.documentElement.dataset.theme = state.theme;
    document.getElementById('app').innerHTML = examHTML();
    pauseTicker();
  };

  function aa22PracticeSettingsHTML() {
    const c = aa22PracticeConfig(), units = EXAM_UNITS[c.subject], selected = c.unitsBySubject[c.subject];
    const labels = selected.map(unit => aa22UnitLabel(c.subject, unit));
    return '<section class="card practiceUnitCard"><div class="eyebrow">UNIT PRACTICE</div><h3 class="h3">単元を指定して演習</h3><p class="sub">教科内の単元を選び、選択した単元だけで即時解説つき演習を作ります。設定と実際の出題単元は開始時にも照合します。</p>' +
      '<div class="examSettings"><div class="field"><label>教科</label><select data-action="practice-subject">' + Object.entries(SUBJECTS).map(([id, name]) => '<option value="' + id + '" ' + (c.subject === id ? 'selected' : '') + '>' + name + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>問題量</label><select data-action="practice-length"><option value="micro" ' + (c.length === 'micro' ? 'selected' : '') + '>短時間（3問）</option><option value="standard" ' + (c.length === 'standard' ? 'selected' : '') + '>標準（8問まで）</option><option value="deep" ' + (c.length === 'deep' ? 'selected' : '') + '>本格（15問まで）</option></select></div>' +
      '<div class="wide"><label class="strong">単元</label><div class="unitGrid">' + units.map(([id, label]) => '<label class="unitCheck"><input type="checkbox" data-action="practice-unit" value="' + id + '" ' + (selected.includes(id) ? 'checked' : '') + '><span>' + esc(label) + '</span></label>').join('') + '</div></div></div>' +
      '<div class="notice"><b>現在の演習対象：</b>' + labels.map(esc).join('・') + '</div><div class="sp12"></div><button class="btn primary" data-action="start-unit-practice">この単元で演習開始</button>' +
      '<div class="tiny">数学の「高校公式」を選ぶと、その単元は旭丘レベルの公式暗記として出題します。数学はここでも公式・法則の暗記だけです。</div></section>';
  }

  const aa22PrevSubjectsHTML = subjectsHTML;
  subjectsHTML = function () {
    let html = aa22PrevSubjectsHTML();
    html = html.replace(/<div class="sp12"><\/div><section class="card hero"><div class="eyebrow">AICHI EXAM COURSE[\s\S]*?<\/section>(?=<\/main>)/, '');
    html = html.replace('<button class="btn ghost" data-route="timeline">歴史年表</button>', '<a class="btn ghost" href="./chronologia.html">歴史年表</a>');
    html = html.replace('<button class="btn primary" data-action="start-reading-simulator">愛知県英語・筆記40分</button>', '<button class="btn primary" data-action="start-reading-simulator">愛知県英語・筆記40分</button><button class="btn ghost" data-action="start-graph-reading">図表＋レポート類題</button>');
    html = html.replace('代数・関数・図形・確率', '中学公式＋高校受験で使える高校公式');
    html = html.replace('>数学演習</button>', '>数学公式暗記</button><button class="btn ghost" data-action="start-advanced-math-formulas">高校公式暗記</button>');
    html = html.replace('<div class="sp12"></div><section class="grid g2">', '<div class="sp12"></div>' + aa22PracticeSettingsHTML() + '<div class="sp12"></div><section class="grid g2">');
    const launch = '<div class="sp12"></div><section class="card"><div class="chronologiaLaunch"><div><div class="eyebrow">SEPARATE EXAM MODE</div><h3 class="h3">入試対策は独立ページへ</h3><p class="sub">演習の即時解説と、本番型テストの採点記録を混ぜません。</p></div><button class="btn primary" data-route="exam">入試対策を開く</button></div></section>' +
      '<div class="sp12"></div><section class="card"><div class="chronologiaLaunch"><div><div class="eyebrow">CHRONOLOGIA 6.1</div><h3 class="h3">歴史年表・同時代史</h3><p class="sub">385件の統合年表、クイズ、並べ替え、弱点復習、参考書型解説を別画面で使います。</p></div><a class="btn gold" href="./chronologia.html">年表を開く</a></div></section>';
    return html.replace(/<\/main>/, launch + '</main>');
  };

  const aa22PrevStudyHTML = studyHTML;
  studyHTML = function () {
    let html = aa22PrevStudyHTML(), s = state.session, q = currentQ();
    if (s?.active && s.trackType === 'practice' && s.practiceConfig && q) {
      const unitLabel = q.examUnit ? aa22UnitLabel(s.subject, q.examUnit) : '';
      const selectedLabels = safeArray(s.practiceUnits).map(unit => aa22UnitLabel(s.subject, unit));
      const meta = '<div class="examQuestionMeta"><span class="chip">単元演習</span>' + (unitLabel ? '<span class="chip">単元：' + esc(unitLabel) + '</span>' : '') + '<span class="chip">設定：' + selectedLabels.map(esc).join('・') + '</span></div>';
      const passage = q.aichiPassage ? '<details class="examPassage" open><summary>本文・資料</summary><div class="examPassageText">' + esc(q.aichiPassage) + '</div></details>' : '';
      return html.replace('<section class="card"><div class="qstem">', '<section class="card">' + meta + passage + '<div class="qstem">');
    }
    if (!s?.active || s.trackType !== 'test' || !q) return html;
    const selected = q.answerIndices ? safeArray(s.testPending?.[q.id]?.indices) : (s.testPending?.[q.id] ? [s.testPending[q.id].idx] : []);
    const unitLabel = q.examUnit ? aa22UnitLabel(s.subject, q.examUnit) : '';
    const meta = '<div class="examQuestionMeta"><span class="chip">' + esc(q.bigQuestion || '入試問題') + '</span><span class="chip">' + esc(q.bigTitle || '') + '</span>' + (unitLabel ? '<span class="chip">単元：' + esc(unitLabel) + '</span>' : '') + '<span class="chip">' + esc(q.officialSmallLabel || '') + '</span><span class="chip">' + Number(q.points || 1) + '点</span></div>' +
      (q.answerIndices ? '<div class="multiGuide">' + q.selectCount + 'つ選択（選択中 ' + selected.length + '/' + q.selectCount + '）' + (q.partialPoints ? '・部分点あり' : '') + '</div>' : '');
    const passage = q.aichiPassage ? '<details class="examPassage" open><summary>本文・資料</summary><div class="examPassageText">' + esc(q.aichiPassage) + '</div></details>' : '';
    html = html.replace('<section class="card"><div class="qstem">', '<section class="card">' + meta + passage + '<div class="qstem">');
    for (const idx of selected) {
      const re = new RegExp('class="choice ([^"]*)" data-action="answer" data-index="' + idx + '"');
      html = html.replace(re, (all, cls) => 'class="choice ' + cls.replace(/\s*testSelected/g, '') + ' testSelected" data-action="answer" data-index="' + idx + '"');
    }
    const ready = selected.length === Number(q.selectCount || 1);
    html = html.replace(/<button class="btn primary" data-action="test-next"(?: disabled)?>/, '<button class="btn primary" data-action="test-next" ' + (ready ? '' : 'disabled') + '>');
    return html;
  };

  function aa22ReviewHTML(s) {
    const rows = aa22AllQuestions(s).map((q, index) => {
      const a = s.answers?.[q.id], selected = q.answerIndices ? safeArray(a?.indices) : (a ? [a.idx] : []);
      const correctIndices = q.answerIndices || [q.answerIndex];
      const earned = Number(a?.earnedPoints || 0), points = Number(q.points || 1);
      const status = !a ? '<span class="dangerText">未回答</span>' : a.correct ? '<span class="goodText">正解</span>' : earned > 0 ? '<span class="partialText">部分点</span>' : '<span class="dangerText">不正解</span>';
      const choiceRows = q.choices.map((c, i) => '<span class="reviewChoice ' + (correctIndices.includes(i) ? 'correct' : selected.includes(i) ? 'wrong' : '') + '">' + String.fromCharCode(65 + i) + ' ' + esc(c.text) + '</span>').join('');
      return '<div class="testReview"><div class="strong">' + esc(q.bigQuestion || '') + ' ' + esc(q.officialSmallLabel || ('問' + (index + 1))) + '　' + status + '　' + earned + '/' + points + '点</div>' +
        '<div class="tiny">' + esc(q.stem).replace(/\n/g, ' ') + '</div><div class="reviewChoices">' + choiceRows + '</div>' +
        '<div class="evidence"><b>解説：</b> ' + esc(q.explanation || q.choices[q.answerIndex]?.reason || '根拠と条件を確認します。') + '</div></div>';
    }).join('');
    return '<div class="sp12"></div><section class="card"><div class="eyebrow">AFTER TEST REVIEW 2.2</div><h3 class="h3">大問別・全問アフターチェック</h3><p class="sub">緑が正答、赤が自分の誤選択です。複数選択は部分点も表示します。</p>' + rows + '</section>';
  }

  const aa22PrevResultHTML = resultHTML;
  resultHTML = function () {
    let html = aa22PrevResultHTML(), s = state.session;
    if (s?.trackType !== 'test') return html;
    html = html.replace(/<div class="sp12"><\/div><section class="card"><div class="eyebrow">AFTER TEST REVIEW[\s\S]*?<\/section>(?=<\/main>)/, '');
    return html.replace(/<\/main>/, aa22ReviewHTML(s) + '</main>');
  };

  const aa22PrevHandleAction = handleAction;
  handleAction = function (el, event) {
    const action = el.dataset.action;
    if (action === 'exam-level' || action === 'select-course') {
      state.ui.examConfig = aa22NormalizeConfig({ ...aa22Config(), level: Number(el.dataset.level) }); save(); render(); return;
    }
    if (action === 'start-graph-reading') return aa22StartGraphPractice();
    if (action === 'start-advanced-math-formulas') return aa22StartAdvancedMathFormulas();
    if (action === 'start-unit-practice') return aa22StartUnitPractice(aa22PracticeConfig());
    if (action === 'another-set' && state.session?.practiceConfig) {
      const previous = state.session.practiceConfig, current = aa22PracticeConfig();
      return aa22StartUnitPractice({ ...current, subject: previous.subject, length: previous.length,
        unitsBySubject: { ...current.unitsBySubject, [previous.subject]: [...previous.units] } });
    }
    if (action === 'start-exam-v22' || action === 'start-aichi-test') return aa22StartExam(aa22Config());
    if (action === 'test-next') return aa22FinalizeCurrent(true);
    if (action === 'repeat-aichi-test') return aa22StartExam(state.session?.examConfig || aa22Config());
    return aa22PrevHandleAction(el, event);
  };

  document.addEventListener('change', event => {
    const el = event.target.closest('[data-action^="practice-"]'); if (!el) return;
    let c = aa22PracticeConfig();
    if (el.dataset.action === 'practice-subject') c = { ...c, subject: el.value };
    if (el.dataset.action === 'practice-length') c = { ...c, length: el.value };
    if (el.dataset.action === 'practice-unit') {
      const checked = [...document.querySelectorAll('[data-action="practice-unit"]:checked')].map(x => x.value);
      if (!checked.length) {
        el.checked = true;
        alert('演習する単元を1つ以上選んでください。');
        return;
      }
      c = { ...c, unitsBySubject: { ...c.unitsBySubject, [c.subject]: checked } };
    }
    state.ui.practiceConfig = aa22NormalizePracticeConfig(c); save(); render();
  });

  document.addEventListener('change', event => {
    const el = event.target.closest('[data-action^="exam-"]'); if (!el) return;
    let c = aa22Config();
    if (el.dataset.action === 'exam-subject') c = aa22DefaultConfig(el.value);
    if (el.dataset.action === 'exam-scope') {
      c = { ...c, scope: el.value };
      if (el.value === 'full') c.units = EXAM_UNITS[c.subject].map(x => x[0]).filter(x => c.level === 3 || x !== 'advanced');
    }
    if (el.dataset.action === 'exam-time') c = { ...c, timeMin: Number(el.value) };
    if (el.dataset.action === 'exam-length') c = { ...c, length: el.value };
    if (el.dataset.action === 'exam-unit') {
      const checked = [...document.querySelectorAll('[data-action="exam-unit"]:checked')].map(x => x.value);
      if (!checked.length) {
        el.checked = true;
        alert('出題する単元を1つ以上選んでください。');
        return;
      }
      c = { ...c, scope: 'custom', units: checked };
    }
    state.ui.examConfig = aa22NormalizeConfig(c); save(); render();
  });
  document.addEventListener('input', event => {
    const el = event.target.closest('[data-action="vocab-index-search"]'); if (!el) return;
    state.ui.vocabIndexQuery = el.value.slice(0, 80); save(); clearTimeout(window.__aa22VocabTimer);
    window.__aa22VocabTimer = setTimeout(render, 120);
  });

  const aa22PrevQaRun = qaRun;
  qaRun = function () {
    aa22PrevQaRun();
    const report = state.qa.report || [], add = (name, ok, detail) => report.push({ name, ok, detail });
    try {
      const ja = aa22JapaneseExam(3), jaPoints = ja.reduce((n, q) => n + q.points, 0);
      add('R8国語4大問・22点', ja.length === 21 && jaPoints === 22 && new Set(ja.map(q => q.bigQuestion)).size === 4, ja.length + '解答項目 / ' + jaPoints + '点');
      add('R8国語 大問二3系統', ja.filter(q => q.bigQuestion === '大問二').length === 4 && ja.some(q => q.code === 'II-2') && ja.some(q => q.code === 'II-3'), '漢字2小問＋同字関係＋文脈語句');
      add('複数選択・部分点', ja.filter(q => q.answerIndices).length >= 3 && ja.filter(q => q.partialPoints).length >= 2, '2つ選択と部分点を試験中非表示で処理');
      for (const subject of ['math', 'science', 'social']) {
        const cfg = aa22DefaultConfig(subject); cfg.level = 3;
        const qs = aa22StructuredQueue(subject, 3, cfg), points = qs.reduce((n, q) => n + q.points, 0);
        const expected = subject === 'math' ? 15 : 20;
        add('R8' + SUBJECTS[subject] + '構成', qs.length === expected && points === 22, qs.length + '解答項目 / ' + points + '点 / ' + new Set(qs.map(q => q.bigQuestion)).size + '大問');
      }
      const mathCfg = aa22DefaultConfig('math'); mathCfg.level = 3;
      const mathQs = aa22StructuredQueue('math', 3, mathCfg);
      const formulaAreas = new Set(API.mathFormulaAreas);
      add('数学は公式暗記だけ', mathQs.length === 15 && mathQs.every(q => formulaAreas.has(q.source?.area) && q.stem.includes('公式・法則') && q.skills.every(s => s.id === 'math.formula.recall')),
        '計算・文章題なし／中学公式＋レベル3高校公式');
      const l1Math = aa22StructuredQueue('math', 1, aa22DefaultConfig('math'));
      const advancedMath = aa22AdvancedMathQueue(15);
      add('高校公式の単元反映', EXAM_UNITS.math.some(x => x[0] === 'advanced') && !l1Math.some(q => q.source?.area === 'advanced') && mathQs.some(q => q.source?.area === 'advanced') && advancedMath.every(q => q.source?.area === 'advanced'),
        'レベル1・2は非表示／旭丘レベル・専用暗記で出題');
      for (const [subject, unit] of [['english', 'grammar'], ['japanese', 'kanbun'], ['math', 'geometry'], ['science', 'experiment'], ['social', 'data']]) {
        const cfg = aa22NormalizeConfig({ subject, level: 3, scope: 'custom', units: [unit], timeMin: 20, length: 'mini' });
        const qs = aa22StructuredQueue(subject, 3, cfg);
        add(SUBJECTS[subject] + '単元指定 ' + aa22UnitLabel(subject, unit), qs.length > 0 && qs.every(q => q.examUnit === unit), qs.length + '問 / ' + [...new Set(qs.map(q => q.examUnit))].join(','));
      }
      const practiceBase = aa22DefaultPracticeConfig('social');
      practiceBase.unitsBySubject.social = ['history'];
      const socialPractice = aa22PracticeQueue(practiceBase);
      add('演習の単元設定を出題へ反映', socialPractice.length > 0 && socialPractice.every(q => q.examUnit === 'history' && q.testMode === false), socialPractice.length + '問 / ' + [...new Set(socialPractice.map(q => q.examUnit))].join(','));
      const previousDifficulty = state.ui.subjectDifficulty;
      state.ui.subjectDifficulty = 11;
      const advancedPracticeConfig = aa22DefaultPracticeConfig('math');
      advancedPracticeConfig.unitsBySubject.math = ['advanced'];
      const advancedPractice = aa22PracticeQueue(advancedPracticeConfig);
      state.ui.subjectDifficulty = previousDifficulty;
      add('演習・高校公式単元', advancedPractice.length > 0 && advancedPractice.every(q => q.examUnit === 'advanced' && q.source?.area === 'advanced'), advancedPractice.length + '問');
      const modern = aa22JapaneseExam(3).filter(q => q.examUnit === 'modern'), literary = aa22JapaneseLiterary(3);
      const readingQuality = [...modern, ...literary].every(q => q.evidence && q.reasoningTag && q.choices.filter(c => !c.ok).every(c => c.error));
      add('国語文章問題の根拠精度', modern.length === 7 && literary.length === 4 && modern[0].aichiPassage.length >= 650 && literary[0].aichiPassage.length >= 500 && readingQuality,
        '説明文' + modern.length + '問・文学文' + literary.length + '問／全問に根拠・思考タグ・誤答型');
      const vocab = window.AA_JA_VOCAB_10000;
      add('国語1万語索引', vocab?.count === 10000 && vocab.entries.length === 10000 && new Set(vocab.entries.map(x => x[0] + '|' + x[1])).size === 10000, '教育基本語彙DB由来 ' + (vocab?.entries.length || 0) + '件');
      const graph = aa22GraphReadingSet(11, 'exam');
      add('英語2資料レポート類題', graph.questions.length === 6 && graph.questions.every(q => q.choices?.length === 4 && q.choices.filter(c => c.ok).length === 1) && graph.questions.some(q => q.code === 'EN-T5'), graph.questions.length + '問 / 比率・時期・推論・語順');
      add('学習履歴キー固定', STORE_KEY === 'asahi_learning_os_v1' && SCHEMA_VERSION === 4, STORE_KEY + ' / schema ' + SCHEMA_VERSION);
      add('独立入試ルート', typeof examHTML === 'function' && aa22Config().timeMin >= 5, '教科・3難度・単元・範囲・時間・問題量');
    } catch (error) { add('v2.2追加検査', false, error.message); }
    state.qa.report = report; state.qa.lastRun = now(); state.ui.modal = 'qa'; save(); render();
  };

  globalThis.AA_V22_TEST_API = {
    units: EXAM_UNITS, japaneseExam: aa22JapaneseExam, structuredQueue: aa22StructuredQueue,
    normalizeConfig: aa22NormalizeConfig, startExam: aa22StartExam, allowedAreas: aa22AllowedAreas,
    vocabIndex: window.AA_JA_VOCAB_10000, graphReadingSet: aa22GraphReadingSet,
    advancedMathQueue: aa22AdvancedMathQueue, normalizePracticeConfig: aa22NormalizePracticeConfig,
    practiceQueue: aa22PracticeQueue, startUnitPractice: aa22StartUnitPractice,
    japaneseLiterary: aa22JapaneseLiterary
  };

  save(); render();
})();
