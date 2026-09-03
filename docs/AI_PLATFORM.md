# Rise AI Platform

この文書は、Rise の5教科AI生成・検証基盤の管理正本である。

## 1. 目的

英語・数学・国語・理科・社会でAIを利用するが、AIの出力をそのまま教材として採用しない。

共通原則:

`生成AI -> 教科固有検証 -> 別AIによる独立検証 -> Rise側の照合 -> 採用または棄却`

AIは教材制作を補助する。正答一意性、数値、保存契約、本番公開の最終保証をAI単独へ委ねない。

## 2. 現在のモデル

生成側Gemini:

`gemini-3.5-flash`

ユーザーから明示的な変更指示がない限り変更しない。

独立検証側Groq:

`openai/gpt-oss-20b`

英語では本番のblind verifierとして接続済み。Phase Dでは数学を最初の共通教科として `POST /v1/verify` へ接続し、国語・理科・社会は後続段階とする。

## 3. プロバイダ責務

### Gemini

主用途:

- 問題本文生成
- 選択肢生成
- 解説生成
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

Groqは英語専用ではなく5教科共通検証providerとして設計する。本番接続は段階的に行い、英語は教材生成経路、数学は決定的エンジンを主判定とした本番監査経路へ接続する。

Groq Strict Structured Outputsへ渡すJSON Schemaはprovider adapter内でGroq互換サブセットへ正規化する。`minItems`、`maxItems`、文字列長などprovider側で不要な検証制約を外しても、Rise側のdeterministic validationとagreement gateは維持し、教材品質基準を緩めない。

### 共通provider入口

`worker/src/providers/index.mjs`

provider共通責務は `callStructuredProvider(provider, env, request)` と `getProviderStatus(env)` に集約する。

### 共通教科validator入口

`worker/src/subject-verifier.mjs`

教科ごとの問題から、正答・解説・誤答理由を除いたblind入力を構築し、Groqの独立解答とRise側の正答を照合する。Phase D開始時点では数学のみ許可する。

### 本番Worker入口

`worker/src/entry.mjs`

英語生成と共通教科検証の編成責務を持ち、既存 `worker/src/index.mjs` の英語検証ロジックを再利用する。

ソースのWorker versionは `v1.3.0`。本番確認は配備Workflowの実英語生成と実数学監査が成功した時点で完了扱いにする。

## 4. セキュリティ

- `GEMINI_API_KEY` と `GROQ_API_KEY` をGitHub Pages、frontend JS、localStorage、公開ログへ出さない。
- APIキーはCloudflare Workerの暗号化Secretとして扱う。
- ブラウザはWorker URLと `AI_ACCESS_TOKEN` のみを扱う。
- 学習者の個人情報をAIへ送らない。
- 適応情報は匿名・限定された弱点、既知語、難度等に絞る。
- AI providerの生エラーをそのままブラウザへ返さない。
- blind verifierへ `expectedAnswerIndex`、正答フラグ、解説、solution steps、誤答理由を渡さない。

## 5. 共通パイプライン

### Stage 1: Request sanitation

難度、教科、出題形式、弱点等を許可リスト・上限で正規化する。

### Stage 2: Gemini generation

AI生成教科では教科スキーマに従って問題セットを生成する。数学の現行 `math-exam/` は決定的テンプレート生成を維持する。

### Stage 3: Deterministic validation

コードで判定できる条件を先に検査する。

例:

- JSON構造
- 問題数
- 選択肢数
- ID重複
- 答え範囲
- 数値の有限性
- 本文中の根拠文字列
- 語数
- 許可文法
- 単位
- 採点単位

### Stage 4: Blind independent verification

Groqへ、生成側の `answerIndex`、正答、解説、各誤答理由を渡さずに解かせる。

英語では本文、設問タイプ、設問文、選択肢だけを渡す。数学では問題文、4択、必要な図表条件だけを渡す。

### Stage 5: Agreement gate

Rise側で次を比較する。

- 生成側または決定的エンジン側の正答
- Groq側の独立解答
- 本文/資料根拠
- 信頼度
- 教科固有検証結果

