# Rise System Management

この文書は、Rise の**システム管理正本**である。
日常の具体的な操作は `OPERATIONS.md`、AI生成・検証は `docs/AI_PLATFORM.md` を参照する。

## 1. 管理目的

Riseは、単一HTMLではなく、既存本体・複数世代の学習エンジン・教科別エンジン・復習・AI・PWA・保存保護・GitHub Actions・公開後検証が重なるシステムである。

管理の最優先事項は、機能を増やすことではなく、**正本・責任範囲・保存契約・公開経路を明確にし、既存学習資産を壊さず段階移行できる状態を維持すること**とする。

## 2. 正本一覧

| 領域 | 正本・中心 | 管理ルール |
|---|---|---|
| コード | `main` | 開発の最終正本。通常は作業ブランチからマージ |
| 実行境界 | `app/runtime-registry.js` | runtime/data/state/engines/ui の登録境界 |
| 境界検査 | `tests/architecture-boundaries.mjs` | 新旧レイヤーの混線を検出する基準 |
| メインUI/旧本体 | `index.html` | 段階移行対象。一括削除しない |
| 追加ロード | `v23-loader.js` | 後段モジュールの読み込み経路を確認する |
| 学習状態 | `asahi_learning_os_v1` | 既存履歴を維持する |
| 保存保護 | `storage-resilience-v1.js` | 履歴退行・破壊的上書きを防ぐ |
| 復習データ | `review-bank-v1.js` | 復習の唯一のデータ正本 |
| 復習UI | `review/index.html` | Review v2 を現役UIとする |
| 数学入試 | `math-exam/` | 愛知県型の決定的検証資産を維持 |
| 国語入試 | `japanese-exam/` | 22点構造・採点単位・根拠検証を維持 |
| 英語AI | `ai-reading-v1.js` + `worker/` | ブラウザとAIプロバイダを分離 |
| AI共通方針 | `docs/AI_PLATFORM.md` | 5教科の生成・独立検証の正本 |
| PWA | `manifest.webmanifest` / `sw.js` | 更新性とオフライン互換を維持 |
| 公開 | `.github/workflows/deploy-pages.yml` | GitHub Pagesの正規公開経路 |
| 本番状態 | `DEPLOY_STATUS.txt` / `PUBLIC_VERIFY_STATUS.txt` | 公開後検証の結果を確認 |

後継ファイルへ正式移行する場合は、正本一覧・テスト・運用文書を同じ変更で更新する。

## 3. レイヤー境界

管理上の基本レイヤーは次の順序とする。

1. `runtime`
2. `data`
3. `state`
4. `engines`
5. `ui`
6. `PWA`
7. `QA / deployment`

### runtime

起動順、モジュール登録、依存解決を担当する。教材内容やUI状態を直接所有しない。

### data

問題バンク、教材カタログ、静的定義を担当する。学習者の永続状態を書き換えない。

### state

学習履歴、復習進捗、設定、保存契約を担当する。UIから保存実装を分離する。

### engines

教科別の出題、採点、検証、適応学習を担当する。UI描画を直接所有しない。

### ui

表示・操作を担当する。保存キーやAIプロバイダへ直接依存する実装を増やさない。

### PWA

オフライン、更新、キャッシュを担当する。古いコードを長期間固定するキャッシュ戦略を避ける。

### QA / deployment

構文、契約、教材、公開資産、本番挙動を検査する。検査を迂回して公開しない。

## 4. 保護対象

次の既存資産は、機能追加・UI刷新・高速化より優先して守る。

- 学習履歴
- 回答履歴
- 誤答履歴
- 復習の「覚えた／要復習」
- 適応学習の習熟度・忘却・弱点情報
- PWA / オフライン
- Service Worker更新性
- ログイン画像・音声
- AI接続設定
- Chronologia
- 国語語彙教材
- 数学・国語等の教科固有検証

破壊的移行が必要な場合は、旧データ読み込み・変換・ロールバック・テストを先に設計する。

## 5. 保存契約

`app/runtime-registry.js` が管理対象として扱う保存キーを基準とする。

主な保護キー:

- `asahi_learning_os_v1`
- `asahi_learning_os_best_snapshot_v1`
- `asahi_review_progress_v1`
- `aa_review_page_v1`
- `aa_ai_reading_config_v1`
- `aa_japanese_exam_session_v1`
- `aa_japanese_exam_history_v1`
- `aa_japanese_exam_imports_v1`

IndexedDBを含む既存保存先も同様に保護する。

禁止事項:

- `localStorage.clear()`
- 保存キーの無計画な改名
- 回答数・履歴量が減るstateの強制上書き
- UI改修と同時に保存形式を無関係に変更すること

