# Development Notes

## 復習ノート更新時のキャッシュ事故防止

`review-bank-v1.js` に復習項目を追加・変更しただけでは、ブラウザや Service Worker が古いファイルを保持し、実際のWebアプリに反映されないことがある。

### 必須ルール

1. `review-bank-v1.js` を更新したら、`window.AA_REVIEW_BANK_VERSION` も上げる。
2. `aa-companion-v2.js` 内の読み込みURLの `?v=` を同じ新バージョンへ更新する。
   - `./review-bank-v1.js?v=...`
   - `./review-page-v1.js?v=...` は `review-page-v1.js` を変更したときに更新する。
3. Service Worker のキャッシュが旧版を保持する可能性がある変更では、`sw.js` の `CACHE_NAME` も更新する。
4. 更新後は GitHub `main` 上の実ファイルを再取得して、項目と読み込みバージョンが両方更新されていることを確認する。
5. Webアプリ側では再読み込み／Service Worker更新後に「復習」画面へ実際に表示されることまで確認する。

### 2026-08-11 に起きた事例

`made of` と `made from` の復習項目は `review-bank-v1.js` には追加済みだったが、`aa-companion-v2.js` が `review-bank-v1.js?v=1.0.0` を読み続けていたため、古いキャッシュが表示される余地があった。読み込みURLを `v=1.0.1` へ更新して解消した。

### 今後の判断

「復習に追加したのに表示されない」ときは、データ本体の有無だけでなく、最初に **読み込みURLのバージョンと Service Worker キャッシュ** を確認する。
