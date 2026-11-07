import{chronological}from'./history-domain.mjs';
export const historyTrails=[
 {id:'participation',title:'政治参加は、どう広がった？',intro:'納税額・性別・年齢の条件を別々に追う。法改正と実際の投票の年を分ける。',ids:[478,255,944,383,384]},
 {id:'treaties',title:'開国から条約改正まで',intro:'条約を結んだ年と効力が生じた年、領事裁判権と関税自主権を区別する。',ids:[178,181,199,866,871,237]},
 {id:'reform',title:'江戸の改革を比較する',intro:'担当者、政策、解決しようとした問題を対応させる。同じ時代の別の出来事と混同しない。',ids:[148,149,158,762,765,813,168,172]},
 {id:'constitution',title:'明治の国家と議会',intro:'政権の変化、制度整備、議会の成立を順に追う。憲法の発布と議会の開始は別の年。',ids:[192,195,198,208,220,478,222]},
 {id:'world',title:'戦後の国際社会への復帰',intro:'国際機関の発足、日本の主権回復、それぞれの機関への加盟を分ける。',ids:[281,292,294,300,301]},
 {id:'environment',title:'環境と持続可能な社会',intro:'宣言・目標・法律・条約は役割が違う。何を定めたのかを本文で確かめる。',ids:[990,495,497,499,500]}
];
// Data carries its reviewed taxonomy. Keep enrichment pure and repeatable.
export function enrichHistory(original){return original.slice().sort(chronological);}
export const historyAdditions=6;

// These are navigation conventions, not claims that every region changed at once.
// Year boundaries intentionally overlap where a political transition falls in a year.
export const eraDefinitions=[
 {id:'旧石器時代',region:'日本',start:-100000,end:-14000,note:'日本列島の考古学的区分。縄文への移行には地域差がある。'},
 {id:'縄文時代',region:'日本',start:-14000,end:-300,note:'終期は地域で異なり、北部九州の弥生文化と重なる。'},
 {id:'弥生時代',region:'日本',start:-1000,end:250,note:'水田稲作の開始・普及には地域差がある。日本列島全体の一斉転換ではない。'},
 {id:'古墳時代',region:'日本',start:250,end:592,note:'古墳文化の範囲と政治史の飛鳥時代は厳密には一致しない。'},
 {id:'飛鳥時代',region:'日本',start:592,end:710},
 {id:'奈良時代',region:'日本',start:710,end:794},
 {id:'平安時代',region:'日本',start:794,end:1185},
 {id:'鎌倉時代',region:'日本',start:1185,end:1333,note:'武家政権成立の過程には1185年・1192年など複数の画期がある。'},
 {id:'建武の新政',region:'日本',start:1333,end:1336},
 {id:'南北朝時代',region:'日本',start:1336,end:1392},
 {id:'室町時代',region:'日本',start:1336,end:1573},
 {id:'戦国時代',region:'日本',start:1467,end:1573,note:'開始・終期には諸説がある。ここでは室町後期の学習用区分。'},
 {id:'安土桃山時代',region:'日本',start:1573,end:1603},
 {id:'江戸時代',region:'日本',start:1603,end:1868},
 {id:'明治時代',region:'日本',start:1868,end:1912},
 {id:'大正時代',region:'日本',start:1912,end:1926},
 {id:'昭和時代（戦前・戦中）',region:'日本',start:1926,end:1945},
 {id:'昭和時代（戦後）',region:'日本',start:1945,end:1989},
 {id:'平成時代',region:'日本',start:1989,end:2019},
 {id:'令和時代',region:'日本',start:2019,end:9999},
 ...['飛鳥文化','天平文化','国風文化','鎌倉文化','北山文化','東山文化','桃山文化','元禄文化','化政文化','文明開化'].map(id=>({id,region:'日本',kind:'文化期',note:'関連する作品・制度・人物に付す。年代だけで自動付与しない。'})),
 {id:'ルネサンス期',region:'ヨーロッパ',kind:'文化期',note:'14〜16世紀のイタリアを中心に展開。北方・イギリス等では展開時期が異なる。宗教改革・科学革命と同義ではない。'},
 {id:'宗教改革期',region:'ヨーロッパ',kind:'主題'},
 {id:'科学革命期',region:'ヨーロッパ',kind:'主題'},
 {id:'啓蒙思想の時代',region:'ヨーロッパ',kind:'主題'},
 {id:'イスラム文明の発展',region:'西アジアなど',kind:'主題'},
 ...['東アジア','東南アジア','南アジア','西アジア','欧米','世界'].flatMap(region=>['古代以前','古代','中世','近世','近代','現代'].map(period=>({id:`${region}：${period}`,region,kind:'地域別大分類',note:'既存periodを地域と組み合わせた検索区分。各地域の王朝・文化の境界を定義するものではない。'})))
];
export const historyTopics=['文化','思想','宗教','文学','美術','建築','科学・技術','教育'];
const culturalGroups=[
 ['飛鳥文化',[29,386,547,548]],['天平文化',[49,50,53,387,388,389,564,565]],
 ['国風文化',[345,346,390,391,392,578,579,584]],['鎌倉文化',[348,394,395,396,397,398,399,400]],
 ['北山文化',[351,401]],['東山文化',[352,402,403,404,405]],['桃山文化',[406,407,408,409]],
 ['元禄文化',[355,411,412,413,741,743,2004]],['化政文化',[357,358,416,417,418,757]],
 ['文明開化',[419,456,457]],['ルネサンス期',[91,432,433,434,435,2005,2006]],
 ['宗教改革期',[108,112,710,711,713,715]],['科学革命期',[114,436,437,768]],
 ['啓蒙思想の時代',[150,438,439,440,441,792]],['イスラム文明の発展',[38,427,428,669]]
];
const topicPatterns=[
 ['思想',/思想|哲学|人文主義|儒教|国学|法の精神|社会契約|国富論|ソクラテス|プラトン|アリストテレス/],
 ['宗教',/仏教|キリスト|イスラム|仏像|信仰|宗教|浄土|禅宗|天台宗|真言宗|曹洞宗|臨済宗|時宗|日蓮|神仏/],
 ['文学',/文学|物語|和歌|日記|随筆|詩|万葉集|古今和歌集|枕草子|方丈記|徒然草|古事記|日本書紀|俳諧|俳句|短歌|浮世草子|好色一代男|浄瑠璃|曽根崎心中|膝栗毛|八犬伝|小説|浮雲|舞姫|たけくらべ|吾輩|羅生門|青鞜|神曲|ハムレット|シェイクスピア/],
 ['美術',/美術|絵|画|彫刻|金剛力士|土偶|埴輪|陶器|焼の生産|絞り染め|障壁|琳派|光琳|モナ・リザ|システィーナ|アテネの学堂|日本陶器/],
 ['建築',/建築|法隆寺|飛鳥寺|唐招提寺|金閣|銀閣|書院造|寝殿造|枯山水|金色堂|大仏|寺の建立|南大門|アンコール|パルテノン|ピラミッド|本丸御殿/],
 ['科学・技術',/科学|天文学|地動説|望遠鏡|プリンキピア|ケプラー|ニュートン|印刷|活字|解体新書|蘭学|測量|エレキテル|ペニシリン|動力飛行|月面|ラジオ放送|テレビ|映画/],
 ['教育',/学問|学校|寺子屋|藩校|教育|アカデメイア|リュケイオン/]
];

