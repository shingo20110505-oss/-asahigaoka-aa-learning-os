import test from 'node:test';
import assert from 'node:assert/strict';
import {forkLocalThread, localChatMessages, recoverLocalThread, savedThreadId} from '../src/local-chat.mjs';

test('offline continuation forks a PC conversation without mutating its messages or id', () => {
  const pc = {id:'pc-id', messages:[{role:'assistant',text:'元の回答',files:[{id:'file'}]}]};
  const local = forkLocalThread(pc, '質問', 100, () => 'local-id');
  assert.equal(local.id, 'local-id');
  assert.equal(local.localOnly, true);
  local.messages[0].text = '変更';
  assert.equal(pc.messages[0].text, '元の回答');
  assert.equal(forkLocalThread(local, '続き').id, 'local-id');
});

test('local context is bounded text, excluding incomplete or failed replies and attachment credentials', () => {
  const input = [
    {role:'assistant',text:'古い回答'},
    {role:'user',text:'質問',files:[{token:'private'}]},
    {role:'assistant',text:'完了した回答'},
    {role:'assistant',text:'途中',status:'inProgress'},
    {role:'assistant',text:'失敗',error:'connection'},
    {role:'user',text:'追加の質問'},
  ];
  assert.deepEqual(localChatMessages(input), [
    {role:'user',content:'質問'}, {role:'assistant',content:'完了した回答'}, {role:'user',content:'追加の質問'},
  ]);
  assert.equal(localChatMessages([{role:'user',text:'a'.repeat(3000)}])[0].content.length, 2400);
});


test('reopening an unfinished device conversation retains visible text as interrupted',()=>{
 const value={localOnly:true,busy:true,messages:[{role:'assistant',text:'保存した途中の文章',status:'inProgress'}]};
 const restored=recoverLocalThread(value);assert.equal(restored.busy,false);assert.equal(restored.messages[0].status,'interrupted');assert.equal(restored.messages[0].text,value.messages[0].text);assert.equal(value.messages[0].status,'inProgress');
 const remote={messages:[],busy:true};assert.equal(recoverLocalThread(remote),remote);
});

test('offline restart chooses the most recent saved conversation, not UUID key order',()=>{
 const data={savedIds:['aaa-old','zzz-recent'],threads:[{id:'missing',updatedAt:30},{id:'aaa-old',updatedAt:10},{id:'zzz-recent',updatedAt:20,localOnly:true}]};
 assert.equal(savedThreadId(data),'zzz-recent');
 assert.equal(savedThreadId(data,'aaa-old'),'aaa-old');
 assert.equal(savedThreadId(data,'deleted'),'zzz-recent');
 assert.equal(savedThreadId({savedIds:[],threads:[]}),undefined);
});
