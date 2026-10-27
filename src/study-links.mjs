export function safeStudyRoute(route){
 if(typeof route!=='string'||/[\s<>"'\\]/.test(route))return null;
 if(/^(history\/\d+|reading|geography\/geo-[a-z0-9-]+)$/.test(route))return route;
 const match=/^(classical\?word=|english-words\?q=)([a-zA-Z0-9%._~-]+)$/.exec(route);if(!match)return null;
 try{decodeURIComponent(match[2]);return route;}catch{return null;}
}
