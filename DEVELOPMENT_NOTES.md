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

## Rise UIの本番目視確認ルール

UI・レイアウト・配色・ナビゲーション・レスポンシブに関わる変更は、DOM検査やHTTP 200、GitHub Pagesのデプロイ成功だけでは完了扱いにしない。

### 必須ルール

1. Pages本番公開後に `.github/workflows/visual-production.yml` の `Rise production visual verification` を実行する。
2. 本番URLを実ブラウザで開き、少なくとも次の2種類のPNGを生成する。
   - Mobile: 390×844、iPhone User-Agent相当
   - Desktop: 1440×1000
3. PNGは空ファイルではなく、PNGシグネチャと実寸をCIで検証する。
4. 生成した画像と `manifest.txt` は `rise-production-screenshots-*` Actions artifactとして保存する。
5. **UI変更について「完了」と報告する前に、最新のvisual verification workflowが成功していることを確認し、artifactの実スクリーンショットを目視確認する。**
6. スクリーンショットに崩れ、旧UI、意図しない上書き、読みにくさ、過密、ナビの欠落などがあれば、機能テストがPASSでも完了扱いにしない。
7. ChromiumによるMobile画像はiPhone User-Agentと390×844 viewportを使うが、Safari/WebKitそのものではない。実iPhone固有の差が疑われる場合は、ユーザー実機スクリーンショットも併用する。

### 目的

「コード上は正しい」「DOM上はRiseになっている」だけでなく、**利用者が実際に見るピクセルの状態まで品質ゲートに含める**。