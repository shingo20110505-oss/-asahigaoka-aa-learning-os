# Third-party notices

## 教育基本語彙データベース 2009B

`japanese-vocabulary-10000.js` は、国立国語研究所の「教育基本語彙データベース 2009B」を基に作成した10,000件の検索索引を含みます。

- 提供元: 国立国語研究所
- 配布ページ: https://mmsrv.ninjal.ac.jp/brfvep/
- ライセンス: Creative Commons Attribution 4.0 International (CC BY 4.0)
- ライセンス本文: https://creativecommons.org/licenses/by/4.0/
- アプリ側の変更: 語と読みの組を一意化し、配当群・複数資料での支持度を基準に10,000件を抽出し、ブラウザで読み込める配列形式へ変換

この10,000件はアプリ内の教育用検索索引です。文部科学省が「中学生の必修語数を10,000語」と定めたことを示すものではありません。

原データに意味記述がない語へ、未監修の辞書定義を自動付与して正誤問題を作ることはしていません。語義を正誤判定する問題には、別途監修したアプリ内教材だけを使用します。

## 青空文庫・著作権保護期間満了作品

`japanese-public-domain.js` は、次の著作権保護期間満了作品から短い本文を引用し、作者名・作品名・参照URLを各問題に表示します。設問、選択肢、誤答理由、解説は本アプリ用に独自作成しています。

- 寺田寅彦「科学者とあたま」: https://www.aozora.gr.jp/cards/000042/files/2359_13797.html
- 寺田寅彦「科学と文学」: https://www.aozora.gr.jp/cards/000042/files/2358_13799.html
- 寺田寅彦「科学上における権威の価値と弊害」: https://www.aozora.gr.jp/cards/000042/files/42693_18075.html
- 夏目漱石「私の個人主義」: https://www.aozora.gr.jp/cards/000148/files/772_33100.html
- 芥川龍之介「蜜柑」: https://www.aozora.gr.jp/cards/000879/files/43017_17431.html
- 宮沢賢治「注文の多い料理店」: https://www.aozora.gr.jp/cards/000081/files/43754_17659.html
- 宮沢賢治「『注文の多い料理店』序」: https://www.aozora.gr.jp/cards/000081/files/43736_17656.html
- 宮沢賢治「よだかの星」: https://www.aozora.gr.jp/cards/000081/files/473_42318.html

青空文庫の入力・校正・公開に携わったボランティアへ謝意を表します。本文は参照先と照合できる短い引用に限定し、アプリ内では「著作権保護期間満了」と明記します。

## EJDict / EJDictHand

英語リーダーの補助辞書 `data/reading-dictionary.json` は、[くじらはんどのEJDict](https://github.com/kujirahand/EJDict) の `src/a.txt`〜`src/z.txt` から、教材に必要な見出し語を抽出・JSON化したものです。

- ライセンス：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- 固定した版：`9663055d59a8cb1a35078a71db7a09ff39305828`
- 生成スクリプト：`scripts/build-reading-dictionary.mjs`
- RISEの既存語彙・独自の説明を優先し、未収録語に補助辞書を使用します。補助辞書の語義は文脈全体の翻訳ではありません。
- 文法確認に使用した一次資料は `data/reading-sources.json` に記載。文法解説・追加長文20本・設問・和訳は本アプリ用の独自作成です。
