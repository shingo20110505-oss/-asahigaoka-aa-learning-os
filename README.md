# 旭丘AA Learning OS

愛知県立旭丘高校普通科を最終目標にした、iPhone対応の端末内保存型PWAです。英語長文を最優先に、語彙・5教科演習・復習・技能分析を1つに統合しています。

## 主な機能

- `HOME / 今日 / 教科 / 分析 / 設定` の5タブ
- 1タップの最優先MISSION
- AA Readiness（公式合格率・偏差値ではない内部学習指標）
- 英語長文の個人語彙カバレッジ、事前重要語、タップ辞書、Evidence表示
- 語彙支援長文と入試実戦長文の分離
- 5教科・英単語・漢字・歴史年表
- 想起練習、適応型復習、選択的インターリーブ
- 学習位置・回答・時間の自動保存
- JSONバックアップの書き出し・共有・読み込み統合
- ホーム画面起動、オフライン利用、更新通知

## iPhoneへの追加

1. 公開URLをSafariで開きます。
2. 画面下の共有ボタンを押します。
3. 「ホーム画面に追加」を選びます。
4. 右上の「追加」を押します。
5. ホーム画面の「旭丘AA OS」から起動します。

初回はオンラインで開いてください。アプリ一式の保存後は、通信がない状態でも利用できます。

## データ保存とバックアップ

学習履歴はブラウザの `localStorage` に自動保存されます。サーバーやGitHubへ学習履歴を送信する処理はありません。

次の操作前には、アプリの「設定 → JSONを書き出す・共有」でバックアップしてください。

- iPhoneの機種変更
- Safariの履歴・Webサイトデータ削除
- ホーム画面版の削除
- 別ブラウザ・別URLへの移行

アプリ更新では保存キー `asahi_learning_os_v1` を維持するため、通常は学習履歴を引き継ぎます。

## 更新方法

`main` ブランチへ変更を反映するとGitHub Actionsが静的監査後にPagesへ公開します。新しいService Workerの準備が完了すると、アプリ上部に「新しい版があります」と表示されます。「更新」を押すと直前の状態を保存して再読み込みします。

コード更新時は、次の2か所を同じ版番号へ変更してください。

- `index.html` の `APP_VERSION`
- `sw.js` の `VERSION`

## ファイル構成

| パス | 役割 |
| --- | --- |
| `index.html` | アプリ本体・教材データ・UI・学習ロジック |
| `manifest.webmanifest` | PWA名、表示、開始URL、アイコン |
| `sw.js` | オフラインキャッシュと安全な更新 |
| `offline.html` | 初回キャッシュ前などのオフライン案内 |
| `icons/` | iPhone、通常、maskable、favicon用アイコン |
| `.github/workflows/pages.yml` | 監査後のGitHub Pages自動公開 |
| `tests/static-audit.mjs` | PWA構成・JavaScript・アイコンの静的監査 |
| `QA_REPORT.md` | 最終監査結果と制約 |
| `.nojekyll` | Jekyll処理を無効化 |

## ローカル確認

Service Workerは `file://` では動作しません。リポジトリのルートでHTTPサーバーを起動してください。

```bash
python3 -m http.server 8080
```

`http://localhost:8080/` を開きます。静的監査は次で再実行できます。

```bash
node tests/static-audit.mjs
```

## 入試情報と指標の扱い

2027年度の旭丘普通科は、愛知県の公表資料に基づき一般選抜の校内順位方式Ⅴとして扱っています。方式Ⅴは `評定得点 + 学力検査合計得点 × 2`、学力検査は5教科各22点です。公式の合格最低点は公表されていないため、アプリは公式cutoff・偽の合格率・未校正の偏差値を表示しません。

- [愛知県：令和9年度 一般選抜の面接・校内順位決定方式](https://www.pref.aichi.jp/press-release/r9kounaijyunni.html)
- [愛知県公立高等学校入学者選抜](https://www.pref.aichi.jp/soshiki/kotogakko/0000027366.html)

## PWA・公開仕様の参照

- [GitHub Docs：Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [WebKit：iOS/iPadOSのホーム画面Webアプリ](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple：SafariのWeb App Manifestとアイコン](https://developer.apple.com/videos/play/wwdc2022/10048/)

## 注意

このアプリは合格を保証するものではありません。AA Readinessは、技能別mastery、証拠量、時間内演習、読みの速度、ケアレスミス、時間余裕などから学習の優先順位を決める非公式指標です。
