export const SUBJECTS=['国語','数学','英語','理科','社会','その他'];
export const DAY=86400000;
export const uid=()=>globalThis.crypto.randomUUID();
export function dayKey(time=Date.now()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(time));}
export const number=(v,min=0,max=Infinity)=>Math.min(max,Math.max(min,Number(v)||0));
export function freshState(){return{schema:6,revision:0,settings:{name:'',school:'旭丘高校',examDate:'2027-02-24',dailyMinutes:90,weeklyMinutes:600,theme:'light',fontSize:19},notes:[],materials:[],tasks:[],sessions:[],exams:[],mistakes:[],cards:[],events:[],review:{},reading:{},history:{favorites:[],progress:{}},vocabulary:{},migration:{},timer:null};}
export function migrateLegacy(state,legacy,now=Date.now()) {
 const next=structuredClone(state);const reports=[];
 const parse=key=>{try{const raw=legacy[key];if(!raw||next.migration[key])return null;const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))return null;next.migration[key]={at:now};reports.push(key);return value;}catch{return null;}};
 const review=parse('asahi_review_progress_v1');if(review){for(const id of new Set([...Object.keys(review.done||{}),...Object.keys(review.seen||{})])){if(!Object.hasOwn(next.review,id))Object.defineProperty(next.review,id,{enumerable:true,configurable:true,writable:true,value:{legacyDone:review.done?.[id]||false,legacySeen:review.seen?.[id]||null,due:review.done?.[id]?Number(review.done[id])+7*DAY:0,interval:review.done?.[id]?7:0,repetitions:0}});}}
 const reading=parse('rise_reading_v2_progress_v1');if(reading){for(const [id,x] of Object.entries(reading.answers||{}))if(!Object.hasOwn(next.reading,id))Object.defineProperty(next.reading,id,{enumerable:true,configurable:true,writable:true,value:{...x,legacy:true,completedAt:x.readAt||null,seconds:0}});}
 const history=parse('chronologia-aichi-v3');if(history){next.history.favorites=[...new Set([...next.history.favorites,...(Array.isArray(history.favorites)?history.favorites:[])])];next.history.progress={...(history.progress||{}),...next.history.progress};}
 // The complete original strings, including unknown fields, are retained in the snapshot store.
 parse('asahi_learning_os_v1');return{state:next,reports};
}
export function scheduleReview(previous={},rating,now=Date.now()) {
 if(!['again','hard','good','easy'].includes(rating))throw Error('不正な復習評価です');
 const old=number(previous.interval,0,365),interval=rating==='again'?0:rating==='hard'?Math.max(1,Math.round(old*1.2)):rating==='good'?(old?Math.min(365,Math.max(3,Math.round(old*2.3))):1):(old?Math.min(365,Math.max(7,Math.round(old*3))):4);
 return{...previous,interval,due:now+(rating==='again'?600000:interval*DAY),last:now,rating,repetitions:number(previous.repetitions)+1,lapses:number(previous.lapses)+(rating==='again'?1:0)};
}
export function dueItems(items,progress,now=Date.now()){return items.filter(x=>!Number.isFinite(progress[x.id]?.due)||progress[x.id].due<=now).sort((a,b)=>(progress[a.id]?.due||0)-(progress[b.id]?.due||0));}
export function weeklyMinutes(sessions,now=Date.now()){const today=dayKey(now);const start=dayKey(now-6*DAY);return sessions.filter(s=>s.date>=start&&s.date<=today).reduce((n,s)=>n+number(s.minutes),0);}
export function scoreV(rating,scores){if(!Number.isInteger(rating)||rating<9||rating>45||scores.length!==5||scores.some(x=>!Number.isInteger(x)||x<0||x>22))throw Error('評定は9〜45、5教科の得点は各0〜22で入力してください');return rating*2+scores.reduce((a,b)=>a+b,0)*2;}
export function intersection(a,m,b){if(Math.abs(a)<1e-10)return Math.abs(m)<1e-10?{kind:Math.abs(b)<1e-10?'coincident':'none',points:[]}:{kind:'points',points:[[-b/m,0]]};const d=m*m+4*a*b;if(d<0)return{kind:'none',points:[]};const roots=d===0?[m/(2*a)]:[(m-Math.sqrt(d))/(2*a),(m+Math.sqrt(d))/(2*a)];return{kind:'points',points:roots.map(x=>[x,a*x*x])};}
export function circuit(voltage,r1,r2,mode='series'){if(![voltage,r1,r2].every(Number.isFinite)||voltage<0||r1<=0||r2<=0||!['series','parallel'].includes(mode))throw Error('電圧・抵抗値を確認してください');const resistance=mode==='series'?r1+r2:r1*r2/(r1+r2),current=voltage/resistance;return{resistance,current,power:voltage*current,i1:mode==='series'?current:voltage/r1,i2:mode==='series'?current:voltage/r2,v1:mode==='series'?current*r1:voltage,v2:mode==='series'?current*r2:voltage};}
export function noteLinks(notes,id){notes=notes.filter(n=>!n.deletedAt);const note=notes.find(n=>n.id===id);return{outgoing:notes.filter(n=>note?.links?.includes(n.id)),incoming:notes.filter(n=>n.links?.includes(id))};}
export function validState(input){if(!input||input.schema!==6)throw Error('RISEのバックアップではありません');for(const key of ['notes','materials','tasks','sessions','exams','mistakes','cards','events'])if(!Array.isArray(input[key]))throw Error('バックアップに必要なデータがありません: '+key);for(const key of ['settings','review','reading','history','vocabulary','migration'])if(!input[key]||typeof input[key]!=='object'||Array.isArray(input[key]))throw Error('不正な保存形式: '+key);const scan=value=>{if(value&&typeof value==='object')for(const k of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(k))throw Error('不正なデータキーです');scan(value[k]);}};scan(input);return input;}
