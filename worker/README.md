# Rise AI Worker

Cloudflare WorkerをAIプロバイダとRiseの間に置き、**APIキーをGitHub Pagesやブラウザへ出さずにAI生成・検証を行う**ためのバックエンドです。

Riseの最新方針は、AIを「無限生成ボタン」にせず、学習履歴と弱点から必要な問題だけを作り、教科別の決定的検査と別AIのblind検証を通過した問題だけを教材候補にすることです。管理正本は `../docs/AI_PLATFORM.md` です。

## 現在の状態

- 本番Worker入口: `src/entry.mjs`
- Workerソースversion: `1.4.0`
- Exam platform version: `1.0.0`
- 英語長文生成: Gemini `gemini-3.5-flash`
- 5教科の入試小問生成: Gemini `gemini-3.5-flash`
- 英語の独立答え直し: Groq `openai/gpt-oss-20b`
- 5教科共通Groq検証: **英語・数学・国語・理科・社会をコード接続済み**
- 英語の決定的検証: 既存 `src/index.mjs` の語数・文法・本文根拠・選択肢等の検証資産を維持
- 共通provider入口: `src/providers/index.mjs`
- 共通教科validator: `src/subject-verifier.mjs`
- 5教科生成・採用ゲート: `src/exam-platform.mjs`
- Gemini provider: `src/providers/gemini.mjs`
- Groq provider: `src/providers/groq.mjs`
- `GEMINI_API_KEY` / `GROQ_API_KEY`: Workerの暗号化Secret

英語長文の経路:

`request sanitation -> Gemini generation -> English deterministic validation -> Groq blind verification -> agreement gate -> delivery`

5教科共通入試小問の経路:

`request sanitation -> Gemini batch generation -> subject deterministic validation -> Groq blind batch solve -> answer agreement gate -> delivery candidate`

Geminiが設定した `answerIndex`、解説、誤答理由はGroqへ渡しません。Groqへ渡すのは問題ID、本文・資料、設問、4択など、独立解答に必要な最小情報だけです。

既存の数学・国語・理科・社会の教科エンジンは削除・置換しません。数学の数値再計算、国語の複数選択/並べ替え/複数欄/部分点、理科の実験・数値検証、社会の資料統合など、既存の高精度資産は今後の教科別adapterで再利用します。`POST /v1/exam` v1は共通境界を安定させるため、**単一正答4択**を共通形式としています。

## Provider層

教科コードからAIベンダー固有HTTP仕様を分離しています。

- `callStructuredProvider('gemini', env, request)`
- `callStructuredProvider('groq', env, request)`
- `getProviderStatus(env)`

共通requestは `input`、`schema`、`schemaName`、`maxOutputTokens`、system instruction等を受け取り、providerごとの差異をadapter内で吸収します。

Groq adapterはOpenAI互換の `POST https://api.groq.com/openai/v1/chat/completions` とJSON Schema Structured Outputsを使用します。

## 共通教科validator

`src/subject-verifier.mjs` は教科固有エンジンとGroqの間のblind検証境界です。

対応教科:

- `english`
- `math`
- `japanese`
- `science`
- `social`

入力をsanitizeした後、正答位置・解説・solution steps・誤答理由等をGroqへ渡さず独立解答させ、Worker内で `expectedAnswerIndex` と照合します。

採用条件:

- Groqが `overallPass=true`
- `ambiguity=false`
- 独立 `answerIndex` がRise側正答と一致
- `confidence >= 0.8`

不一致や曖昧性がある場合は `subject_verification_rejected` としてfail closedします。

## 5教科生成API

`src/exam-platform.mjs` が `POST /v1/exam` を担当します。

入力の主フィールド:

- `subject`: `english | math | japanese | science | social`
- `count`: 1〜10
- `difficulty`: 1〜10
- `skill`
- `focus[]`
- `recentQuestionIds[]`

返却問題の共通フィールド:

- `id`
- `subject`
- `skill`
- `difficulty`
- `question`
- `context`
- `choices`
- `answerIndex`
- `answer`
- `explanation`
- `evidence`
- `misconception`
- `marks`
- `quality`

