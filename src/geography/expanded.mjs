import {expandedOceania} from './expanded-oceania.mjs';
import {expandedAsiaEurope} from './expanded-asia-europe.mjs';
import {expandedAfricaAmericas} from './expanded-africa-americas.mjs';
import {expandedJapanEast} from './expanded-japan-east.mjs';
import {expandedJapanWest} from './expanded-japan-west.mjs';
import {atlasFoundation} from './atlas-foundation.mjs';
import {atlasOceania} from './atlas-oceania.mjs';
import {atlasAsiaEast} from './atlas-asia-east.mjs';
import {atlasAsiaSouthWest} from './atlas-asia-south-west.mjs';
import {atlasEurope} from './atlas-europe.mjs';
import {atlasAfrica} from './atlas-africa.mjs';
import {atlasNorthAmerica} from './atlas-north-america.mjs';
import {atlasSouthAmerica} from './atlas-south-america.mjs';
import {atlasHokkaido} from './atlas-hokkaido.mjs';
import {atlasTohoku} from './atlas-tohoku.mjs';
import {atlasKanto} from './atlas-kanto.mjs';
import {atlasChubu} from './atlas-chubu.mjs';
import {atlasKinki} from './atlas-kinki.mjs';
import {atlasChugokuShikoku} from './atlas-chugoku-shikoku.mjs';
import {atlasKyushu} from './atlas-kyushu.mjs';
import {atlasFood} from './atlas-food.mjs';
import {atlasEnergy} from './atlas-energy.mjs';
import {atlasTrade} from './atlas-trade.mjs';
import {atlasPopulation} from './atlas-population.mjs';
import {atlasEnvironment} from './atlas-environment.mjs';
import {atlasInquiry} from './atlas-inquiry.mjs';
import {atlasJapanLinks} from './atlas-japan-links.mjs';
import {atlasPolar} from './atlas-polar.mjs';
import {geographySourceOverrides} from './source-overrides.mjs';
export const expandedGeography=[...expandedOceania,...expandedAsiaEurope,...expandedAfricaAmericas,...expandedJapanEast,...expandedJapanWest,...atlasFoundation,...atlasOceania,...atlasAsiaEast,...atlasAsiaSouthWest,...atlasEurope,...atlasAfrica,...atlasNorthAmerica,...atlasSouthAmerica,...atlasHokkaido,...atlasTohoku,...atlasKanto,...atlasChubu,...atlasKinki,...atlasChugokuShikoku,...atlasKyushu,...atlasFood,...atlasEnergy,...atlasTrade,...atlasPopulation,...atlasEnvironment,...atlasInquiry,...atlasJapanLinks,...atlasPolar].map(x=>({...x,sourceIds:geographySourceOverrides[x.key]||x.sourceIds}));

const baseTopics={
 '地形':'asia-land na-land sa-land oceania-land jp-mountains plates fans deltas levees coasts caldera glaciers soil-relief kanto-land kyushu-volcano',
 '気候':'climate-controls tropical dry temperate cold-polar highland climograph monsoon europe-climate africa-climate aus-climate jp-seasons jp-climates jp-currents hokkaido-climate tohoku-climate chubu-regions cs-climate',
 '農林水産業':'asia-farming southeast europe-farm na-farming na-agribusiness oceania-farm jp-agriculture jp-food jp-fish-forest hokkaido-farm hokkaido-rotation tohoku-farm tohoku-coast kanto-farm hokuriku central-highland atsumi tokai-farm cs-farm kyushu-farm agriculture-compare',
 '資源・工業':'china korea-taiwan india west-asia europe-industry europe-energy russia africa-exports africa-resources na-industry sa-brazil sa-andes aus-resources jp-industry jp-energy tohoku-industry kanto-industry chukyo chubu-traditional hanshin setouchi-industry kyushu-industry industry-compare',
 '貿易・交通':'asean na-neighbours jp-trade jp-transport cs-transport global-interdependence sea-transport',
 '人口・都市・文化':'food-housing religion africa-history africa-development na-people sa-cities oceania-culture jp-population jp-aging hokkaido-culture kanto-city kinki-cities okinawa-bases global-population global-urban',
 '環境・防災':'asia-environment sa-forest hazard disaster-types regional-future nobi aichi-water kinki-nature kinki-conservation cs-water kyushu-environment okinawa global-warming global-water global-forest'
};
export const geographyTopics=['地球・地図・資料',...Object.keys(baseTopics)];
const byKey=new Map(Object.entries(baseTopics).flatMap(([topic,keys])=>keys.split(' ').map(key=>[key,topic])));
export const geographyTopic=key=>byKey.get(key)||'地球・地図・資料';
export const geographyLevelLabel=level=>level==='応用'?'発展':'基礎';
