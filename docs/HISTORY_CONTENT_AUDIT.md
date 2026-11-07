# 社会年表の内容・分類改修（2026-11-07）

## 対象と保存

元リポジトリ HEAD `7a02f5d47f7574f56c43f8dfb7bc40fc07354a11` の追跡ファイルを `git archive` で別ディレクトリへ取り出し、独立した Git リポジトリ／ブランチ `content/history-periods-culture` で編集した。元 checkout と未コミットの `tests/rise-relay.test.mjs` は変更していない。浅いローカルリポジトリの clone が Windows sandbox の MSYS 制約で失敗したため、元 `.git` を書き換える worktree は使っていない。

既存 ID 1〜1000 の ID・event・date・sort・level はすべて維持。これら5項目を ID 順に JSON 化した SHA-256 は `788ce9e565c172f3db72d1e32b44cad7294685386ac915858d2384f991c5d8e9`。学習履歴の ID を再割当てしない。`migration-manifest.json` は元教材の保全記録なので変更しない。

## 分類の契約

- `period`：既存6大分類を保持。
- `eras: string[]`：複数の細分類。日本史20時代区分＋10文化期、世界史5主題区分＋地域別大分類。`eraDefinitions`（`src/history-content.mjs`）が定義元。定義の `id` をそのまま表示ラベルとして使える。`label` フィールドではない。
- `topics: string[]`：文化・思想・宗教・文学・美術・建築・科学／技術・教育。文字列は実装の `historyTopics` を参照。
- `tags` に細分類名と主題名も格納するので、現行の検索・「文化・学問」フィルターでも利用可能。独立した時代選択UIは機能担当が統合する。
- `classifyHistory(row)` はデータ生成・検証用の純関数。実行時 `enrichHistory` は既存どおりソートのみで、入力を変更せず追加項目を重ねて生成しない。
- 年代だけでルネサンス・天平・国風などの文化期を付けない。関連作品・人物・制度の ID を明示している。宗教改革と科学革命をルネサンスと混同しない。中国の「文化大革命」は政治運動として文化史検索タグを付けない。
- 日本の政治史の年境界は検索上の目安。境界年には複数所属を認め、南北朝／戦国は室町と重なる。北海道・琉球を含む全地域の文化が同時に交替したという意味ではない。
- 世界の地域別大分類は既存 `area` と `period` を組み合わせた検索ラベル。王朝単位の全世界史分類・個々の既存 `area` の全面再監査は未実施。日本の時代を同年の世界事象に流用しない。アンコール・ワット（431）の地域は東南アジアに修正。
- 任意の `dateRange: {start,end,precision,note}` は範囲・概数の性質を明記する。`sort` は表示順用の代表年であり、制作期間・伝播期間全体を一点に確定しない。世紀表示は `historyDateRange` で幅を得られる。
- `sources: string[]` は既存画面／AI参照が期待する HTTPS URL 配列。`sourceRecords` に資料名、URL、確認日、確認範囲を保存。史料の文章は転載せず短い要約を書いた。

## 追加6件（合計1,006件）

