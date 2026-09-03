# Rise — 運用・保守ルール

この文書は、Rise（旧 旭丘AA Learning OS）の**日常運用手順**を定める。
システム全体の正本・境界・保護対象は `docs/SYSTEM_MANAGEMENT.md`、AI基盤は `docs/AI_PLATFORM.md` を参照する。

## 1. 開発の正本

- 開発・修正・教材追加のコード正本は `main`。
- 通常の変更は作業ブランチでまとめ、検査後に `main` へマージする。
- `gh-pages` を手動編集・手動同期しない。
- `git push origin main:gh-pages --force` のような手動公開は禁止。
- 現在のGitHub Pages公開は `.github/workflows/deploy-pages.yml` を正規経路とする。

## 2. 変更前に必ず確認するもの

1. 最新 `main` のcommit SHA。
2. 対象ファイルの最新blob SHA。
3. `docs/SYSTEM_MANAGEMENT.md` の正本一覧と保護対象。
4. 影響するテスト、Workflow、Service Worker、保存領域。
5. 同じ機能を後段で上書きする互換レイヤーがないか。

古い会話・古いREADME・過去の運用文書だけを根拠に編集しない。

## 3. アーキテクチャ境界

アプリの管理境界は次の順とする。

`runtime -> data -> state -> engines -> ui -> PWA/QA`

`app/runtime-registry.js` と `tests/architecture-boundaries.mjs` を境界確認の基準とし、UIから保存領域や教科エンジンへ無秩序に直接アクセスする構造を増やさない。

既存の巨大な `index.html` と互換レイヤーは段階移行中の資産として扱い、動作確認なしに一括削除しない。

## 4. 守る保存データ

移行設計なしにキー名変更・削除・全消去をしない。保存キーは、そのキーを実際に所有する現行実装を確認して扱う。

主な保護対象:

- 学習本体: `asahi_learning_os_v1`
- 学習本体の保護スナップショット: `aa-storage-best-v4`
- 保存保護IndexedDB: `asahigaoka-aa-os-storage` / store `snapshots`
- 復習進捗: `asahi_review_progress_v1`
- Review v2画面状態: `aa_review_page_v1`
- AI接続設定: `aa_ai_reading_config_v1`
- 国語入試: `aa_japanese_exam_session_v1`
- 国語入試: `aa_japanese_exam_history_v1`
- 国語入試: `aa_japanese_exam_imports_v1`
- ログイン画像IndexedDB: `aa-login-companion-v1`
- ログイン音声IndexedDB: `aa-companion-voice-v1`

学習本体の保存保護は `storage-resilience-v1.js` の現行定義を基準にする。

`localStorage.clear()` や、既存stateを移行なしで丸ごと置換する変更は禁止。

## 5. 復習

- 唯一の復習データ正本: `review-bank-v1.js`（後継正本が明示された場合はその最新版）
- 現役UI: `review/index.html` の Review v2
- `review.html` は旧URL互換、`review-page-v1.js` は互換シムとして扱う。
- 普通の復習追加で通常問題データや別の復習データへ重複登録しない。
- 追加前に最新ファイルとSHAを取得し、既存IDを維持し、ID重複を避け、`AA_REVIEW_BANK_VERSION` を更新する。
- 画像付き復習は永続画像を `review/assets/` に保存し、一時URLを使わない。

復習変更はGitHub上の反映だけで完了としない。公開後に本番の項目・画像・SHA-256・`DEPLOY_STATUS.txt`・`PUBLIC_VERIFY_STATUS.txt` まで確認する。

## 6. AI基盤

- ブラウザやGitHub PagesへAIプロバイダのAPIキーを置かない。
- APIキーはCloudflare Workerの暗号化Secretとして扱う。
- 現行Gemini生成モデルは `gemini-3.5-flash`。明示的な変更指示なしにモデルを変更しない。
- `GEMINI_API_KEY`、`GROQ_API_KEY`、`AI_ACCESS_TOKEN` をソース・ログ・公開レスポンスへ出さない。
- 5教科のAI生成・検証の共通方針は `docs/AI_PLATFORM.md` を正本とする。
- Groqは共通の独立検証基盤として統合する。教科固有の決定的検証を置き換えない。

## 7. 教科エンジン

各教科の独自検証資産を維持する。

- 数学: 数値計算、正答一意性、選択肢検査、図形・有限値等の決定的検証を優先する。
- 国語: 本文根拠、採点単位、複数選択・並べ替え等の構造を維持する。
- 英語: 語数、文法範囲、本文根拠、選択肢、独立解答検証を維持する。
- 理科: 数値・単位・条件整合など、コードで検証できるものをAI任せにしない。
- 社会: 資料・年代・用語・根拠の検証層をAI生成と分離する。

## 8. PWA / Service Worker

- `sw.js` がキャッシュ戦略を一元管理する。
- HTML / JS / CSS / JSON はオンライン時に最新版を優先し、通信失敗時にキャッシュへフォールバックする現行方針を維持する。
- 重要資産の更新経路を確認せずにcache-firstへ変更しない。
- 画像差し替えは必要に応じて一意の新ファイル名を使い、古いキャッシュと衝突させない。
- 大きなキャッシュ構造変更時のみService Workerのバージョンを意図的に更新する。

## 9. 検査

`main` へ入れる前に、変更範囲に応じて既存テストを通す。

全体公開では `.github/workflows/deploy-pages.yml` が実行するpreflightを基準とする。特に以下を壊さない。

- `tests/architecture-boundaries.mjs`
- `tests/ai-reading-contract.mjs`
- `scripts/validate-management-contract.mjs`
- 復習検証
- 数学検証
- 国語検証
- runtime asset検証
- 重要JSの `node --check`

管理正本・公開経路・保存契約・AIモデル/Secret配線の整合は `.github/workflows/management-contract.yml` でも自動検査する。

テストを削って変更を通すことを修正とみなさない。

## 10. 公開経路

正規経路:

`作業ブランチ -> 検査 -> mainへマージ -> deploy-pages.yml -> GitHub Pages -> 本番検証`

`gh-pages` のcommit SHA一致を完了条件にしない。現在のPagesはActionsによる公開を基準とする。

## 11. 公開完了の判断

通常変更では少なくとも次を確認する。

1. `main` に意図した変更が存在する。
2. 対象の自動検査が成功する。
3. Pages deploymentが成功する。
4. 公開URLから必要な資産を取得できる。
5. `DEPLOY_STATUS.txt` と `PUBLIC_VERIFY_STATUS.txt` が対象リリースについて成功を示す。

復習変更は、さらに専用の本番一致・画像表示・SHA-256確認を必須とする。

## 12. 管理上の既知課題

以下は「存在を認識して管理する負債」であり、調査なしに削除しない。

- `main` のbranch protectionが現在無効。
- Workflowが状態ファイルを `main` へ記録するため、公開元SHAと最新main HEADが異なり得る。
- 旧Workflow・トリガーファイル・互換コードが残っている。
- `index.html` に旧実装が大きく残り、後段モジュールとの段階移行中。

改善は `docs/SYSTEM_MANAGEMENT.md` の優先順位に従い、1変更1目的で進める。
