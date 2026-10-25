export function webReferences(answer){
 const found=new Map();
 for(const match of String(answer).matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g)){
  try{const url=new URL(match[2]);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue;if(!found.has(url.href))found.set(url.href,{id:'web-'+found.size,kind:'web',title:match[1].slice(0,200),excerpt:'',sources:[url.href]});}catch{}
  if(found.size>=20)break;
 }return[...found.values()];
}
