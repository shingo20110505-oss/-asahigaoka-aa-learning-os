import{chronological}from'./history-domain.mjs';
export const historyTrails=[
 {id:'participation',title:'政治参加は、どう広がった？',intro:'納税額・性別・年齢の条件を別々に追う。法改正と実際の投票の年を分ける。',ids:[478,255,944,383,384]},
 {id:'treaties',title:'開国から条約改正まで',intro:'条約を結んだ年と効力が生じた年、領事裁判権と関税自主権を区別する。',ids:[178,181,199,866,871,237]},
 {id:'reform',title:'江戸の改革を比較する',intro:'担当者、政策、解決しようとした問題を対応させる。同じ時代の別の出来事と混同しない。',ids:[148,149,158,762,765,813,168,172]},
 {id:'constitution',title:'明治の国家と議会',intro:'政権の変化、制度整備、議会の成立を順に追う。憲法の発布と議会の開始は別の年。',ids:[192,195,198,208,220,478,222]},
 {id:'world',title:'戦後の国際社会への復帰',intro:'国際機関の発足、日本の主権回復、それぞれの機関への加盟を分ける。',ids:[281,292,294,300,301]},
 {id:'environment',title:'環境と持続可能な社会',intro:'宣言・目標・法律・条約は役割が違う。何を定めたのかを本文で確かめる。',ids:[990,495,497,499,500]}
];
// Restore the preserved descriptions without overwriting dates or adding rows.
export function enrichHistory(original){return original.slice().sort(chronological);}
export const historyAdditions=0;
