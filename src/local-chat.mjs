// Device conversations are explicit local forks. They never acquire a PC thread id.
export function forkLocalThread(current, question, now = Date.now(), uuid = () => crypto.randomUUID()) {
  if (current?.localOnly) return structuredClone(current);
  return {
    id: uuid(), title: question.slice(0, 60) || '端末内AIとの会話',
    createdAt: now, updatedAt: now, localOnly: true, busy: false,
    messages: structuredClone(current?.messages || []),
  };
}

export function localChatMessages(messages, maxChars = 2400) {
  const result = [];
  let remaining = maxChars;
  for (const message of messages.slice().reverse()) {
    if (!['user', 'assistant'].includes(message.role) || message.status === 'inProgress' || message.error) continue;
    const content = String(message.text || '').trim();
    if (!content) continue;
    if (content.length > remaining) {
      if (!result.length) result.unshift({role: message.role, content: content.slice(0, remaining)});
      break;
    }
    result.unshift({role: message.role, content});
    remaining -= content.length;
    if (result.length >= 6) break;
  }
  while (result[0]?.role === 'assistant') result.shift();
  return result;
}

export function recoverLocalThread(thread) {
  if (!thread?.localOnly) return thread;
  return {...thread, busy:false, messages:thread.messages.map(m => m.status === 'inProgress' ? {...m,status:'interrupted'} : m)};
}