問題IDは問題内容から安定生成する `rise-<subject>-<16hex>` 形式です。同じ問題を履歴・復習・分析へ渡すための共通ID境界として使えます。

### 教科別決定的ゲート

共通検査に加え、現在は次を行います。

- 英語/国語: contextがある読解では `evidence` が本文中の完全一致根拠であること
- 数学: NaN/Infinity等を拒否し、数学的条件を要求
- 理科: 実験・観察・資料・条件など解答条件を要求
- 社会: 資料文脈を要求し、「現在の首相」等の変動事実依存を拒否
- 共通: 4択一意、重複なし、答え範囲、解説、根拠、誤答原因、marks、ID、問題文中の答え漏えいを検査

このv1の決定的ゲートは、既存教科エンジンの全検算を置き換えるものではありません。次段階で既存 `math-exam/`、`japanese-exam/`、`science-exam/`、`social-exam/` を教科adapterとしてさらに接続します。

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

## 現行API

- `GET /health`: 稼働確認。秘密情報は返さない
- `POST /v1/status`: Bearer認証付き設定確認。生成/検証provider、モデル、5教科接続状態、安全策を返す
- `POST /v1/reading`: 英語長文をGeminiで生成し、英語deterministic validationとGroq独立検証まで通過したものだけ返す
- `POST /v1/verify`: 英語・数学・国語・理科・社会の単一正答4択をblind独立検証する
- `POST /v1/exam`: 5教科の入試小問をGeminiで生成し、教科別決定的検査とGroq blind agreementを通過したものだけ返す

英語長文成功レスポンス:

- `method: cross-provider-blind-answer-check`
- `generationProvider: gemini`
- `generationModel: gemini-3.5-flash`
- `verificationProvider: groq`
- `verificationModel: openai/gpt-oss-20b`

共通検証成功レスポンス:

- `method: deterministic-plus-cross-provider-blind-answer-check`
- `verificationProvider: groq`
- `verificationModel: openai/gpt-oss-20b`
- `confidence`

5教科生成問題の採用ゲート:

- `method: gemini-authoring-subject-deterministic-groq-blind-agreement`
- 問題ごとに生成provider/model・検証provider/model・verifier confidenceを記録

Groqが利用不能、quota超過、認証失敗の場合にGemini自己検証へ自動劣化させません。品質保証を下げず、新規問題を採用しません。Gemini/Groqの429時も有料APIへ自動フォールバックしません。

## テスト

- `tests/ai-provider-contract.mjs`: provider共通契約
- `tests/ai-reading-contract.mjs`: 既存英語検証資産
- `tests/ai-reading-groq-contract.mjs`: Gemini生成→Groq blind verificationの英語契約
- `tests/ai-subject-verifier-contract.mjs`: 5教科blind検証、answer-key非漏えい、agreement gate契約
- `tests/ai-exam-platform-contract.mjs`: 5教科生成、教科別決定的ゲート、安定ID、Gemini→Groq blind agreement契約

Worker配備Workflowでは、配備後に実際のGemini英語長文＋Groq検証、`math-exam/engine.js` 由来の数学問題＋Groq監査、さらに理科 `POST /v1/exam` のGemini生成→決定的検査→Groq一致まで実通信で検証します。

## Verified Question Poolとの境界

`POST /v1/exam` は「検証済み問題を作って返す」Phase 3のバックエンドです。**永続的なVerified Question Poolへの保存・再利用、学習履歴からの自動補充、復習への自動連携は別段階で、まだこのWorkerだけでは完了していません。**

したがって現時点で、AI APIの完成をプロジェクト全体の学習循環完成とは扱いません。次段階は、合格した共通ID付き問題をプールへ保存し、Riseの弱点分析が「次の一問」を選択できるようにすることです。

## 5教科共通化の原則

英語で実証した同じprovider層・共通validator・blind agreementを5教科へ使います。ただし、数学や理科の数値再計算、国語の採点構造、英語の文法/本文根拠など、**コードで正確に判定できる教科固有検証をGroqで置き換えません**。

既存の学習履歴、復習、PWA、Service Worker、オフライン動作、教科別エンジンには今回のWorker更新で変更を加えません。

詳細・移行段階・品質基準は `docs/AI_PLATFORM.md` を参照してください。
