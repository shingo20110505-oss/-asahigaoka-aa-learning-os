# Rise Documentation

現行システムを変更するときは、古い資料より先にこの管理文書群を確認する。

## 管理正本

- [`SYSTEM_MANAGEMENT.md`](SYSTEM_MANAGEMENT.md) — システム全体の正本、レイヤー、保存契約、変更フロー、管理負債
- [`AI_PLATFORM.md`](AI_PLATFORM.md) — 英語・数学・国語・理科・社会のAI生成・独立検証基盤
- [`../OPERATIONS.md`](../OPERATIONS.md) — 日常の開発、検査、公開、本番確認の手順

## 優先順位

運用情報が食い違う場合は、次の順で現在状態を確認する。

1. 実際の `main` のコードとWorkflow
2. `docs/SYSTEM_MANAGEMENT.md`
3. `OPERATIONS.md`
4. 対象領域の現行README
5. 過去資料・旧運用メモ

ただし、復習データについては `review-bank-v1.js`（または正式に指定された後継正本）が唯一のデータ正本であり、文書より実データを優先する。

## 変更時の基本

`最新main取得 -> 対象SHA確認 -> 作業ブランチ -> 変更 -> テスト -> 差分確認 -> mainへマージ -> Pages -> 本番検証`

既存の学習履歴・復習進捗・PWA・音声・画像・AI接続・教科エンジンを、別目的の変更に巻き込まない。
