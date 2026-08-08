# 旭丘AA Learning OS v1.4.0 最終監査

監査日: 2026-08-08

## 結論

GitHub Pagesへそのまま配置できるPWA構成として完成。既存v1.3の学習ロジックと保存キーを維持し、iPhone向けmanifest、Service Worker、アイコン、オフライン、更新通知、バックアップ共有、GitHub Actions公開、READMEを追加した。

## 1. デザイン監査

| 観点 | 結果 | 確認内容 |
| --- | --- | --- |
| 既存デザイン継承 | PASS | 紺・白・金、カード、5タブ、ライト/ダークを維持 |
| iPhone safe area | PASS | `viewport-fit=cover` と上下の `safe-area-inset-*` を使用 |
| タップ操作 | PASS | 主要ボタンは46px以上、`touch-action: manipulation` |
| PWA表示 | PASS | 更新・オフライン表示は本文を塞がないsticky banner |
| アイコン | PASS | 32 / 180 / 192 / 512 / maskable 512を用意 |
| 横幅 | PASS | 既存v1.3の390px監査で横スクロール0。追加カードも1列化・折返し対応 |

## 2. 操作・バグ監査

| テスト | 結果 |
| --- | --- |
| 初回HOME表示 | PASS |
| 初回20語診断の開始 | PASS |
| 「わからない」回答と解説 | PASS |
| 回答後に再読込して同じ解説・「次へ」を復元 | PASS |
| テーマ変更後の再読込復元 | PASS |
| 設定・バックアップJSON表示 | PASS |
| バックアップJSONにschemaVersion・attemptsを保持 | PASS |
| 総合QA modalの表示 | PASS |
| アプリ由来のJavaScript runtime error | 0 |

Cloud Browserに注入された拡張機能のmetadata送信エラーは記録されたが、アプリ本体URLからのエラーではなく、アプリ操作への影響はなかった。

## 3. 内容監査

### データ構造

- 英単語: 107語、重複0
- 漢字語彙: 80語、重複0
- 歴史: 99件、年代昇順・ID重複なし
- 英語長文素材: 20シナリオ
- 初回語彙診断: 20語
- 選択肢一意性: 720問、異常0、生成例外0
- 英単語穴埋め: 107語、異常0
- 長文生成: 36本、文法違反0、高類似重複0、言語手掛かり0、辞書未登録0

v1.3完成時の拡張ストレス監査（生成問題9,000問、長文80本、総合20/20 PASS）も継承対象として確認した。今回変更した範囲はPWA・保存UI・公開構成で、問題生成ロジック本体は変更していない。

### 入試情報

2027年度の旭丘普通科について、愛知県が2026年7月7日に公表した一般選抜資料を基準にした。校内順位方式Ⅴ、評定得点最高90点、5教科学力検査最高110点、方式Ⅴの学力検査2倍を前提とする。公式合格最低点は表示しない。

