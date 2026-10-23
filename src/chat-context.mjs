export function normalizeChatContext(value={}){
 return {title:String(value.title||'教材').slice(0,180),quote:String(value.quote||'').slice(0,4000),context:String(value.context||'').slice(0,8000)};
}
export function contextualMessage(question,reference){
 if(!reference)return question;
 const {title,quote,context}=normalizeChatContext(reference);
 return `${question}\n\n【質問する教材】${title}${quote?'\n【選んだ部分】\n'+quote:''}${context&&context!==quote?'\n【前後の文脈】\n'+context:''}`;
}
// Explicit quick questions may send immediately only into an empty, idle composer.
export const canSendQuickQuestion=({draft='',files=[],busy=false,preparing=false,offline=false,session=false})=>Boolean(session&&!offline&&!busy&&!preparing&&!draft.trim()&&!files.length);
