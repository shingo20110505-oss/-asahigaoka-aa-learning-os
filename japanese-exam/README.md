# 国語・愛知県型マーク式エンジン

本番入口は `japanese-exam/index.html`。既存アプリの国語入試開始・国語単元別演習を `bridge.js` で接続する。語彙クロノロジア、熟語、復習正本、保存キー、ログイン画像・音声、他教科は変更しない。

## 実装済み

- オリジナル2セット（各17小問・22点、計34問）。論説＋参考文、小説／随筆、語彙、古文／漢文風書き下し文。
- 配点8/3/7/4および7/3/8/4。仕様は9/3/6/4にも対応。
- 4〜6選択肢、複数選択、並べ替え、複数欄。採点は正答IDを参照し、表示順を変更しても不変。
- 完答・独立欄加点・採点群ごとの部分点。複数選択の不足や過剰選択による得点獲得を防止。
- 全選択肢の説明、正確な本文引用、誤り箇所、誤答オペレーター、9軸の難度メタデータ。
- `aa_japanese_exam_session_v1` / `aa_japanese_exam_history_v1` / `aa_japanese_exam_imports_v1` のみ書き込む。
- 途中再開、任意の制限時間、見直しフラグ、分野別演習、誤答オペレーターを優先する弱点演習。
- ブラウザから外部AIへの呼び出しはなく、学習時のAPI料金は0。既存のService Workerを使用する。
- `catalog.json` と `items/<sha256>.json` から、バックエンドで受理済みの追加教材をSHA-256確認後に読み込む。

## 限界を明示する

組み込み教材は編集時に本文根拠を点検した教材で、独立モデルの実行済みを装わない。同じセットで選択肢順が変わっても新しい問題数として数えない。難度の数値は作問調整用で、実測正答率・合否予測ではない。本文字数は本番の厳密な再現保証ではない。創作古典は必ず創作教材と表示する。

新しい教材は、Geminiで本文生成→Geminiで設問生成→Riseの決定的構造検査→Groqによる4大問のblind独立解答→正答・各肢判定・本文完全一致引用の照合、という経路を使う。Groqには作者の正答ID・解説・根拠メタデータ・誤答オペレーター・語彙の解答用資料を渡さない。AI同士の一致も正しさを保証するものではないため、Riseの決定的検査を必ず併用する。

## バックエンド定期生成

`.github/workflows/replenish-japanese.yml` が毎日 07:47 JST（22:47 UTC）にGitHub Actions上で実行する。既存の英語長文生成（06:17 JST）とは90分ずらし、別concurrencyグループで動かす。ブラウザやGitHub PagesからGemini/Groqへ生成要求を送らない。

`node scripts/japanese-library.mjs --generate` は `GEMINI_API_KEY`、`GEMINI_MODEL`、`GEMINI_FREE_TIER_CONFIRMED=true`、`GROQ_API_KEY` が必要。`GROQ_MODEL` は `openai/gpt-oss-20b` に固定し、それ以外への自動切替を認めない。Geminiも許可済みFlashモデルだけを使い、コード側から勝手に有料・上位モデルへ変更しない。

Gemini生成は `v1beta/models/<model>:generateContent` のJSONモードを使う。Interactionsのrevision headerへ依存しない。HTTP 400は `request_rejected` として明示的に失敗させ、候補を受理しない。HTTP 429はその日の追加を停止し、自動再試行・有料Batch API・別プロバイダーへのフォールバックを行わない。既存教材はそのまま利用できる。

1日1候補。通常はGemini 2回（本文・設問）とGroq 4回（大問1〜4）の6回。本文JSONの大問欠落・型ずれ・必要字数不足だけは、診断を絞った本文再生成を1回まで許可し、最大7回とする。429や通信失敗は再試行しない。Groqには大問単位の最小blind入力だけを送り、長い国語一式を一度に送らない。秘密鍵はGitHub Actions secrets / 環境変数からのみ取得し、公開ファイルやブラウザへ保存しない。

候補がRise構造検査とGroq独立検証を通過した場合だけ `items/<sha256>.json` と `catalog.json` を更新して `main` に保存する。採用された日だけ `deploy-pages.yml` を明示起動し、Pagesの公開検証が完了するまで待つ。`scripts/verify-japanese-public.mjs` は公開中の国語アセット、catalog、追加教材JSONを取得し、SHA-256・モジュールMIME・22点採点・教材構造を検証する。quota・生成棄却・公開検証失敗は定期生成Workflowを成功扱いにしない（同日の実行枠を既に使った `daily_limit` のみ正常終了）。

確認フラグはAI Studioで対象プロジェクトが無料枠であることを管理者が確認した後にだけ設定する。フラグ自体が課金状態を技術的に照会・保証するものではない。

## 検証

- `node tests/japanese-exam.mjs`
- `node tests/japanese-groq-verifier.mjs`
- `node scripts/japanese-library.mjs`
- `node scripts/verify-japanese-public.mjs <Pages URL> <source SHA>`

テストは、配点・選択数・ID・本文引用・一意な並べ替えの形・採点・表示順不変・外部生成の無料確認ゲートに加え、Groqへ正答情報が漏れないこと、4大問を別々に照合すること、低信頼・曖昧回答・誤答・捏造引用を拒否することを検査する。実モデルの正答能力そのものはlive smokeと実際の定期生成結果で確認する。
