import {randomUUID} from 'node:crypto';
import {validId} from './security.mjs';

// Guest recovery changes the history identity, never the browser's budget ID.
// This ID is server generated and retained behind the existing device token.
export function guestBrowserId({device,session,now=Date.now()}){
 if(device?.expires>now&&validId(device.browserId))return device.browserId;
 if(session?.role==='guest'&&session.expires>now&&validId(session.browserId))return session.browserId;
 return randomUUID();
}
