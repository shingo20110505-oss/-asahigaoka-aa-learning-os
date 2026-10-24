import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,dayKey,DAY} from '../src/domain.mjs';
import {completeReading,finishReadingReview,planReadingReview,isReadingDue} from '../src/reading-domain.mjs';
import {calendarSummary,readingReviews} from '../src/planner.mjs';
import {recommendReading} from '../src/home.mjs';
import {classicalWords,selectWords} from '../src/classical-words.mjs';
import {classicalPapers} from '../src/classical-evidence.mjs';

test('completion schedules the next JST date, survives reload, and is idempotent',()=>{
 const now=Date.parse('2026-12-31T23:59:00+09:00'),state=freshState();
 state.reading.a=completeReading({memo:'残す',seconds:70,paragraph:2},now);
 assert.equal(dayKey(state.reading.a.review.due),'2027-01-01');
 const before=structuredClone(state.reading.a);state.reading.a=completeReading(state.reading.a,now+DAY);
 assert.deepEqual(state.reading.a,before);
 const restored=JSON.parse(JSON.stringify(state)),summary=calendarSummary(restored,'2027-01-01',[{id:'a',title:'A new year'}]);
 assert.equal(summary.readings.length,1);assert.equal(summary.readings[0].title,'A new year');assert.equal(summary.reviewCount,1);
 assert.equal(restored.tasks.length,0);assert.equal(restored.reading.a.memo,'残す');assert.equal(restored.reading.a.seconds,70);
 assert.equal(calendarSummary(restored,'2026-12-31').reviewCount,0);
 assert.ok(isReadingDue(restored.reading.a,Date.parse('2027-01-01T00:00:00+09:00')));
});
test('explicit dates and cancellations are preserved; changes move the same calendar entry',()=>{
 const now=Date.parse('2026-10-24T18:00:00+09:00'),state=freshState();
 const review=planReadingReview({},7,now);state.reading.a=completeReading({review},now);
 assert.equal(state.reading.a.review.due,review.due);
 assert.equal(calendarSummary(state,'2026-10-31').readings.length,1);
 state.reading.a.review=planReadingReview(state.reading.a.review,3,now);
 assert.equal(calendarSummary(state,'2026-10-31').readings.length,0);assert.equal(calendarSummary(state,'2026-10-27').readings.length,1);
 state.reading.a.review.due=null;
 assert.equal(readingReviews(state).length,0);assert.equal(completeReading({review:{due:null}},now).review.due,null);
 state.reading.b={review:{due:'bad'}};state.reading.c={review:{due:Infinity}};state.reading.d={review:{due:1e30}};
 assert.equal(readingReviews(state).length,0);
 assert.equal(recommendReading([{id:'a',level:2},{id:'z',level:2}],state.reading,now).book.id,'z');
});
test('finishing reviews schedules 3, 7, then 14 days without duplicating tasks',()=>{
 const now=Date.parse('2026-10-24T10:00:00+09:00'),state=freshState();state.reading.a=completeReading({title:'保存した題名',memo:'keep'},now);
 for(const [n,days] of [3,7,14,14].entries()){
  const at=now+(n+1)*DAY;state.reading.a=finishReadingReview(state.reading.a,at);
  assert.equal(state.reading.a.review.due,at+days*DAY);assert.equal(state.reading.a.review.completedReviews,n+1);assert.equal(state.reading.a.memo,'keep');assert.equal(readingReviews(state).length,1);
 }
 assert.equal(readingReviews(state)[0].title,'保存した題名');assert.equal(state.tasks.length,0);
});
test('official-paper evidence is traceable and priority changes keep existing vocabulary IDs',()=>{
 assert.equal(classicalPapers.length,4);assert.equal(new Set(classicalPapers.map(p=>new URL(p.url).hostname)).size,3);
 for(const p of classicalPapers)assert.ok(p.url.startsWith('https://')&&p.answers.startsWith('https://')&&p.section&&p.finding);
 for(const [id,word] of [['001','あはれなり'],['026','侍り'],['070','ものす'],['099','本意'],['100','つと']])assert.equal(classicalWords.find(w=>w.id==='classical-kobun-'+id).word,word);
 const past=selectWords(freshState(),{filter:'exam'});assert.ok(past.length>=30);
 for(const w of past)for(const e of w.evidence)assert.ok(classicalPapers.some(p=>p.id===e.paperId));
 assert.equal(classicalWords.find(w=>w.word==='本意').rank,'S');
 assert.ok(classicalWords.find(w=>w.word==='あやしむ').evidence.some(e=>e.paperId==='osaka-b-2026'));
 assert.ok(!classicalWords.find(w=>w.word==='侍り').evidence.some(e=>e.paperId==='aichi-2026'));
 assert.equal(selectWords(freshState(),{kind:'漢文',filter:'exam'}).length,0);
});
