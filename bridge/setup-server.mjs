import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ConfigStore,validOllama,validPublicOrigin} from './config.mjs';
import {secret,digest,passwordHash,passwordMatches,validPassword} from './security.mjs';
import {openCodex,discoverCodex} from './codex-client.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const error=(message,status=400)=>Object.assign(Error(message),{status});
const json=(res,value,status=200,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(value));};
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw error('JSONで送信してください',415);let size=0,parts=[];for await(const part of req){size+=part.length;if(size>16384)throw error('入力が大きすぎます',413);parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw error('入力形式を確認してください');}}

export async function createSetupServer({privateDir,port=4320,bridgeURL='http://127.0.0.1:4318',onConfigChange=async()=>{},codexFactory=openCodex,discover=discoverCodex,relayStatus=()=>({connected:false,message:'遠隔接続は未設定です'})}={}){
  const configStore=new ConfigStore(privateDir),sessions=new Map(),guesses=new Map();
  const executable=await discover();let client=null,clientPromise=null,closed=false,generation=0,changeQueue=Promise.resolve();
  let codex={available:false,connected:false,plan:'',models:[],pending:false,message:'接続確認を押してください'};
  async function changed(config,options={}){const change=changeQueue.catch(()=>{}).then(()=>onConfigChange(config,options));changeQueue=change;await change;return config;}
  async function closeClient(){generation++;client?.close();client=null;clientPromise=null;codex={available:false,connected:false,plan:'',models:[],pending:false,message:'接続確認を押してください'};}
  async function ensureClient(){
    if(client&&!client.closed)return client;
    if(clientPromise)return clientPromise;
    const pending=(async()=>{
      const ticket=generation,config=await configStore.read(),next=await codexFactory(privateDir,{...config,codexExecutable:config.codexExecutable||executable});
      if(closed||ticket!==generation){next.close();throw error('設定画面は終了しました',503);}
      client=next;
      next.observe(m=>{
        if(client!==next||closed)return;
        if(m.method==='account/login/completed'){
          codex.pending=false;delete codex.authURL;delete codex.loginId;
          if(m.params.success)probe().then(async()=>{if(codex.connected)await changed(await configStore.update(c=>{c.ownerCodex=true;}));}).catch(e=>{codex.message=e.message;});
          else codex.message=m.params.error||'ログインが完了しませんでした。もう一度接続してください。';
        }
        if(m.method==='rise/closed'){codex.available=false;codex.pending=false;codex.connected=false;delete codex.authURL;codex.message='Codex接続が終了しました。接続確認で再開できます。';}
      });return next;
    })();
    clientPromise=pending;
    try{return await pending;}finally{if(clientPromise===pending)clientPromise=null;}
  }
  async function probe(){
    const c=await ensureClient(),account=await c.request('account/read',{refreshToken:false});if(client!==c||closed)throw error('接続設定が変更されました。接続確認をやり直してください',409);codex.available=true;codex.connected=account.account?.type==='chatgpt';codex.plan=codex.connected?String(account.account.planType||''):'';
    codex.message=codex.connected?'RISE専用のChatGPTログインを確認しました':account.account?'ChatGPTでログインしてください。有料APIキーは使用しません。':'Codexは起動できました。ChatGPTへのログインはまだです。';
    if(codex.connected){const result=await c.request('model/list',{includeHidden:false});if(client!==c||closed)throw error('接続設定が変更されました',409);codex.models=(result.data||[]).map(x=>({id:x.model||x.id,name:x.displayName||x.model||x.id})).filter(x=>x.id);}else codex.models=[];
    return codex;
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    try {
      const currentPort=server.address().port,allowedHosts=['127.0.0.1:'+currentPort,'localhost:'+currentPort],host=req.headers.host;
      if(!allowedHosts.includes(host)||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.forwarded||req.headers['x-forwarded-for']||req.headers['x-rise-relay'])throw error('この設定画面はPC内から開いてください',403);
      if(req.headers.origin&&req.headers.origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site')throw error('この接続元は許可されていません',403);
      const url=new URL(req.url,'http://'+host),p=url.pathname;
      if(req.method==='GET'&&['/','/setup.mjs','/setup.css','/logo.png'].includes(p)){
        const type={'/':'text/html; charset=utf-8','/setup.mjs':'text/javascript; charset=utf-8','/setup.css':'text/css; charset=utf-8','/logo.png':'image/png'}[p];
        if(p==='/'){for(const [k,v] of sessions)if(v.expires<Date.now())sessions.delete(k);if(sessions.size>=100)throw error('設定画面のタブを閉じて再起動してください',429);const token=secret(),config=await configStore.read();sessions.set(digest(token),{csrf:secret(),unlocked:!config.ownerPassword,expires:Date.now()+3600000});res.setHeader('Set-Cookie','rise_setup='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600');}
        const file=p==='/logo.png'?path.join(here,'../icons/rise-icon-192-20260905-v5.png'):path.join(here,'setup',p==='/'?'index.html':p.slice(1));res.writeHead(200,{'Content-Type':type});return res.end(await fs.readFile(file));
      }
      const raw=(req.headers.cookie||'').match(/(?:^|;\s*)rise_setup=([A-Za-z0-9_-]+)/)?.[1],session=raw&&sessions.get(digest(raw));
      if(!session||session.expires<Date.now())throw error('PC設定画面を開き直してください',401);
      const config=await configStore.read();
      if(p==='/api/status'&&req.method==='GET')return json(res,{csrf:session.csrf,unlocked:session.unlocked,passwordsConfigured:Boolean(config.ownerPassword&&config.guestPassword),bridgeURL,relay:session.unlocked?{...relayStatus(),keyConfigured:Boolean(config.relayToken)}:null,codex:session.unlocked?codex:{connected:false,message:'管理者パスワードで設定を開いてください'},settings:session.unlocked?{codexExecutable:config.codexExecutable||executable,ownerModel:config.ownerModel||'',ownerCodex:Boolean(config.ownerCodex),guestOllama:config.guestOllama||null,publicOrigin:config.publicOrigin||''}:null});
      if(req.method!=='POST')throw error('見つかりません',404);
      if(req.headers['x-rise-csrf']!==session.csrf)throw error('設定画面を開き直してください',403);
      const input=await body(req);
      if(p==='/api/unlock'){
        const k='local',tries=guesses.get(k)||{count:0,reset:Date.now()+60000};if(tries.reset<Date.now()){tries.count=0;tries.reset=Date.now()+60000;}tries.count++;guesses.set(k,tries);if(tries.count>6)throw error('1分ほど待ってから試してください',429);
        if(!await passwordMatches(input.password,config.ownerPassword))throw error('管理者パスワードを確認してください',401);session.unlocked=true;return json(res,{ok:true});
      }
      if(!session.unlocked)throw error('管理者パスワードで設定を開いてください',403);
      if(p==='/api/settings'){
        const program=String(input.codexExecutable||'codex').trim();
        if(program!=='codex'&&(!path.isAbsolute(program)||!program.toLowerCase().endsWith('.exe')||!(await fs.stat(program).catch(()=>null))?.isFile()))throw error('Codexの実行ファイル（.exe）を確認してください');
        const guestOllama=validOllama(input.guestOllama),publicOrigin=validPublicOrigin(input.publicOrigin),ownerModel=String(input.ownerModel||'').trim();
        if(ownerModel&&!/^[\w./-]{1,100}$/.test(ownerModel))throw error('モデル名を確認してください');
        if(program!==(config.codexExecutable||executable))await closeClient();
        await changed(await configStore.update(c=>{Object.assign(c,{codexExecutable:program,ownerModel,guestOllama,publicOrigin});}));return json(res,{ok:true});
      }
      if(p==='/api/passwords'){
        if([input.ownerPassword,input.guestPassword].some(p=>!validPassword(p)))throw error('パスワードは8〜512文字で設定してください');
        if(input.ownerPassword!==input.ownerConfirm||input.guestPassword!==input.guestConfirm)throw error('確認用パスワードが一致していません');
        if(input.ownerPassword===input.guestPassword)throw error('管理者とゲストは別のパスワードにしてください');
        const ownerPassword=await passwordHash(input.ownerPassword),guestPassword=await passwordHash(input.guestPassword);
        await changed(await configStore.update(c=>{c.ownerPassword=ownerPassword;c.guestPassword=guestPassword;}),{revokeSessions:true});
        for(const s of sessions.values())if(s!==session)s.unlocked=false;return json(res,{ok:true});
      }
      if(p==='/api/codex/probe')return json(res,await probe());
      if(p==='/api/codex/login'){
        if(codex.pending)throw error('開いているログインを完了するか、キャンセルしてください',409);
        const c=await ensureClient(),result=await c.request('account/login/start',{type:'chatgpt'}),auth=new URL(result.authUrl);
        if(auth.protocol!=='https:'||auth.hostname!=='auth.openai.com')throw error('ログイン先を確認できませんでした',502);
        codex.pending=true;codex.loginId=result.loginId;codex.authURL=auth.href;codex.message='ChatGPTのログイン画面で接続を完了してください';return json(res,{ok:true,authURL:auth.href});
      }
      if(p==='/api/codex/cancel'){if(codex.pending&&client)await client.request('account/login/cancel',{loginId:codex.loginId});codex.pending=false;delete codex.authURL;return json(res,{ok:true});}
      if(p==='/api/ollama/models'){
        const settings=validOllama({url:input.url||'http://127.0.0.1:11434',model:'probe'}),response=await fetch(new URL('/api/tags',settings.url),{redirect:'error',signal:AbortSignal.timeout(5000)});
        if(!response.ok)throw error('Ollamaが応答しませんでした',502);const result=await response.json();return json(res,{models:(result.models||[]).map(m=>({name:m.name,size:m.size})).slice(0,100)});
      }
      throw error('見つかりません',404);
    } catch(e) {json(res,{error:e.status?e.message:e.name==='TimeoutError'?'接続が時間切れになりました':e.code==='ENOSPC'?'PCの空き容量が不足しています':e.message||'PC設定でエラーが発生しました'},e.status||500);}
  });
  server.requestTimeout=30000;await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:'http://127.0.0.1:'+server.address().port,configStore,async close(){closed=true;await closeClient();await new Promise(resolve=>server.close(resolve));}};
}
