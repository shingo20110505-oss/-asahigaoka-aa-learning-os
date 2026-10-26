import {guestBudget,weeklySample,BUDGET_NOTICE} from './guest-budget.mjs';
import {setTimeout as wait} from 'node:timers/promises';

export function budgetInfo(config,role){return role==='guest'&&config.guestWeeklyBudget?.enabled===true?{mode:'estimated',totalLimit:25,browserLimit:5,notice:BUDGET_NOTICE}:null;}

export async function beginGuestMeter({client,budget,browserId,requestId,limitId='codex',now=Date.now,pause=wait}){
 const account=await client.request('account/read',{refreshToken:false});
 const read=async()=>weeklySample(account,await client.request('account/rateLimits/read',{}),{now:now(),limitId});
 const before=await read(),lease=await budget.begin({browserId,requestId,sample:before});
 let dispatched=false,quotaEvidence=false,maximum=before.used,ended=false;
 const unobserve=client.observe(message=>{
  if(!dispatched||message.method!=='account/rateLimits/updated')return;
  // Notifications are sparse. They are evidence of an in-turn quota update,
  // never a replacement for the complete, account-bound snapshot at settlement.
  const b=message.params?.rateLimits;
  if(b?.limitId!==limitId)return;
  const windows=[b.primary,b.secondary].filter(w=>w?.windowDurationMins===10080&&w.resetsAt*1000===before.resetAt&&Number.isInteger(w.usedPercent)&&w.usedPercent>=before.used);
  if(windows.length===1){quotaEvidence=true;maximum=Math.max(maximum,windows[0].usedPercent);}
 });
 return {
  dispatched(){dispatched=true;},
  async finish(){
   if(ended)return;ended=true;
   let after;
   try{
    if(dispatched){
     // Bounded post-turn settling catches common delayed updates. Missing
     // readings remain pending in the durable ledger, including failed turns.
     for(let attempt=0;attempt<3;attempt++){
      try{after=await read();if(after.used>=maximum&&(after.used>before.used||quotaEvidence))break;}catch{after=undefined;}
      if(attempt<2)await pause(1500);
     }
     if(after&&after.used<maximum)after=undefined;
    }
   }finally{unobserve();}
   return lease.finish({sample:after,quotaEvidence,dispatched});
  }
 };
}
export {guestBudget};
