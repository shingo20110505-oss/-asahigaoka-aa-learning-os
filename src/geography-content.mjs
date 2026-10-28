import {foundation} from './geography/foundation.mjs';
import {world} from './geography/world.mjs';
import {japan} from './geography/japan.mjs';
import {connections} from './geography/connections.mjs';
import {expandedGeography,geographyTopic} from './geography/expanded.mjs';
import {expandedSources} from './geography/expanded-sources.mjs';
import {japanSources} from './geography/japan-sources.mjs';
import {themeSources} from './geography/theme-sources.mjs';
import {countrySources} from './geography/country-sources.mjs';
import {europeSources} from './geography/europe-sources.mjs';
import {africaSources} from './geography/africa-sources.mjs';
import {americaSources} from './geography/america-sources.mjs';
export {geographyTopics,geographyLevelLabel} from './geography/expanded.mjs';
export const geographyVersion='2026-10-28.2';
export const geographySources={
 ...expandedSources,
 ...japanSources,
 ...themeSources,
 ...countrySources,
 ...europeSources,
 ...africaSources,
 ...americaSources,
 flowers:{title:'愛知県：あいちの農産物・花（電照菊の仕組み）',url:'https://www.pref.aichi.jp/soshiki/engei/aichisan-hana.html'},
 climateZones:{title:'英国気象庁：世界の気候区分',url:'https://weather.metoffice.gov.uk/climate/climate-explained/climate-zones',scope:'気温・降水による分類、地中海性気候の夏の乾燥と冬の雨、西ヨーロッパの温帯。農業の説明には地域資料を併用',checked:'2026-10-28'},
 curriculum:{title:'文部科学省：中学校学習指導要領解説 社会編',url:'https://www.mext.go.jp/content/20240919-mxt_kyoiku01-100002608.pdf'},
 maps:{title:'国土地理院：地理教育の教材・素材',url:'https://www.gsi.go.jp/CHIRIKYOUIKU/shien.html'},
 landforms:{title:'国土地理院：日本の典型地形',url:'https://web1.gsi.go.jp/kikaku/tenkei_top.html',scope:'典型地形の分類と地域別地形資料への入口。個々の成因は河川・火山等の資料と併用',checked:'2026-10-28'},
 climate:{title:'気象庁：日本の気候・地域別解説',url:'https://www.jma.go.jp/jma/kishou/know/kisetsu_riyou/tenkou/Average_Climate_Japan.html'},
 world:{title:'外務省：国・地域別の基礎データ',url:'https://www.mofa.go.jp/mofaj/area/index.html'},
 statistics:{title:'総務省統計局：日本の統計2026',url:'https://www.stat.go.jp/data/nihon/index1.html',scope:'国土・人口・産業の統計分類と資料入口。地域の特徴は地域資料と併用し、数値や順位は追加本文に転記しない',checked:'2026-10-28'},
 japan:{title:'農林水産省：食料・農林水産業を調べる',url:'https://www.maff.go.jp/j/kids/'},
 global:{title:'気象庁：日本の気候変動2025',url:'https://www.data.jma.go.jp/cpdinfo/ccj/2025/pdf/cc2025_honpen_kaisetsu.pdf'},
 energy:{title:'資源エネルギー庁：エネルギー需給の概要',url:'https://www.enecho.meti.go.jp/about/energytrends/202506/html/s-1-1.html'},
 water:{title:'水資源機構：愛知用水',url:'https://www.water.go.jp/chubu/aityosui/'},
 territory:{title:'外務省：日本の領土をめぐる情勢',url:'https://www.mofa.go.jp/mofaj/territory/index.html'},
 aichi:{title:'愛知県：2026年度の公式問題と正答',url:'https://www.pref.aichi.jp/soshiki/kotogakko/r08nyuushimonndai.html'}
};
const comparisons=new Set(['maps-world','distribution','climograph','denominators','growth','correlation','multi-source','date-line','time-flight','agriculture-compare','industry-compare','unit-check','jp-food','jp-aging','europe-energy']);
export const geographyChapters=[...foundation,...world,...japan,...connections].map(([id,title,curriculum,source,content])=>({id,title,curriculum,source,content}));
const originalItems=geographyChapters.flatMap(ch=>ch.content.trim().split(/\r?\n/).map(line=>{
 const parts=line.split('|'); if(parts.length!==8)throw Error('Invalid geography row: '+parts[0]);
 const [key,title,summary,why,read,pitfall,question,answer]=parts;
 const refs=[ch.source]; if(ch.source==='japan')refs.push('climate','statistics');
 if(key==='atsumi')refs.push('flowers');if(key==='temperate')refs.push('climateZones');
 if(key==='aichi-water')refs.push('water');if(key==='islands'||key==='territory')refs.push('territory');if(/energy/.test(key))refs.push('energy');
 return {id:'geo-'+key,key,chapter:ch.id,title,summary,why,read,pitfall,question,answer,topic:geographyTopic(key),level:comparisons.has(key)?'応用':'必修',subject:'社会',curriculum:ch.curriculum,sourceIds:[...new Set(refs)],version:geographyVersion};
}));
export const geographyItems=geographyChapters.flatMap(ch=>[
 ...originalItems.filter(x=>x.chapter===ch.id),
 ...expandedGeography.filter(x=>x.chapter===ch.id).map(x=>({...x,id:'geo-'+x.key,subject:'社会',curriculum:ch.curriculum,version:geographyVersion}))
]);
export const geographyText=item=>[item.title,item.location&&'場所：'+item.location,item.summary,item.why,item.compare&&'比較：'+item.compare,'資料の読み方：'+item.read,'取り違え注意：'+item.pitfall,item.question,item.answer].filter(Boolean).join('\n');
const normalizeSearch=s=>s.normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
export function filterGeography({chapter='all',topic='all',query='',level='all',status='all',progress={},now=Date.now()}={}){
 const terms=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
 return geographyItems.filter(x=>(chapter==='all'||x.chapter===chapter)&&(topic==='all'||x.topic===topic)&&(level==='all'||x.level===level)&&terms.every(t=>normalizeSearch(geographyText(x)).includes(t))&&(status==='all'||status==='new'&&!progress[x.id]?.repetitions||status==='due'&&progress[x.id]?.due<=now||status==='weak'&&['again','hard'].includes(progress[x.id]?.rating)));
}
export function saveGeographyCard(state,item,now=Date.now()){
 const id='card-'+item.id; const existing=state.cards.find(x=>x.id===id);
 if(existing){existing.archived=false;return false;}
 state.cards.push({id,title:item.title,question:item.question,answer:item.answer+(item.answer.includes(item.why)?'':'\n'+item.why),subject:'社会',tags:['地理',item.chapter],source:{kind:'geography',id:item.id,version:geographyVersion},updatedAt:now});return true;
}
export const geographyCurriculum=[
 ['A(1)','世界と日本の地域構成',['earth']],['B(1)','世界各地の人々の生活と環境',['climate']],
 ['B(2)','世界の諸地域',['asia','europe','africa','north-america','south-america','oceania','connections']],
 ['C(1)','地域調査の手法',['map-skills','inquiry']],['C(2)','日本の地域的特色と地域区分',['landforms','japan-overview']],
 ['C(3)','日本の諸地域',['hokkaido','tohoku','kanto','chubu','kinki','chugoku-shikoku','kyushu']],['C(4)','地域の在り方',['inquiry','connections']]
].map(([code,title,chapters])=>({code,title,chapters}));
