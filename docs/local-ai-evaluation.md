> Historical evidence only. On 2026-10-26 the user requested removal of all current browser-local LLMs. Their application code, model download/comparison UI and runtime were removed. The updated app purges model caches. Commands and source paths below describe the retired release and are not current instructions.

# RISE 端末内LLM比較記録

評価日: 2026-10-26 JST。公開判定: **今回の固定WebLLM・AMD WebGPU実行経路では採用保留**。

7モデルの実回答を比較したところ、日本語の学習で重要な誤りが残りました。モデルがダウンロードできたことや簡単な語句照合を通過したことだけで、学習用チャットに自動採用しません。`src/local-ai/models.mjs` の `RELEASE_MODEL_IDS` は空です。通常の `prepare` / `generate` は未承認モデルを拒否し、`status().ready` は false です。端末の対応確認、実験用の明示的な比較、結果保存は利用できます。

これは全てのオフラインLLMが不適という結論ではありません。今回の量子化済みモデル・コンパイル済みWASM・ランタイム・GPU経路に限定した結果です。量子化、コンパイラ、GPUカーネル、トークナイザーを含む原因の切り分けは未完了です。

## 測定環境と方法

- Windows、Headless Chrome 155、AMD WebGPU。`maxBufferSize=2147483648`、`shader-f16` 対応。実際のUAとGPU情報は各JSONに保存。
- WebLLM **0.2.86**、モデルのHugging FaceリビジョンとWASMのGitコミットを全て固定。正確なURLは `src/local-ai/models.mjs` に記載。
- 各候補を順に読み込み、固定6問を独立した会話として処理。毎回 `resetChat()` でKVキャッシュをリセット。
- 質問は英語 because/although、一次方程式、御恩と奉公、光合成、顕著、添付がない画像についての質問。個人のチャット、画像、ノートは使っていません。
- `temperature=0.2`、`top_p=0.9`、`frequency_penalty=0.1`、最大220出力トークン、文脈4096。Qwen3系は `enable_thinking:false`。Gemmaの再確認では公式の形式に従いsystem指示を最初のuser本文へ移しました。
- 初字・回答完了時間は6問の上側中央値（昇順の4番目）。短い回答ほど完了時間が小さくなるため、速度だけで比較していません。初回質問にはシェーダー準備等が含まれます。
- 比較後にWorkerを破棄し、新しいWorker内でネットワーク取得を禁止。保存済みモデルだけで再ロードし、1+1に回答できるか確認。
- 簡易スクリーニングは6問中5問以上・オフライン再起動・計算スモークテストを条件にしていますが、語句照合には偽陽性・同義表現の見落としがあります。公開採用には原文確認も必要です。

## 結果

GPU参考値はWebLLMのモデル設定に記載された値です。端末の実測ピークメモリではありません。

|モデル|GPU参考MB|簡易判定|初字中央値 秒|完了中央値 秒|初回読み込み 秒|保存済み再読み込み 秒|
|---|---:|---:|---:|---:|---:|---:|
|Qwen2.5 0.5B|944.62|2/6|0.469|6.858|13.940|1.491|
|Qwen3 0.6B|1403.34|2/6*|0.484|3.979|27.188|1.566|
|Qwen3.5 0.8B|1629.49|2/6|1.041|14.667|18.333|3.124|
|Qwen2.5 1.5B|1629.75|1/6|1.395|11.290|34.498|4.591|
|Gemma 3 1B 再確認|711.07|0/6|0.473|10.858|下記参照|下記JSON|
|Gemma 2 日本語2B 再確認|1895.30|3/6|1.654|8.323|84.037（初回）|6.467|
|Qwen3 1.7B|2036.66|2/6|1.665|12.186|37.643|4.076|

* Qwen3 0.6Bの画像なしの回答は、推測をしているのに旧判定を通過しました。現在の判定では拒否します。

読み込み時間にはダウンロード、キャッシュ、コンパイル等が含まれます。再確認では既にモデルが保存されており、新規ダウンロードの時間とは比較できません。Gemma 3は初回、上流設定のcontextとsliding-windowの競合で起動失敗。`sliding_window_size:-1` を明示した後に実際の推論を測定しました。Gemma 3の繰り返しの多さはこの設定・ビルドを含む実行経路での観測です。

## 原文と判断

全質問、回答原文、トークン数、生成速度、初字・全体・再起動時間、エラーは以下のJSONに保存しています。途中の結果も改変せず残しました。

- `local-ai-pc-benchmark.json`: 最初の3候補。旧スキーマの `offlineVerified` は1+1の正誤まで混ぜていたため、Qwen2.5 0.5Bのfalseは「ネット接続が必要」の意味ではありません。ネット取得禁止で生成は完了したものの計算回答が誤りました。
- `local-ai-pc-controls.json`: Qwen3 0.6Bでsystem文なしの英語・日本語を比較。英語の光合成とalthoughは正答、日本語の光合成では光子と回答、althoughでは「の」を説明。全般に推論不能という状態ではありませんが、これだけでランタイム由来の問題を排除できません。
- `local-ai-pc-expanded.json`: Qwen2.5 1.5B、Gemma 3初期設定の失敗。1.5Bは方程式をx=20/3、顕著の読みを「ひけょう」とする等の誤り。
- `local-ai-pc-gemma.json`: Gemma 3の設定修正後とGemma 2日本語2Bの初回。日本語2Bは語句照合5/6でしたが、方程式の見出しに「xで割る」という誤りがあり、その後の再確認でも安定しませんでした。
- `local-ai-pc-gemma-formatted.json`: Gemma公式形式に合わせた再確認。日本語2Bは3/6。方程式の数式は正しくても見出しは「xで割る」。御恩は経済・政治支援の説明で所領安堵・新恩給与を説明していません。画像なしに対する確認質問は適切な応答とも評価できますが、その同義表現を通しても4/6で、採用判断は変わりません。
- `local-ai-pc-qwen17.json`: Qwen3 1.7B。becauseとalthoughをともに「なぜか」、御家人を将軍の家族、光合成で二酸化炭素を発生すると説明。初等方程式と画像なしへの応答は適切でした。

