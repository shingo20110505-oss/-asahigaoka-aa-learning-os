import {foundation} from './geography/foundation.mjs';
import {world} from './geography/world.mjs';
import {japan} from './geography/japan.mjs';
import {connections} from './geography/connections.mjs';
export const geographyVersion='2026-10-27.1';
export const geographySources={
 curriculum:{title:'文部科学省：中学校学習指導要領解説 社会編',url:'https://www.mext.go.jp/content/20240919-mxt_kyoiku01-100002608.pdf'},
 maps:{title:'国土地理院：地理教育の教材・素材',url:'https://www.gsi.go.jp/CHIRIKYOUIKU/shien.html'},
 landforms:{title:'国土地理院：日本の典型地形',url:'https://web1.gsi.go.jp/kikaku/tenkei_top.html'},
 climate:{title:'気象庁：日本の気候・地域別解説',url:'https://www.jma.go.jp/jma/kishou/know/kisetsu_riyou/tenkou/Average_Climate_Japan.html'},
 world:{title:'外務省：国・地域別の基礎データ',url:'https://www.mofa.go.jp/mofaj/area/index.html'},
 statistics:{title:'総務省統計局：日本の統計2026',url:'https://www.stat.go.jp/data/nihon/index1.html'},
 japan:{title:'農林水産省：食料・農林水産業を調べる',url:'https://www.maff.go.jp/j/kids/'},
 global:{title:'気象庁：日本の気候変動2025',url:'https://www.data.jma.go.jp/cpdinfo/ccj/2025/pdf/cc2025_honpen_kaisetsu.pdf'},
 energy:{title:'資源エネルギー庁：エネルギー需給の概要',url:'https://www.enecho.meti.go.jp/about/energytrends/202506/html/s-1-1.html'},
 water:{title:'水資源機構：愛知用水',url:'https://www.water.go.jp/chubu/aityosui/'},
 territory:{title:'外務省：日本の領土をめぐる情勢',url:'https://www.mofa.go.jp/mofaj/territory/index.html'},
 aichi:{title:'愛知県：2026年度の公式問題と正答',url:'https://www.pref.aichi.jp/soshiki/kotogakko/r08nyuushimonndai.html'}
};
const comparisons=new Set(['maps-world','distribution','climograph','denominators','growth','correlation','multi-source','date-line','time-flight','agriculture-compare','industry-compare','unit-check','jp-food','jp-aging','europe-energy']);
export const geographyChapters=[...foundation,...world,...japan,...connections].map(([id,title,curriculum,source,content])=>({id,title,curriculum,source,content}));
export const geographyItems=geographyChapters.flatMap(ch=>ch.content.trim().split(/\r?\n/).map(line=>{
 const parts=line.split('|'); if(parts.length!==8)throw Error('Invalid geography row: '+parts[0]);
 const [key,title,summary,why,read,pitfall,question,answer]=parts;
 const refs=[ch.source]; if(ch.source==='japan')refs.push('climate','statistics');
 if(key==='aichi-water')refs.push('water');if(key==='islands'||key==='territory')refs.push('territory');if(/energy/.test(key))refs.push('energy');
 return {id:'geo-'+key,key,chapter:ch.id,title,summary,why,read,pitfall,question,answer,level:comparisons.has(key)?'応用':'必修',subject:'社会',curriculum:ch.curriculum,sourceIds:[...new Set(refs)],version:geographyVersion};
}));
export const geographyText=item=>[item.title,item.summary,item.why,'資料の読み方：'+item.read,'取り違え注意：'+item.pitfall,item.question,item.answer].join('\n');
export function filterGeography({chapter='all',query='',level='all',status='all',progress={},now=Date.now()}={}){
 const terms=query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
 return geographyItems.filter(x=>(chapter==='all'||x.chapter===chapter)&&(level==='all'||x.level===level)&&terms.every(t=>geographyText(x).normalize('NFKC').toLowerCase().includes(t))&&(status==='all'||status==='new'&&!progress[x.id]?.repetitions||status==='due'&&progress[x.id]?.due<=now||status==='weak'&&['again','hard'].includes(progress[x.id]?.rating)));
}
export function saveGeographyCard(state,item,now=Date.now()){
 const id='card-'+item.id; const existing=state.cards.find(x=>x.id===id);
 if(existing){existing.archived=false;return false;}
 state.cards.push({id,title:item.title,question:item.question,answer:item.answer+'\n'+item.why,subject:'社会',tags:['地理',item.chapter],source:{kind:'geography',id:item.id,version:geographyVersion},updatedAt:now});return true;
}
export const geographyCurriculum=[
 ['A(1)','世界と日本の地域構成',['earth']],['B(1)','世界各地の人々の生活と環境',['climate']],
 ['B(2)','世界の諸地域',['asia','europe','africa','north-america','south-america','oceania','connections']],
 ['C(1)','地域調査の手法',['map-skills','inquiry']],['C(2)','日本の地域的特色と地域区分',['landforms','japan-overview']],
 ['C(3)','日本の諸地域',['hokkaido','tohoku','kanto','chubu','kinki','chugoku-shikoku','kyushu']],['C(4)','地域の在り方',['inquiry','connections']]
].map(([code,title,chapters])=>({code,title,chapters}));