/** Range used only for navigation: explicit curated ranges take precedence. */
export function historyDateRange(row){
 if(row.dateRange)return {...row.dateRange};
 const year=Math.trunc(row.sort),text=row.date;
 // Exact years (including BCE) should not become whole-century intervals.
 if(!text.includes('世紀'))return {start:year,end:year,precision:/ごろ|約|年代/.test(text)?'approximate':'year'};
 const m=text.match(/(\d+)(?:[〜～–-](\d+))?世紀/);
 if(!m)return {start:year,end:year,precision:'representative'};
 const first=Number(m[1]),last=Number(m[2]||m[1]);
 if(text.includes('紀元前'))return {start:-Math.max(first,last)*100,end:-(Math.min(first,last)-1)*100-1,precision:'century'};
 let start=(first-1)*100+1,end=last*100;
 if(!m[2]){if(/後半/.test(text))start+=50;else if(/前半/.test(text))end-=50;else if(/初め|初頭/.test(text))end=start+24;}
 return {start,end,precision:'century'};
}

/** Build-time materialization. Never infer cultural periods from year alone. */
export function classifyHistory(row){
 const range=historyDateRange(row),eras=[],japan=row.area.includes('日本');
 if(japan){
  if(row.id===380||row.id===2002)eras.push('縄文時代');
  else if(row.id===381||row.id===2003)eras.push('弥生時代');
  else if(row.id===2001)eras.push('旧石器時代');
  else for(const era of eraDefinitions.filter(x=>x.region==='日本'&&Number.isFinite(x.start))){if(range.start<=era.end&&range.end>=era.start)eras.push(era.id);}
 }else{
  const region=['東南アジア','東アジア','南アジア','西アジア','欧米'].find(x=>row.area.includes(x))||'世界';
  eras.push(`${region}：${row.period}`);
 }
 for(const [name,ids]of culturalGroups)if(ids.includes(row.id))eras.push(name);
 const labels=new Set([...eraDefinitions.map(x=>x.id),...historyTopics]);
 const text=[row.event,...row.tags.filter(x=>!labels.has(x))].join(' '),topics=topicPatterns.filter(([,re])=>re.test(text)).map(([name])=>name);
 if([428,429,430,433,436,437,443,444,445,768].includes(row.id))topics.push('科学・技術');
 if(row.id!==313&&(topics.length||eras.some(x=>eraDefinitions.find(d=>d.id===x)?.kind==='文化期')||/文化|能を|歌舞伎|かぶき|茶の湯|わび茶|出版業|貸本屋/.test(text)))topics.unshift('文化');
 return {eras:[...new Set(eras)],topics:[...new Set(topics)]};
}
