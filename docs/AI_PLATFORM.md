# Rise AI Platform

この文書は、Rise の5教科AI生成・検証基盤の管理正本である。

## 1. 最終目的

Riseは「AIが問題を作るアプリ」ではない。最新の上位方針は、学習履歴を見て弱点を判断し、愛知県公立高校入試で次に解くべき一問を選び、必要な場合だけAIで良問を制作し、検品・演習・復習・分析へつなぐ学習OSである。

共通原則:

`学習履歴 -> 弱点判断 -> 次問選択 -> 必要時だけAI制作 -> 教科固有検証 -> 別AIによる独立検証 -> Rise側の照合 -> 採用/棄却 -> 演習 -> 復習 -> 分析へ戻す`

AIは教材制作を補助する。正答一意性、数値、保存契約、本番公開の最終保証をAI単独へ委ねない。

## 2. 現在の到達点

2026-09-04時点のソース状態:

- 共通provider interface: 実装済み
- 共通subject validator interface: 5教科まで実装済み
- 英語Groq blind verification: 本番コードへ接続済み
- Worker本番入口: `worker/src/entry.mjs`
- Workerソースversion: `v1.4.0`
- 5教科共通生成入口: `POST /v1/exam`
- 5教科共通blind監査入口: `POST /v1/verify`
- 英語長文入口: `POST /v1/reading`
- 5教科共通Groq検証: 英語・数学・国語・理科・社会をコード接続済み
- 数学Groq blind verification: コード接続済み
- 国語・理科・社会のGroq検証: コード接続済み
- Verified Question Pool永続保存: 未実装
- 弱点分析からの自動プール補充: 未実装
- 共通問題ID: `rise-<subject>-<16hex>` を実装済み

この段階を、最新プロジェクト計画における**Phase 3「AI Problem Production Engine」の共通バックエンド実装**と扱う。Phase 4のVerified Question Pool、Phase 5のAdaptive Engine統合までを「学習循環完成」とは呼ばない。

## 3. 現在のモデル

生成側Gemini:

`gemini-3.5-flash`

ユーザーから明示的な変更指示がない限り変更しない。

独立検証側Groq:

`openai/gpt-oss-20b`

5教科共通のblind verifierとして使う。生成側の正答を与えず、問題・資料・選択肢だけを独立して解かせる。

## 4. プロバイダ責務

### Gemini

主用途:

- 問題本文生成
- 選択肢生成
- 解説生成
- evidence / misconception生成
- 教科固有JSONスキーマへの出力

APIキー: `GEMINI_API_KEY`

provider adapter: `worker/src/providers/gemini.mjs`

### Groq

主用途:

- 生成側の正解を渡さない独立解答
- 正答一意性の補助判定
- 本文・資料根拠の独立確認
- Geminiと異なるモデル系統によるクロスチェック

APIキー: `GROQ_API_KEY`

provider adapter: `worker/src/providers/groq.mjs`

Groq Strict Structured Outputsへ渡すJSON Schemaはprovider adapter内でGroq互換サブセットへ正規化する。provider側の制約差があっても、Rise側のdeterministic validationとagreement gateは維持し、教材品質基準を緩めない。

### 共通provider入口

`worker/src/providers/index.mjs`

provider共通責務は `callStructuredProvider(provider, env, request)` と `getProviderStatus(env)` に集約する。

### 共通教科validator入口

`worker/src/subject-verifier.mjs`

英語・数学・国語・理科・社会の単一正答4択をblind監査する。教科ごとの問題から、正答・解説・solution steps・誤答理由を除いた入力を構築し、Groqの独立解答とRise側の正答を照合する。

### 5教科生成入口

`worker/src/exam-platform.mjs`

Geminiのバッチ生成、共通/教科別deterministic validation、Groqのblind batch solve、agreement gate、安定問題ID付与を担当する。

### 本番Worker入口

`worker/src/entry.mjs`

英語長文、5教科生成、5教科blind監査の編成責務を持つ。既存 `worker/src/index.mjs` の英語検証ロジックは維持して再利用する。

## 5. セキュリティ

- `GEMINI_API_KEY` と `GROQ_API_KEY` をGitHub Pages、frontend JS、localStorage、公開ログへ出さない。
- APIキーはCloudflare Workerの暗号化Secretとして扱う。
- ブラウザはWorker URLと `AI_ACCESS_TOKEN` のみを扱う。
- 学習者の個人情報をAIへ送らない。
- 適応情報は匿名・限定された弱点、既知語、難度等に絞る。
- AI providerの生エラーをそのままブラウザへ返さない。
- blind verifierへ `expectedAnswerIndex`、`answerIndex`、正答フラグ、解説、solution steps、誤答理由を渡さない。
- provider障害時に品質保証を下げて問題を採用しない。