- [愛知県：令和9年度 一般選抜の面接・校内順位決定方式](https://www.pref.aichi.jp/press-release/r9kounaijyunni.html)
- [令和9年度資料 PDF](https://www.pref.aichi.jp/uploaded/attachment/623173.pdf)

## 4. 学習科学との整合性監査

| 実装 | 判定 | 理由・修正 |
| --- | --- | --- |
| 想起練習 | 整合 | 答えを見る前の回答、誤答後の再想起を中心化 |
| 間隔反復 | 整合 | 項目別の保持状態を指数型忘却モデルで近似し、本人の履歴で更新 |
| インターリーブ | 条件付き整合 | 全面ランダム化せず、技能識別が必要なセットで選択的に使用 |
| 語彙カバレッジ | 整合・注記強化 | 92%を「支援付き入口」と明示し、94〜98%へ段階化。98%を絶対的合格条件にしない |
| 読解速度 | 整合 | 辞書・事前語彙を使った初読は支援付きWPMとし、速度masteryを上げない |
| mastery | 妥当な内部指標 | 正誤だけでなく速度・転移・証拠量を含むが、標準化得点ではない |
| AA Readiness | 表示上妥当 | 公式合格率・偏差値・cutoffではないことを明示 |

参照研究:

- [Karpicke & Roediger (2008): The Critical Importance of Retrieval for Learning](https://web.mit.edu/jbelcher/www/learner/retrieval.pdf)
- [Cepeda et al. (2008): Spacing Effects in Learning](https://pubmed.ncbi.nlm.nih.gov/19076480/)
- [Settles & Meeder (2016): A Trainable Spaced Repetition Model](https://aclanthology.org/P16-1174/)
- [Hu & Nation (2000): Unknown Vocabulary Density and Reading Comprehension](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2000-Hu-Density-and-comprehension.pdf)
- [Kremmel et al.: Hu & Nation (2000) replication project](https://osf.io/d3vzs/overview)
- [Rohrer et al. (2014): Interleaved Mathematics Practice](https://pubmed.ncbi.nlm.nih.gov/24578089/)

## 5. PWA要件監査

静的監査 `node tests/static-audit.mjs`: **27 / 27 PASS**

| 要件 | 結果 |
| --- | --- |
| HTTPS前提 | PASS（GitHub Pages） |
| Web App Manifest | PASS |
| `id / start_url / scope` の相対指定 | PASS（project Pages対応） |
| standalone表示 | PASS |
| 192px / 512px icon | PASS |
| maskable icon | PASS |
| apple-touch-icon 180px | PASS |
| Service Worker登録 | PASS |
| app shell precache | PASS |
| navigation offline fallback | PASS |
| 古いcache削除 | PASS |
| waiting workerをユーザー操作で更新 | PASS |
| localStorage保存キー維持 | PASS |
| 更新前save | PASS |
| `.nojekyll` | PASS |
| GitHub Actions Pages workflow | PASS |

iOS Safari実機そのものはこの実行環境にないため、Safariエンジンでの物理端末試験は未実施。代わりに、Apple/WebKit公表仕様、iOS用meta、Apple touch icon、safe area、relative scope、ホーム画面追加手順を照合し、Chromiumの実ブラウザで学習操作を確認した。公開後の最終実機確認項目は、ホーム画面追加、単独起動、機内モード再起動、更新banner、JSON共有の5点。

参照:

- [WebKit: Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple WWDC22: Web App Manifest icons](https://developer.apple.com/videos/play/wwdc2022/10048/)
- [GitHub Docs: Configuring a Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 6. 別観点監査

### プライバシー

- 学習履歴をGitHubや外部サーバーへ送信しない。
- ChatGPT相談は問題文と専用promptを本人のクリップボードへコピーし、新しいタブを開く方式。
- 公開リポジトリに個人の学習履歴・バックアップを含めない。

### データ消失

- 自動保存、強制終了復元、JSONファイル、共有シート、テキストコピーの複数経路を用意。
- Safariデータ削除、端末変更、ホーム画面版削除の前にバックアップする説明を追加。
- URLが変わるとoriginが変わりlocalStorageを自動共有できないため、JSON統合を正式な移行方法とした。

### セキュリティ

- 学習アプリは静的ファイルのみ。認証・APIキー・秘密情報なし。
- Service Workerは同一origin・自身のscope内のGETだけを処理。
- 外部originのChatGPT通信はキャッシュしない。

### アクセシビリティ

- `lang=ja`、button要素、keyboard focus、status表示、十分なタップ領域を維持。
- 色だけでなくPASS/FAIL、オンライン/オフライン、文章labelを併記。

### 性能

- 外部CDN・外部JavaScriptなし。
- 初回HTMLは大きいが、教材とロジックを1ファイルに含めるためオフライン再現性が高い。
- 2回目以降はService Worker cacheから即時起動できる。

## 残る運用上の注意

1. GitHub PagesのURLまたはリポジトリ名を変更するとlocalStorageのoriginが変わる可能性がある。
2. SafariのWebサイトデータ削除は学習履歴も消すため、JSONバックアップが必要。
3. 入試制度の公表内容が更新された場合は、設定画面の年度・方式説明を再監査する。
4. AA Readinessは意思決定補助であり、合否保証には使わない。