不一致、曖昧、根拠不足は教材または検証済み成果として扱わない。

### Stage 6: Delivery

英語は全ゲートを通過した問題だけをfrontendへ返す。数学は既存の高速・オフライン学習経路を維持し、Groqを毎問の表示待ちには使わず、本番監査・品質確認経路で追加ゲートとして使う。

## 6. 教科別の追加検証

### 英語

本番稼働確認済み。

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

既存 `worker/src/index.mjs` の英語検証資産を捨てず、`worker/src/entry.mjs` から利用する。

2026-09-03のWorker v1.2.1配備では、契約テスト、Secret確認、Cloudflare配備に加え、実際のGemini生成とGroq blind verificationを1セット実行し、`cross-provider-blind-answer-check`、生成/検証provider provenance、5問、本文根拠を含めて成功を確認した。

### 数学

AIだけで正しさを判定しない。

優先検査:

- 数式・数値の再計算
- 正解一意性
- 選択肢の重複・同値性
- 定義域
- 0除算
- 無限/NaN
- 図形条件
- 複数段階解法との整合

既存 `math-exam/` の決定的検証を中核として維持する。

Phase Dでは `worker/src/subject-verifier.mjs` と `POST /v1/verify` を追加し、`math-exam` が作った問題の問題文・選択肢・必要な図表データだけをGroqへ送り、Rise側の `expectedAnswerIndex` と独立解答をWorker内で照合する。`expectedAnswerIndex`、`choices[].ok`、解説、solution steps、誤答理由はGroqへ送らない。

数学は毎問通信で学習表示をブロックしない。既存のローカル決定的検証を主役にし、配備時の実問題監査や将来の生成ライブラリ採用時にGroqを追加ゲートとして使う。これにより無料枠・速度・PWAオフライン性を維持する。

### 国語

- 本文根拠
- 設問と本文の対応
- 複数選択
- 並べ替え
- 複数欄
- 部分点/marks
- 誤答理由
- 外部知識なしで解けるか

既存 `japanese-exam/` の構造を維持する。

### 理科

- 数値再計算
- 単位
- 有効な条件範囲
- グラフ/表との一致
- 実験条件
- 因果関係
- 中学範囲外知識への依存確認

数式で確認可能なものは決定的コードで検算する。

### 社会

- 年代整合
- 地理条件
- 公民制度
- 資料と選択肢の一致
- 時系列
- 用語の取り違え

AIの記憶だけに依存せず、Rise側の検証済み資料・データセットと照合できる構造へ段階移行する。

## 7. 共通レスポンス方針

将来的な共通問題形式は少なくとも次を持つ。

- `subject`
- `skill`
- `difficulty`
- `question`
- `choices`
- `answer`
- `explanation`
- `evidence`
- `misconception`
- `marks`
- `quality`

各教科固有フィールドを無理に消さず、共通部分と教科拡張を分ける。

共通検証APIの成功レスポンスは、少なくとも `subject`、`itemId`、`accepted`、`quality` を返し、秘密情報や内部プロンプトは返さない。

## 8. 品質情報

英語の採用問題では `quality` に次を記録する。

- `method: cross-provider-blind-answer-check`
- `generationProvider`
- `generationModel`
- `verificationProvider`
- `verificationModel`
- `attempt`
- `questionCount`
- `checkedAt`

数学の共通検証では次を記録する。

- `method: deterministic-plus-cross-provider-blind-answer-check`
- `verificationProvider`
- `verificationModel`
- `confidence`
- `checkedAt`

APIキー、生providerエラー、内部プロンプトは返さない。

## 9. 無料枠保護

- 失敗時の無限再試行を禁止する。
- 1リクエストあたり生成は最大2試行。
- 各候補問題にGroq検証は1回だけ行う。
- 429をprovider別quotaエラーへ変換する。
- 同じ問題を不要に再検証しない。
- 数学は学習者の毎問表示をGroq通信でブロックしない。
- 有料APIへの自動フォールバックを追加しない。

