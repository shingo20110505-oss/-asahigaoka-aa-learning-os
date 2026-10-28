# 理科700項目・公開前統合検証

2026-10-28 UTC。公開承認を受け、最新main `b9eff173aca81384ab6b72f816d5971671367bc2` に理科教材と専用画面を統合した。作業ブランチは `codex/science-memory-700`。main更新と理科変更のファイル重複・競合はなかった。

## 統合後の結果

- 全体テスト `node --test tests/rise-*.test.mjs`：221件成功、失敗・スキップ0。
- CI指定の補助テスト `python -m unittest discover -s gateway -p 'test_*.py'`：7件成功。
- 固定runtimeのSRI確認、ビルド、公開asset allowlist検査：成功。Windowsローカルbuild `a6dc1c165815`。生成432ファイル、検査435ファイル。旧復習114・歴史1000・英文150とロゴを保護。
- 理科UI：14チェック成功、JavaScriptページエラー0。提供中の教材をブラウザー内で読み、700項目・51単元・物理147／化学183／生物206／地学164を確認。
- 学年・分野・単元・基本/発展・学習状況、かなと複数語の検索、答えの初期非表示、復習追加と再読込、他画面との履歴共有、保存失敗時、オフラインを確認。
- トリプシン・ペプシン・リパーゼの検索と区分、トリプシンの説明・出典・保存を確認。旧516項目版の編集済みカードと評価を保持。
- 1280px・768px・390pxの画面確認。携帯幅の横あふれなし。酵素の携帯幅画像を目視。
- 地理の既存UI試験：920項目・30演習と13チェック成功。既存ワークスペースUI14チェック、RAG UI（検索24問・再読込・オフライン・表示の回帰試験）も成功。
- `git diff --check` 成功。AIサーバー・認証・予算台帳のコード変更なし。試験は使い捨てデータとスタブ応答を使用し、利用者の実データを操作していない。

証拠は `test-results/science-memory-all-tests.txt`、`test-results/science-memory/result.json`、同フォルダーの画面画像、`test-results/geography/result.json`、`test-results/workspace/result.json`、`test-results/rag/`。

## CIと公開確認

現行の正式ワークフローは `.github/workflows/rise.yml`（RISE tests and Pages）。旧運用資料中の `deploy-pages.yml` は現在のブランチに存在しないため、その旧状態ファイルを公開成功の根拠にはしない。

現行CIに理科UI試験と証拠画像・JSONのartifact保存を追加。PRのCI合格、mainへの通常merge、Pages deployment成功を順に確認する。PRのApproveレビュー操作は行わない。

公開後は `RISE_SCIENCE_BASE_URL` を設定して同じ理科UI試験を公開URLに実行できる。空の隔離ブラウザーcontextを使い、結果を `test-results/science-memory-public/` に保存する。公開commit・CI run・公開buildは、公開成功後の証拠で別途確認する。この文書は公開前の検証結果であり、公開成功の宣言ではない。

## 範囲と限界

教材版 `2026-10-28.2`。基本614・発展86、計算演習を除外。調査・内容監査は [research.md](research.md)、[source-audit.md](source-audit.md)、[depth-audit.md](depth-audit.md) を参照。既存516項目の全フィールドとIDを保持したまま184項目を追加。

[verification-v2.md](verification-v2.md) は統合前の履歴（216テスト・旧build）として保存。本書が統合後の検証結果。実機iPhone/iPad・Safari、全教科書本文の完全網羅、全件の専門家校閲は未検証。
