export function browsingURL(value,origin=''){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.origin===origin)return null;return u.href;}catch{return null;}
}
export const externalSearch=(query,engine)=>({google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',duckduckgo:'https://duckduckgo.com/?q='}[engine]||'https://www.google.com/search?q=')+encodeURIComponent(query);
