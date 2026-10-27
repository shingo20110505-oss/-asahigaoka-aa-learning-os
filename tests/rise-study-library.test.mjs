import test from 'node:test';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {libraryReferences,runStudyTool,studyIndex} from '../bridge/study-library.mjs';
import {CodexClient} from '../bridge/codex-client.mjs';import {chatText} from '../src/chat-text.mjs';import {safeStudyRoute} from '../src/study-links.mjs';
test('default corpus finds geography, both classical vocabularies, English and corrected history',async()=>{
 const examples=[['輪中とは？','geo-nobi'],['やませで冷害が起こるのはなぜ？','geo-tohoku-climate'],['漢文の未だ','classical-classical-kanbun-003'],['古文のあはれなり','classical-classical-kobun-001'],['althoughの意味','english-en-2e1d76579d44d7cf'],['明治憲法はいつ発布された？','history-220']];
 for(const [q,id]of examples)assert.ok((await libraryReferences(q)).some(x=>x.id===id),q);
 const index=await studyIndex();assert.ok(index.count>=39800);assert.match(index.get('history-499').text,/17の目標/);assert.ok(!index.get('history-499').text.includes('男女共同参画'));
 assert.equal(index.search('no-match-xyzzzzwww',{category:'geography'}).length,0);
 const refs=await libraryReferences('日本海側 冬 雪',{category:'geography'});assert.ok(refs.length);assert.ok(refs.every(x=>x.category==='geography'));
});
test('search tools support repeated searches but never arbitrary paths or unrecognized actions',async()=>{
 const seen=[];for(const query of ['輪中','電照菊']){const r=await runStudyTool({tool:'rise_search',arguments:{query,category:'geography',limit:3}},{onReferences:r=>seen.push(...r)});assert.equal(r.success,true);assert.equal(r.contentItems[0].type,'inputText');}
 assert.ok(seen.some(x=>x.id==='geo-nobi'));assert.ok(seen.some(x=>x.id==='geo-atsumi'));
 const r=await runStudyTool({tool:'rise_read',arguments:{id:'geo-atsumi'}});assert.match(r.contentItems[0].text,/日長/);
 for(const params of [{tool:'delete',arguments:{}},{tool:'rise_read',arguments:{id:'../../.env'}},{tool:'rise_search',arguments:{query:'輪中',path:'secret'}},{tool:'rise_search',arguments:{query:'輪中',limit:100}},{tool:'rise_search',namespace:'shell',arguments:{query:'輪中'}}])await assert.rejects(runStudyTool(params));
 const controller=new AbortController();controller.abort();await assert.rejects(runStudyTool({tool:'rise_read',arguments:{id:'geo-nobi'}},{signal:controller.signal}),{name:'AbortError'});
});
test('stdio tool dispatch only accepts registered dynamic tool requests',async()=>{
 const c=Object.create(CodexClient.prototype),sent=[];c.send=v=>sent.push(v);c.observers=new Set();c.pending=new Map();let handled=0;
 const remove=c.handleTools(async p=>{handled++;return{success:true,contentItems:[{type:'inputText',text:p.tool}]};});
 c.receive(JSON.stringify({id:1,method:'item/tool/call',params:{tool:'rise_search'}}));await new Promise(r=>setImmediate(r));assert.equal(sent[0].result.success,true);
 c.receive(JSON.stringify({id:2,method:'item/fileChange/requestApproval',params:{}}));assert.equal(sent[1].error.code,-32601);assert.equal(handled,1);remove();
 c.receive(JSON.stringify({id:3,method:'item/tool/call',params:{}}));assert.equal(sent[2].error.code,-32601);
});
test('internal citations route to actual lessons and cannot create arbitrary executable links',()=>{
 assert.ok(chatText('[輪中](#/geography/geo-nobi)').includes('href="#/geography/geo-nobi"'));
 for(const url of ['javascript:evil()','https://evil.example','geography/geo-nobi\" onclick=evil()','classical?word=%FF'])assert.equal(safeStudyRoute(url),null);
 assert.ok(!chatText('[悪意](javascript:evil())').includes('<a '));assert.ok(!chatText('`[文字](#/geography/geo-nobi)`').includes('<a '));
 assert.ok(!chatText('[<img src=x onerror=evil()>](#/geography/geo-nobi)').includes('<img'));
});
