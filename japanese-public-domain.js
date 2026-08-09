/* 旭丘AA Learning OS v2.2.6
   著作権保護期間が満了した日本語作品による読解問題バンク */
(function () {
  'use strict';

  const SOURCES = {
    teradaAtama: {
      author: '寺田寅彦', title: '科学者とあたま', area: 'modern', genre: '評論',
      url: 'https://www.aozora.gr.jp/cards/000042/files/2359_13797.html'
    },
    teradaLiterature: {
      author: '寺田寅彦', title: '科学と文学', area: 'modern', genre: '評論',
      url: 'https://www.aozora.gr.jp/cards/000042/files/2358_13799.html'
    },
    teradaAuthority: {
      author: '寺田寅彦', title: '科学上における権威の価値と弊害', area: 'modern', genre: '評論',
      url: 'https://www.aozora.gr.jp/cards/000042/files/42693_18075.html'
    },
    sosekiIndividual: {
      author: '夏目漱石', title: '私の個人主義', area: 'modern', genre: '講演',
      url: 'https://www.aozora.gr.jp/cards/000148/files/772_33100.html'
    },
    akutagawaMikan: {
      author: '芥川龍之介', title: '蜜柑', area: 'literary', genre: '小説',
      url: 'https://www.aozora.gr.jp/cards/000879/files/43017_17431.html'
    },
    miyazawaRestaurant: {
      author: '宮沢賢治', title: '注文の多い料理店', area: 'literary', genre: '童話',
      url: 'https://www.aozora.gr.jp/cards/000081/files/43754_17659.html'
    },
    miyazawaPreface: {
      author: '宮沢賢治', title: '「注文の多い料理店」序', area: 'literary', genre: '序文',
      url: 'https://www.aozora.gr.jp/cards/000081/files/43736_17656.html'
    },
    miyazawaYodaka: {
      author: '宮沢賢治', title: 'よだかの星', area: 'literary', genre: '童話',
      url: 'https://www.aozora.gr.jp/cards/000081/files/473_42318.html'
    }
  };

  const BANK = [
    {
      id: 'atama-fuji', source: 'teradaAtama', difficulty: 3, reasoningTag: '比喩の理解',
      excerpt: '頭のいい人は、言わば富士のすそ野まで来て、そこから頂上をながめただけで、それで富士の全体をのみ込んで東京へ引き返すという心配がある。富士はやはり登ってみなければわからない。',
      prompt: '「富士はやはり登ってみなければわからない」が表す考えとして最も適切なものを選びなさい。',
      correct: '対象を本当に理解するには、外から見て早く分かったつもりにならず、実際に確かめる必要がある。',
      distractors: [
        ['知識は遠くから眺めるだけで完全に得られる。', '「登ってみなければ」と反対です。', 'opposite'],
        ['研究では頂上へ着く速さだけが重要である。', '速さを評価する文章ではありません。', 'focus_shift'],
        ['難しい対象は調べずに避ける方がよい。', '実際に確かめることを勧めています。', 'opposite']
      ],
      explanation: '富士山を外から眺めることと実際に登ることを対比し、表面的な理解と実地の探究の違いを示しています。'
    },
    {
      id: 'atama-traveler', source: 'teradaAtama', difficulty: 5, reasoningTag: '比喩の働き',
      excerpt: 'いわゆる頭のいい人は、言わば足の早い旅人のようなものである。人より先に人のまだ行かない所へ行き着くこともできる代わりに、途中の道ばたあるいはちょっとしたわき道にある肝心なものを見落とす恐れがある。',
      prompt: '「足の早い旅人」という比喩の働きとして最も適切なものを選びなさい。',
      correct: '理解の速さには利点がある一方、途中の重要な疑問を見落とす危険もあることを具体化している。',
      distractors: [
        ['旅の経験がある人だけが科学者になれると説明している。', '旅は思考の速さを表す比喩です。', 'literal_only'],
        ['理解の速い人には欠点が一つもないと強調している。', '見落とす恐れも示しています。', 'opposite'],
        ['研究では目的地を決めてはいけないと主張している。', '目的地の有無は論点ではありません。', 'outside_information']
      ],
      explanation: '「先に着く」と「肝心なものを見落とす」を並べ、同じ性質の長所と短所を一つの比喩で示しています。'
    },
    {
      id: 'atama-nature', source: 'teradaAtama', difficulty: 7, reasoningTag: '警告の要旨',
      excerpt: '頭のよい人は、あまりに多く頭の力を過信する恐れがある。その結果として、自然がわれわれに表示する現象が自分の頭で考えたことと一致しない場合に、「自然のほうが間違っている」かのように考える恐れがある。',
      prompt: '筆者がここで最も強く戒めている態度を選びなさい。',
      correct: '自分の考えを過信し、観察された事実の方を誤りとして退ける態度。',
      distractors: [
        ['観察した事実をもとに仮説を修正する態度。', '筆者が必要と考える方向です。', 'opposite'],
        ['一つの結果について別の原因も検討する態度。', '本文の警告を避ける態度です。', 'opposite'],
        ['自然現象を正確に記録しようとする態度。', '記録自体は批判されていません。', 'focus_shift']
      ],
      explanation: '「頭の力を過信」した結果、理論と合わない事実を退ける危険を述べています。'
    },
    {
      id: 'atama-failure', source: 'teradaAtama', difficulty: 8, reasoningTag: '因果と逆説',
      excerpt: '頭の悪い人は、頭のいい人が考えて、はじめからだめにきまっているような試みを、一生懸命につづけている。やっと、それがだめとわかるころには、しかしたいてい何かしらだめでない他のものの糸口を取り上げている。',
      prompt: 'この部分から読み取れる筆者の考えとして最も適切なものを選びなさい。',
      correct: '失敗に見える試みでも、続けて確かめる過程から予想外の発見の糸口が得られることがある。',
      distractors: [
        ['失敗すると分かっている試みは、必ず直ちに中止すべきだ。', '本文は試みの過程から糸口を得る場合を示します。', 'opposite'],
        ['科学では最初の予想が正しいかどうかは重要ではない。', '予想を確かめる過程の価値を述べており、予想を無視してはいません。', 'overgeneralization'],
        ['一度失敗した方法は、同じ結果しか生まない。', '予想外の糸口が得られる可能性を否定しています。', 'opposite']
      ],
      explanation: '「だめな試み」から「だめでない他のものの糸口」へ進む逆説が中心です。'
    },
    {
      id: 'atama-value-later', source: 'teradaAtama', difficulty: 9, reasoningTag: '限定を含む主張',
      excerpt: '科学的研究の結果の価値はそれが現われるまではたいていだれにもわからない。また、結果が出た時にはだれも認めなかった価値が十年百年の後に初めて認められることも珍しくはない。',
      prompt: '本文の限定を保った言い換えとして最も適切なものを選びなさい。',
      correct: '研究の価値は事前に確実に判断できるとは限らず、成果が後の時代に評価される場合もある。',
      distractors: [
        ['価値のある研究は、発表された瞬間に必ず全員から認められる。', '後に初めて認められる場合を否定しています。', 'opposite'],
        ['現在評価されない研究は、すべて百年後に高く評価される。', '「ことも珍しくはない」を「すべて」に広げています。', 'overgeneralization'],
        ['研究者は成果の価値を一切考えてはいけない。', '事前判断の限界を述べており、価値を考える行為を全面否定していません。', 'overgeneralization']
      ],
      explanation: '「たいてい」「ことも珍しくはない」という限定を落とさず、事前評価の不確実さと後世の評価をまとめます。'
    },
    {
      id: 'atama-both', source: 'teradaAtama', difficulty: 10, reasoningTag: '対立概念の統合',
      excerpt: '人間の頭の力の限界を自覚して大自然の前に愚かな赤裸の自分を投げ出し、そうしてただ大自然の直接の教えにのみ傾聴する覚悟があって、初めて科学者にはなれるのである。しかしそれだけでは科学者にはなれない事ももちろんである。やはり観察と分析と推理の正確周到を必要とするのは言うまでもないことである。',
      prompt: '二つの文の関係を最も適切に説明したものを選びなさい。',
      correct: '自然に対する謙虚さを必要条件として示したうえで、それだけでは足りず、正確な観察・分析・推理も必要だと補っている。',
      distractors: [
        ['前半の考えを後半で全面的に取り消している。', '後半は前半を否定せず、条件を追加しています。', 'logic_reversal'],
        ['謙虚さと正確な推理は同時に持てないと対立させている。', '両方が必要だと統合しています。', 'opposite'],
        ['科学者には自然への感情だけが必要だと結論づけている。', '観察・分析・推理も必要だと明示しています。', 'single_factor']
      ],
      explanation: '「しかしそれだけでは」に注目すると、前半を残しながら必要条件を追加する論理だと分かります。'
    },
    {
      id: 'literature-words', source: 'teradaLiterature', difficulty: 4, reasoningTag: '定義',
      excerpt: '文学の内容は「言葉」である。言葉でつづられた人間の思惟の記録でありまた予言である。言葉をなくすれば思惟がなくなると同時にあらゆる文学は消滅する。',
      prompt: 'この部分で筆者が文学について述べていることとして最も適切なものを選びなさい。',
      correct: '文学は、人間の思考を言葉で記録し、先へ伝えるものとして成り立つ。',
      distractors: [
        ['文学には言葉を使ってはいけない。', '本文と反対です。', 'opposite'],
        ['文学は過去の出来事だけを記録し、未来とは関係しない。', '「また予言である」を落としています。', 'scope'],
        ['言葉で書かれたものは、すべて自動的に優れた文学になる。', '本文はここで作品の優劣を述べていません。', 'overgeneralization']
      ],
      explanation: '「思惟の記録」と「予言」の両方を含む選択肢が適切です。'
    },
    {
      id: 'literature-record', source: 'teradaLiterature', difficulty: 6, reasoningTag: '条件の把握',
      excerpt: '作者の頭の中にある腹案のようなものは、いかに詳細に組み立てられたつもりでも、それは文学ではない。象形文字であろうが、速記記号であろうが、ともかくも読める記号文字で、粘土板でもパピラスでも「記録」されたものでなければおそらくそれを文学とは名づけることができないであろう。',
      prompt: '筆者が文学の成立に必要だと考えている条件を選びなさい。',
      correct: '頭の中の考えが、他者の読める記号によって記録された形を持つこと。',
      distractors: [
        ['作者だけが内容を覚えていればよいこと。', '頭の中の腹案だけでは文学ではないとしています。', 'opposite'],
        ['必ず紙と活字で印刷されていること。', '粘土板や速記記号も例に挙げています。', 'overgeneralization'],
        ['多数の聴衆の前で一度だけ話されること。', '読める記号による記録を条件にしています。', 'focus_shift']
      ],
      explanation: '媒体の種類ではなく、「読める記号文字で記録された」という条件が中心です。'
    },
    {
      id: 'literature-writing', source: 'teradaLiterature', difficulty: 9, reasoningTag: '循環過程',
      excerpt: '考えていたものがただそのままに器械的に文字に書き現わされるのではなくて、むしろ、紙上の文字に現われた行文の惰力が作者の頭に反応して、ただ空で考えただけでは決して思い浮かばないような潜在的な意識を引き出し、それが文字に現われて、もう一度作者の頭に働きかけることによって、さらに次の考えを呼び起こす、というのが実際の現象であるように思われる。',
      prompt: '筆者が説明する創作の過程として最も適切なものを選びなさい。',
      correct: '書くことは考えの単純な転写ではなく、書かれた言葉が作者へ働き返し、新しい考えを生む循環的な過程である。',
      distractors: [
        ['文章は、書き始める前に完成した考えを一字も変えず写す作業である。', '「ただそのままに器械的に」ではないとしています。', 'opposite'],
        ['作者の考えは、文字にすると必ず失われる。', '文字が新しい意識を引き出すと述べています。', 'opposite'],
        ['創作では、読者の反応だけが次の考えを決める。', 'ここでは紙上の言葉と作者の相互作用を述べています。', 'focus_shift']
      ],
      explanation: '「文字→作者の頭→さらに次の考え」という働き返しを捉えるのが要点です。'
    },
    {
      id: 'literature-science-product', source: 'teradaLiterature', difficulty: 8, reasoningTag: '区別',
      excerpt: '普通の世間の人の口にする科学という語の包括する漠然とした概念の中には、たとえばラジオとか飛行機とか紫外線療法とかいうようなものがある。しかしこれらは科学の産み出した生産物であって学そのものとは区別さるべきものであろう。',
      prompt: '「しかし」の前後で筆者が行っている区別として最も適切なものを選びなさい。',
      correct: '科学によって生み出された製品・技術と、知の体系としての科学そのものを区別している。',
      distractors: [
        ['役に立つ科学と役に立たない科学を区別している。', '有用性の優劣は論点ではありません。', 'focus_shift'],
        ['昔の科学と現代の科学を区別している。', '時代区分ではありません。', 'outside_information'],
        ['文学が生み出したものと科学が生み出したものを区別している。', 'この箇所では科学の生産物と学そのものの区別です。', 'scope']
      ],
      explanation: '具体物を「科学そのもの」とみなす日常的理解を問い直しています。'
    },
    {
      id: 'authority-guide', source: 'teradaAuthority', difficulty: 4, reasoningTag: '比喩の対応',
      excerpt: 'ともかくも学術上の権威者の一つの役目は丁度旅行者に対する案内者の役目である。京都見物を一定時日の間に最も有効にしようというには適当な案内者あるいはこれに代るべき案内書があると便利である。',
      prompt: 'この比喩で「案内者」に対応するものを選びなさい。',
      correct: '学習者や研究者に、重要な知識や進む方向を示す学術上の権威者。',
      distractors: [
        ['研究対象である自然そのもの。', '自然は旅行先に近い側で、案内者ではありません。', 'mapping_error'],
        ['学ぶ時間を制限する制度。', '時間は案内者の役割を説明する条件です。', 'mapping_error'],
        ['知識を一切持たない旅行者。', '旅行者は学習者・研究者に対応します。', 'mapping_error']
      ],
      explanation: '旅行者＝学習者、案内者＝権威者、見物先＝学ぶ対象、という対応です。'
    },
    {
      id: 'authority-own-eyes', source: 'teradaAuthority', difficulty: 7, reasoningTag: '具体例からの一般化',
      excerpt: '「これでは自分で見物するのでなくてベデカの記者に見物させられているようなものだ。」多くの自然科学の学生がその研究の対象とする自然を見るのに、あるいは教科書を通しあるいは教師の講義録を通して見るのみで、自分の眼で自分の頭で自然を観察するものが果して幾何あるだろうかという事を考えざるを得なかった。',
      prompt: '旅行案内書の例を通して筆者が問題にしていることを選びなさい。',
      correct: '教科書や教師の説明だけを通して対象を見て、自分で観察し考えることを失う危険。',
      distractors: [
        ['旅行案内書には誤字が多いという問題。', '案内書の誤字ではなく、依存する態度が中心です。', 'surface_reading'],
        ['科学の学生は旅行をしてはいけないという決まり。', '旅行は科学学習の比喩です。', 'literal_only'],
        ['教師は教科書を一切使うべきでないという主張。', '案内の価値も認めており、全面否定ではありません。', 'overgeneralization']
      ],
      explanation: '具体例の「案内書を通して見る」を、学習で「権威を通してだけ見る」態度へ一般化しています。'
    },
    {
      id: 'authority-uncritical', source: 'teradaAuthority', difficulty: 8, reasoningTag: '主張と限定',
      excerpt: '学生にとっては教科書や教師のノートは立派な権威である。これらの権威を無批判的に過信する弊害は甚だ恐るべきものでなければならない。もしノートや教科書の教ゆる所をそのままに受け取り、それ以上について考える所も見る所もなかったらどうであろう。',
      prompt: '筆者の批判の対象を過不足なく表すものを選びなさい。',
      correct: '教科書や教師の説明の価値ではなく、それを無批判に信じ、それ以上を自分で見たり考えたりしない態度。',
      distractors: [
        ['教科書や教師が存在すること自体。', '「無批判的に過信する」態度を批判しています。', 'overgeneralization'],
        ['学んだ内容を正確に覚えようとすること。', '記憶自体ではなく、そこで思考を止めることが問題です。', 'focus_shift'],
        ['説明を聞いた後に自分で確かめること。', '筆者が求める方向です。', 'opposite']
      ],
      explanation: '権威そのものの全否定ではなく、「無批判的に過信」という限定が重要です。'
    },
    {
      id: 'authority-direct', source: 'teradaAuthority', difficulty: 10, reasoningTag: '論証の構造',
      excerpt: '自然科学の目的とする所は結局自然その物である以上は本当の事は直接自然から学ばねば分るものではない。教科書やノートは丁度案内者に過ぎない。それが間違っていない限りはまるで方角の分らぬ者には必要欠くべからざるものである。',
      prompt: 'この部分の論の組み立てとして最も適切なものを選びなさい。',
      correct: '学ぶ最終対象は自然そのものだと置き、教科書の必要性を認めつつも、その役割を対象へ導く案内に限定している。',
      distractors: [
        ['教科書は不要だと結論づけた後、自然の観察も不要だと付け加えている。', '教科書を「必要欠くべからざる」と認めています。', 'logic_reversal'],
        ['教科書こそ最終的な研究対象であり、自然は補助資料だと位置づけている。', '対象と案内の関係が逆です。', 'opposite'],
        ['教科書が正しければ、自分で自然を見る必要はないと結論づけている。', '直接自然から学ぶ必要を先に示しています。', 'opposite']
      ],
      explanation: '「必要だが案内者に過ぎない」という両面を保つ選択肢が正解です。'
    },
    {
      id: 'soseki-self-and-others', source: 'sosekiIndividual', difficulty: 5, reasoningTag: '対比',
      excerpt: '彼らは自分の自我をあくまで尊重するような事を云いながら、他人の自我に至っては毫も認めていないのです。いやしくも公平の眼を具し正義の観念をもつ以上は、自分の幸福のために自分の個性を発展して行くと同時に、その自由を他にも与えなければすまん事だと私は信じて疑わないのです。',
      prompt: '筆者の考えとして最も適切なものを選びなさい。',
      correct: '自分の個性と自由を大切にするなら、同時に他人の個性と自由も尊重しなければならない。',
      distractors: [
        ['自分の自由を守るためなら、他人の自由を制限してよい。', '本文が批判する態度です。', 'opposite'],
        ['個性の発展は自分にも他人にも認めるべきではない。', '個性の発展自体を否定していません。', 'overgeneralization'],
        ['公平とは全員が同じ個性を持つことである。', '違う個性を尊重する主張です。', 'outside_information']
      ],
      explanation: '「自分」と「他人」、「個性」と「自由」を対応させて読みます。'
    },
    {
      id: 'soseki-power-duty', source: 'sosekiIndividual', difficulty: 6, reasoningTag: '具体例と原則',
      excerpt: '元来をいうなら、義務の附着しておらない権力というものが世の中にあろうはずがないのです。叱る権利をもつ先生はすなわち教える義務をももっているはずなのですから。',
      prompt: '先生の例によって説明されている原則を選びなさい。',
      correct: '権力や権利を行使できる立場には、それに対応する義務が伴う。',
      distractors: [
        ['先生には生徒を叱る権利だけがあり、教える義務はない。', '本文と反対です。', 'opposite'],
        ['義務を果たす人は、どのような権力でも自由に使える。', '権力の無制限な使用は述べていません。', 'overgeneralization'],
        ['学校の中だけでは権利と義務が無関係になる。', '先生は一般原則を示す具体例です。', 'opposite']
      ],
      explanation: '一つの具体例から、権力には義務が伴うという一般原則を読み取ります。'
    },
    {
      id: 'soseki-three-points', source: 'sosekiIndividual', difficulty: 9, reasoningTag: '要約の構造',
      excerpt: '今までの論旨をかい摘んでみると、第一に自己の個性の発展を仕遂げようと思うならば、同時に他人の個性も尊重しなければならないという事。第二に自己の所有している権力を使用しようと思うならば、それに附随している義務というものを心得なければならないという事。第三に自己の金力を示そうと願うなら、それに伴う責任を重んじなければならないという事。',
      prompt: '三つの主張に共通する考えを最も適切にまとめたものを選びなさい。',
      correct: '自由・権力・金力を自分のために用いるときは、他者への尊重・義務・責任を同時に負う。',
      distractors: [
        ['個性・権力・金力は危険なので、誰も持つべきではない。', '使用を全面否定せず、伴う責任を求めています。', 'overgeneralization'],
        ['他人を尊重すれば、義務や責任を考える必要はない。', '三点を一つに縮めすぎています。', 'single_factor'],
        ['自由と権力は個人の問題で、社会とは関係しない。', '他人への影響を中心にしています。', 'opposite']
      ],
      explanation: '三項目を「力の享受」と「他者に対する制約・責任」の対応として要約します。'
    },
    {
      id: 'soseki-freedom-duty', source: 'sosekiIndividual', difficulty: 10, reasoningTag: '条件付き概念',
      excerpt: '要するに義務心を持っていない自由は本当の自由ではないと考えます。と云うものは、そうしたわがままな自由はけっして社会に存在し得ないからであります。私はあなたがたが自由にあらん事を切望するものであります。同時にあなたがたが義務というものを納得せられん事を願ってやまないのであります。',
      prompt: '筆者のいう「本当の自由」の条件を最も適切に説明したものを選びなさい。',
      correct: '自分の望みだけを通すのではなく、社会の中で他者への義務を引き受けること。',
      distractors: [
        ['社会の規則から完全に離れ、何をしても妨げられないこと。', '「わがままな自由」を否定しています。', 'opposite'],
        ['自由をすべて捨て、義務だけに従うこと。', '筆者は自由も切望しています。', 'overgeneralization'],
        ['権力を持つ人だけが自由を得ること。', '権力の有無を自由の条件にしていません。', 'outside_information']
      ],
      explanation: '自由を否定するのではなく、義務と切り離せない社会的な自由として捉えています。'
    },
    {
      id: 'mikan-color', source: 'akutagawaMikan', difficulty: 6, reasoningTag: '情景と心情',
      excerpt: '暮色を帯びた町はずれの踏切りと、小鳥のように声を挙げた三人の子供たちと、そうしてその上に乱落する鮮やかな蜜柑の色と――すべては汽車の窓の外に、瞬く暇もなく通り過ぎた。が、私の心の上には、切ない程はっきりと、この光景が焼きつけられた。',
      prompt: '「鮮やかな蜜柑の色」の描写が果たす働きとして最も適切なものを選びなさい。',
      correct: '暗い暮色の中に強い色彩を置き、短い出来事が「私」の心を大きく動かしたことを印象づける。',
      distractors: [
        ['蜜柑の値段が高いことを説明する。', '価格は書かれていません。', 'outside_information'],
        ['汽車が非常に遅く走っていたことを示す。', '「瞬く暇もなく通り過ぎた」とあります。', 'opposite'],
        ['子供たちと「私」が以前から親しかったことを示す。', 'その関係は示されていません。', 'outside_information']
      ],
      explanation: '暮色と鮮色、瞬間と心への焼き付きという対比が、心情変化の強さを支えています。'
    },
    {
      id: 'mikan-change', source: 'akutagawaMikan', difficulty: 8, reasoningTag: '心情変化',
      excerpt: 'そうしてそこから、或得体の知れない朗らかな心もちが湧き上って来るのを意識した。私はこの時始めて、云いようのない疲労と倦怠とを、そうして又不可解な、下等な、退屈な人生を僅かに忘れる事が出来たのである。',
      prompt: '「私」の心情変化を最も適切に説明したものを選びなさい。',
      correct: '人生への倦怠を抱えていたが、目の前の光景に触れて、一時的に明るい感情を取り戻した。',
      distractors: [
        ['疲労や倦怠が完全に消え、以後二度と戻らなくなった。', '「僅かに忘れる」とあるので言い過ぎです。', 'overgeneralization'],
        ['朗らかな気持ちを不快に感じ、さらに人生を退屈だと思った。', '心情の方向が逆です。', 'opposite'],
        ['自分が蜜柑を受け取れなかったことに腹を立てた。', 'そのような感情は書かれていません。', 'outside_information']
      ],
      explanation: '「僅かに」という限定を保ち、暗い心情から一時的な明るさへの変化を読みます。'
    },
    {
      id: 'restaurant-gentlemen', source: 'miyazawaRestaurant', difficulty: 5, reasoningTag: '人物像',
      excerpt: '「ぜんたい、ここらの山は怪しからんね。鳥も獣も一疋も居やがらん。なんでも構わないから、早くタンタアーンと、やって見たいもんだなあ。」「鹿の黄いろな横っ腹なんぞに、二三発お見舞もうしたら、ずいぶん痛快だろうねえ。」',
      prompt: '会話から読み取れる二人の紳士の人物像として最も適切なものを選びなさい。',
      correct: '生き物を自分たちの楽しみの対象として見ており、尊大で思いやりに欠ける。',
      distractors: [
        ['動物の命を守るため、狩りをやめようとしている。', '会話の内容と反対です。', 'opposite'],
        ['山の生態を慎重に観察する研究者である。', '観察より撃つことを望んでいます。', 'outside_information'],
        ['道に迷った人を助けるため山へ来ている。', '目的は狩りです。', 'outside_information']
      ],
      explanation: '発言の語調と「なんでも構わない」「痛快」から、他の生命を軽視する人物像を読み取ります。'
    },
    {
      id: 'preface-source', source: 'miyazawaPreface', difficulty: 7, reasoningTag: '比喩的表現',
      excerpt: 'これらのわたくしのおはなしは、みんな林や野はらや鉄道線路やらで、虹や月あかりからもらってきたのです。ほんとうにもう、どうしてもこんなことがあるようでしかたないということを、わたくしはそのとおり書いたまでです。',
      prompt: '作者が自分の物語について述べていることとして最も適切なものを選びなさい。',
      correct: '自然や日常の風景から受けた強い感覚を、物語として書き留めた。',
      distractors: [
        ['虹や月から文字どおり原稿を受け取った。', '比喩的表現を文字どおりに読んでいます。', 'literal_only'],
        ['他人の物語をそのまま書き写した。', '自然や風景からもらった感覚を述べています。', 'outside_information'],
        ['役に立つ知識だけを選んで説明書にした。', '物語の源と書き方について述べています。', 'focus_shift']
      ],
      explanation: '「虹や月あかりからもらってきた」は、自然から着想や実感を得たことを表す比喩です。'
    },
    {
      id: 'yodaka-view', source: 'miyazawaYodaka', difficulty: 7, reasoningTag: '語りと周囲の評価',
      excerpt: 'よだかは、実にみにくい鳥です。顔は、ところどころ、味噌をつけたようにまだらで、くちばしは、ひらたくて、耳までさけています。ほかの鳥は、もう、よだかの顔を見ただけでも、いやになってしまうという工合でした。',
      prompt: 'この冒頭で強調されている状況として最も適切なものを選びなさい。',
      correct: 'よだかの外見が詳しく描かれ、その外見だけで周囲の鳥から嫌われている。',
      distractors: [
        ['よだかが自分の外見を誇り、他の鳥を嫌っている。', '嫌っている主体が逆です。', 'opposite'],
        ['よだかの飛ぶ能力が他の鳥より優れている。', 'この箇所では外見と周囲の反応が中心です。', 'focus_shift'],
        ['ほかの鳥はよだかの性格を長く調べた後で嫌った。', '顔を見ただけで嫌になったとあります。', 'outside_information']
      ],
      explanation: '外見の描写と「顔を見ただけでも」という周囲の反応を結び付けます。'
    }
  ];

  function difficultyRange(diff) {
    diff = clamp(Math.round(Number(diff) || 7), 1, 11);
    if (diff <= 3) return [1, 4];
    if (diff <= 5) return [3, 6];
    if (diff <= 8) return [5, 9];
    return [8, 11];
  }

  function makePublicDomainJapaneseQ(diff = 7, exclude = [], area = null) {
    const [min, max] = difficultyRange(diff);
    const excluded = new Set(safeArray(exclude));
    let candidates = BANK.filter(item => item.difficulty >= min && item.difficulty <= max && (!area || SOURCES[item.source].area === area));
    if (!candidates.length) candidates = BANK.filter(item => !area || SOURCES[item.source].area === area);
    const scored = candidates.map(item => {
      const key = 'ja-pd:' + item.id;
      const recent = typeof recentCorrectPenaltyForKey === 'function' ? recentCorrectPenaltyForKey(key) : 0;
      const used = excluded.has(item.id) || excluded.has(key) ? 8 : 0;
      const fit = Math.abs(item.difficulty - clamp(Number(diff) || 7, 1, 11)) * .16;
      return { item, score: recent + used + fit + Math.random() * .08 };
    }).sort((a, b) => a.score - b.score);
    const item = (scored[0] || { item: BANK[0] }).item;
    const source = SOURCES[item.source];
    const distractors = item.distractors.map(([text, reason, error]) => ({ text, ok: false, reason, error, distractorType: error }));
    const q = mcq(
      'ja:pd:' + item.id + ':' + uid('q'), 'japanese',
      '次の文章を読んで答えなさい。\n\n「' + item.excerpt + '」\n\n' + item.prompt + '\n\n（出典：' + source.author + '「' + source.title + '」／青空文庫・著作権保護期間満了作品）',
      item.correct, distractors, item.difficulty >= 8 ? 'ja.read.paraphrase' : 'ja.read.claim',
      item.explanation, 52000 + item.difficulty * 3500, item.reasoningTag
    );
    q.templateId = item.id;
    q.reviewKey = 'ja-pd:' + item.id;
    q.difficulty = item.difficulty;
    q.requestedDifficulty = clamp(Math.round(Number(diff) || 7), 1, 11);
    q.reasoningTag = item.reasoningTag;
    q.evidence = item.excerpt;
    q.publicDomain = true;
    q.source = { ...source, id: item.id, publicDomain: true, rightsLabel: '著作権保護期間満了', excerpt: item.excerpt };
    return q;
  }

  function planPublicDomainJapaneseQueue(count = 8, diff = 7, area = null) {
    const queue = [], used = [];
    for (let i = 0; i < count; i++) {
      const q = makePublicDomainJapaneseQ(diff, used, area);
      used.push(q.templateId);
      queue.push(q);
    }
    return queue;
  }

  makeJapaneseQ = function (diff = 7) {
    if (Math.random() < .22) return makeKanjiQ();
    return makePublicDomainJapaneseQ(diff);
  };

  globalThis.makePublicDomainJapaneseQ = makePublicDomainJapaneseQ;
  globalThis.planPublicDomainJapaneseQueue = planPublicDomainJapaneseQueue;
  globalThis.AA_JA_PD_TEST_API = { sources: SOURCES, bank: BANK, make: makePublicDomainJapaneseQ, plan: planPublicDomainJapaneseQueue, difficultyRange };
})();
