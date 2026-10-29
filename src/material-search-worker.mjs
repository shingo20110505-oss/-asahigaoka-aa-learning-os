import {prepareDocuments,searchDocuments} from './material-search.mjs';
let builtIn=[],personal=[];
self.onmessage=async({data:m})=>{
 try{
  if(m.type==='load'){
   const response=await fetch(new URL('../data/material-search.json',import.meta.url),{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('教材を読み込めませんでした。');
   const catalog=await response.json();
   if(catalog.schema!==1||!Array.isArray(catalog.documents))throw Error('検索データを更新してください。');
   builtIn=prepareDocuments(catalog.documents);self.postMessage({type:'ready',counts:catalog.counts,total:builtIn.length});
  }else if(m.type==='personal'){personal=prepareDocuments(m.documents);}
  else if(m.type==='search'){const start=performance.now(),result=searchDocuments([...builtIn,...personal],m);self.postMessage({type:'results',request:m.request,...result,milliseconds:performance.now()-start});}
 }catch(error){self.postMessage({type:'error',message:error.message||'検索の準備ができませんでした。'});}
};
