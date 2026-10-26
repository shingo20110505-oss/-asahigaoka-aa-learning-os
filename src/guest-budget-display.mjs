export function guestBudgetText(session,messages=[]){
 if(session?.role!=='guest'||session.provider?.guestBudget?.mode!=='estimated')return '';
 const notice=session.provider.guestBudget.notice;
 const last=session.budgetBrowserKey&&[...messages].reverse().find(m=>m.budget?.mode==='estimated'&&m.budget.browserKey===session.budgetBrowserKey)?.budget;
 if(!last)return notice;
 const numbers=[last.totalUsed,last.browserUsed];
 if(numbers.some(n=>!Number.isFinite(n)||n<0)||!Number.isFinite(last.resetsAt))return notice;
 return notice+' この会話の最終計測: 全ゲスト '+last.totalUsed+' / 25%、このブラウザー '+last.browserUsed+' / 5%。次回更新 '+new Date(last.resetsAt).toLocaleString('ja-JP')+'。'+(last.pending?'使用量の反映確認待ちです。':'最新の上限判定は送信時に行います。');
}
