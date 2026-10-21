import fs from 'node:fs/promises';

export class InferenceQueue {
  active=false;
  waiting=[];
  async run(signal,task){
    signal.throwIfAborted();
    await new Promise((resolve,reject)=>{
      const entry={resolve,reject,signal,abort:null};
      entry.abort=()=>{this.waiting=this.waiting.filter(x=>x!==entry);reject(signal.reason);};
      if(!this.active){this.active=true;resolve();}
      else{signal.addEventListener('abort',entry.abort,{once:true});this.waiting.push(entry);}
    });
    try{signal.throwIfAborted();return await task();}
    finally{
      const next=this.waiting.shift();
      if(next){next.signal.removeEventListener('abort',next.abort);next.resolve();}
      else this.active=false;
    }
  }
}
// All provider generations share the queue, including after a settings save.
const pcQueue=new InferenceQueue();
export async function inspectGuestModel({guest,signal,fetchImpl=fetch}){
  const response=await fetchImpl(new URL('/api/show',guest.url),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:guest.model}),signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
  if(!response.ok)throw Error('ゲスト用モデルが見つかりません。PC設定画面でインストール済みモデルを確認してください。');
  const info=await response.json();return {vision:!info.capabilities||info.capabilities.includes('vision'),thinking:info.thinking?.values?.includes(false)||(!info.thinking&&info.capabilities?.includes('thinking'))?false:undefined};
}
export async function runGuest({guest,input,guidance,signal,onDelta,fetchImpl=fetch,queue=pcQueue,inspectModel=inspectGuestModel}){
  if(!guest)throw Error('ゲスト用AIの設定が必要です');
  const bounded=AbortSignal.any([signal,AbortSignal.timeout(10*60*1000)]);
  try{return await queue.run(bounded,async()=>{
    const model=await inspectModel({guest,signal:bounded,fetchImpl});
    if(!model.vision&&input.some(x=>x.type==='localImage'))throw Error('このゲスト用モデルは画像に対応していません。PC設定画面で画像対応モデルを選ぶか、文章で質問してください。');
    const images=[];
    for(const part of input.filter(x=>x.type==='localImage')){
      bounded.throwIfAborted();images.push((await fs.readFile(part.path,{signal:bounded})).toString('base64'));
    }
    const response=await fetchImpl(new URL('/api/chat',guest.url),{
      method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},signal:bounded,
      body:JSON.stringify({model:guest.model,...(model.thinking===false?{think:false}:{}),messages:[{role:'system',content:guidance},{role:'user',content:input.filter(x=>x.type==='text').map(x=>x.text).join('\n\n'),...(images.length?{images}:{})}],stream:true,
        options:{num_ctx:8192,num_predict:1024,temperature:0.4,presence_penalty:0,repeat_penalty:1},keep_alive:0})
    });
    if(!response.ok)throw Error('PC内のゲスト用AIに接続できません（'+response.status+'）。Ollamaとモデルを確認してください。');
    let pending='',done=false,hasAnswer=false;const decoder=new TextDecoder();
    const event=line=>{
      if(!line.trim())return;
      let value;try{value=JSON.parse(line);}catch{throw Error('ゲスト用AIの応答が途中で壊れました。再送信してください。');}
      if(value.error)throw Error(String(value.error));
      if(value.message?.content){hasAnswer=true;onDelta(value.message.content);}
      if(value.done){done=true;if(value.done_reason==='length')onDelta('\n\n［回答が長さの上限に達しました。続きが必要なら、その部分を指定して質問してください。］');}
    };
    for await(const chunk of response.body){
      bounded.throwIfAborted();pending+=decoder.decode(chunk,{stream:true});
      if(pending.length>1024*1024)throw Error('ゲスト用AIの応答形式を確認してください。');
      const lines=pending.split('\n');pending=lines.pop();for(const line of lines)event(line);
    }
    pending+=decoder.decode();if(pending.trim())event(pending);
    if(!done)throw Error('ゲスト用AIとの接続が途中で切れました。受信済みの回答は履歴に残ります。');
    if(!hasAnswer)throw Error('ゲスト用AIから回答の本文が返りませんでした。質問を短くするか、PC設定でモデルを確認してください。');
  });}catch(error){
    if(bounded.aborted&&!signal.aborted)throw Error('待ち時間が長くなったため停止しました。画像や質問を分けて試してください。');
    throw error;
  }
}