## 6. 変更の分類

### A. 教材・コンテンツ変更

問題・解説・教材データのみ。対応する教材検査を必須とする。

### B. 復習変更

`review-bank-v1.js` を正本とし、通常変更より厳しい本番一致確認を行う。画像は `review/assets/` に永続保存する。

### C. 教科エンジン変更

採点・生成・難度・選択肢・図形等。教科固有テストと共通境界テストを行う。

### D. AI変更

Worker、プロンプト、スキーマ、AIモデル、独立検証。ブラウザへ秘密情報を出さず、契約テストを更新する。

### E. UI変更

表示・操作・デザイン。学習状態・保存契約・教科ロジックを同時に書き換えない。

### F. PWA / 配信変更

Service Worker、manifest、公開経路。オンライン更新とオフラインの両方を検査する。

### G. 管理 / CI変更

Workflow、状態ファイル、公開確認、文書。自己pushや重複実行を増やさないことを重視する。

## 7. 標準変更フロー

1. 最新 `main` と対象SHAを取得する。
2. 変更分類と影響範囲を決める。
3. 作業ブランチを作る。
4. 1目的に絞って変更する。
5. 対応テストを実行する。
6. 差分を確認する。
7. `main` へマージする。
8. GitHub Actions / Pagesを確認する。
9. 本番資産・状態ファイルを確認する。
10. 完了条件を満たしてから完了扱いする。

直接mainへ小さな連続コミットを重ね、Workflowを何度も起動する運用は避ける。

## 8. 公開の正規経路

現在の正規経路は `.github/workflows/deploy-pages.yml` によるGitHub Pages公開である。

旧 `gh-pages` 手動同期方式を運用正本として扱わない。

公開後は少なくとも次を確認する。

- Pages deployment成功
- 対象ファイルが公開URLから取得可能
- `DEPLOY_STATUS.txt`
- `PUBLIC_VERIFY_STATUS.txt`
- release marker / source一致検査（該当する変更）
- ブラウザruntime検査（該当する変更）

復習についてはユーザー定義の専用完了条件を追加で満たす。

## 9. AI基盤の管理境界

AIは5教科共通基盤へ段階統合する。

基本責務:

`Gemini生成 -> 教科固有の決定的検証 -> Groq独立解答/検証 -> Rise照合 -> 採用/棄却`

ただし、Groq統合がコード・テスト・本番まで完了する前に「全教科で稼働中」とは扱わない。

詳細は `docs/AI_PLATFORM.md` を参照する。

## 10. 管理負債レジスタ

### P0: 公開状態ファイルによるmain更新

`deploy-pages.yml` は `PUBLIC_VERIFY_STATUS.txt` と `DEPLOY_STATUS.txt` を公開確認後に `main` へ記録する。現在はこれらの状態ファイルを `paths-ignore` しているため、**状態ファイルだけの更新で同じPages Workflowが再起動することは抑制済み**。

一方で、公開元の `github.sha` と、その後botが状態記録した最新 `main` HEAD は異なる。このため「最新mainのSHA＝公開したソースSHA」と単純にみなさず、状態ファイル内の `source_sha` とrelease markerを確認する。将来は、公開状態をリポジトリへcommitし続ける必要性と、artifact/外部状態へ分離する案を比較してから整理する。

### P0: main branch protection

現在無効。CI整理後に、必須チェックが安定してから保護ルール導入を検討する。

### P1: 巨大な `index.html`

旧実装を保持したまま後段モジュールで置換している。UI刷新前に責務分離を進める。

### P1: 旧Workflow・トリガーファイル

存在だけで削除しない。呼び出し元、最終実行、公開影響を棚卸し後に廃止する。

### P1: 文書の世代混在

本ドキュメント、`OPERATIONS.md`、現行Workflowを優先し、旧方式の記述を段階的に除去する。

### P2: ブランド旧名

内部識別子は互換性を優先し、表向きブランドをRiseへ段階移行する。保存キーやURLをブランド変更だけの理由で改名しない。

## 11. 大規模改良の順序

1. 管理・構造整理
2. AI/教科基盤の共通化
3. UI・デザイン刷新
4. 今日の学習など統合体験
5. 徹底高速化
6. 継続QA強化

速度や見た目を理由に、先に保存・学習・検証資産を壊さない。

## 12. 完了の定義

コードを書いたこと、GitHubへcommitしたこと、ローカルテストが通ったことだけでは「本番完了」ではない。

対象変更に応じたテスト、main反映、Pages公開、本番取得、本番runtime確認までを一つの変更単位として扱う。
