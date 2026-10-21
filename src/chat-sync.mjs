export function mergeChatSnapshot(current,snapshot){
  if(current?.id!==snapshot.id)return snapshot;
  const known=new Map((current.messages||[]).map(m=>[m.id,m]));
  const messages=snapshot.messages.map(message=>{
    const local=known.get(message.id);
    // An HTTP snapshot may have been captured just before a newer SSE delta.
    if(message.status==='inProgress'&&local?.text?.length>message.text.length)return {...message,text:local.text};
    return message;
  });
  if(snapshot.busy){const ids=new Set(messages.map(m=>m.id));for(const message of known.values())if(!ids.has(message.id)&&message.status==='inProgress')messages.push(message);}
  return {...snapshot,messages};
}
