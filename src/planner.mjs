import {dayKey,DAY,uid} from './domain.mjs';
import {materialFiles} from './material-files.mjs';
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
 const tasks=state.tasks.filter(t=>eventOnDay(t,day)).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||'')||a.title.localeCompare(b.title)),notes=state.notes.filter(n=>!n.deletedAt&&!n.archived&&validDue(n.review?.due)&&dayKey(n.review.due)===day),readings=reviews.filter(r=>r.date===day);
 return {tasks,notes,readings,reviewCount:notes.length+readings.length,minutes:tasks.filter(t=>t.date===day&&isStudyEvent(t)).reduce((n,t)=>n+(Number(t.minutes)||0),0),studied:state.sessions.filter(s=>s.date===day).reduce((n,s)=>n+(Number(s.minutes)||0),0)};
}
export const isStudyEvent=t=>!t.kind||t.kind==='学習';
export const eventOnDay=(t,day)=>t.date<=day&&(t.endDate||t.date)>=day;
export const eventTime=t=>t.allDay===false&&t.startTime?`${t.startTime}${t.endTime?'–'+t.endTime:''}`:'終日';
export function validDay(day){return /^\d{4}-\d{2}-\d{2}$/.test(day||'')&&Number.isFinite(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}
export function calendarEvent(fields,old={},added=[]){
 const title=String(fields.title||'').trim(),date=fields.date,endDate=fields.endDate||date,allDay=fields.allDay!==false;
 if(!title)throw Error('予定名を入力してください。');
 if(!validDay(date)||!validDay(endDate)||endDate<date)throw Error('終了日は開始日以降にしてください。');
 const startTime=allDay?'':String(fields.startTime||''),endTime=allDay?'':String(fields.endTime||'');
 const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
 if(!allDay&&(!time.test(startTime)||!time.test(endTime)||date===endDate&&endTime<=startTime))throw Error('開始・終了時刻を確認してください。終了は開始より後にしてください。');
 const kind=fields.kind==='予定'?'予定':'学習',minutes=kind==='学習'?Number(fields.minutes||25):0;
 if(kind==='学習'&&(!Number.isFinite(minutes)||minutes<1||minutes>1440))throw Error('学習時間は1〜1440分で入力してください。');
 return{...old,id:old.id||uid(),title:title.slice(0,200),date,endDate,allDay,startTime,endTime,kind,minutes,subject:kind==='学習'?String(fields.subject||'その他'):'その他',category:String(fields.category||'個人'),location:String(fields.location||''),priority:String(fields.priority||'通常'),memo:String(fields.memo||''),done:old.done||false,createdAt:old.createdAt||Date.now(),attachments:[...materialFiles(old),...added]};
}
export function moveCalendarEvent(event,date){if(!validDay(date))throw Error('日付を確認してください。');const days=Math.round((Date.parse((event.endDate||event.date)+'T12:00:00Z')-Date.parse(event.date+'T12:00:00Z'))/DAY);return{...event,date,endDate:shiftDay(date,Math.max(0,days))};}
export function repeatCalendarEvent(event,interval=0,count=1){
 if(!Number.isInteger(count)||count<1||count>52||![0,1,7,14].includes(interval)||interval===0&&count!==1)throw Error('繰り返し回数は1〜52回で指定してください。');
 const seriesId=count>1?uid():undefined;
 return Array.from({length:count},(_,i)=>({...moveCalendarEvent(event,shiftDay(event.date,i*interval)),id:i?uid():event.id,...(seriesId?{seriesId}:{})}));
}
