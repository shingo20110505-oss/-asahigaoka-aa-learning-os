import test from 'node:test';
import assert from 'node:assert/strict';
import {atomicJSON} from '../bridge/atomic-json.mjs';

function fixture(failures,code='EPERM'){
 const files=new Map([['saved.json','original']]),pauses=[];let attempts=0;
 const io={mkdir:async()=>{},writeFile:async(p,b)=>files.set(p,b),rm:async p=>files.delete(p),rename:async(from,to)=>{if(attempts++<failures)throw Object.assign(Error('locked'),{code});files.set(to,files.get(from));files.delete(from);}};
 return{files,pauses,io,pause:async ms=>pauses.push(ms),attempts:()=>attempts};
}
test('brief Windows locks retry the atomic replacement without losing the old record',async()=>{
 const f=fixture(3);await atomicJSON('saved.json',{messages:['complete']},f);
 assert.equal(f.files.get('saved.json'),'{"messages":["complete"]}');assert.equal(f.files.size,1);assert.deepEqual(f.pauses,[25,50,100]);
});
test('permanent failure preserves the old record, cleans only temporary data, and stops retrying',async()=>{
 const f=fixture(100);await assert.rejects(atomicJSON('saved.json',{},f),{code:'EPERM'});assert.equal(f.attempts(),6);assert.deepEqual([...f.files],[['saved.json','original']]);
 const full=fixture(100,'ENOSPC');await assert.rejects(atomicJSON('saved.json',{},full),{code:'ENOSPC'});assert.equal(full.attempts(),1);assert.deepEqual([...full.files],[['saved.json','original']]);
});
