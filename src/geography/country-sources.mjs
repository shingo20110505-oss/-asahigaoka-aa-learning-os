const s=(title,url,scope)=>({title,url,scope,checked:'2026-10-28'});
export const countrySources={
 westernGhats:s('UNESCO：西ガーツ山脈','https://whc.unesco.org/en/list/1342/','山地とモンスーンの関係、生態系'),
 ...Object.fromEntries([['bhutan','ブータン'],['maldives','モルディブ']].map(([key,name])=>['country-'+key,s('外務省：'+name+'基礎データ','https://www.mofa.go.jp/mofaj/area/'+key+'/data.html','位置・産業・文化。変動する統計は転載しない')])),
 ...Object.fromEntries([['mongolia','モンゴル'],['korea','韓国'],['thailand','タイ'],['vietnam','ベトナム'],['cambodia','カンボジア'],['laos','ラオス'],['malaysia','マレーシア'],['philippines','フィリピン'],['singapore','シンガポール'],['myanmar','ミャンマー'],['bangladesh','バングラデシュ'],['pakistan','パキスタン'],['nepal','ネパール'],['srilanka','スリランカ'],['kazakhstan','カザフスタン'],['uzbekistan','ウズベキスタン'],['iran','イラン'],['iraq','イラク'],['turkey','トルコ'],['uae','アラブ首長国連邦'],['qatar','カタール'],['israel','イスラエル'],['jordan','ヨルダン']].map(([key,name])=>['country-'+key,s('外務省：'+name+'基礎データ','https://www.mofa.go.jp/mofaj/area/'+key+'/data.html','国の位置・産業・貿易品・文化。変動する数値・順位は転記しない')])),
 sichuan:s('NASA：四川盆地','https://science.nasa.gov/photojournal/sichuan-basin-china/','山地に囲まれた盆地と農地・谷の分布'),
 tienShan:s('NASA：天山山脈','https://science.nasa.gov/earth/earth-observatory/chinas-celestial-mountains-150774/','中央アジアから中国西部の山脈・砂漠との位置関係'),
 taklaMountains:s('NASA：タクラマカン砂漠を囲む山脈','https://science.nasa.gov/earth/earth-observatory/taklimakan-desert-1925/','天山・崑崙・カラコルムと盆地'),
 indus:s('NASA：インダス川の季節変化','https://science.nasa.gov/earth/earth-observatory/world-of-change/indus-river/','融雪・雨季と流量、灌漑農業の関係'),
 tonle:s('メコン川委員会：流域内の地理的な地域','https://www.mrcmekong.org/geographic-regions/','コーラート高原・トンレサップ湖・デルタと季節的逆流'),
 mesopotamia:s('FAO：イラクの流域と灌漑','https://www.fao.org/4/w4356e/w4356e0e.HTM','チグリス・ユーフラテスの源流・合流と灌漑。古い統計・施設状況は本文に転記しない'),
 ...Object.fromEntries([['fiji','フィジー'],['samoa','サモア'],['tonga','トンガ'],['vanuatu','バヌアツ'],['solomon','ソロモン諸島'],['palau','パラオ'],['kiribati','キリバス'],['marshall','マーシャル諸島'],['micronesia','ミクロネシア連邦'],['nauru','ナウル']].map(([key,name])=>['country-'+key,s('外務省：'+name+'基礎データ','https://www.mofa.go.jp/mofaj/area/'+key+'/data.html','国の位置・主要産業・言語など。人口・順位・政権は本文に固定しない')])),
 ausLand:s('豪州地球科学機構：大陸の地形と歴史','https://www.ga.gov.au/scientific-topics/national-location-information/landforms/australian-landforms-and-their-history','西部台地、内陸流域、東部高地と地形形成'),
 uluru:s('豪州国立公園：アナングの文化','https://parksaustralia.gov.au/uluru/discover/culture/','ウルルと土地に結びつく生きた文化、文化的・自然的価値'),
 waikato:s('NZ文化遺産省Te Ara：ワイカト地方','https://teara.govt.nz/en/waikato-region','酪農・水力・植林と木材加工、歴史'),
 nzGeothermal:s('NZ文化遺産省Te Ara：地熱エネルギー','https://teara.govt.nz/en/geothermal-energy/print','北島の地熱資源と利用'),
 nzPlateau:s('NZ文化遺産省Te Ara：火山台地地方','https://teara.govt.nz/en/volcanic-plateau-region/print','火山台地、農林業、ワイカト川と発電')
};
