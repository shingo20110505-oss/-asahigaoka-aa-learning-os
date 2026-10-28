const s=(title,url,scope)=>({title,url,scope,checked:'2026-10-28'});
export const europeSources={
 ...Object.fromEntries([['uk','英国'],['italy','イタリア'],['spain','スペイン'],['netherlands','オランダ'],['norway','ノルウェー'],['sweden','スウェーデン'],['finland','フィンランド'],['switzerland','スイス'],['poland','ポーランド'],['czech','チェコ'],['ukraine','ウクライナ'],['denmark','デンマーク'],['iceland','アイスランド'],['ireland','アイルランド'],['greece','ギリシャ'],['portugal','ポルトガル']].map(([key,name])=>['country-'+key,s('外務省：'+name+'基礎データ','https://www.mofa.go.jp/mofaj/area/'+key+'/data.html','位置・産業・文化。変動する統計や順位は教材本文に固定しない')])),
 europeRegions:s('欧州環境庁：欧州の生物地理地域と海域','https://www.eea.europa.eu/en/analysis/publications/report_2002_0524_154909','大西洋側・地中海側・大陸内部・高山・北方地域の自然条件。古い統計は利用しない'),
 europeWater:s('欧州環境庁：ヨーロッパの水不足','https://www.eea.europa.eu/en/analysis/indicators/use-of-freshwater-resources-in-europe-1','季節別の水資源と需要の関係。割合や順位を転載せず仕組みを学ぶ'),
 poValley:s('NASA：ポー平野の地形と大気','https://modis-snow-ice.gsfc.nasa.gov/content/031705it.html','アルプス南側の平野、都市・工業と大気の滞留。2005年画像は現在の濃度の証拠にしない'),
 volga:s('NASA：ボルガ川のデルタ','https://science.nasa.gov/earth/earth-observatory/volga-river-delta-7047/','ロシア西部の流域、カスピ海への流入と堆積'),
 euCountries:s('欧州連合：国別の参加制度','https://european-union.europa.eu/principles-countries-history/eu-countries_en','EU・ユーロ・シェンゲン参加は異なる区分。加盟数は本文に固定しない'),
 euHistory:s('欧州連合：1945〜1959年の歩み','https://european-union.europa.eu/principles-countries-history/history-eu/1945-59_en','石炭・鉄鋼の共同管理と欧州統合の歴史')
};