前半候補の回答にはQwenの空のthinkタグが記録されています。現在は空の非思考プレフィックスのみを表示前に取り除きます。答えの内容は補正していません。

## iPad A16とオフライン

**iPad A16の実機測定は行っていません。PCの数字をiPadへ換算していません。** Safari 26でのWebGPU導入を確認した上で、OS名の推測ではなくsecure context、WebGPU adapter、shader-f16を実行時に検出します。学校側のブラウザ制限、空きメモリ、モデル配信ドメインへの到達、ストレージ保持は端末ごとに異なります。

`#/device-ai` で対応確認と任意の比較を実行できます。比較はモデルを直列処理し、進捗、中止、メモリ不足、取得失敗、時間切れに対応します。結果は端末内保存でJSONの保存・コピーが可能です。自動で大容量モデルを取得しません。

オフライン準備判定はconfig、tokenizer、tensor manifest、全シャード、WASMの存在をCache APIで確認します。`cachedOnly` は不完全なら起動せず、Workerのネット取得も禁止します。ブラウザがキャッシュを消去した場合は未準備に戻ります。ここで検証したのはモデル資産のネット取得禁止下での新Worker再起動です。実機iPadでページ全体のオフライン再起動を確認したという意味ではありません。

## APIと分離

`src/local-ai/client.mjs` の `localAI` が入口です。`status()` の `installed` は実際の完全キャッシュ、`validated` は公開許可と現在のモデル・runtimeの確認記録、`ready` はそれらとGPU対応を全て要求します。`generate(messages,{onDelta,signal})` のonDeltaは追加文字列です。会話は渡されたテキストだけを使用し、毎回KVを初期化します。ログアウト時には上位アプリから `unload()` を呼びます。管理者・ゲストの履歴保存は上位チャットの責務です。

`benchmark()` は実験用に未承認モデルを起動できますが、終了・例外・中止時にWorkerを破棄します。APIで結果が偶然簡易合格になっても、公開許可リスト外は通常チャットのreadyになりません。削除時はモデル資産と検証証明を削除します。

## 再現と検証

```powershell
node --test tests/rise-local-ai.test.mjs
$env:RISE_PLAYWRIGHT_MODULE='（利用するPlaywrightのindex.js絶対パス）'
node scripts/local-ai-benchmark.mjs docs/local-ai-new-result.json 'Qwen3-0.6B-q4f16_1-MLC'
```

比較スクリプトは自分のcheckoutだけをport4322で配信し、一時Chromeプロファイルへモデルを保存します。モデルIDをカンマ区切りで複数指定できます。モデル未保存時はGB単位の取得が発生します。`RISE_BENCH_UI_ONLY=1` はモデルを取得せず画面だけを確認します。`RISE_BENCH_CONTROL=1` は保存済みモデルに英日対照質問を送ります。

回帰検証はキャッシュ欠落、GPU非対応、キャンセル、履歴入力の制限、公開ゲート、Gemma会話形式、空thinkタグ、比較例外時のbusy解除、削除時の検証記録削除を含みます。有料APIは使用していません。

## 依存物と一次資料

- [WebLLM](https://github.com/mlc-ai/web-llm): npm 0.2.86の配布JSを改変せず同梱。Apache-2.0、`vendor/LICENSE.web-llm` と `vendor/README.md`。npm SRIを照合して取得し、インストールスクリプトは実行していません。
- [WebLLMの設定](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts)、[WebLLMの高度な使い方](https://webllm.mlc.ai/docs/user/advanced_usage.html)。実行バージョンとモデルURLは前述のコードで固定。
- [Safari 26のWebGPU](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)。実際の対応は機能検出。
- [Qwen3 0.6B公式](https://huggingface.co/Qwen/Qwen3-0.6B)、[Qwen2.5 1.5B公式](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)。Qwen候補はApache-2.0。モデルの重みは同梱せず固定revisionの上流MLC変換を使用。
- [Gemma 3公式](https://huggingface.co/google/gemma-3-1b-it)、[Gemma 2日本語2B公式](https://huggingface.co/google/gemma-2-2b-jpn-it)、[Gemmaのプロンプト形式](https://ai.google.dev/gemma/docs/core/prompt-structure)。
- [Gemma利用規約](https://ai.google.dev/gemma/terms)、[使用制限](https://ai.google.dev/gemma/prohibited_use_policy)。2026-10-26取得の本文コピーを `vendor/GEMMA_TERMS.txt` / `GEMMA_PROHIBITED_USE.txt` に保存し、必要な通知を `NOTICE.Gemma.txt` に記載。比較画面でGemmaを含める場合は同意を必要とします。

Gitにはモデルの重みを保存していません。検証結果に個人のチャットや資料は含まれません。
