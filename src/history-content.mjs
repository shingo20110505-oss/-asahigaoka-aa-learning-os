import{chronological}from'./history-domain.mjs';
const sources={
 votes:'https://www.sangiin.go.jp/japanese/annai/chousa/rippou_chousa/backnumber/2015pdf/20151001003.pdf',
 vote2016:'https://www.pref.kanagawa.jp/docs/em7/cnt/f5/p983663.html',
 adult:'https://www.moj.go.jp/MINJI/minji07_00218.html',
 paris:'https://www.env.go.jp/policy/hakusyo/h30/html/hj18020102.html',
 rice:'https://www.soumu.metro.tokyo.lg.jp/01soumu-archives/06kanko_butsu/0601sisiko/0601sangyo/0601sangyo11',
 un:'https://www.unic.or.jp/info/un/charter/text_japanese/',
 unesco:'https://www.archives.go.jp/ayumi/kobetsu/s26_1951_02.html',
 universal:'https://www.ndl.go.jp/modern/cha3/description13.html',
 women:'https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/kensei/No.043.pdf/%24File/No.043.pdf',
 trade:'https://www.archives.go.jp/exhibition/digital/bakumatsu/contents/20.html',
 tariff:'https://www.archives.go.jp/ayumi/kobetsu/m44_1911_01.html',
 famine:'https://www.archives.go.jp/exhibition/digital/tenkataihen/famine/index.html',
 sdgs:'https://www.mofa.go.jp/mofaj/gaiko/oda/SDGs/about/index.html'
};
const extra=[
 [1001,2015,'2015年','選挙権年齢を18歳以上に引き下げる改正法が成立','日本','選挙権','votes','選挙権年齢を20歳以上から18歳以上へ改める公職選挙法の改正が成立した。','政治参加の年齢を見直す議論を受けた改正。','実際の適用は2016年の選挙から。法律が成立した年と、新しい条件で投票する年を区別する。','1925年は納税資格、1945年は男女の区別、2015〜16年は年齢条件の変化に着目する。'],
 [1002,2016,'2016年','18歳選挙権が適用される','日本','選挙権','vote2016','選挙権年齢の引下げが実施され、18歳・19歳の人も国政選挙へ参加できるようになった。','前年の改正公職選挙法による変更。','選挙に参加できる年齢の範囲が広がった。','成年年齢の18歳への引下げは2022年。選挙権と民法の成年を同じ改正だと思い込まない。'],
 [1003,2016,'2016年11月4日','パリ協定が発効する','欧米・世界','環境','paris','2015年に採択されたパリ協定が、発効に必要な条件を満たして効力を持った。','温暖化対策の新たな国際的枠組みとして前年に採択された。','各国による協定の実施を進める段階に移った。','2015年の採択と2016年の発効を区別する。京都議定書と成立年を混同しない。'],
 [1004,1722,'1722年','上米の制と参勤期間の変更が行われる','日本','江戸の改革','rice','享保の改革期に、諸大名の上米と参勤の期間変更に関する命令が出された。','幕府と大名の財政負担を考えるうえで重要な制度変更。','参勤交代の仕組みと財政政策が結び付いていたことが分かる。','将軍は徳川吉宗。松平定信の寛政の改革、水野忠邦の天保の改革と担当者・政策を混同しない。'],
 [1005,1945,'1945年6月26日','国際連合憲章が調印される','欧米・世界','国際協調','un','サンフランシスコで国際連合憲章が調印された。','第二次世界大戦後の国際協力を担う組織の基本となる文書。','同年10月24日に発効し、国際連合が発足する。','調印と発効は別の段階。日本の国連加盟は1956年であり、発足時の加盟ではない。'],
 [1006,1951,'1951年7月2日','日本がユネスコに加盟する','日本・世界','国際協調','unesco','日本はユネスコ憲章への署名と受諾書の寄託を経て、正式な加盟国となった。','戦後、教育・科学・文化を通じた国際協力への復帰を進めていた。','国際社会への復帰を進める一歩となった。','ユネスコ加盟は1951年、主権回復は1952年、国連加盟は1956年。組織と年を組み合わせる。'],
 [1007,2022,'2022年4月1日','民法の成年年齢が18歳に引き下げられる','日本','社会参加','adult','2018年に成立した民法改正が施行され、成年年齢が20歳から18歳に変更された。','若者の自己決定や社会参加に関わる制度の見直し。','民法上の成年となる年齢が変わった。','2016年の18歳選挙権と区別する。すべての年齢制限が18歳になったという意味ではない。']
].map(([id,sort,date,event,area,tag,source,summary,background,result,exam])=>({id,sort,date,event,area,period:sort<1868?'近世':'現代',level:'A',detail:summary,tags:[tag,'補完'],note:{summary,background,result,exam},sources:[sources[source]],enriched:true}));
const patches={
 813:{sort:1833,date:'1833年以降',dateApproximate:true,note:{summary:'天保の飢饉は1833年から始まり、1836〜37年ごろにも深刻な被害をもたらした。',background:'冷害や凶作で食料が不足し、米価が上がった。',result:'農村だけでなく都市の生活も圧迫され、一揆や打ちこわし、大塩平八郎の乱の背景となった。',exam:'「1830年代」という広い表示を1830年の単発事件として並べない。始まりと深刻化には幅がある。'},sources:[sources.famine]},
 500:{sort:2015,date:'2015年12月',sources:['https://www.env.go.jp/policy/hakusyo/h29/html/hj17010201.html'],note:{background:'温暖化対策を進める新しい国際的枠組みが議論された。',result:'2016年に発効した。',exam:'SDGsの採択も2015年だが、目的・採択の場・文書を区別する。'}},
 499:{date:'2015年9月',sources:[sources.sdgs],note:{summary:'国連で採択された「持続可能な開発のための2030アジェンダ」に、17の目標からなるSDGsが掲げられた。',background:'MDGsの後継として、開発と持続可能性を結び付ける目標が議論された。',result:'2030年を目標年とする国際的な取組の基準となった。',exam:'SDGsは目標。温暖化対策の国際約束であるパリ協定と区別する。'}},
 255:{sources:[sources.universal],note:{background:'納税額にかかわらず選挙に参加できるよう求める普選運動が広がった。',result:'衆議院議員選挙の納税資格がなくなったが、女性に選挙権は認められなかった。',exam:'「普通選挙」という名から、当時すべての成人に認められたと思い込まない。同年の治安維持法との対比も確認する。'}},
 256:{sources:[sources.universal],note:{background:'社会主義運動などへの警戒が強まる中で制定された。',result:'国体の変革や私有財産制度の否認を目的とする結社などを取り締まる法律となった。',exam:'1925年は選挙参加の拡大と思想統制の強化が同時期に起きたことを押さえる。'}},
 383:{sources:[sources.women],note:{background:'戦後の政治制度の改革の一環として選挙制度が改められた。',result:'女性参政権と20歳以上の選挙権が認められ、翌年の総選挙につながる。',exam:'制度が改められた1945年と、女性が初めて投票した1946年を分ける。'}},
 384:{date:'1946年4月10日',sources:[sources.women],note:{background:'前年の選挙法改正で女性の参政権が認められた。',result:'女性が初めて国政選挙で投票し、女性議員も選出された。',exam:'日本国憲法の施行は1947年。女性の初投票を憲法施行後だと思い込まない。'}},
 181:{sources:[sources.trade],note:{background:'日米和親条約後、ハリスは通商条約の締結を幕府に求めた。',result:'貿易や開港、領事裁判権、関税に関する条件が定められ、他の欧米諸国とも同様の条約が結ばれた。',exam:'和親条約と通商条約を区別する。通商条約の内容を、後の条約改正の課題へ結び付ける。'}},
 237:{sources:[sources.tariff],note:{background:'幕末以来の不平等な条約の改正が続けられていた。',result:'1911年の日米通商航海条約により関税自主権を完全に回復した。',exam:'1894年の条約調印、1899年の領事裁判権撤廃、1911年の関税自主権回復を段階として整理する。'}},
 281:{date:'1945年10月24日',sources:[sources.un],note:{background:'国際連合憲章は同年6月26日に調印されていた。',result:'憲章が発効し、国際連合が正式に発足した。',exam:'国際連盟とは別の組織。日本の加盟は発足から後の1956年。'}}
};
export const historyTrails=[
 {id:'participation',title:'政治参加は、どう広がった？',intro:'納税額・性別・年齢の条件を別々に追う。法改正と実際の投票の年を分ける。',ids:[478,255,944,383,384,1001,1002,1007]},
 {id:'treaties',title:'開国から条約改正まで',intro:'条約を結んだ年と効力が生じた年、領事裁判権と関税自主権を区別する。',ids:[178,181,199,866,871,237]},
 {id:'reform',title:'江戸の改革を比較する',intro:'担当者、政策、解決しようとした問題を対応させる。同じ時代の別の出来事と混同しない。',ids:[148,149,1004,158,762,765,813,168,172]},
 {id:'constitution',title:'明治の国家と議会',intro:'政権の変化、制度整備、議会の成立を順に追う。憲法の発布と議会の開始は別の年。',ids:[192,195,198,208,220,478,222]},
 {id:'world',title:'戦後の国際社会への復帰',intro:'国際機関の発足、日本の主権回復、それぞれの機関への加盟を分ける。',ids:[1005,281,1006,292,294,300,301]},
 {id:'environment',title:'環境と持続可能な社会',intro:'宣言・目標・法律・条約は役割が違う。何を定めたのかを本文で確かめる。',ids:[990,495,497,499,500,1003]}
];
export function enrichHistory(original){const rows=original.map(x=>patches[x.id]?{...x,...patches[x.id],note:{...x.note,...patches[x.id].note},enriched:true}:x);const ids=new Set(rows.map(x=>x.id));for(const x of extra){if(ids.has(x.id))throw Error('History ID collision');rows.push(x);}return rows.sort(chronological);}
export const historyAdditions=extra.length;
