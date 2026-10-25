// In-memory HTTP adapter for restricted development environments. No socket
// connection is made; the real bridge handler still handles auth and persistence.
import {Readable,Writable} from 'node:stream';
export async function injectHTTP(server,{url,method='GET',headers={},body}){
 const u=new URL(url),request=Readable.from(body?.length?[body]:[]);request.url=u.pathname+u.search;request.method=method;request.headers={...headers,host:u.host};request.socket={remoteAddress:'127.0.0.1'};
 return new Promise((resolve,reject)=>{
  const chunks=[],output={};const response=new Writable({write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));callback();}});response.statusCode=200;response.headersSent=false;
  response.setHeader=(key,value)=>output[key.toLowerCase()]=value;response.getHeader=key=>output[key.toLowerCase()];response.removeHeader=key=>delete output[key.toLowerCase()];response.writeHead=(status,values)=>{response.statusCode=status;Object.entries(values||{}).forEach(([k,v])=>response.setHeader(k,v));response.headersSent=true;return response;};response.flushHeaders=()=>{response.headersSent=true;};
  response.on('error',reject);response.on('finish',()=>resolve({status:response.statusCode,headers:Object.fromEntries(Object.entries(output).map(([k,v])=>[k,String(v)])),body:Buffer.concat(chunks)}));
  Promise.resolve(server.listeners('request')[0](request,response)).catch(reject);
 });
}
