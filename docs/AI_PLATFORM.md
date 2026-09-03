# Rise AI Platform

この文書は、Rise の5教科AI生成・検証基盤の管理正本である。

## 1. 目的

英語・数学・国語・理科・社会でAIを利用するが、AIの出力をそのまま教材として採用しない。

共通原則:

`生成AI -> 教科固有検証 -> 別AIによる独立検証 -> Rise側の照合 -> 採用または棄却`

AIは教材制作を補助する。正答一意性、数値、保存契約、本番公開の最終保証をAI単独へ委ねない。

## 2. 現在の生成モデル

現行の生成側Geminiモデルは:

`gemini-3.5-flash`

ユーザーから明示的な変更指示がない限り、このモデルを変更しない。

Groq独立検証providerの既定モデル候補は:

`openai/gpt-oss-20b`

ただし、provider実装が存在することと本番教材経路で有効化されていることを区別する。現時点ではGroqを本番の英語blind verifierへまだ接続していない。

## 3. プロバイダ責務

### Gemini

主用途:

- 問題本文生成
- 選択肢生成
- 解説生成
- 教科固有JSONスキーマへの出力

APIキー:

`GEMINI_API_KEY`

provider adapter:

`worker/src/providers/gemini.mjs`

### Groq

主用途:

- 生成側の正解を渡さない独立解答
- 正答一意性の補助判定
- 本文・資料根拠の独立確認
- Geminiと異なるモデル系統によるクロスチェック

APIキー:

`GROQ_API_KEY`

provider adapter:

`worker/src/providers/groq.mjs`

Groqは英語専用にしない。5教科共通の検証プロバイダとして統合する。

GroqのHTTP/JSON Schema providerクライアントは実装済みだが、現時点では本番教材経路へ未接続である。英語の現行blind validationは引き続きGemini別リクエスト方式で稼働している。

### 共通provider入口

`worker/src/providers/index.mjs`

教科コードは将来的にベンダー固有HTTP形式ではなく、`callStructuredProvider(provider, env, request)` を経由する。provider statusは秘密値を返さず、configured/model/roleのみを扱う。

## 4. セキュリティ

- `GEMINI_API_KEY` と `GROQ_API_KEY` をGitHub Pages、フロントエンドJS、localStorage、公開ログへ出さない。
- APIキーはCloudflare Workerの暗号化Secretとして扱う。
- ブラウザはWorker URLとアプリ用接続トークンのみを扱う。
- `AI_ACCESS_TOKEN` もソースへ直書きしない。
- AIプロバイダのエラーレスポンスをそのまま公開画面へ返さず、秘密情報を含まない診断コードへ変換する。
- 学習者の個人情報をAIへ送らない。適応情報は匿名・限定された弱点/既知語/難度等に絞る。

## 5. 共通パイプライン

### Stage 1: Request sanitation

難度、教科、出題形式、弱点等を許可リスト・上限で正規化する。

### Stage 2: Gemini generation

教科スキーマに従って問題セットを生成する。

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

Groqへ、生成側の `answerIndex`・正答・解説を渡さずに問題を解かせる。

検証AIには必要最小限の本文、資料、設問、選択肢だけを渡す。

### Stage 5: Agreement gate

Rise側で次を比較する。

- Gemini側の正答
- Groq側の独立解答
- 必要な根拠
- 信頼度
- 教科固有検証結果

不一致、曖昧、根拠不足は教材として返さない。

### Stage 6: Delivery

全ゲートを通過した問題だけをフロントエンドへ返す。

## 6. 教科別の追加検証

### 英語

- 語数・段落数
- 中学範囲の文法ゲート
- 本文と選択肢の言語
- 本文中の完全一致根拠
- 4択の重複防止
- 設問タイプ構成
- 独立解答一致

現行 `worker/src/index.mjs` の英語検証資産を共通AI基盤へ移す際も失わない。

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

将来的な共通問題形式は、少なくとも次の概念を持つ。

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

## 8. 品質情報

採用問題には、可能な範囲で次を記録する。

- 生成モデル
- 検証モデル
- deterministic validation結果
- independent verification結果
- attempt数
- checkedAt
- schemaVersion

ブラウザへAPIキー・生のプロバイダエラー・内部プロンプトは返さない。

## 9. 無料枠保護

- 失敗時の無限再試行を禁止する。
- 1リクエストあたりの生成回数と検証回数に上限を持つ。
- 429は明示的にquota状態へ変換する。
- 同じ問題を不要に再検証しない。
- バッチ生成では1日上限を管理できる状態を維持する。
- 有料APIへの自動フォールバックを勝手に追加しない。
- Groq本番接続は、無料枠・quota・失敗時挙動を実測してから有効化する。

## 10. フォールバック

Groqが一時的に利用不能でも、品質保証を下げて問題を通過させない。

原則:

- 独立検証が必須の生成経路では `verification_unavailable` として生成を保留/失敗させる。
- 「Groqが落ちたのでGemini自身で検証して合格扱い」に自動劣化させない。
- オフライン時は既存の検証済み問題ライブラリを利用する。

## 11. テスト方針

AI変更では少なくとも以下を検査する。

- Provider APIキーがfrontendへ含まれない
- author answer keyがblind verifierへ含まれない
- JSON parse失敗
- 401/403
- 429
- 5xx
- timeout
- verifier disagreement
- low confidence
- evidence mismatch
- deterministic validation failure
- provider secret未設定

既存 `tests/ai-reading-contract.mjs` は英語契約として維持する。

共通provider契約は `tests/ai-provider-contract.mjs` で検査し、Gemini/Groqのprovider選択、Secret非露出、Structured JSON request、未設定Secret、未対応providerを確認する。

## 12. 段階移行計画

### Phase A — 管理基盤

- `GROQ_API_KEY` をGitHub ActionsからWorker Secretへ安全に渡す。
- AI基盤正本を本書へ統一する。

状態: **完了**

### Phase B — Provider分離

- Gemini呼び出しとGroq呼び出しをprovider層へ分離する。
- 英語固有コードから共通provider責務を外す。

状態: **基盤実装済み**

`worker/src/providers/` と共通契約テストを追加済み。現行英語runtimeはまだ旧直接Gemini呼び出しを使用しているため、完全な切替はPhase Cで行う。

### Phase C — 英語で実証

- 現行blind verifierをGroqへ切り替える。
- Gemini 3.5 Flash生成は維持する。
- 契約テスト・本番テストを通す。
- 無料枠・429・timeout・Groq未設定時の失敗を確認する。

状態: **未実施**

### Phase D — 5教科共通化

- 数学、国語、理科、社会へ共通validator interfaceを接続する。
- 各教科のdeterministic validatorを優先し、Groqは追加ゲートとする。

状態: **未実施**

### Phase E — 運用最適化

- quota管理
- キャッシュ
- 生成ライブラリ
- 品質統計
- 失敗理由の可視化

状態: **未実施**

## 13. 現在の状態

- Gemini生成: 稼働中
- Geminiモデル: `gemini-3.5-flash`
- 既存英語blind validation: Gemini別リクエスト方式で稼働中
- 共通provider interface: 実装済み
- Gemini provider adapter: 実装済み
- Groq provider adapter: 実呼び出しコード実装済み・本番未接続
- Groq既定検証モデル候補: `openai/gpt-oss-20b`
- `GROQ_API_KEY`: Worker配備Workflowへ渡せる
- Groq本番教材呼び出し: 未接続
- 5教科共通Groq検証: 未接続

この状態表は実装を進めるたびに更新し、未接続を稼働済みと記載しない。
