import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as wait} from 'node:timers/promises';

// Windows readers and scanners can briefly hold the destination open. Never
// delete the old file or fall back to a partial write while replacing it.
export async function atomicJSON(file,value,{io=fs,pause=wait,space}={}){
 await io.mkdir(path.dirname(file),{recursive:true});
 const temp=file+'.'+randomUUID()+'.tmp';
 try{
  await io.writeFile(temp,JSON.stringify(value,null,space),{mode:0o600});
  for(let attempt=0;;attempt++){
   try{await io.rename(temp,file);break;}
   catch(error){if(attempt>=5||!['EPERM','EACCES','EBUSY'].includes(error.code))throw error;await pause(25*2**attempt);}
  }
 }finally{await io.rm(temp,{force:true}).catch(()=>{});}
}
