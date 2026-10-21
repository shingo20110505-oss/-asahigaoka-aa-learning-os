// Shared, deliberately narrow HTTP surface. No PC paths or Codex RPC can be forwarded.
export const BODY_LIMIT=3*1024*1024, CHUNK_LIMIT=64*1024;
export const REQUEST_HEADERS=['accept','content-type','cookie','origin','range','sec-fetch-site','x-rise-csrf','upload-offset'];
export const RESPONSE_HEADERS=['content-type','content-length','content-range','accept-ranges','content-disposition','set-cookie','cache-control','x-content-type-options','referrer-policy','content-security-policy','x-frame-options'];
export function validRoute(value){return typeof value==='string'&&/^\/api\/[a-z0-9/-]+(?:\?download=1)?$/.test(value)&&!value.includes('//')&&!value.includes('..');}
export function validId(value){return typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);}
export function selectHeaders(headers,names){return Object.fromEntries(names.map(k=>[k,headers.get(k)]).filter(([,v])=>v!==null));}
export function encode(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
export function decode(text,limit=BODY_LIMIT){if(typeof text!=='string'||text.length>Math.ceil(limit/3)*4)throw Error('Invalid body');const value=Uint8Array.from(atob(text),c=>c.charCodeAt(0));if(value.length>limit)throw Error('Body too large');return value;}
export async function limitedBody(request,limit){if(Number(request.headers.get('content-length'))>limit)throw Error('Body too large');const reader=request.body?.getReader();if(!reader)return new Uint8Array();const parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Body too large');parts.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
