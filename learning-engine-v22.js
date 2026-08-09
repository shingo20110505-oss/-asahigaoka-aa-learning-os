/* 旭丘AA Learning OS v2.2.1
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
      ['number', '数と計算'], ['algebra', '式・因数分解'], ['equation', '方程式'],
      ['function', '関数'], ['geometry', '平面・空間図形'], ['probability', '確率'],
      ['statistics', 'データ活用'], ['advanced', '高校内容の検算・短縮（L3のみ）']
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
      geometry: ['geometry', 'measure'], probability: ['probability'], statistics: ['statistics'],
      advanced: ['advanced', 'strategy']
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

  const aa22PrevDefaultState = defaultState;
  defaultState = function () {
    const s = aa22PrevDefaultState();
    s.ui.examConfig = aa22DefaultConfig('japanese');
    s.ui.vocabIndexQuery = '';
    return s;
  };
  const aa22PrevMigrate = migrate;
  migrate = function (input) {
    const s = aa22PrevMigrate(input);
    s.ui.examConfig = aa22NormalizeConfig(s.ui.examConfig || aa22DefaultConfig(s.ui.testSubject));
    s.ui.vocabIndexQuery = String(s.ui.vocabIndexQuery || '').slice(0, 80);
    return s;
  };
  state.ui.examConfig = aa22NormalizeConfig(state.ui.examConfig || aa22DefaultConfig(state.ui.testSubject));
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
      skills: spec.skills || [{ id: spec.subject === 'english' ? 'en.read.inference' : spec.subject === 'japanese' ? 'ja.aichi.integration' : spec.subject === 'math' ? 'math.aichi.multistep' : spec.subject === 'science' ? 'sci.aichi.integration' : 'soc.aichi.integration', role: 'primary' }],
      expectedMs: Number(spec.expectedMs || 65000), context: 'aichi-r8-' + spec.subject,
      format: spec.format || 'aichi-mark', testMode: true, courseLevel: Number(spec.level || 1),
      bigQuestion: spec.bigQuestion, bigTitle: spec.bigTitle, officialSmallLabel: spec.officialSmallLabel,
      examUnit: spec.unit || spec.source?.area || 'integration',
      aichiPassage: spec.passage || '', source: spec.source || { area: spec.unit || 'integration', difficulty: Number(spec.level || 1) * 3 }
    };
  }

  const JA_PASSAGE_I = `【文章】\n市立図書館では、貸出冊数を増やすため、入口近くに「今週よく読まれている本」を並べた。すると、その棚の本は以前より多く借りられた。担当者は展示が成功したと考えたが、調査係の生徒は、貸出冊数だけでは利用者が新しい分野の本に出会ったかどうかは分からないと指摘した。\nそこで、生徒たちは展示前後の貸出冊数に加え、借りた人への短い質問も行った。「もともと借りる予定だったか」「展示を見て初めて知ったか」を尋ねると、冊数の増加の一部は、もともと人気のある本が目立つ場所へ移ったためだと分かった。一方、テーマを一週間ごとに変えた棚では、普段読まない分野を選んだ人が増えていた。\nこの結果から、生徒たちは、施策を評価するときには、目標を一つの数字だけで置き換えない方がよいとまとめた。数字は変化を比べるために必要だが、その数字が何を表し、何を表していないかを確かめる別の資料も必要だからである。`;
  const JA_PASSAGE_III = `【対話と資料】\n文化祭実行委員会は、校内案内を改善するため、二つの方法を試した。A週は廊下の矢印表示を増やし、B週は案内係が声をかける場所を増やした。\n\n〔調査結果〕\nA週：目的地まで迷わなかった人 78％／案内を「自分で確かめやすい」と答えた人 84％\nB週：目的地まで迷わなかった人 86％／案内を「自分で確かめやすい」と答えた人 61％\n\n美咲「迷わなかった割合だけなら、B週の方法がよさそうだね。」\n陸「でも、混雑する時間は案内係が足りなくなる。A週の『自分で確かめやすい』という結果も無視できないよ。」\n美咲「では、入口と分岐点には矢印を置き、特に迷いやすい場所だけ案内係を配置したらどうかな。」\n陸「二つの方法を組み合わせた後、同じ質問で再調査すれば、改善したか比べられるね。」`;
  const JA_PASSAGE_IV = `【古文・本アプリ作成】\nある人、朝ごとに庭の梅を見て、「まだ咲かず」と言ひけり。友来たりて、「花のみ待たば、日々は同じに見ゆべし。枝の色、鳥の声にも春は近づく」と言ふ。その人、翌朝より小さき変はりを記しければ、花の咲く前より春を知りぬ。\n\n〔注〕見ゆべし＝見えるだろう。変はり＝変化。`;

  function aa22JapaneseExam(level) {
    const shared = { subject: 'japanese', level };
    return [
      aa22Question({ ...shared, code: 'I-1', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問1', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '「その数字が何を表し、何を表していないか」とある。ここでいう「その数字」として最も適切なものを選びなさい。', choices: ['展示前後の貸出冊数', '図書館にある本の総数', '質問に答えた生徒の学年', '一週間の日数'], answer: 0, explanation: '直前の「目標を一つの数字だけで置き換えない」「数字は変化を比べるために必要」を受け、貸出冊数を指します。' }),
      aa22Question({ ...shared, code: 'I-2', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問2', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '生徒たちが、貸出冊数に加えて利用者への質問を行った目的として最も適切なものを選びなさい。', choices: ['人気のある本を棚から外すため', '貸出冊数が増えた理由を区別するため', '図書館の開館時間を延ばすため', '利用者の名前を記録するため'], answer: 1, explanation: '同じ冊数増加でも、もともとの予定か、展示による新しい出会いかを区別するためです。' }),
      aa22Question({ ...shared, code: 'I-3', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問3', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '本文全体の論の進め方として最も適切なものを選びなさい。', choices: ['結論を示し、無関係な例を列挙している', '一つの結果を疑い、別の資料で確かめて評価を修正している', '二人の人物の性格を対比している', '昔の制度を年代順に説明している'], answer: 1, explanation: '貸出冊数の増加をそのまま成功とせず、質問調査を加えて解釈を修正する構成です。' }),
      aa22Question({ ...shared, code: 'I-4', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問4（二つ選択）', passage: JA_PASSAGE_I, points: 2, partialPoints: 1, unit: 'modern', stem: '本文の内容と一致するものを二つ選びなさい。', choices: ['入口の人気本は、展示後に貸出冊数が減った。', 'テーマを変える棚では、普段読まない分野を選ぶ人が増えた。', '生徒たちは、数字による比較は一切不要だと結論づけた。', '施策の評価には、数字の意味を確かめる別資料も役立つ。', '利用者への質問は展示より前にだけ行われた。'], answers: [1, 3], explanation: 'テーマ棚の効果と、数字を補う資料の必要性が本文に述べられています。' }),
      aa22Question({ ...shared, code: 'I-5a', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5①', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '本文の要約の空欄に入る語句として最も適切なものを選びなさい。\n「展示の効果を判断するには、貸出冊数という【　】だけでなく、その増加の理由を示す資料が必要である。」', choices: ['印象', '単一の指標', '規則', '予算'], answer: 1, explanation: '本文は「目標を一つの数字だけで置き換えない」と述べています。' }),
      aa22Question({ ...shared, code: 'I-5b', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5②', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '「一方」が示す関係として最も適切なものを選びなさい。', choices: ['原因と結果', '同じ内容の反復', '人気本の移動とテーマ棚の異なる結果の対比', '時間の順序だけ'], answer: 2, explanation: '人気本の移動による増加と、テーマ棚による新分野との出会いを対比しています。' }),
      aa22Question({ ...shared, code: 'I-5c', bigQuestion: '大問一', bigTitle: '説明的文章', officialSmallLabel: '問5③', passage: JA_PASSAGE_I, points: 1, unit: 'modern', stem: '筆者の考えに最も近いものを選びなさい。', choices: ['測定値は多いほど必ず正しい。', '数字は不要で、感想だけで評価すべきだ。', '数字の利点と限界を理解し、複数の資料で評価すべきだ。', '人気のある本だけを展示すべきだ。'], answer: 2, explanation: '数字を否定せず、その表す範囲を別資料で確かめることが結論です。' }),

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
          ? `【条件】${row.prompt}\n必要なら途中式・図・表を書き、条件を満たす法則または方針を選ぶ。`
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

  const JA_LITERARY_PASSAGE = `【文学的文章・本アプリ作成】\n放課後、真帆は返却されたノートを机に置いたまま、窓の外を見ていた。発表の原稿には直すところがいくつもあった。そこへ悠斗が来て、赤い印のついた一文を指した。\n「ここ、だめって意味じゃなくて、いちばん伝えたいことが見えそうだから印をつけたんだと思う。」\n真帆はもう一度その一文を読んだ。直す場所が増えたと思っていた紙が、急に次へ進むための地図のように見えた。真帆は鉛筆を持ち、最初の一行を消した。`;
  function aa22JapaneseLiterary(level) {
    const shared = { subject: 'japanese', level, unit: 'literary', bigQuestion: '単元別', bigTitle: '文学的文章', passage: JA_LITERARY_PASSAGE };
    return [
      aa22Question({ ...shared, code: 'LIT-1', officialSmallLabel: '問1', stem: '真帆が初めに窓の外を見ていた理由として最も適切なものを選びなさい。', choices: ['発表が終わって安心していたから', '直す箇所の多さに気持ちが止まっていたから', '悠斗を待ち伏せしていたから', 'ノートをなくしたから'], answer: 1, explanation: '直すところがいくつもある原稿を前に、すぐ作業へ向かえない心情が描かれています。' }),
      aa22Question({ ...shared, code: 'LIT-2', officialSmallLabel: '問2', stem: '悠斗の発言によって真帆の受け止め方はどのように変わったか。', choices: ['赤い印を失敗の数だと考えた。', '原稿を捨てる理由だと考えた。', '修正を前進の手掛かりだと考えた。', '発表を他人に任せようと考えた。'], answer: 2, explanation: '「次へ進むための地図」という比喩が、修正を手掛かりとして捉え直したことを示します。' }),
      aa22Question({ ...shared, code: 'LIT-3', officialSmallLabel: '問3', stem: '「地図のように見えた」という表現の効果として最も適切なものを選びなさい。', choices: ['教室の位置を具体的に説明する。', '直す順序と方向が見えた心情を表す。', '紙が本物の地図に変わったことを表す。', '窓の外の景色を強調する。'], answer: 1, explanation: '比喩により、否定的だった赤字が改善の方向を示すものへ変化した心情を表します。' }),
      aa22Question({ ...shared, code: 'LIT-4', officialSmallLabel: '問4', stem: '結末の「最初の一行を消した」から読み取れる真帆の様子を選びなさい。', choices: ['修正に取りかかった。', '発表をあきらめた。', '悠斗に怒った。', 'ノートを返却した。'], answer: 0, explanation: '見方を変えた真帆が、具体的な修正行動を始めた結末です。' })
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
  const EN_DATA = `【案内と表】\nLibrary workshops\nA: Book Talk / Tue 16:00 / 40 minutes / Room 2\nB: Research Skills / Wed 16:30 / 60 minutes / Room 1\nC: Local History / Fri 15:50 / 50 minutes / Room 3\nStudents must arrive ten minutes before the starting time.`;
  function aa22EnglishFixedUnit(unit, level) {
    const shared = { subject: 'english', level, unit, bigQuestion: '単元別', bigTitle: aa22UnitLabel('english', unit), points: 1 };
    if (unit === 'dialogue') return [
      aa22Question({ ...shared, code: 'EN-D1', officialSmallLabel: '問1', passage: EN_DIALOGUE, stem: 'Why can Leo not come at four?', choices: ['He has piano practice.', 'He must write a new report.', 'The club room is closed.', 'He has a science test.'], answer: 0, explanation: 'Leo says, “I have piano practice until four fifteen.”' }),
      aa22Question({ ...shared, code: 'EN-D2', officialSmallLabel: '問2', passage: EN_DIALOGUE, stem: 'What will the club do first?', choices: ['Start the experiment.', 'Practice the piano.', 'Listen to the report.', 'Clean the room.'], answer: 2, explanation: 'Mika says that they will begin with the report.' }),
      aa22Question({ ...shared, code: 'EN-D3', officialSmallLabel: '問3', passage: EN_DIALOGUE, stem: 'Which activity can Leo join?', choices: ['The report at four.', 'The experiment at four thirty.', 'Piano practice at four thirty.', 'A meeting tomorrow.'], answer: 1, explanation: 'His practice ends at 4:15, so he can join the 4:30 experiment.' }),
      aa22Question({ ...shared, code: 'EN-D4', officialSmallLabel: '問4', passage: EN_DIALOGUE, stem: 'What will Leo do before piano practice?', choices: ['Send his report.', 'Do the experiment.', 'Meet Mika at four.', 'Cancel the club meeting.'], answer: 0, explanation: 'Leo says, “I will send my report before practice.”' })
    ];
    if (unit === 'data') return [
      aa22Question({ ...shared, code: 'EN-T1', officialSmallLabel: '問1', passage: EN_DATA, stem: 'Which workshop is held on Wednesday?', choices: ['Book Talk', 'Research Skills', 'Local History', 'Science Report'], answer: 1, explanation: 'The table lists Research Skills on Wednesday.' }),
      aa22Question({ ...shared, code: 'EN-T2', officialSmallLabel: '問2', passage: EN_DATA, stem: 'When should a student arrive for Book Talk?', choices: ['15:40', '15:50', '16:00', '16:10'], answer: 1, explanation: 'Students arrive ten minutes before the 16:00 start.' }),
      aa22Question({ ...shared, code: 'EN-T3', officialSmallLabel: '問3', passage: EN_DATA, stem: 'Which workshop is the longest?', choices: ['Book Talk', 'Research Skills', 'Local History', 'They are all the same.'], answer: 1, explanation: 'Research Skills lasts 60 minutes, longer than 40 or 50 minutes.' }),
      aa22Question({ ...shared, code: 'EN-T4', officialSmallLabel: '問4', passage: EN_DATA, stem: 'Where is Local History held?', choices: ['Room 1', 'Room 2', 'Room 3', 'The library entrance'], answer: 2, explanation: 'The Local History row shows Room 3.' })
    ];
    if (unit === 'grammar') return [
      aa22Question({ ...shared, code: 'EN-G1', officialSmallLabel: '問1', stem: 'If I _____ enough time, I will help you.', choices: ['have', 'had', 'will have', 'having'], answer: 0, explanation: 'A future condition uses the present tense in the if-clause.' }),
      aa22Question({ ...shared, code: 'EN-G2', officialSmallLabel: '問2', stem: 'This book _____ by many students last year.', choices: ['reads', 'read', 'was read', 'is reading'], answer: 2, explanation: 'The passive in the past is “was read.”' }),
      aa22Question({ ...shared, code: 'EN-G3', officialSmallLabel: '問3', stem: 'I _____ in Nagoya for three years.', choices: ['live', 'lived now', 'have lived', 'am live'], answer: 2, explanation: 'A continuing situation with “for three years” uses the present perfect.' }),
      aa22Question({ ...shared, code: 'EN-G4', officialSmallLabel: '問4', stem: 'Choose the correct sentence.', choices: ['Do you know where is the station?', 'Do you know where the station is?', 'Do you know is where the station?', 'Do you where know the station is?'], answer: 1, explanation: 'An indirect question uses statement word order: where the station is.' })
    ];
    return [];
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
      { name: '大問一', title: '短問集合（計算・数と式・関数・図形）', count: 10 },
      { name: '大問二', title: '資料活用・確率・関数', count: 2 },
      { name: '大問三', title: '平面図形・空間図形', count: 3 }
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
        const q = aa22BankQuestion(subject, level, allowed, globalIndex, big, '問' + (i + 1), points);
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
      '<span class="courseNo">LEVEL ' + level + '</span><h4>' + esc(x.name) + '</h4><p>' + esc(x.description) + (Number(level) === 3 ? '。数学では入試で有効な高校公式を検算・短縮手段として限定使用。' : '') + '</p></button>'
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
      '<div class="tiny">「現在の既習範囲」「選択単元のみ」は、上のチェックだけを出題範囲として使います。単元別では本番の大問配列より選択単元を優先します。LEVEL 3の高校内容は数学の解法短縮・検算に限定し、高校入試の出題範囲そのものとは区別します。</div></section>' +
      '<div class="sp12"></div><section class="card"><h3 class="h3">令和8年度公開問題を基準にした構成</h3><div class="tableWrap"><table class="blueprintTable"><thead><tr><th>区分</th><th>処理する力</th><th>構成</th></tr></thead><tbody>' + rows.map(r => '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="tiny">問題文・文章・資料はすべて本アプリ作成。公開問題の転載ではなく、最新の大問構成・解答形式・時間条件を学習用にモデル化しています。</p><a class="btn ghost" href="' + OFFICIAL_URL + '" target="_blank" rel="noopener">愛知県公式問題ページ</a></section>' +
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

  const aa22PrevSubjectsHTML = subjectsHTML;
  subjectsHTML = function () {
    let html = aa22PrevSubjectsHTML();
    html = html.replace(/<div class="sp12"><\/div><section class="card hero"><div class="eyebrow">AICHI EXAM COURSE[\s\S]*?<\/section>(?=<\/main>)/, '');
    html = html.replace('<button class="btn ghost" data-route="timeline">歴史年表</button>', '<a class="btn ghost" href="./chronologia.html">歴史年表</a>');
    const launch = '<div class="sp12"></div><section class="card"><div class="chronologiaLaunch"><div><div class="eyebrow">SEPARATE EXAM MODE</div><h3 class="h3">入試対策は独立ページへ</h3><p class="sub">演習の即時解説と、本番型テストの採点記録を混ぜません。</p></div><button class="btn primary" data-route="exam">入試対策を開く</button></div></section>' +
      '<div class="sp12"></div><section class="card"><div class="chronologiaLaunch"><div><div class="eyebrow">CHRONOLOGIA 6.1</div><h3 class="h3">歴史年表・同時代史</h3><p class="sub">385件の統合年表、クイズ、並べ替え、弱点復習、参考書型解説を別画面で使います。</p></div><a class="btn gold" href="./chronologia.html">年表を開く</a></div></section>';
    return html.replace(/<\/main>/, launch + '</main>');
  };

  const aa22PrevStudyHTML = studyHTML;
  studyHTML = function () {
    let html = aa22PrevStudyHTML(), s = state.session, q = currentQ();
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
    if (action === 'start-exam-v22' || action === 'start-aichi-test') return aa22StartExam(aa22Config());
    if (action === 'test-next') return aa22FinalizeCurrent(true);
    if (action === 'repeat-aichi-test') return aa22StartExam(state.session?.examConfig || aa22Config());
    return aa22PrevHandleAction(el, event);
  };

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
      for (const [subject, unit] of [['english', 'grammar'], ['japanese', 'kanbun'], ['math', 'geometry'], ['science', 'experiment'], ['social', 'data']]) {
        const cfg = aa22NormalizeConfig({ subject, level: 3, scope: 'custom', units: [unit], timeMin: 20, length: 'mini' });
        const qs = aa22StructuredQueue(subject, 3, cfg);
        add(SUBJECTS[subject] + '単元指定 ' + aa22UnitLabel(subject, unit), qs.length > 0 && qs.every(q => q.examUnit === unit), qs.length + '問 / ' + [...new Set(qs.map(q => q.examUnit))].join(','));
      }
      const vocab = window.AA_JA_VOCAB_10000;
      add('国語1万語索引', vocab?.count === 10000 && vocab.entries.length === 10000 && new Set(vocab.entries.map(x => x[0] + '|' + x[1])).size === 10000, '教育基本語彙DB由来 ' + (vocab?.entries.length || 0) + '件');
      add('学習履歴キー固定', STORE_KEY === 'asahi_learning_os_v1' && SCHEMA_VERSION === 4, STORE_KEY + ' / schema ' + SCHEMA_VERSION);
      add('独立入試ルート', typeof examHTML === 'function' && aa22Config().timeMin >= 5, '教科・3難度・単元・範囲・時間・問題量');
    } catch (error) { add('v2.2追加検査', false, error.message); }
    state.qa.report = report; state.qa.lastRun = now(); state.ui.modal = 'qa'; save(); render();
  };

  globalThis.AA_V22_TEST_API = {
    units: EXAM_UNITS, japaneseExam: aa22JapaneseExam, structuredQueue: aa22StructuredQueue,
    normalizeConfig: aa22NormalizeConfig, startExam: aa22StartExam, allowedAreas: aa22AllowedAreas,
    vocabIndex: window.AA_JA_VOCAB_10000
  };

  save(); render();
})();