| ID | 内容 | 年代の扱い | 主な確認先 |
|---|---|---|---|
| 2001 | 岩宿遺跡の旧石器文化 | 約3万5000〜2万5000年前、2石器群。1949年の発掘と区別 | [日本旧石器学会](https://palaeolithic.jp/sites/iwajuku/) |
| 2002 | 三内丸山の集落 | 紀元前3900〜2200年ごろ、遺跡の継続期間 | [三内丸山遺跡センター](https://sannaimaruyama.pref.aomori.jp/about/) |
| 2003 | 吉野ヶ里の大規模環壕集落 | 弥生後期1〜3世紀ごろ、集落開始年ではない | [吉野ヶ里歴史公園](https://www.yoshinogari.jp/introduction/history/) |
| 2004 | 光琳『燕子花図屏風』 | 18世紀初めごろ。作品台帳は18世紀、作者没年1716年を上限とする目安 | [根津美術館](https://www.nezu-muse.or.jp/jp/collection/detail.php?id=10301) |
| 2005 | ラファエロ『アテネの学堂』 | 制作1509〜1511年 | [ヴァチカン美術館](https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/stanze-di-raffaello/stanza-della-segnatura/scuola-di-atene.html)、[Yale A&AePortal](https://aaeportal.com/images/20341/the-school-of-athens) |
| 2006 | シェイクスピア『ハムレット』初刊 | 刊行1603年。執筆・初演年と区別 | [Folger Shakespeare Library](https://www.folger.edu/explore/shakespeares-works/hamlet/) |

追加 ID 1001〜1007 は `bridge/history-reference-content.mjs` の補完教材に使用済みなので避けた。AI参照の enrich 後も衝突がないことを関連テストで確認。追加レベルは 2005=B、ほか=A。実測入試頻度の意味ではない。

## 本文・タグの混線修復

ID **412、414〜474、498〜500 の65件**では見出し／既存 `note` が一致する一方、`detail` と `tags` が別の時代・事象を指していた。既存 note の summary/background/result から整合する本文を復元し、無関係なタグを除去した。例：432はSNS→ルネサンス、433は配信→金属活字、434はグプタ朝→モナ・リザ、447は大仏→二毛作、499は男女共同参画→SDGs。

そのうち下記8件と381は今回外部資料で照合し、主要事項を修正・具体化した。これら9件は `contentReview.method=source-checked-correction`、残る57件は `restored-matching-existing-note` と区別する。後者は説明の取り違えの修復であり、本文の全史実を独立した外部資料で全面再検証したとは扱わない。今後の監査対象をデータ内で追跡できる。

| ID | 今回の確認点 | 出典 |
|---|---|---|
| 381 | 北部九州の水田稲作開始は紀元前10世紀ごろ。既存-400は伝播の代表年で全国一律の開始年ではない | [国立歴史民俗博物館 第1展示室](https://www.rekihaku.ac.jp/exhibitions/room1/) |
| 412 | 西鶴『好色一代男』1682年刊 | [東洋文庫書誌](https://app.toyobunko-lab.jp/s/main/document/965c23b5-4c04-311b-6bba-5501687d9fd0) |
| 418 | 北斎「神奈川沖浪裏」1831年ごろ、錦絵 | [北九州市立美術館](https://jmapps.ne.jp/kmma/det.html?data_id=6958) |
| 427・428 | 762年バグダッド建都、9世紀の翻訳・学術活動 | [Met年表](https://www.metmuseum.org/ja/toah/ht/06/wam) |
| 429 | 木版印刷の具体的証拠として868年刊記の『金剛般若経』 | [大英図書館 IDP](https://idp.bl.uk/discover/learning/buddhism-on-the-silk-roads/articles/buddhism-on-the-ground/buddhist-texts-the-diamond-sutra/) |
| 432 | イタリアで14世紀に発達した人文主義、欧州内部の展開差 | [Smarthistory](https://smarthistory.org/humanism-renaissance-italy/) |
| 434 | モナ・リザの台帳上の制作期間1503〜1519年 | [ルーヴル美術館](https://collections.louvre.fr/ark:/53355/cl010062370) |
| 435 | 天井画1508〜1512年。祭壇壁『最後の審判』と区別 | [ヴァチカン美術館](https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/cappella-sistina/volta.html) |

## 重複監査と限界

全1,006 IDと正規化見出しは一意。追加6件は既存の見出し・本文・タグを検索し、遺跡名・人物名・作品別名を照合して採用した。既存項目には同じ史実を別の焦点で説明するものが残る。150/439（法の精神）は実質重複、386/548（法隆寺）、427/669（バグダッド）、412/741（西鶴）、415/759（国学）は内容に重なりがある。`relatedIds` で相互参照を記録し、過去の学習履歴を壊すID削除・統合はしていない。全項目の意味的重複がゼロであるとは主張しない。同年・見出し類似度の検査では134/724も検出されたが、武家諸法度と禁中並公家諸法度は異なる法令なので別項目のまま。

外部照合の対象は追加6件と修正9件。既存1,000件全史実・全別名の網羅的再監査は未完了。既存 note 由来の学習上の因果説明は、学術的合意を新規に検証したものではない。

## 統合

機能担当の `src/views/history.mjs`、`src/history-domain.mjs`、`src/history.css`、index関連は未変更。内容担当の新規検証は `tests/rise-content-history.test.mjs`。親担当の追加指示に従い、`tests/rise-learning.test.mjs` と `scripts/validate-rise-build.mjs` は件数・ID保全検証だけ更新した。

`scripts/build-rise.mjs` の `version.json.counts.history` は元の migration manifest の1000を読んでいる。今回のデータの実件数は1006であり、**統合側でその件数メタデータを実データ長に合わせる必要がある**（担当境界のためビルドスクリプトは未編集）。画面は実データ長を使用する。

ローカル変更は元 HEAD との内容差分 patch で統合できる。独立リポジトリの最初のコミットはスナップショットで元リポジトリと履歴がつながっていないため、ルートコミットを cherry-pick しない。検証・結果の詳細は親担当へ報告。公開・push・merge・deployはしていない。

## 実行結果

- 関連テスト：内容、学習機能、履歴移行、AI参照の23件すべて成功。
- 全体テスト：`node --test tests/rise-*.test.mjs`、235件成功／0失敗。最初のsandbox実行ではlocalhostへの接続EACCES等で11件失敗したため、許可されたsandbox外のローカル再実行で確認した。
- `node scripts/build-rise.mjs` と `node scripts/validate-rise-build.mjs` が成功。history=1006、review=114、reading=150、配布443ファイル。既存RAG用vendorは元checkoutのローカルファイルを独立checkoutへコピーし、ダウンロード・本番変更なし。
- `git diff --check` 成功。UIは担当外で未編集のため、この作業でブラウザの見た目や機能担当との合成画面を確認したとは扱わない。

## 統合後の補足

上記の build 件数メタデータの修正と分類UI対応は統合版で実施済み。最終の全体テスト・ブラウザ検証は HISTORY_UPGRADE_QA.md を参照。
