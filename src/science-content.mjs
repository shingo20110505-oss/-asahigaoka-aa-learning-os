import {physicsUnits} from './science/physics.mjs';
import {chemistryUnits} from './science/chemistry.mjs';
import {biologyUnits} from './science/biology.mjs';
import {earthUnits} from './science/earth.mjs';
import {biologyDetails} from './science/biology-details.mjs';
import {physicsDetails} from './science/physics-details.mjs';
import {chemistryDetails} from './science/chemistry-details.mjs';
import {earthDetails} from './science/earth-details.mjs';
import {unit as parseUnit} from './science/schema.mjs';
import {scheduleReview,uid} from './domain.mjs';
export {scienceSources} from './science/sources.mjs';
export const scienceVersion='2026-10-28.2';
export const scienceFields={physics:'物理',chemistry:'化学',biology:'生物',earth:'地学'};
export const scienceLevels={basic:'基本',advanced:'発展'};
const details={...biologyDetails,...physicsDetails,...chemistryDetails,...earthDetails};
const baseUnits=[...physicsUnits,...chemistryUnits,...biologyUnits,...earthUnits];
for(const id of Object.keys(details))if(!baseUnits.some(u=>u.id===id))throw Error('Unknown science detail unit: '+id);
export const scienceUnits=baseUnits.map(u=>details[u.id]?{...u,items:[...u.items,...parseUnit(u.id,u.grade,u.field,u.title,u.curriculum,u.pages,details[u.id]).items]}:u);
export const scienceItems=scienceUnits.flatMap(u=>u.items);
export const scienceCardId=item=>'card-'+item.id;
export const scienceProgress=(state,item)=>state.review?.[scienceCardId(item)];
export function normalizeScience(text){return String(text).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
export function filterScience({grade='all',field='all',unit='all',level='all',query='',status='all',state={review:{},cards:[]},now=Date.now()}={}){
 const terms=normalizeScience(query).trim().split(/\s+/).filter(Boolean),registered=new Set((state.cards||[]).filter(c=>!c.archived).map(c=>c.id));
 return scienceItems.filter(x=>{
  const r=scienceProgress(state,x),text=normalizeScience([x.question,x.answer,x.reason,x.connection].join(' '));
  return (grade==='all'||x.grade===Number(grade))&&(field==='all'||x.field===field)&&(unit==='all'||x.unit===unit)&&(level==='all'||x.level===level)&&terms.every(t=>text.includes(t))&&
   (status==='all'||status==='new'&&!r?.repetitions||status==='weak'&&r?.rating==='again'||status==='due'&&registered.has(scienceCardId(x))&&(!Number.isFinite(r?.due)||r.due<=now));
 });
}
export function saveScienceCard(state,item,now=Date.now()){
 const id=scienceCardId(item),existing=state.cards.find(c=>c.id===id);
 if(existing){if(existing.archived){existing.archived=false;existing.updatedAt=now;}return false;}
 const unit=scienceUnits.find(u=>u.id===item.unit);
 state.cards.push({id,question:item.question,answer:item.answer+'\n\n理由：'+item.reason+'\n関連：'+item.connection,subject:'理科',tags:['理科暗記','中'+item.grade,scienceFields[item.field],unit.title],source:{kind:'science-memory',id:item.id,version:scienceVersion},createdAt:now,updatedAt:now});
 return true;
}
export function rateScience(state,item,rating,now=Date.now()){
 if(!['again','good'].includes(rating))throw Error('理科の復習評価が不正です');
 saveScienceCard(state,item,now);
 const id=scienceCardId(item);state.review[id]=scheduleReview(state.review[id],rating,now);
 state.events.push({id:uid(),type:'recall',source:'science-memory',item:id,rating,at:now});
 return state.review[id];
}
