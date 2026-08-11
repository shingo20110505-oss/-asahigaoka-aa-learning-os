# 旭丘AA Learning OS — 運用・保守ルール

## 1. 唯一の正本

- 開発・修正・データ追加は `main` のみ。
- `gh-pages` は編集しない。
- `.github/workflows/site-publish.yml` が検証後に `gh-pages` を同じ commit SHA へ更新する。
- 検証に失敗した commit は公開しない。

## 2. 公開前の自動検査

必須検査:

- `scripts/validate-review-bank.mjs`
  - 復習データ形式
  - 必須項目
  - ID重複
  - バージョン形式
- `scripts/validate-review-ui.mjs`
  - Review v2 への入口統一
  - 旧Review画面の再混入防止
  - `覚えた` 状態の保存キー維持
- `scripts/validate-runtime-assets.mjs`
  - ログイン画像ローダー
  - ZIP画像読み込み
  - IndexedDB画像保存
  - ログインボイスDB
  - 複数ログインボイス
  - Explosionボイス
  - iPhoneのユーザー操作後の音声再試行
  - Service Workerの重要資産更新
- 重要JSの `node --check`

## 3. 復習

- データ: `review-bank-v1.js`
- 画面: `review/index.html`
- 旧URL: `review.html` は転送のみ
- 旧アプリ内モジュール: `review-page-v1.js` は互換シムのみ
- 普通の復習追加では `review-bank-v1.js` 以外を触らない。

## 4. ログイン画像

- 実装: `login-companion-v1.js`
- 保存先: IndexedDB `aa-login-companion-v1` / store `images`
- GitHubへ画像本体は送らない。
- 画像は Blob + Object URL で表示する。
- ZIPは枚数・総容量制限を維持する。
- `object-fit: contain` を維持し、縦横比を壊さない。

## 5. ログインボイス

- 実装: `companion7-runtime.js`
- 保存先: IndexedDB `aa-companion-voice-v1` / store `voices`
- 通常ログインボイス: `daily-*`
- Explosion: `explosion`
- iPhoneの自動再生制限に備え、`pointerdown` / `touchstart` / `keydown` 後の再試行を維持する。
- `playsInline=true` を維持する。

## 6. ログイン本番テスト

- 実装: `login-production-test-v1.js`
- 本番の抽選状態や連続日数を消費せず、現在登録済みの画像・ボイスで演出確認できる。
- iPhoneで初回再生を拒否された場合は、画面タップで再試行する。

## 7. PWA / キャッシュ

- `sw.js` が一元管理。
- HTML / JS / CSS / JSON はオンライン時に最新版を確認し、通信失敗時にキャッシュへフォールバックする。
- 個別ファイル名を巨大な正規表現へ足し続ける方式は禁止。
- Service Workerの `VERSION` を大きなキャッシュ構造変更時に上げる。
- 旧 `asahigaoka-aa-os-*` キャッシュは activate 時に削除する。

## 8. 公開確認

完了条件:

1. `main` の対象修正が存在する。
2. 自動検査が通る。
3. `main` と `gh-pages` の commit SHA が同一。
4. GitHub Pagesの実URLから対象ページ・JS・データを取得できる。
5. 復習追加時は公開 `review-bank-v1.js` のバージョン・件数・対象IDを確認する。
6. ログイン関連変更時は公開 `companion7-runtime.js` / `login-companion-v1.js` / `login-production-test-v1.js` の配信内容も確認する。

## 9. 変更しない識別子

既存ユーザーデータを守るため、移行計画なしでは以下を変更しない:

- `asahi_review_progress_v1`
- `aa-login-companion-v1`
- `aa-companion-voice-v1`
- `aa-companion-study-streak-v1`

