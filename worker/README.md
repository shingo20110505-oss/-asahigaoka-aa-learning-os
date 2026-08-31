# AI Reading Worker

Gemini APIキーをGitHub Pagesやブラウザへ出さず、英語長文を生成・二重検査するCloudflare Workerです。

## 推奨：GitHub Actionsから初回配備

広い権限を要求する `wrangler login` は使わず、Cloudflare公式の「Edit Cloudflare Workers」限定APIトークンを使用します。GitHubリポジトリの `Settings > Secrets and variables > Actions` に次のRepository secretsを登録します。

- `CLOUDFLARE_API_TOKEN`: 対象アカウントだけに限定した「Edit Cloudflare Workers」トークン
- `CLOUDFLARE_ACCOUNT_ID`: 配備先アカウントID
- `GEMINI_API_KEY`: Google AI Studioで作成したGemini APIキー
- `AI_ACCESS_TOKEN`: 自分で作る32文字以上のランダムな接続用トークン

登録後、GitHubの `Actions > Deploy verified AI reading Worker > Run workflow` を実行します。Workflowは暗号化secretをWorkerへ設定し、公開URL、Bearer認証、実際のGemini長文生成、全5問の根拠一致まで検査します。

## 手元のCLIから配備する場合

Cloudflareへログイン済みの自分の端末で `worker` ディレクトリから実行します。

```sh
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put AI_ACCESS_TOKEN
npx wrangler deploy
```

- `GEMINI_API_KEY`: Google AI Studioで作成したGemini APIキー
- `AI_ACCESS_TOKEN`: 自分で作る32文字以上のランダムな接続用トークン
- どちらもファイル、Git、GitHub Actionsログへ書かないでください。
- 公開後、アプリの「AI接続設定」にはWorker URLと `AI_ACCESS_TOKEN` だけを入力します。Gemini APIキーは入力しません。

ローカル開発だけで `http://localhost` を許可する場合は、一時的に `ALLOW_LOCALHOST=true` を設定します。本番では `false` のままにします。

## API

- `GET /health`: 秘密情報を返さない稼働確認
- `POST /v1/status`: Bearer認証付きの設定確認
- `POST /v1/reading`: 匿名化した学習要約から長文を生成

生成後に構造・語数・文法ゲート・本文根拠を検査し、別リクエストで全5問を答え直します。正答と根拠が一致しないセットは返しません。
