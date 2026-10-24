import {dayKey,DAY} from './domain.mjs';
export const shiftDay=(day,n)=>dayKey(new Date(day+'T12:00:00+09:00').getTime()+n*DAY);
export function calendarDays(day,mode='month'){
 const first=mode==='week'?day:day.slice(0,8)+'01';
 const weekday=new Date(first+'T12:00:00+09:00').getUTCDay(),start=shiftDay(first,-((weekday+6)%7));
 return Array.from({length:mode==='week'?7:42},(_,i)=>shiftDay(start,i));
}
export function shiftMonth(day,delta){const [y,m,d]=day.split('-').map(Number),base=new Date(Date.UTC(y,m-1+delta,1));const last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();return `${base.getUTCFullYear()}-${String(base.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
const validDue = value => typeof value==='number' && Number.isFinite(value) && value>0 && value<=8640000000000000;
export function readingReviews(state,index=[]){
 const books=new Map(index.map(b=>[b.id,b]));
 return Object.entries(state.reading||{}).filter(([,p])=>validDue(p.review?.due)).map(([id,p])=>({id,title:books.get(id)?.title||p.title||'英語長文の復習',date:dayKey(p.review.due),due:p.review.due})).sort((a,b)=>a.due-b.due||a.id.localeCompare(b.id));
}
export function calendarSummary(state,day,index=[],reviews=readingReviews(state,index)){
 const tasks=state.tasks.filter(t=>t.date===day),notes=state.notes.filter(n=>!n.deletedAt&&!n.archived&&validDue(n.review?.due)&&dayKey(n.review.due)===day),readings=reviews.filter(r=>r.date===day);
 return {tasks,notes,readings,reviewCount:notes.length+readings.length,minutes:tasks.reduce((n,t)=>n+(Number(t.minutes)||0),0),studied:state.sessions.filter(s=>s.date===day).reduce((n,s)=>n+(Number(s.minutes)||0),0)};
}
