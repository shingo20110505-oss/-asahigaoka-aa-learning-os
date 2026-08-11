(()=>{'use strict';
const items=[
  {
    id:'en-day-date-day-of-month-20260811',
    subject:'英語',
    unit:'疑問文・日付',
    title:'day / date / day of the month の区別',
    question:'「What day is it today?」「What is the date today?」「What day of the month is it today?」は、それぞれ何をたずねている？',
    answer:'What day is it today? は「今日は何曜日？」。What is the date today? は「今日は何日？」。What day of the month is it today? も「今日は（今月の）何日？」で、date を使った文と同じ内容をたずねています。',
    why:'英語の day は文脈によって「日」だけでなく「曜日」を表します。day of the month とすると「その月の中の何番目の日」という意味になるため、曜日ではなく日付をたずねます。',
    examples:[
      'What day is it today? → It’s Tuesday.（今日は何曜日？ → 火曜日です）',
      'What is the date today? → It’s August 11th.（今日は何日？ → 8月11日です）',
      'What day of the month is it today? → It’s the 11th.（今日は今月の何日？ → 11日です）'
    ],
    memory:'day だけ → 曜日 / date → 日付 / day of the month → 今月の何日',
    tags:['day','date','曜日','日付','書き換え'],
    createdAt:'2026-08-11'
  }
];
function normalize(x){return {...x,examples:Array.isArray(x.examples)?x.examples:[],tags:Array.isArray(x.tags)?x.tags:[]}}
const bank=items.map(normalize);
window.AA_REVIEW_BANK=bank;
window.AA_REVIEW_BANK_VERSION='1.0.0';
window.AA_REVIEW_BANK_BY_ID=Object.fromEntries(bank.map(x=>[x.id,x]));
})();