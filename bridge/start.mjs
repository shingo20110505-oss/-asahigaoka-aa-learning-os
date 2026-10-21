import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {ConfigStore} from './config.mjs';
import {createBridge} from './server.mjs';
import {createProviders} from './providers.mjs';
import {createSetupServer} from './setup-server.mjs';

export async function startRise({privateDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.rise-private'),port=4318,setupPort=4320}={}){
  const configStore=new ConfigStore(privateDir),config=await configStore.read();
  const app=await createBridge({privateDir,config,provider:await createProviders({privateDir,config}),port,publicOrigin:config.publicOrigin||null});
  let setup;
  try{setup=await createSetupServer({privateDir,port:setupPort,bridgeURL:app.url,onConfigChange:async(next,options)=>{const nextProvider=await createProviders({privateDir,config:next});await app.reloadConfig({nextProvider,...options});}});}catch(error){await app.close();throw error;}
  return {app,setup,async close(){await setup.close();await app.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  try{await fs.access(path.join(root,'dist/index.html'));}catch{console.error('先に node scripts/build-rise.mjs を実行してください。');process.exit(1);}
  try{
    const rise=await startRise({privateDir:process.env.RISE_PRIVATE_DIR||path.join(root,'.rise-private'),port:Number(process.env.PORT||4318),setupPort:Number(process.env.RISE_SETUP_PORT||4320)});
    console.log('RISE: '+rise.app.url);console.log('PC設定: '+rise.setup.url);console.log('パスワードはPC設定画面で後から入力できます。停止: Ctrl+C');
    if(!process.argv.includes('--no-browser')&&process.platform==='win32')spawn('cmd.exe',['/d','/c','start','',rise.setup.url],{windowsHide:true,stdio:'ignore'}).on('error',()=>{});
    let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await rise.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }catch(error){console.error(error.code==='EADDRINUSE'?'RISEのポートが使用中です。既に起動しているRISEを確認してください。':error.message);process.exitCode=1;}
}
