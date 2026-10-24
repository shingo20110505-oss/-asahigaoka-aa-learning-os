// Reviewed official papers, 2026-10-24. A word in a passage is not necessarily
// the target of a vocabulary question. This small sample is not frequency data.
export const classicalPapers=[
 {id:'aichi-2026',label:'愛知県 2026年度',section:'大問4・冊子9ページ',work:'閑夜茶話',url:'https://www.pref.aichi.jp/uploaded/attachment/609757.pdf#page=10',answers:'https://www.pref.aichi.jp/uploaded/attachment/609772.pdf',finding:'主語の特定、気持ちの読み取り、行動の意味が問われています。'},
 {id:'osaka-b-2026',label:'大阪府 2026年度 B問題',section:'大問2・冊子2ページ',work:'古今著聞集',url:'https://www.pref.osaka.lg.jp/documents/129362/r08ippan-102kokugo-b-mondai.pdf#page=1',answers:'https://www.pref.osaka.lg.jp/documents/129362/r08ippan-102kokugo-b-saishi.pdf',finding:'驚いた理由の記述、現代仮名遣い、手紙の内容、動作主を確認する問題です。'},
 {id:'osaka-c-2026',label:'大阪府 2026年度 C問題',section:'大問2・冊子2ページ',work:'今物語',url:'https://www.pref.osaka.lg.jp/documents/129362/r08ippan-103kokugo-c-mondai.pdf#page=1',answers:'https://www.pref.osaka.lg.jp/documents/129362/r08ippan-103kokugo-c-saishi.pdf',finding:'敬語を手がかりに動作主を特定し、指示内容と判断の理由を読み取ります。'},
 {id:'kanagawa-2026',label:'神奈川県 2026年度 全日制',section:'問4・冊子11〜12ページ',work:'宇治拾遺物語',url:'https://www.pref.kanagawa.jp/documents/131902/2_r8kokugo_zen_mon.pdf#page=12',answers:'https://www.pref.kanagawa.jp/documents/131902/2_r8kokugo_zen_sei.pdf',finding:'僧・殿・周囲の人々の関係、驚いた理由、出来事の因果関係を読み取ります。'}
];
// Each group names base forms of words visually confirmed in the cited paper.
const observations=[
 ['aichi-2026','本文',['給ふ']],
 ['aichi-2026','主語の設問',['申す']],
 ['aichi-2026','意味を含む設問',['本意']],
 ['osaka-b-2026','本文',['参る','召す','いづれ','すみやかなり']],
 ['osaka-b-2026','状況説明の設問',['あやしむ']],
 ['osaka-b-2026','動作主の設問',['さとる']],
 ['osaka-c-2026','本文',['候ふ','いづれ','あまた','やがて','おぼゆ','給ふ','いかに','かかる','いぬ']],
 ['osaka-c-2026','動作主の設問',['召す','申す']],
 ['osaka-c-2026','指示内容の設問',['尋ぬ']],
 ['osaka-c-2026','注付き本文',['まめやかなり']],
 ['kanagawa-2026','本文',['侍り','給ふ','参る','仰す','申す','のたまふ','おはす','奉る','召す','つゆ','やむごとなし','よし','かく','いみじ','としごろ','けしき','心地','こよなし','そこばく','失す']],
 ['kanagawa-2026','注付き本文',['候ふ','ゐる']],
 ['kanagawa-2026','心情の設問',['あやし']]
];
export function wordEvidence(word){return observations.filter(([, ,words])=>words.includes(word)).map(([paperId,type])=>({paperId,type}));}
