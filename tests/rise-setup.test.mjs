import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createSetupServer} from '../bridge/setup-server.mjs';
import {createBridge} from '../bridge/server.mjs';
import {passwordMatches} from '../bridge/security.mjs';
import {validOllama,validPublicOrigin,ConfigStore} from '../bridge/config.mjs';

test('PC configuration only accepts loopback guest inference and an HTTPS public origin',()=>{
  assert.equal(validOllama({url:'http://127.0.0.1:11434',model:'qwen:4b'}).model,'qwen:4b');
  for(const url of ['https://example.com','http://evil.invalid','http://127.0.0.1@evil.invalid','http://localhost/path'])assert.throws(()=>validOllama({url,model:'x'}));
  assert.equal(validPublicOrigin('https://rise.example.com/'),'https://rise.example.com');
  for(const url of ['http://example.com','https://example.com/private','https://user:pass@example.com'])assert.throws(()=>validPublicOrigin(url));
});

test('PC-only setup delays password creation, enforces origin and CSRF, hashes passwords and revokes old chat sessions',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-setup-test-'));
  const bridge=await createBridge({privateDir:dir}),configStore=new ConfigStore(dir);let observedCallback=0;
  const setup=await createSetupServer({privateDir:dir,port:0,bridgeURL:bridge.url,discover:async()=> 'codex',onConfigChange:async(config,options)=>{observedCallback++;await bridge.reloadConfig(options);}});
  t.after(async()=>{await setup.close();await bridge.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-setup-test-'))await fs.rm(dir,{recursive:true});});
  assert.equal((await fetch(setup.url+'/api/status')).status,401);
  assert.equal((await fetch(setup.url+'/',{headers:{Origin:'https://evil.invalid'}})).status,403);
  assert.equal((await fetch(setup.url+'/',{headers:{'X-Forwarded-For':'1.2.3.4'}})).status,403);
  const initial=await fetch(setup.url+'/'),cookie=initial.headers.get('set-cookie').split(';')[0];
  assert.ok((await initial.text()).includes('最後にパスワード'));assert.ok(!initial.headers.get('set-cookie').includes('SameSite=None'));
  const status=await(await fetch(setup.url+'/api/status',{headers:{Cookie:cookie}})).json();assert.equal(status.passwordsConfigured,false);assert.equal(status.unlocked,true);assert.deepEqual(await configStore.read(),{});
  const post=(endpoint,input,extra={})=>fetch(setup.url+'/api/'+endpoint,{method:'POST',headers:{Cookie:cookie,Origin:setup.url,'X-Rise-CSRF':status.csrf,'Content-Type':'application/json',...extra},body:JSON.stringify(input)});
  assert.equal((await post('settings',{}, {'X-Rise-CSRF':'wrong'})).status,403);
  const configResult=await post('settings',{codexExecutable:'codex',ownerModel:'',guestOllama:null,publicOrigin:''});assert.equal(configResult.status,200);assert.equal((await(await fetch(bridge.url+'/api/status')).json()).configured,false);
  const owner='Owner fixture password 45',guest='Guest fixture password 46';
  assert.equal((await post('passwords',{ownerPassword:owner,ownerConfirm:'different',guestPassword:guest,guestConfirm:guest})).status,400);
  const values={ownerPassword:owner,ownerConfirm:owner,guestPassword:guest,guestConfirm:guest};assert.equal((await post('passwords',values)).status,200);
  const config=await configStore.read();assert.equal(await passwordMatches(owner,config.ownerPassword),true);assert.equal(await passwordMatches(guest,config.guestPassword),true);
  const rawConfig=await fs.readFile(path.join(dir,'config.json'),'utf8');assert.ok(!rawConfig.includes(owner)&&!rawConfig.includes(guest));
  const login=await fetch(bridge.url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'owner',password:owner})});assert.equal(login.status,200);const chatCookie=login.headers.get('set-cookie').split(';')[0];
  const newPage=await fetch(setup.url+'/'),newCookie=newPage.headers.get('set-cookie').split(';')[0];
  const locked=await(await fetch(setup.url+'/api/status',{headers:{Cookie:newCookie}})).json();assert.equal(locked.unlocked,false);assert.equal(locked.settings,null);
  assert.equal((await fetch(setup.url+'/api/settings',{method:'POST',headers:{Cookie:newCookie,Origin:setup.url,'X-Rise-CSRF':locked.csrf,'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await post('passwords',{...values,ownerPassword:owner+'new',ownerConfirm:owner+'new'})).status,200);
  assert.equal((await fetch(bridge.url+'/api/session',{headers:{Cookie:chatCookie}})).status,401);
  assert.ok(observedCallback>=3);
  for(let n=0;n<7;n++){
    const page=await fetch(setup.url),freshCookie=page.headers.get('set-cookie').split(';')[0],fresh=await(await fetch(setup.url+'/api/status',{headers:{Cookie:freshCookie}})).json();
    const failure=await fetch(setup.url+'/api/unlock',{method:'POST',headers:{Cookie:freshCookie,'X-Rise-CSRF':fresh.csrf,'Content-Type':'application/json'},body:'{"password":"incorrect"}'});
    assert.equal(failure.status,n<6?401:429,'opening another tab must not reset the guess limit');
  }
});

test('Codex setup only offers ChatGPT login and marks ready after an actual login completion event',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rise-login-test-'));let observer,loggedIn=false;const methods=[];
  const fake={closed:false,observe(fn){observer=fn;return()=>{};},close(){this.closed=true;},async request(method,params){methods.push({method,params});if(method==='account/read')return {account:loggedIn?{type:'chatgpt',planType:'pro'}:null};if(method==='model/list')return {data:[{model:'fixture-model',displayName:'Fixture'}]};if(method==='account/login/start')return {type:'chatgpt',loginId:'login-fixture',authUrl:'https://auth.openai.com/authorize?test=fixture'};return {};}};
  const setup=await createSetupServer({privateDir:dir,port:0,discover:async()=> 'codex',codexFactory:async()=>fake});
  t.after(async()=>{await setup.close();if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('rise-login-test-'))await fs.rm(dir,{recursive:true});});
  const page=await fetch(setup.url),cookie=page.headers.get('set-cookie').split(';')[0],state=await(await fetch(setup.url+'/api/status',{headers:{Cookie:cookie}})).json();
  const call=route=>fetch(setup.url+'/api/'+route,{method:'POST',headers:{Cookie:cookie,'X-Rise-CSRF':state.csrf,'Content-Type':'application/json'},body:'{}'});
  assert.equal((await(await call('codex/probe')).json()).connected,false);
  const saved=await fetch(setup.url+'/api/settings',{method:'POST',headers:{Cookie:cookie,'X-Rise-CSRF':state.csrf,'Content-Type':'application/json'},body:'{"codexExecutable":"codex"}'});assert.equal(saved.status,200);assert.equal(fake.closed,false,'saving the auto-detected path must keep the probed connection');
  assert.equal((await call('codex/login')).status,200);
  assert.equal(methods.find(m=>m.method==='account/login/start').params.type,'chatgpt');
  loggedIn=true;observer({method:'account/login/completed',params:{success:true}});
  for(let n=0;n<50;n++){if((await setup.configStore.read()).ownerCodex)break;await new Promise(r=>setTimeout(r,10));}
  assert.equal((await setup.configStore.read()).ownerCodex,true);assert.equal((await setup.configStore.read()).ownerPassword,undefined);
});
