import {defaultHistoryRankInfo,HISTORY_RANKS,HISTORY_RANK_INFO} from './history-ranking.mjs';
export {HISTORY_RANKS,HISTORY_RANK_INFO};
export function historyRankInfo(row,progress={}){
 const base=defaultHistoryRankInfo(row);
 return HISTORY_RANKS.includes(progress?.rank)?{...base,rank:progress.rank,personal:true,reason:'自分用に保存した学習優先度です。'}:{...base,personal:false};
}
export function historyRank(row,progress={}){return historyRankInfo(row,progress).rank;}
export function matchesHistoryRanks(row,ranks=HISTORY_RANKS,progress={}){
 return Array.isArray(ranks)&&ranks.includes(historyRank(row,progress));
}
export const isJapan=x=>x.area.includes('日本');
export const yearOf=x=>Math.trunc(x.sort);
export const datePart=x=>{const m=x.date.match(/年(\d+)月(?:(\d+)日)?/);return m?Number(m[1])*100+Number(m[2]||0):0;};
export const chronological=(a,b)=>yearOf(a)-yearOf(b)||datePart(a)-datePart(b)||a.id-b.id;
export const yearLabel=y=>y<0?'紀元前'+Math.abs(y)+'年':y+'年';
export function yearDistance(a,b){const x=yearOf(a),y=yearOf(b);return Math.abs(x-y)-(x*y<0?1:0);}
export function normalizeSearch(value){return String(value).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();}
export function filterHistory(rows,{query='',period='全部',era='全部',topic='全部',region='全部',theme='',from=null,to=null,favorites=null,ranks=HISTORY_RANKS,progress={}}={}){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 return rows.filter(x=>(period==='全部'||x.period===period)&&(era==='全部'||x.eras?.includes(era))&&(topic==='全部'||x.topics?.includes(topic))&&(region==='全部'||(region==='日本'?isJapan(x):!isJapan(x)))&&(from===null||yearOf(x)>=from)&&(to===null||yearOf(x)<=to)&&(!favorites||favorites.includes(x.id))&&matchesHistoryRanks(x,ranks,progress[x.id])&&(!theme||new RegExp(theme).test([x.event,x.detail,...x.tags].join(' ')))&&terms.every(q=>normalizeSearch([x.event,x.detail,x.date,x.area,...x.tags,...(x.eras||[]),...(x.topics||[])].join(' ')).includes(q))).sort(chronological);
}
export function parallelGroups(rows){if(!rows.length)return[];const span=yearOf(rows.at(-1))-yearOf(rows[0]),width=span>2500?500:span>500?100:span>120?25:span>30?10:5,map=new Map();for(const x of rows){const start=Math.floor(yearOf(x)/width)*width;let g=map.get(start);if(!g){g={start,end:start+width-1,japan:[],world:[]};map.set(start,g);}g[isJapan(x)?'japan':'world'].push(x);}return[...map.values()];}
