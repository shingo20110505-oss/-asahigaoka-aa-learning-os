# RISE — 総合学習ワークスペース

旭丘高校を目指す学習をまとめる、静的PWAとPCチャットです。ロゴは既存のv5を維持しています。

- 英語長文130本：段落メモ、要約、対訳、語彙、読解ガイド、読み直し日程。
- 復習114項目と過去の履歴の移行・バックアップ。
- 歴史年表：既存1,000件のIDを保持し、出典付き追加・比較・因果関係・メモ。
- 国語語彙、公式入試資料、10種類の数学・理科モデル、学習ノート、教材・予定・集中記録。
- 管理者・ゲスト別のPCチャット。ゲスト履歴はブラウザごとに分離し、引き継ぎコードで移動できます。

## PCで使う

Node.js 24以上で `RISE-PC.cmd` を開きます。学習画面は http://127.0.0.1:4318 、PC設定は http://127.0.0.1:4320 です。

管理者はPC設定からChatGPTでCodexにログインします。ゲストはPC内のOllamaを使います。有料OpenAI API、PHPは使用しません。パスワードは8文字以上・管理者とゲストで別に設定し、PC内にsalt付きscryptで保存します。公開コードには保存しません。

MP4は元ファイルの保存・再生・時刻付き静止画の抽出に対応します。AIには静止画を送ります。動画全体や動画音声の解析ではありません。保存量にアプリ独自のGB上限はありませんが、PCの空き容量とAI入力上限は別です。

## 別端末から使う

`relay/` はCloudflare WorkersとSQLite型Durable Objectを使うHTTPS中継です。PCは外向きの接続だけを行います。PC設定画面やCodex RPCは公開しません。中継は会話・添付を永続保存せず、会話とファイルはPCの `.rise-private/` に保存します。PCが停止するとAIチャットはオフラインになります。

GitHubの `RISE authenticated PC relay` ワークフローは、既存のCloudflareデプロイ資格情報と、追加の `RISE_RELAY_TOKEN` シークレットを使用します。同じ接続キーをPCの非公開設定に置き、PC設定のHTTPS URLを公開先に合わせます。キーはブラウザ・URL・公開成果物には含めません。

GitHub Pagesの学習履歴と別ドメインのチャット画面の学習履歴は、自動では同期しません。学習データの移動は設定のバックアップを使います。チャット履歴は接続先PCに共通保存します。

## 検証と公開

`node --test tests/rise-*.test.mjs` と `node scripts/build-rise.mjs`、`node scripts/validate-rise-build.mjs` を実行します。公開するのは `dist/` の許可された静的ファイルだけです。Worker開発用依存は `pnpm install --frozen-lockfile` で固定します。

設計・検証状況は [docs/RISE_REBUILD.md](docs/RISE_REBUILD.md)、入試調査は [docs/ASAHIGAOKA_RESEARCH.md](docs/ASAHIGAOKA_RESEARCH.md) を参照してください。学校の実機・ネットワークでの到達性は別途確認が必要です。
