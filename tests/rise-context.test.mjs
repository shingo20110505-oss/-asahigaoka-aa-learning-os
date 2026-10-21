import test from 'node:test';import assert from 'node:assert/strict';
import {studyReferences,referenceInput} from '../bridge/study-context.mjs';
import {referenceHTML} from '../src/chat-references.mjs';
import {chatText} from '../src/chat-text.mjs';
test('chat retrieves sourced chronology and distinguishes constitution proclamation from the first Diet',async()=>{
 const refs=await studyReferences('大日本帝国憲法が発布された年と、最初の帝国議会が開かれた年を教えて。');
 assert.deepEqual(refs.map(r=>r.id).sort(),['history-220','history-222']);const text=referenceInput(refs);assert.ok(text.includes('1889年2月11日'));assert.ok(text.includes('1890年'));assert.ok(text.includes('11月25日'));assert.ok(text.includes('11月29日'));assert.ok(text.length<1800);
 assert.equal((await studyReferences('明治憲法はいつ発布された？'))[0].id,'history-220');
 assert.equal((await studyReferences('今日の天気を教えて')).length,0);
});
test('reading guidance is linked for a grammar question and reference markup never executes input HTML',async()=>{
 const refs=await studyReferences('because と although の違いは？');assert.deepEqual(refs.map(r=>r.id),['reading-guide-3','reading-guide-4']);assert.ok(referenceInput(refs).includes('because 以下が理由'));
 const markup=referenceHTML([{id:'x',title:'<script>alert(1)</script>',route:'javascript:alert(1)',excerpt:'<img onerror=evil()>',sources:['javascript:evil()','https://www.ndl.go.jp/']}]);assert.ok(!markup.includes('<script>'));assert.ok(!markup.includes('<img'));assert.ok(!markup.includes('javascript:'));assert.ok(markup.includes('https://www.ndl.go.jp/'));
});
test('assistant formatting escapes executable markup and keeps code literal',()=>{
 const formatted=chatText('**理由**\n- <img src=x onerror=evil()>\n`**literal**`\n```html\n<script>evil()</script>\n```');
 assert.ok(formatted.includes('<strong>理由</strong>'));assert.ok(formatted.includes('<code>**literal**</code>'));assert.ok(!formatted.includes('<img'));assert.ok(!formatted.includes('<script>'));assert.ok(formatted.includes('&lt;script&gt;'));
});
