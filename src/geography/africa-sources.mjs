const s=(title,url,scope)=>({title,url,scope,checked:'2026-10-28'});
export const africaSources={
 ...Object.fromEntries([['morocco','モロッコ'],['algeria','アルジェリア'],['nigeria','ナイジェリア'],['ethiopia','エチオピア'],['senegal','セネガル'],['tanzania','タンザニア'],['cote_d','コートジボワール'],['zambia','ザンビア'],['botswana','ボツワナ'],['madagascar','マダガスカル'],['mozambique','モザンビーク'],['namibia','ナミビア'],['rwanda','ルワンダ']].map(([key,name])=>['country-'+key,s('外務省：'+name+'基礎データ','https://www.mofa.go.jp/mofaj/area/'+key+'/data.html','国の位置・産業・言語・歴史。最新順位の固定や統計の転載は行わない')])),
 okavango:s('UNESCO：オカバンゴ・デルタ','https://whc.unesco.org/en/list/1432/','海へ流出しない内陸デルタ、季節の増水と生態系'),
 kilimanjaro:s('UNESCO：キリマンジャロ国立公園','https://whc.unesco.org/en/list/403/','火山と高度による環境の違い'),
 malawi:s('UNESCO：マラウイ湖国立公園','https://whc.unesco.org/en/list/289/','湖と固有の魚、生息環境'),
 serengeti:s('UNESCO：セレンゲティ国立公園','https://whc.unesco.org/en/list/156/','季節移動と保護区を越える生態系'),
 ngorongoro:s('UNESCO：ンゴロンゴロ保全地域','https://whc.unesco.org/en/list/39/','地形、放牧と野生生物、複合的土地利用')
};