Groq `openai/gpt-oss-20b` の無料枠は運用時点の公式値を確認して管理する。2026-09-03確認時点では 30 RPM / 1,000 RPD / 8K TPM / 200K TPD。

## 10. フォールバック

Groqが一時的に利用不能でも、品質保証を下げて問題を通過させない。

原則:

- `verification_unavailable`、`groq_quota_exceeded`、`groq_auth_failed` 等として失敗させる。
- Groq障害時にGemini自身の検証へ自動劣化させない。
- オフライン時は既存の検証済み問題ライブラリを利用する。
- 数学の学習ホットパスは既存の決定的テンプレートを使うため、Groq障害で学習画面そのものを停止させない。

## 11. テスト方針

AI変更では少なくとも以下を検査する。

- Provider APIキーがfrontendへ含まれない
- author answer keyがblind verifierへ含まれない
- `explanationJa` / `reasonJa` / 数学のsolution stepsがGroqへ送られない
- Groqへ渡すStrict Schemaがprovider互換である
- JSON parse失敗
- 401/403
- 429
- 5xx
- verifier disagreement
- low confidence
- evidence mismatch
- deterministic validation failure
- provider secret未設定

テスト正本:

- `tests/ai-provider-contract.mjs`
- `tests/ai-reading-contract.mjs`
- `tests/ai-reading-groq-contract.mjs`
- `tests/ai-subject-verifier-contract.mjs`

Worker配備後は実Gemini生成＋実Groq英語検証に加え、`math-exam/` の決定的問題を1問生成し、実 `POST /v1/verify` でGroq blind監査を通す。

## 12. 段階移行計画

### Phase A — 管理基盤

状態: **完了**

- `GROQ_API_KEY` をGitHub ActionsからWorker Secretへ安全に渡す。
- AI基盤正本を本書へ統一する。

### Phase B — Provider分離

状態: **完了**

- Gemini/Groqを `worker/src/providers/` へ分離。
- 共通provider契約テストを追加。

### Phase C — 英語で実証

状態: **本番稼働確認済み**

- Gemini 3.5 Flash生成を維持。
- 英語blind verifierをGroq `openai/gpt-oss-20b` へ切替。
- `worker/src/entry.mjs` を本番入口にする。
- answer key / explanation / distractor reasonをGroqへ送らない契約テストを追加。
- Groq Strict Structured Outputs向けSchema正規化をprovider層へ実装。
- 配備Workflowで実Gemini＋実Groqの生成・独立検証成功を確認済み。

### Phase D — 5教科共通化

状態: **実装中（数学コード接続済み・本番確認待ち）**

- `worker/src/subject-verifier.mjs` に共通validator interfaceを追加。
- 数学を最初の共通教科として接続。
- 教科deterministic validatorを優先し、Groqは追加ゲートとする。
- 国語、理科、社会は数学の本番確認後に同じinterfaceへ接続する。

### Phase E — 運用最適化

状態: **未実施**

- quota管理
- キャッシュ
- 生成ライブラリ
- 品質統計
- 失敗理由の可視化

## 13. 現在の状態

- Gemini生成: 稼働中
- Geminiモデル: `gemini-3.5-flash`
- 共通provider interface: 実装済み
- 共通subject validator interface: 数学まで実装済み
- Gemini provider adapter: 実装済み
- Groq provider adapter: 実装済み
- Groq既定検証モデル: `openai/gpt-oss-20b`
- `GROQ_API_KEY`: Worker配備Workflowへ渡せる
- 英語Groq blind verification: 本番コードへ接続済み
- 英語Groq blind verification本番確認: 成功
- Worker本番入口: `worker/src/entry.mjs`
- Workerソースversion: `1.3.0`
- 数学Groq blind verification: `POST /v1/verify` へコード接続済み・本番確認待ち
- 国語・理科・社会のGroq検証: 未接続
- 5教科共通Groq検証: 英語本番＋数学本番監査候補まで接続

この状態表は実装と本番検証に合わせて更新し、未検証を稼働確認済みと記載しない。
