import {RelayCore,authorized} from './core.mjs';
export class RiseRelay extends RelayCore {constructor(ctx,env){super(env);}}
export default {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/_rise/host/')){
    if(url.pathname.startsWith('/_rise/host/')&&!await authorized(request,env.RISE_RELAY_TOKEN))return new Response('Unauthorized',{status:401});
    return env.RISE_RELAY.get(env.RISE_RELAY.idFromName('pc')).fetch(request);
  }
  if(url.pathname.startsWith('/_rise/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
}};