## 6. 共通パイプライン

### Stage 1: Request sanitation

難度、教科、skill、focus、直近問題ID等を許可範囲と上限で正規化する。

### Stage 2: Gemini generation

AI生成教科では共通スキーマに従い、原則5〜10問のバッチ生成へ拡張できる構造にする。現在の `POST /v1/exam` は1〜10問を受け付ける。

公式問題、著作権素材、問題集の文言を再現せず、オリジナルの愛知県公立高校入試型問題を作る。

### Stage 3: Deterministic validation

AIより先にコードで判定できる条件を検査する。

共通:

- JSON構造
- 問題数上限
- 4択
- 選択肢重複
- answerIndex範囲
- answerと選択肢の一致
- explanation
- evidence
- misconception
- marks
- 安定ID
- 問題文中の答え漏えい
- 直近IDとの重複

教科別の現行追加ゲート:

- 英語/国語: contextがある読解ではevidenceが本文中の完全一致文字列
- 数学: NaN/Infinity等を拒否し、数学的条件を要求
- 理科: 実験・観察・資料・測定・条件等の解答条件を要求
- 社会: 資料文脈を要求し、現在の首相など変動事実依存を拒否

### Stage 4: Blind independent verification

Groqへ、生成側の `answerIndex`、正答、解説、誤答理由を渡さず独立解答させる。

`POST /v1/exam` のGroq入力は問題ごとの `id / context / question / choices` のみを基本とする。

### Stage 5: Agreement gate

Rise側で次を比較する。

- 生成側または決定的エンジン側の正答
- Groq側の独立解答
- `overallPass`
- `ambiguity`
- `confidence >= 0.8`

不一致、曖昧、低信頼、根拠不足は採用しない。

5教科生成採用method:

`gemini-authoring-subject-deterministic-groq-blind-agreement`

単問blind監査method:

`deterministic-plus-cross-provider-blind-answer-check`

英語長文method:

`cross-provider-blind-answer-check`

### Stage 6: Delivery candidate

全ゲートを通った問題だけを共通問題形式で返す。現時点ではこの返却を**Verified Question Poolに保存する前のdelivery candidate**と扱う。

### Stage 7: Verified Question Pool（次段階）

合格問題を永続保存し、同じ問題を何度もAI生成・再検証しない。オフライン時やAPI上限時にも学習を継続できるようにする。

### Stage 8: Adaptive selection（次段階）

学習履歴・弱点・復習予定からRise自身が次問を選び、プール不足時だけAI生成を要求する。

## 7. 教科別方針

### 英語

既存長文経路は維持する。

`Gemini 3.5 Flash生成 -> 英語deterministic validation -> Groq GPT-OSS-20B blind verification -> agreement gate`

維持する検査:

- 語数・段落数
- 中学範囲の文法ゲート
- 本文と選択肢の言語
- 本文中の完全一致根拠
- 4択の重複防止
- 設問タイプ構成
- Groq独立解答一致
- confidence閾値

英語小問は `POST /v1/exam` でも生成できる。語彙学習そのものにはAPIを使わない。

### 数学

AIだけで正しさを判定しない。

既存 `math-exam/` の決定的生成・検証を保護する。数式・数値の再計算、正解一意性、定義域、0除算、図形条件等を既存エンジン側で検証できる構造は捨てない。

`POST /v1/verify` では問題文・4択・必要な図表条件のみをGroqへ送り、Rise側の正答と独立解答を照合する。毎問表示のホットパスをGroq通信でブロックしない。

### 国語

既存 `japanese-exam/` の次を維持する。

- 本文根拠
- 4〜6択
- 単一選択
- 複数選択
- 並べ替え
- 複数欄
- 部分点/marks
- 誤答理由
- 外部知識なしで解けるか

`POST /v1/exam` v1は5教科共通境界を安定させるため単一正答4択に限定しており、既存の複雑な国語採点構造を削除・置換しない。次段階で専用adapterを接続する。

### 理科

既存 `science-exam/` の実験・観察・資料・数値再計算・単位・条件範囲・因果検証を保護する。

共通APIではまず資料/実験条件を持つ4択問題を生成しblind検証する。数式で確認可能なものは最終的に既存決定的コードへ寄せる。

### 社会

既存 `social-exam/` の資料統合構造を保護する。

現行共通APIでは資料文脈を必須寄りにし、年代・地理・公民の安定知識を使う。現在の首相・最新人口など生成後に変わり得る事実へ依存する問題を拒否する。将来はRise側の検証済み資料・データセット照合を強化する。

## 8. 共通問題形式

`POST /v1/exam` v1は少なくとも次を返す。

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

共通問題IDは `rise-<subject>-<16hex>`。問題内容から安定生成し、将来のプール・演習・復習・分析で同じ問題を追跡するための境界とする。

