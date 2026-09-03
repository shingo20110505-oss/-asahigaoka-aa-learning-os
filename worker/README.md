# Rise AI Worker

Cloudflare WorkerをAIプロバイダとRiseの間に置き、**APIキーをGitHub Pagesやブラウザへ出さずにAI生成・検証を行う**ためのバックエンドです。

現在の教材生成本番対象は英語長文です。Phase Dでは数学を最初の共通教科検証として接続し、既存の決定的数学エンジンを主判定にしたままGroq blind監査を追加します。5教科共通AI基盤への移行方針は `../docs/AI_PLATFORM.md` を正本とします。

## 現在の状態

- 本番Worker入口: `src/entry.mjs`
- Workerソースversion: `1.3.0`
- 英語生成: Gemini `gemini-3.5-flash`
- 英語の独立答え直し: Groq `openai/gpt-oss-20b`
- 英語の決定的検証: 既存 `src/index.mjs` の語数・文法・本文根拠・選択肢等の検証資産を維持
- 共通provider入口: `src/providers/index.mjs`
- 共通教科validator: `src/subject-verifier.mjs`
- Gemini provider: `src/providers/gemini.mjs`
- Groq provider: `src/providers/groq.mjs`
- `GEMINI_API_KEY` / `GROQ_API_KEY`: Workerの暗号化Secret
- 5教科共通Groq検証: **英語は本番稼働、数学はコード接続済み・本番確認待ち、国語・理科・社会は未接続**

英語の本番経路は次の通りです。

`request sanitation -> Gemini generation -> English deterministic validation -> Groq blind verification -> agreement gate -> delivery`

Geminiが設定した `answerIndex`、解説、各誤答理由はGroqへ渡しません。Groqへ渡すのは本文、設問、選択肢など解答に必要な最小情報だけです。

数学のPhase D経路は次の通りです。

`math-exam deterministic generation/validation -> POST /v1/verify -> Groq blind solve -> Worker agreement gate -> audit result`

数学は学習者が問題を開くたびにGroq通信を待つ構成にはしません。既存 `math-exam/` の高速・オフライン・決定的検証を主役にし、配備時の実問題監査や将来の生成ライブラリ採用時にGroqを追加ゲートとして使います。

数学でGroqへ送らない情報:

- `expectedAnswerIndex`
- `choices[].ok`
- 解説
- solution steps
- 各誤答理由

Groqへ送るのは問題文、4択、解答に必要な図表条件だけです。

## Provider層

教科コードからAIベンダー固有HTTP仕様を分離しています。

- `callStructuredProvider('gemini', env, request)`
- `callStructuredProvider('groq', env, request)`
- `getProviderStatus(env)`

共通requestは `input`、`schema`、`schemaName`、`maxOutputTokens`、system instruction等を受け取り、providerごとの差異をadapter内で吸収します。

Groq adapterは公式OpenAI互換の `POST https://api.groq.com/openai/v1/chat/completions` とJSON Schema Structured Outputsを使用します。

## 共通教科validator

`src/subject-verifier.mjs` は教科固有エンジンとGroqの間のblind検証境界です。

Phase D開始時点では `subject: math` のみ許可します。入力をsanitizeした後、正答位置をGroqへ渡さず独立解答させ、Worker内で `expectedAnswerIndex` と照合します。

採用条件:

- Groqが `overallPass=true`
- `ambiguity=false`
- 独立 `answerIndex` がRise側正答と一致
- `confidence >= 0.8`

不一致や曖昧性がある場合は `subject_verification_rejected` としてfail closedします。

## GitHub Actionsから配備

GitHubリポジトリの `Settings > Secrets and variables > Actions` に次のRepository secretsを登録します。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `AI_ACCESS_TOKEN`

`.github/workflows/deploy-ai-worker.yml` は必要Secretの存在を確認し、Workerへ暗号化Secretとして設定します。

## Secretの扱い

- APIキーをソースコードへ書かない。
- APIキーをGitへcommitしない。
- APIキーをGitHub Pagesへ配信しない。
- APIキーをブラウザlocalStorageへ保存しない。
- APIキーをActionsログやAPIレスポンスへ表示しない。
- フロントエンドへGemini/GroqのAPIキーを入力させない。

ブラウザが扱うのはWorker URLと `AI_ACCESS_TOKEN` だけです。

## 手元のCLIから配備する場合

```sh
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put AI_ACCESS_TOKEN
npx wrangler deploy
```

本番では `ALLOW_LOCALHOST=false` を維持します。

## 現行API

- `GET /health`: 稼働確認。秘密情報は返さない
- `POST /v1/status`: Bearer認証付き設定確認。生成/検証provider、モデル、教科接続状態を返す
- `POST /v1/reading`: 匿名化した学習要約から英語長文を生成し、Groq独立検証まで通過したものだけ返す
- `POST /v1/verify`: 教科固有の決定的検証済み問題をblind独立検証する。Phase D開始時点では数学のみ対応

英語成功レスポンスの `quality` には、少なくとも次を含めます。

- `method: cross-provider-blind-answer-check`
- `generationProvider: gemini`
- `generationModel: gemini-3.5-flash`
- `verificationProvider: groq`
- `verificationModel: openai/gpt-oss-20b`

数学検証成功レスポンスの `quality` には、少なくとも次を含めます。

- `method: deterministic-plus-cross-provider-blind-answer-check`
- `verificationProvider: groq`
- `verificationModel: openai/gpt-oss-20b`
- `confidence`

Groqが利用不能、quota超過、認証失敗の場合にGemini自己検証へ自動劣化させません。品質保証を下げず、検証を失敗/保留させます。数学の通常学習ホットパスは既存の決定的エンジンを使うため、Groq障害で学習表示自体は停止させません。

## テスト

- `tests/ai-provider-contract.mjs`: provider共通契約
- `tests/ai-reading-contract.mjs`: 既存英語検証資産
- `tests/ai-reading-groq-contract.mjs`: Gemini生成→Groq blind verificationの英語本番編成契約
- `tests/ai-subject-verifier-contract.mjs`: 数学の共通blind検証、answer-key非漏えい、agreement gate契約

Worker配備Workflowでは、配備後に実際のGemini英語生成＋Groq検証を1セット実行し、さらに `math-exam/engine.js` で作った決定的数学問題を `POST /v1/verify` へ送り、実Groq blind監査まで確認します。

## 5教科共通化するときの原則

英語で実証した同じprovider層と共通subject validatorを数学・国語・理科・社会へ段階的に接続します。ただし、数学や理科の数値再計算、国語の採点構造、英語の文法/本文根拠など、**コードで正確に判定できる教科固有検証をGroqで置き換えません**。

詳細・移行段階・品質基準は `docs/AI_PLATFORM.md` を参照してください。
