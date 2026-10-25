// Disposable loopback-only UI test server, excluded from the public build.
import {createBridge} from '../bridge/server.mjs';
import {passwordHash} from '../bridge/security.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('test-results/workspace');await fs.mkdir(root,{recursive:true});
const privateDir=await fs.mkdtemp(path.join(root,'fixture-')),password='RISE UI fixture only',hash=await passwordHash(password);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
export const app=await createBridge({privateDir,port:Number(process.env.RISE_TEST_PORT||4326),config:{ownerPassword:hash,guestPassword:hash},provider:{ready:()=>true,info:()=>({label:'UI試験用'}),run:async({onDelta,onImage,onReferences,messages})=>{const msg=messages.at(-1);if(msg.study.mode==='image')await onImage(png);if(msg.study.search)onReferences([{id:'fixture-web',kind:'web',title:'試験用出典',sources:['https://example.com/']}]);onDelta('試験回答：'+msg.study.mode+' / 検索 '+Boolean(msg.study.search)+' / 添付 '+msg.files.length+'件');}}});
console.log('Workspace fixture: '+app.url);
export async function close(){await app.close();if(path.dirname(privateDir)===root&&path.basename(privateDir).startsWith('fixture-'))await fs.rm(privateDir,{recursive:true,force:true});}
process.on('SIGINT',async()=>{await close();process.exit(0);});
