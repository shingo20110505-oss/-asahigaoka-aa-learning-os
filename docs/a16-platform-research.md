# iPad A16 / ブラウザ内LLMの実行条件

調査日: 2026-10-26 JST。公式仕様・開発元のドキュメント・固定モデルメタデータを参照。実機A16には接続できていないため、この文書は性能の実測ではない。

## ハードウェアとブラウザ

Appleの仕様はA16、5コアCPU、4コアGPU、16コアNeural Engine、ストレージ128/256/512GB。iPhoneのA16のコア数を流用しない。Appleの当該仕様表にRAM容量は掲載されていない。一般に流通するRAM値を、確認済みのブラウザ使用可能量として採用しない。Neural Engineの存在はWebGPUからそれを使える根拠ではない。[Apple仕様](https://support.apple.com/en-us/122240)

WebKitはSafari 26.0でiPadOSを含むWebGPUの提供を発表している。OS名だけで判定せず、HTTPS、`navigator.gpu`、adapter取得、`shader-f16`、buffer上限を実行時に確認する。旧iPadOSのブラウザや学校の管理設定、アプリ内ブラウザは別条件になる。[WebKit Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)、[Apple WWDC25](https://developer.apple.com/videos/play/wwdc2025/236/)

調査日時点では**iPadOS 27 / Safari 27系も提供済み**で、AppleのiPadOS 27対応機種にA16が含まれる。Safari 27.0の公式リリース記事は2026-09-17付で、WASM SIMDやWebGPUのエラー処理・WGSL検証などの修正も記載している。したがって26.0を「現行最新版」と扱わず、端末が26系か27系か、実際の細かなバージョンを結果に記録する。ブラウザ修正が今回のモデル品質・速度を改善するかは実機検証が必要。[Apple対応機種](https://support.apple.com/en-ph/guide/ipad/ipad213a25b2/27/ipados/27)、[WebKit Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)

ブラウザ名がChromeでもWindowsのChromeと同じエンジン・制限とは限らない。Appleの代替エンジン制度は地域・OS・entitlementで条件が異なり、日本向け制度の記載はiOSが対象。EUのiPadOS対応と混同しない。Safariを基準にし、他ブラウザは実際の版と機能検出を別記する。[日本](https://developer.apple.com/support/alternative-browser-engines-jp/)、[EU](https://developer.apple.com/support/alternative-browser-engines/)

## メモリと保存領域

- パラメータ数×量子化bit数は重みのおおよその下限。スケール、非量子化テンソル、KVキャッシュ、作業バッファ、JS/WASM、GPUへの転送時のコピー、OS・ブラウザもメモリを使う。モデルファイルの容量だけでは実行可否を判断できない。
- `maxBufferSize` は単一GPUバッファの上限、`maxStorageBufferBindingSize` はバインド可能サイズ。どちらも空きRAMやGPU総メモリではない。WebLLMの `vram_required_MB` も開発元の参考値で、A16上の実測ピークではない。
- Safariの保存領域はブラウザのoriginで最大ディスクの60%、ブラウザ全体では80%という方針があるが、予約容量ではない。ディスク不足・全体上限・使用状況に応じた回収がある。`navigator.storage.estimate()` と `persist()` の結果、実際の再起動を記録する。128GB端末の60%を使えると保証してモデル選定しない。[WebKit保存方針](https://webkit.org/blog/14403/updates-to-storage-policy/)
- WASM32の4GiBアドレス空間、JS ArrayBufferの実装上限、ブラウザ/OSのプロセス終了は別々の制約。4GiBをブラウザ全体のRAM上限として扱わない。ONNX Runtimeの資料もArrayBuffer・protobuf・WASMメモリを区別している。[ONNX Runtime large models](https://onnxruntime.ai/docs/tutorials/web/large-models.html)
- iPadの標準Web APIから実メモリ総量・ピークGPU常駐量を信頼できる形で取得することは、このラボではできない。`performance.memory` があるChromiumでもJS heapだけ。実機ではMacのWeb Inspector/Instruments等による別測定と、実際の背景復帰・タブ再生成の観測を要する。

## 現行ランタイム

|経路|今回確認した版|適性と注意|
|---|---|---|
|WebLLM / MLC WebGPU|npm 0.2.86|モデル・量子化・コンパイル済みWASMの組合せを固定する。小さなシャードを使え、Cache APIでオフライン再起動可能。前回と同一系列なので大型化による改善と実行経路の問題を切り分ける必要がある。|
|wllama / llama.cpp|npm 3.8.1|現行版はWASM CPUだけでなくWebGPUにも対応。GGUF/Jinjaテンプレートを使う別経路。GPU offloadは `n_gpu_layers`、CPUは0。マルチスレッドにはCOOP/COEP等が必要なのでラボはsingle-threadで実行。|
|Transformers.js / ONNX Runtime Web|npm metadata 4.3.1|WebGPU/量子化ONNXの候補。変換モデルの対応演算・外部データ配置も検証が必要。本ラボでは実行していない。公式WebGPUガイドのstable表示はv3.8.1でnpmタグと差があり、最新版タグを安定動作の証拠にはしない。|

wllamaはファイルを512MB程度へ分割することを推奨し、2GBを超える単一ファイルに制約を記している。今回のQwen2.5 3B GGUFは2,104,932,768 bytes（約1.96GiB）で2GiB未満だが、その近辺でもSafariが保持できる保証はない。4B GGUFの約2.50GBを使う場合はGGUF構造を保つsplitで分割し、全シャード・保存/復帰を再検証する。単純なバイナリ分割やファイル総量だけの判断はしない。[wllama開発元](https://github.com/ngxson/wllama)、[v3変更](https://github.com/ngxson/wllama/blob/master/guides/intro-v3.md)、[Transformers.js](https://huggingface.co/docs/transformers.js/guides/webgpu)

## 大型化した候補

|候補|量子化/経路|固定配布物の容量|選定理由|
|---|---|---:|---|
|Qwen2.5 3B Instruct|q4f16_1 / WebLLM|1,747,842,539 bytes|前回の0.5B/1.5Bから大型化。同じ3Bの公式GGUFと比較する。3Bはqwen-researchライセンス。|
|Qwen3 4B|q4f16_1 / WebLLM|2,278,983,734 bytes|前回の0.6B/1.7Bから大型化。日本語を含む多言語、非思考モードを使用。|
|Qwen3.5 4B|q4f16_1 / WebLLM|2,390,258,276 bytes|前回0.8Bから大型化。今回の対象はテキスト学習質問。原モデルが画像対応でも、画像理解の実用性は主張しない。|
|Qwen2.5 3B Instruct|Q4_K_M / wllama|2,104,932,768 bytes|公式GGUFによる別ランタイム・別量子化の対照。MLCだけの問題かを検討する材料。|
|Qwen3 4B Instruct 2507|Q3_K_M / wllama|2,075,618,400 bytes|非思考専用の改良版。UnslothのGGUF変換。単一ファイル制約に収まる3bit版で、旧Qwen3とはモデル・量子化・runtimeが異なる。|

MLCの容量は固定revisionのconfig/tokenizer/manifest/全重みシャードの合計で、実際の通信量ではない。WASM・runtime・保存管理のオーバーヘッドは別。GGUFは配布元のLFSサイズ。初回ロード時間には取得・キャッシュ書込・コンパイルを含むため、通信時間だけではない。2507版の変換元は [Unsloth GGUF](https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF)。

未実測の追加候補にPhi-4-mini-instruct（3.8B、日本語を含む）がある。7B/8B級も容量だけで禁止しないが、4bit重みだけで約4GB以上に加え実行メモリが必要になるため、A16の実測がないまま推奨できない。

原モデル一次資料: [Qwen2.5 3B](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)、[公式GGUF](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF)、[Qwen3 4B](https://huggingface.co/Qwen/Qwen3-4B)、[Qwen3.5 4B](https://huggingface.co/Qwen/Qwen3.5-4B)、[Qwen3-4B-Instruct-2507](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)、[Phi-4-mini](https://huggingface.co/microsoft/Phi-4-mini-instruct)。量子化変換のSHAとWASMのGit SHAは `experiments/a16/models.json` に保存。