各教科固有フィールドを無理に消さず、共通部分と教科拡張を分ける。

## 9. 品質情報

英語長文:

- `method: cross-provider-blind-answer-check`
- `generationProvider`
- `generationModel`
- `verificationProvider`
- `verificationModel`
- `attempt`
- `questionCount`
- `checkedAt`

5教科単問blind監査:

- `method: deterministic-plus-cross-provider-blind-answer-check`
- `verificationProvider`
- `verificationModel`
- `confidence`
- `checkedAt`

5教科生成問題:

- `verified: true`
- `method: subject-deterministic-plus-cross-provider-blind-answer-check`
- `generationProvider`
- `generationModel`
- `verificationProvider`
- `verificationModel`
- `verifierConfidence`
- `checkedAt`

APIキー、生providerエラー、内部プロンプトは返さない。

## 10. 無料枠保護

- 失敗時の無限再試行を禁止する。
- 1リクエストあたり生成は最大2試行。
- バッチ単位でGroqへblind検証する。
- 429をprovider別quotaエラーへ変換する。
- 同じIDの問題を不要に再採用しない。
- 有料APIへの自動フォールバックを追加しない。
- Gemini/Groqが止まっても、将来のVerified Question Poolから学習継続できる設計にする。
- 数学の既存ローカル学習ホットパスはGroq通信でブロックしない。

## 11. フォールバック

Groqが一時的に利用不能でも、品質保証を下げて問題を通過させない。

原則:

- `verification_unavailable`、`groq_quota_exceeded`、`groq_auth_failed` 等として失敗させる。
- Groq障害時にGemini自身の検証へ自動劣化させない。
- Gemini 429時は新規生成を停止する。
- 有料providerへ自動切替しない。
- オフライン/API停止時は既存教材と、Phase 4以降の検証済み問題プールを利用する。

## 12. テスト方針

AI変更では少なくとも以下を検査する。

- Provider APIキーがfrontendへ含まれない
- author answer keyがblind verifierへ含まれない
- explanation / misconception / solution steps / choicesの正答フラグがGroqへ送られない
- strict JSON schemaでprovider出力を受ける
- 4択重複を拒否する
- 安定IDを生成する
- 国語/英語の本文根拠不一致を拒否する
- 社会の変動事実依存を拒否する
- Groq独立解答とauthor answerが不一致なら拒否する
- confidence閾値未満なら拒否する
- 429で有料fallbackしない

契約テスト:

- `tests/ai-provider-contract.mjs`
- `tests/ai-reading-contract.mjs`
- `tests/ai-reading-groq-contract.mjs`
- `tests/ai-subject-verifier-contract.mjs`
- `tests/ai-exam-platform-contract.mjs`

## 13. 本番配備契約

`.github/workflows/deploy-ai-worker.yml` は、Worker変更を本番へ出す前後に次を検査する。

1. Node syntax check
2. provider/英語/5教科subject verifier/5教科exam platform契約テスト
3. 必須Secretの存在
4. Cloudflare Worker deploy
5. `/health` がWorker v1.4.0 / `rise-ai-platform` を返すこと
6. `/v1/status` がGemini/Groqと5教科接続状態を返すこと
7. 実Gemini英語長文 -> Groq blind verification
8. `math-exam/engine.js`由来数学問題 -> 実Groq blind監査
9. 実理科 `POST /v1/exam` -> Gemini -> deterministic -> Groq agreement

本番Workflowが成功するまでは、「本番v1.4.0確認済み」とは記録しない。

## 14. 既存資産保護

今回のAI Worker共通化で壊してはいけないもの:

- 既存学習履歴
- 復習ページと覚えた/要復習進捗
- PWA
- Service Worker
- オフライン学習
- `math-exam/`
- `japanese-exam/`
- `science-exam/`
- `social-exam/`
- 高校数学
- Chronologia
- 国語語彙
- 既存英語長文
- 適応学習ロジック

今回のv1.4.0 Worker変更では、これらのfrontend/runtime/storage資産は変更対象にしない。

## 15. 次段階

API基盤の次は以下の順で進める。

1. Verified Question Poolの正本形式を決める
2. 合格した共通ID問題を永続保存・重複排除する
3. PWAへ検証済みプールをキャッシュする
4. 学習履歴・弱点から次問を選ぶAdaptive Engineへ接続する
5. プール不足時だけ `POST /v1/exam` を呼ぶ
6. 誤答を復習へつなぎ、同じ問題IDで分析へ戻す
7. 既存教科エンジンの高度な決定的検査をadapter化して共通APIへ追加する

これにより、Riseは「APIで問題を作る機能」ではなく、**AI Problem Production Engine + Verified Question Pool + Adaptive Engine + Review + Analytics**が循環する学習OSになる。
