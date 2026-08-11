# 復習ページ管理ルール

## 正本
- 復習データの正本は `main` ブランチの `review-bank-v1.js` のみ。
- 「復習に入れて」「復習へ追加して」等の依頼は、このファイルだけに学習項目を追加する。
- 通常の英文法データ、長文データ、問題生成データ、通常画面には追加しない。

## 公開
- `.github/workflows/review-publish.yml` が `main/review-bank-v1.js` の更新を検知する。
- `scripts/validate-review-bank.mjs` で必須項目、ID重複、配列形式、バージョン形式を検査する。
- 検査に通った `review-bank-v1.js` だけを `gh-pages` へ自動同期する。
- `gh-pages` の `review-bank-v1.js` を手動編集しない。

## 表示
- `review.html` は専用ページとして独立させる。
- 復習ページを開くたびに `review-bank-v1.js` を `cache: no-store` で取得し、オンライン時は最新版を優先する。
- アプリの「復習」ボタンは `review.html` への直接リンクだけにする。通常画面へ復習データを注入しない。

## 追加時の完了条件
1. `main/review-bank-v1.js` に項目を追加する。
2. `AA_REVIEW_BANK_VERSION` を更新する。
3. GitHub Actions の検証を通す。
4. `gh-pages/review-bank-v1.js` が `main` と同じ内容 SHA になったことを確認する。
5. 復習ページで登録件数とデータ版が更新される構成を維持する。

## 進捗データ
- 「覚えた／要復習」の状態は端末の `localStorage` に保存する。
- 復習項目そのものは GitHub に保存されるため、端末側の進捗が消えても項目は失われない。
