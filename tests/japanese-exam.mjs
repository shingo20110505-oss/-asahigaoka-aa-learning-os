import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {PROFILE,validatePack,scoreQuestion,scoreExam,shuffleChoices,selectQuestions,wrongOperators} from '../japanese-exam/core.mjs';
import {starterPacks} from '../japanese-exam/starter-packs.mjs';
import {blindInput,verifierAgreement} from '../japanese-exam/prompts.mjs';
import {freeGate,generatePack,validateLibrary} from '../scripts/japanese-library.mjs';
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const copy=value=>JSON.parse(JSON.stringify(value));
const response=q=>q.marks?Object.fromEntries(q.marks.map(m=>[m.id,m.answer])):[...q.answers];
const fixtures=p=>({pass:true,answers:p.questions.map(q=>({id:q.id,ambiguous:false,reason:'テスト用の独立回答フィクスチャ。実モデルの検証実績ではない。',answerIds:q.marks?[]:[...q.answers],marks:q.marks?response(q):{},choices:q.choices.map(c=>({id:c.id,relation:c.relation,reason:'test'})),evidence:q.major===2?[]:copy(q.evidence)}))});
for(const p of starterPacks){
 check(validatePack(p).ok,p.id+' validates');
 check(p.questions.length===17,'17 questions per set');
 check(p.questions.reduce((s,q)=>s+q.points,0)===22,'22 points');
 const responses=Object.fromEntries(p.questions.map(q=>[q.id,response(q)]));
 check(scoreExam(p.questions,responses).earned===22,'perfect exam');
 check(scoreExam(p.questions,{}).earned===0,'blank exam');
 for(const q of p.questions){
   check(scoreQuestion(q,response(q)).earned===q.points,'correct earns maximum');
   check(scoreQuestion(q,null).earned===0,'empty earns zero');
   if(!q.marks){
     check(scoreQuestion(q,q.choices.map(c=>c.id)).earned===0,'selecting all cannot score');
     check(!scoreQuestion(q,['missing']).valid,'unknown choice invalid');
     check(!scoreQuestion(q,[q.answers[0],q.answers[0]]).valid,'duplicate invalid');
     if(q.requiredCount>1)check(scoreQuestion(q,[q.answers[0]]).earned===0,'incomplete multi no points');
     for(const c of q.choices.filter(c=>!q.answers.includes(c.id)))check(c.text.includes(c.errorSpan)&&c.explanation.length>=4,'explain every distractor');
   }else{
     const wrong=response(q);wrong[q.marks[0].id]='bad';check(!scoreQuestion(q,wrong).valid,'unknown mark invalid');
     if(q.format==='ordered_choice'){const duplicate=response(q);duplicate[q.marks[0].id]=duplicate[q.marks[1].id];check(scoreQuestion(q,duplicate).earned===0,'duplicate ordered choice no points');}
   }
   for(let i=0;i<12;i++)check(scoreQuestion(shuffleChoices(q),response(q)).earned===q.points,'shuffle preserves ID-based scoring');
 }
 const blind=blindInput(p),serialized=JSON.stringify(blind);
 check(!serialized.includes('errorSpan')&&!serialized.includes('explanation')&&!serialized.includes('proposition')&&!serialized.includes('"relation"')&&!serialized.includes('"answers"'),'blind input excludes answer metadata');
 check(!blind.passages.some(x=>x.id==='lexicon'),'blind verifier cannot read vocabulary answer explanations');
 check(blind.questions.every(q=>!q.marks||q.marks.every(m=>!('answer' in m))),'blind ordered marks have no answer');
 check(verifierAgreement(p,fixtures(p)).ok,'agreement fixture');
 const mismatch=fixtures(p);mismatch.answers[0].answerIds=['missing'];check(!verifierAgreement(p,mismatch).ok,'reject wrong independent answer');
 const wrongTruth=fixtures(p);wrongTruth.answers[0].choices[0].relation='not_stated';check(!verifierAgreement(p,wrongTruth).ok,'reject per-choice disagreement');
 const noEvidence=fixtures(p);noEvidence.answers[0].evidence=[];check(!verifierAgreement(p,noEvidence).ok,'reject missing blind evidence');
 const duplicateVerifier=fixtures(p);duplicateVerifier.answers[1]=copy(duplicateVerifier.answers[0]);check(!verifierAgreement(p,duplicateVerifier).ok,'reject duplicate verifier question');
 for(const mutate of [
   p=>{p.questions[1].id=p.questions[0].id;},p=>{p.questions[0].points=3;},
   p=>{p.questions[0].format='free_response';},p=>{p.questions[0].evidence[0].quote='本文にない引用テスト';},
   p=>{p.questions[0].choices[0].id=p.questions[0].choices[1].id;},
   p=>{p.questions[0].answers=['does-not-exist'];},p=>{p.questions[0].domain='math';},
   p=>{p.passages[0].rights={kind:'unknown'};},p=>{p.questions[0].difficulty.choice_length=2;},
   p=>{p.questions[0].requiredCount=2;},p=>{p.questions[0].polarity='anything';}
 ]){const modified=copy(p);mutate(modified);check(!validatePack(modified).ok,'reject mutated invalid pack');}
 check(selectQuestions(p,{mode:'practice',domains:['classical']}).every(q=>q.major===4),'selected domain only');
 check(selectQuestions(p,{mode:'weak',focus:['scope_expand']}).length===6,'weak practice limit');
}
const all=starterPacks.flatMap(p=>p.questions);check(new Set(all.map(q=>q.id)).size===34,'IDs unique across sets');
const multi=all.find(q=>q.format==='multi_select'&&q.scoring.rule==='additive_partial');
const wrong=multi.choices.find(c=>!multi.answers.includes(c.id)).id;
check(scoreQuestion(multi,[multi.answers[0],wrong]).earned===1,'additive multi exact partial point');
check(wrongOperators(multi,[multi.answers[0],wrong]).length===1,'record only selected error');
const slots=all.find(q=>q.format==='multi_slot_choice');const slotResponse=response(slots);delete slotResponse[slots.marks[0].id];
check(scoreQuestion(slots,slotResponse).earned===2,'independent marks keep partial points');
const ordered=all.find(q=>q.format==='ordered_choice');const orderResponse=response(ordered);[orderResponse.s0,orderResponse.s1]=[orderResponse.s1,orderResponse.s0];
check(scoreQuestion(ordered,orderResponse).earned===0,'near miss ordering all-or-nothing');
const grouped={...copy(ordered),points:3,scoring:{rule:'structured_partial',groups:[{marks:['s0','s1'],points:1},{marks:['s2','s3'],points:1},{marks:['s4','s5'],points:1}]}};
check(scoreQuestion(grouped,orderResponse).earned===2,'explicit groups score independently');
check(scoreQuestion(grouped,{...orderResponse,extraneous:'c1'}).earned===0,'invalid extra marks score zero');
assert.throws(()=>freeGate({GEMINI_API_KEY:'dummy',GEMINI_MODEL:'gemini-3.5-flash'}),/free_tier_not_confirmed/);checks++;
assert.throws(()=>freeGate({GEMINI_FREE_TIER_CONFIRMED:'true',GEMINI_API_KEY:'dummy',GEMINI_MODEL:'paid-model'}),/unconfirmed_free_model/);checks++;
let calls=0;await assert.rejects(generatePack({env:{},call:async()=>{calls++;}}),/free_tier_not_confirmed/);check(calls===0,'unconfirmed billing never calls provider');
const env={GEMINI_FREE_TIER_CONFIRMED:'true',GEMINI_API_KEY:'test-not-real',GEMINI_MODEL:'gemini-3.5-flash'};
calls=0;await assert.rejects(generatePack({env,call:async()=>{calls++;const e=Error('quota');e.status=429;throw e;}}),/quota/);check(calls===1,'quota error has no retries');
calls=0;const candidate=copy(starterPacks[0]);const material={passages:candidate.passages.filter(p=>p.role!=='answer_only'),propositions:[]};
const generated=await generatePack({env,call:async prompt=>{calls++;if(calls===1)return material;if(calls===2)return candidate;check(!prompt.includes('正しい理由'),'verifier not handed explanation labels');return fixtures(candidate);}});
check(calls===3&&generated.quality.verified&&validatePack(generated).ok,'three-stage generation contract with mock provider');
const page=await fs.readFile(new URL('../japanese-exam/index.html',import.meta.url),'utf8');check(page.includes('lang="ja"')&&page.includes('type="module"'),'HTML entry');
const appCode=await fs.readFile(new URL('../japanese-exam/app.mjs',import.meta.url),'utf8');
check(!/localStorage\.(clear|removeItem)/.test(appCode),'never erase old storage');
check(!/generativelanguage|api\.openai|GEMINI_API_KEY/.test(appCode),'browser has no AI endpoint or secret');
check(appCode.includes("!session.finished")&&appCode.includes('revealed'),'resume and delayed answer reveal');
const bridge=await fs.readFile(new URL('../japanese-exam/bridge.js',import.meta.url),'utf8');
const events={},urls=[],sandbox={URL,location:{href:'https://example.test/app/',assign:u=>urls.push(u)},document:{currentScript:{src:'https://example.test/app/japanese-exam/bridge.js'},addEventListener:(name,fn)=>{events[name]=fn;}},state:{ui:{examConfig:{subject:'math'}}},console};sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(bridge,sandbox);
let prevented=0;const event={target:{closest:()=>({dataset:{action:'start-exam-v22'}})},preventDefault:()=>{prevented++;},stopImmediatePropagation:()=>{}};
events.click(event);check(!urls.length&&!prevented,'bridge leaves math unchanged');
sandbox.state.ui.examConfig={subject:'japanese',scope:'full',length:'full',timeMin:45};events.click(event);
check(urls.length===1&&urls[0].startsWith('https://example.test/app/japanese-exam/index.html')&&urls[0].includes('mode=full'),'bridge opens Japanese full exam');
sandbox.state.ui.practiceConfig={subject:'japanese',unitsBySubject:{japanese:['classical']}};event.target.closest=()=>({dataset:{action:'start-unit-practice'}});events.click(event);
check(urls.at(-1).includes('classicalGenre=kobun'),'bridge preserves classical-only unit');
check((await validateLibrary()).total===2,'catalog and bundled packs validated');
console.log(JSON.stringify({ok:true,checks,packs:starterPacks.length,questions:all.length,points:starterPacks.map(p=>validatePack(p).totals),apiCalls:0,browserTesting:'not requested; pure logic and adapter tests only'}));
