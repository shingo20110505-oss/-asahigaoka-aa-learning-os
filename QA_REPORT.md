# 旭丘AA Learning OS v1.5.0 公開前最終監査

監査日: 2026-08-08  
公開条件: after-check合格前はGitHub Pagesへ反映しない

## 結論

初回監査でEvidence ID処理が既存根拠を空配列で上書きする不具合を1件検出した。元の根拠を保持してIDだけ付与するよう修正し、全検査を最初から再実行した。

- 静的PWA・構成監査: **41 / 41 PASS**
- 操作・移行after-check: **26 / 26 PASS**
- アプリ内総合QA: **全件PASS**
- JavaScript構文: `index.html` / `learning-engine-v15.js` / `sw.js` **PASS**

## 1. デザイン・iPhone

| 観点 | 結果 | 確認内容 |
| --- | --- | --- |
| 視覚設計 | PASS | ネイビー・白、低刺激のカード、十分な余白、問題中の情報量を抑制 |
| safe area | PASS | `viewport-fit=cover` と上下の `safe-area-inset-*` |
| レスポンシブ | PASS | 700px/520px以下で1列化、ボタン折返し |
| タップ領域 | PASS | 主要ボタン46px以上、touch-action設定 |
| 認知負荷 | PASS | HOMEは最優先MISSIONを中心にし、教科メニューは別タブ |
| 年表 | PASS | 縦型一覧・検索・年号/出来事隠し・お気に入りを維持 |

クラウドブラウザはローカルの公開前プレビューへ接続できなかったため、公開前画面試験はDOM実行環境、構文、レスポンシブCSS、safe-areaの組合せで実施した。iOS実機Safariの物理端末試験は別途必要。

## 2. 操作・保存・移行

| テスト | 結果 |
| --- | --- |
| 初期HOMEとv1.5/schema 3 | PASS |
| 適応型語彙診断18問で停止するケース | PASS |
| 語彙診断の標準誤差・上下限 | PASS |
| 英語筆記40分・3長文・支援OFF | PASS |
| 漢字セットに意味問題を含む | PASS |
| 漢字解説に意味・用例を表示 | PASS |
| Chronologia 8問・8出来事・4選択肢 | PASS |
| v1.4相当データをschema 3へ移行 | PASS |
| 回答履歴・技能・復習項目の件数保持 | PASS |
| 途中問題・経過4567ms・scrollY 137を保持 | PASS |
| 移行前JSON原本の完全一致 | PASS |
| 端末内世代コピー作成 | PASS |
| 強制終了相当の再読込復元 | PASS |
| JSON v3・共通Learning Profile・状態指紋 | PASS |

保存キー `asahi_learning_os_v1` は変更していない。移行・Importで現在の履歴件数が減る場合は保存を中止する。初期化前にも直前コピーを残す。

## 3. 内容・問題品質

- 英単語107語、漢字語彙80語、歴史99件、英語長文20シナリオ
- 選択肢一意性720問、生成例外0
- 英単語穴埋め107語、異常0
- 長文36本: 文法違反0、高重複0、言語手掛かり0、辞書未登録0
- 全誤答に理由、長文誤答にシナリオ別タイプ
- Evidence ID、段落、文番号、根拠英文を保持
- 漢字は読みだけでなく意味・文脈・類義語・用例を扱う
- Chronologiaは年号・出来事・順序・因果を項目別SRSへ接続

## 4. 学習科学・教育測定

| 実装 | 判定 | 監査内容 |
| --- | --- | --- |
| Retrieval Practice | 整合 | 診断、漢字、年表とも答えを見る前に回答 |
| Spacing | 整合 | 項目別の正誤・保持・回答速度からdueを更新 |
| 忘却モデル | 注記適切 | 指数型近似をEbbinghaus-inspiredとして扱い、本人の履歴で更新 |
| Interleaving | 条件付き整合 | 基礎取得後に意味/文脈/順序/因果を混ぜ、無差別混合を避ける |
| Transfer | 整合 | 同一技能を別テーマ・形式で確認 |
| Feedback | 整合 | 正答、本人誤答、全選択肢理由、本文根拠を表示 |
| Lexical Coverage | 整合 | 平均だけでなく95%推定範囲、支援後下限を表示 |
| Knowledge Tracing | 内部推定として妥当 | alpha/betaによる証拠量と範囲を保持、未校正の合格率には変換しない |
| AA Readiness | 表示適切 | 得点と推定範囲を併記し、公式指標でないことを明示 |
| Cognitive Load / HCI | 整合 | 難しい問題と簡単な操作を分離 |

語彙カバレッジの92〜98%は学習設計上の目安で、絶対的な科学基準・合格条件として表示しない。

## 5. 入試目的

- 英語長文をMISSION上の最優先に維持
- 語彙不足時は本文全体を単純化せず重要未知語を事前提示
- 語彙支援・辞書利用時のWPMは支援付きとして分離
- 愛知県公表の英語筆記40分に合わせた非公式シミュレーターを追加
- 公式合格最低点、公式偏差値、公式合格率を表示しない

参照:

- [愛知県：令和9年度 一般選抜方式](https://www.pref.aichi.jp/press-release/r9kounaijyunni.html)
- [愛知県：令和9年度資料 PDF](https://www.pref.aichi.jp/uploaded/attachment/623173.pdf)
- [愛知県：学力検査の実施方法 PDF](https://www.pref.aichi.jp/uploaded/attachment/582102.pdf)

## 6. PWA・GitHub Pages

| 要件 | 結果 |
| --- | --- |
| 相対 `id/start_url/scope` | PASS |
| standalone / portrait | PASS |
| 192 / 512 / maskable / Apple 180 icons | PASS |
| Service Worker v1.5 app shell | PASS |
| `learning-engine-v15.js` precache | PASS |
| offline fallback | PASS |
| 古いcache削除 | PASS |
| waiting workerの明示更新 | PASS |
| 更新前save | PASS |
| `.nojekyll` | PASS |
| GitHub Actionsで検査後だけ公開 | PASS |

iOS Safari実機で未実施の物理確認は、ホーム画面追加、standalone起動、機内モード再起動、更新通知、JSON共有の5点。

## 7. 別観点監査

- プライバシー: 学習履歴をGitHubや外部サーバーへ送信しない
- セキュリティ: 静的アプリ、APIキーなし、Service Workerは同一origin/scopeのGETのみ
- アクセシビリティ: `lang=ja`、button、focus-visible、status、色以外のラベル
- 性能: 外部CDN/実行時依存なし、app shellをcache
- 継続性: 連続日数の罰ではなく最低MISSION・途中再開・復帰を支援
- 機能節制: 今回の追加は語彙障壁、根拠学習、時間内処理、保持、履歴保護へ限定

## 残る運用上の注意

1. SafariのWebサイトデータ削除は端末内コピーも消すため、JSONを端末外へ保存する。
2. URL・repository名を変更するとoriginが変わるため、JSON統合で移行する。
3. 愛知県の制度・時間が更新された場合は公式資料で再監査する。
4. AA Readinessは合否保証・公式確率ではない。
