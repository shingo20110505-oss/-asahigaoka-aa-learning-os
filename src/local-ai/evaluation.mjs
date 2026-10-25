// Windows Chrome, AMD WebGPU, 2026-10-26 JST. These are NOT iPad measurements.
// See docs/local-ai-*.json and docs/local-ai-evaluation.md for original responses and methodology.
export const PC_EVALUATION={date:'2026-10-26',device:'Windows・Chrome・AMD WebGPU',runtime:'WebLLM 0.2.86',approved:false,rows:[
 {name:'Qwen2.5 · 0.5B',score:'2/6',first:0.47,total:6.86,note:'英語・社会・理科の説明に誤り'},
 {name:'Qwen3 · 0.6B',score:'2/6*',first:0.48,total:3.98,note:'日本語の質問で重要な誤り。画像なしの判定にも偽陽性'},
 {name:'Qwen3.5 · 0.8B',score:'2/6',first:1.04,total:14.67,note:'御恩・光合成・語彙の説明に誤り'},
 {name:'Qwen2.5 · 1.5B',score:'1/6',first:1.39,total:11.29,note:'方程式と理科の説明に誤り'},
 {name:'Gemma 3 · 1B',score:'0/6',first:0.47,total:10.86,note:'この実行経路では語句の繰り返しが多い'},
 {name:'Gemma 2 · 日本語 2B',score:'3/6',first:1.65,total:8.32,note:'初回5/6から再確認で3/6。計算説明にも誤り'},
 {name:'Qwen3 · 1.7B',score:'2/6',first:1.66,total:12.19,note:'光合成・御恩・語彙の説明に誤り'},
]};
