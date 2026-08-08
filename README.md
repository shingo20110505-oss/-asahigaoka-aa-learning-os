# 旭丘AA Learning OS v1.5.0

愛知県立旭丘高校普通科を目標に、5教科の得点力を本番で安定して発揮するためのiPhone対応PWAです。英語長文を最優先とし、語彙診断・復習・時間内処理・転移・不確実性を1つのLearning Profileで扱います。

AA Readinessは公式の合格率・偏差値・合格最低点ではありません。技能別習熟、保持、転移、速度、証拠量などから作る非公式の個人内学習指標です。

## v1.5.0の主な機能

- 回答に応じて18〜32語を出題する適応型英語語彙診断
- 本文ごとの個人語彙カバレッジと95%推定範囲
- 推定値の下限を基準に選ぶ事前重要語
- `take part in`、`as a result` などの語句・collocation復習
- 安定したEvidence IDと段落・文・根拠英文
- 長文シナリオに合わせた誤答選択肢と誤答タイプ
- 支援付き長文から辞書OFF実戦への自動移行
- 愛知県公表の筆記時間に合わせた英語40分シミュレーター（非公式）
- Beta-Bernoulli型の証拠更新を加えた技能Knowledge Tracingと推定範囲
- 読み・意味・文脈・類義語を扱う漢字学習
- 年表の検索・隠す・お気に入りを維持したChronologia想起復習
- Chronologia・5教科QUEST連携用 `aa-learning-profile/1`
- オフライン、更新通知、途中再開、JSON Export / Import / Merge

## 学習履歴を失わないための設計

保存キーは旧版から変えず、`asahi_learning_os_v1` を維持しています。

- 回答・現在問題・問題順・経過時間・スクロール位置を自動保存
- v1.5移行前のJSON原本を端末内に1件保持
- 最大3世代の端末内セーフティコピー
- セッション完了・Import前・初期化前に退避
- 移行またはImportで回答履歴・技能・復習項目が減る場合は処理を中止
- v1/v2の旧JSONとv3統合バックアップの両方を読込可能
- JSON v3は状態指紋と共通Learning Profileを同梱

端末内コピーもSafariのWebサイトデータ削除では消えます。機種変更、Safariデータ削除、ホーム画面版削除、URL変更の前には「設定 → JSONを書き出す・共有」で端末外へ保存してください。

## iPhoneへの追加

1. 公開URLをSafariで開きます。
2. 画面下の共有ボタンを押します。
3. 「ホーム画面に追加」を選びます。
4. 右上の「追加」を押します。
5. ホーム画面の「旭丘AA OS」から起動します。

初回はオンラインで開いてください。Service Workerがアプリ一式を保存した後は、通信がない状態でも基本学習を続けられます。

## 更新

`main` ブランチへ反映すると、GitHub Actionsが静的検査と移行・学習エンジンのafter-checkを通過した場合だけPagesへ公開します。新しいService Workerの準備後、アプリ上部の更新ボタンを押すと学習状態を保存して切り替えます。

版更新時は次をそろえます。

- `index.html` の `APP_VERSION`
- `sw.js` の `VERSION`
- README / QA_REPORTの版番号

## ファイル構成

| パス | 役割 |
| --- | --- |
| `index.html` | 教材データ、基本UI、v1.4互換ロジック |
| `learning-engine-v15.js` | 適応診断、推定区間、Evidence、Chronologia、保存保護 |
| `manifest.webmanifest` | PWA名、表示、開始URL、アイコン |
| `sw.js` | v1.5 app shell、オフライン、cache更新 |
| `offline.html` | 初回cache前のオフライン案内 |
| `icons/` | iPhone、通常、maskable、favicon用アイコン |
| `.github/workflows/pages.yml` | 検査合格後のGitHub Pages公開 |
| `tests/static-audit.mjs` | PWA・構成・構文・アイコンの41項目監査 |
| `tests/after-check.mjs` | 操作、学習エンジン、旧データ移行の26項目監査 |
| `QA_REPORT.md` | 公開前の最終監査記録 |
| `.nojekyll` | Jekyll処理を無効化 |

## ローカル検査

Service Workerは `file://` では動作しません。HTTPサーバーから開いてください。

```bash
python3 -m http.server 8080
node tests/static-audit.mjs
```

完全after-checkはHappy DOMを一時ディレクトリへ入れて実行します。

```bash
npm install --prefix /tmp/aa-after-check --no-save happy-dom@20.0.11
HAPPY_DOM_PATH=/tmp/aa-after-check/node_modules/happy-dom/lib/index.js node tests/after-check.mjs
```

## 入試情報

2027年度の旭丘普通科は、愛知県の公表資料に基づき一般選抜の校内順位方式Ⅴとして扱っています。方式Ⅴは `評定得点 + 学力検査合計得点 × 2`、学力検査は5教科各22点です。英語はリスニング約10分の後、筆記40分と公表されています。公式合格最低点は表示しません。

- [愛知県：令和9年度 一般選抜の面接・校内順位決定方式](https://www.pref.aichi.jp/press-release/r9kounaijyunni.html)
- [愛知県：令和9年度資料 PDF](https://www.pref.aichi.jp/uploaded/attachment/623173.pdf)
- [愛知県：学力検査の実施方法 PDF](https://www.pref.aichi.jp/uploaded/attachment/582102.pdf)

## PWA参照

- [GitHub Docs：Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [WebKit：iOS/iPadOSのホーム画面Webアプリ](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple：Web App Manifestとアイコン](https://developer.apple.com/videos/play/wwdc2022/10048/)

このアプリは合格を保証しません。推定値は学習の優先順位と次の練習を決めるために使い、公式選抜結果の予測として扱いません。
