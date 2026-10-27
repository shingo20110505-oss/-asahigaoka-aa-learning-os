// Optional product tool, never used in the three pure comparison arms.
// Parse only unambiguous school scale / specified standard-meridian questions.
// No eval, generated code, question IDs, or answer bank.
function number(value){
 const s=value.replaceAll(',','');if(!/^(?:\d+万)?(?:\d+千)?\d*$/.test(s)||!s)return null;
 let n=0;for(const m of s.matchAll(/(\d+)(万|千|$)/g))n+=Number(m[1])*({万:10000,千:1000}[m[2]]||1);
 return Number.isSafeInteger(n)&&n>0&&n<=1e8?n:null;
}
export function calculateGeography(input){
 const q=String(input).normalize('NFKC');
 if(/地図|地形図|縮尺/.test(q)&&/何\s*km|何キロメートル/.test(q)){
  const scales=[...q.matchAll(/([\d万千,]+)分の1|1\s*[:：]\s*([\d,]+)/g)],lengths=[...q.matchAll(/(\d+(?:\.\d+)?)\s*(?:cm|センチメートル)/g)];
  if(scales.length!==1||lengths.length!==1||/面積|平方|拡大|縮小|倍率/.test(q))return null;
  const scale=number(scales[0][1]||scales[0][2]),cm=Number(lengths[0][1]);if(!scale||!Number.isFinite(cm)||cm<=0)return null;
  const real=cm*scale,km=real/100000;if(!Number.isSafeInteger(real))return null;
  return{kind:'calculation',text:`地図上${cm}cm × ${scale.toLocaleString('en-US')} ＝ ${real.toLocaleString('en-US')}cm ＝ ${km}kmです。1kmは100,000cmなので、実際の距離は${km}kmです。`,sourceId:'geo-scale'};
 }
 if(!/日本(?:が|は|では|で)/.test(q)||!/何時/.test(q)||/飛行|出発|到着|日付変更線/.test(q))return null;
 if(/夏時間|サマータイム/.test(q)&&!/(?:夏時間|サマータイム)(?:は|を)?(?:考え(?:ません|ない)|無視|使わない|なし)/.test(q))return null;
 const clocks=[...q.matchAll(/(午前|午後)?\s*(\d{1,2})時(?:(\d{1,2})分)?/g)],meridians=[...q.matchAll(/(東経|西経)\s*(\d{1,3}(?:\.\d+)?)度/g)];
 if(clocks.length!==1||meridians.length!==1||!/標準時子午線|標準子午線/.test(q))return null;
 const [,period,hourText,minuteText]=clocks[0],hour=Number(hourText),minute=Number(minuteText||0),degree=Number(meridians[0][2]);
 if(minute>59||hour>23||(period&&(hour<1||hour>=12))||degree>180)return null;
 const japan=(hour+(period==='午後'?12:0))*60+minute,longitude=degree*(meridians[0][1]==='西経'?-1:1),difference=(longitude-135)*4;
 if(!Number.isInteger(difference))return null;
 const raw=japan+difference,day=Math.floor(raw/1440),local=((raw%1440)+1440)%1440;
 const clock=n=>`${Math.floor(n/60)}時${n%60?`${n%60}分`:''}`,dayLabel=day<0?'前日':day>0?'翌日':'同日';
 return{kind:'calculation',text:`日本標準時は東経135度です。経度差は${Math.abs(longitude-135)}度で、時差は${Math.abs(difference)/60}時間（${Math.abs(longitude-135)}÷15）。相手の時刻は日本より${difference<0?'遅い':'進んでいる'}ので、${clock(japan)}${difference<0?'−':'＋'}${Math.abs(difference)/60}時間＝${dayLabel}${clock(local)}です。`,sourceId:'geo-time'};
}
