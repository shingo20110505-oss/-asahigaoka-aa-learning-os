# Rise AI Worker

Cloudflare WorkerをAIプロバイダとRiseの間に置き、**APIキーをGitHub Pagesやブラウザへ出さずにAI生成・検証を行う**ためのバックエンドです。

現在の実装は英語長文を中心に稼働しています。5教科共通AI基盤への移行方針は `../docs/AI_PLATFORM.md` を正本とします。

## 現在の状態

- 生成モデル: `gemini-3.5-flash`
- 英語生成: Geminiで稼働中
- 英語の独立答え直し: 現在はGeminiへの別リクエストで稼働中
- `GROQ_API_KEY`: 配備Secretとして受け渡し可能
- Groq実呼び出し: **まだ未実装**
- 5教科共通Groq検証: **まだ未実装**

未実装の機能を稼働済みとして扱わないでください。

## GitHub Actionsから配備

広い権限を要求する恒常的なCLIログインではなく、Cloudflare Worker編集に必要な範囲へ限定したAPIトークンを使用します。

GitHubリポジトリの `Settings > Secrets and variables > Actions` に次のRepository secretsを登録します。

- `CLOUDFLARE_API_TOKEN`: 配備先アカウントへ限定したCloudflare Worker編集トークン
- `CLOUDFLARE_ACCOUNT_ID`: 配備先CloudflareアカウントID
- `GEMINI_API_KEY`: Gemini APIキー
- `GROQ_API_KEY`: Groq APIキー。共通独立検証への移行用
- `AI_ACCESS_TOKEN`: RiseからWorkerへ接続するためのランダムなBearer token

`.github/workflows/deploy-ai-worker.yml` は必要Secretの存在を確認し、Workerへ暗号化Secretとして設定します。

## Secretの扱い

次を守ります。

- APIキーをソースコードへ書かない。
- APIキーをGitへcommitしない。
- APIキーをGitHub Pagesへ配信しない。
- APIキーをブラウザlocalStorageへ保存しない。
- APIキーをActionsログやAPIレスポンスへ表示しない。
- フロントエンドの「AI接続設定」へGemini/GroqのAPIキーを入力させない。

ブラウザが扱うのは、原則としてWorker URLと `AI_ACCESS_TOKEN` だけです。

## 手元のCLIから配備する場合

Cloudflareへログイン済みの自分の端末で `worker` ディレクトリから実行します。

```sh
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put AI_ACCESS_TOKEN
npx wrangler deploy
```

Secret値はファイルへ保存せず、対話入力で設定します。

ローカル開発だけで `http://localhost` を許可する場合は、一時的に `ALLOW_LOCALHOST=true` を設定します。本番では `false` のままにします。

## 現行API

- `GET /health`: 秘密情報を返さない稼働確認
- `POST /v1/status`: Bearer認証付きの設定確認
- `POST /v1/reading`: 匿名化した学習要約から英語長文を生成

現行英語フローは、Gemini生成後に構造・語数・文法ゲート・本文根拠を検査し、別リクエストで全5問を答え直します。正答と根拠が一致しないセットは返しません。

## 5教科共通化するときの原則

今後はprovider呼び出しを教科ロジックから分離し、概ね次の責務へ整理します。

`request sanitation -> Gemini generation -> subject deterministic validation -> Groq blind verification -> agreement gate -> delivery`

ただし、数学や理科の数値検証、国語の採点構造、英語の文法/本文根拠など、**コードで正確に判定できる教科固有検証をGroqで置き換えません**。

詳細・移行段階・品質基準は `docs/AI_PLATFORM.md` を参照してください。
