let state,csrf='',busy=false,pollTimer;
const $=id=>document.getElementById(id),settings=$('settings-form');
function notice(text,error=false){$('notice').textContent=text;$('notice').className=error?'error':'';}
async function api(path,input){const response=await fetch('/api/'+path,{method:input===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:input===undefined?{}:{'Content-Type':'application/json','X-Rise-CSRF':csrf},body:input===undefined?undefined:JSON.stringify(input)});const value=await response.json();if(!response.ok)throw Error(value.error||'設定を処理できませんでした');return value;}
async function refresh(fill=false){
  state=await api('status');csrf=state.csrf;$('unlock-panel').hidden=state.unlocked;$('setup-panels').hidden=!state.unlocked;
  if(!state.unlocked)return;
  $('codex-status').textContent=state.codex.message+(state.codex.plan?'（'+state.codex.plan+'）':'');
  $('login-panel').hidden=!state.codex.pending;
  if(state.codex.authURL)$('auth-link').href=state.codex.authURL;
  $('password-status').textContent=state.passwordsConfigured?'設定済みです。パスワードの内容は表示・再取得できません。':'未設定です。準備が終わってから、ここで設定してください。';
  $('open-chat').href=state.bridgeURL+'/#/chat';
  if(fill){settings.elements.codexExecutable.value=state.settings.codexExecutable;settings.elements.ownerModel.value=state.settings.ownerModel;settings.elements.ollamaURL.value=state.settings.guestOllama?.url||'http://127.0.0.1:11434';settings.elements.guestModel.value=state.settings.guestOllama?.model||'';settings.elements.publicOrigin.value=state.settings.publicOrigin;}
  const chosen=fill?state.settings.ownerModel:settings.elements.ownerModel.value;
  const models=[{id:'',name:'Codexの標準設定'},...state.codex.models];if(chosen&&!models.some(m=>m.id===chosen))models.push({id:chosen,name:chosen});
  settings.elements.ownerModel.replaceChildren(...models.map(m=>new Option(m.name,m.id,false,m.id===chosen)));
  clearTimeout(pollTimer);if(state.codex.pending)pollTimer=setTimeout(()=>refresh().catch(e=>notice(e.message,true)),2500);
}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
$('unlock-form').onsubmit=e=>{e.preventDefault();action(async()=>{await api('unlock',{password:e.target.elements.password.value});e.target.reset();await refresh(true);notice('管理者設定を開きました');});};
settings.onsubmit=e=>{e.preventDefault();action(async()=>{const f=new FormData(settings);await api('settings',{codexExecutable:f.get('codexExecutable'),ownerModel:f.get('ownerModel'),publicOrigin:f.get('publicOrigin'),guestOllama:{url:f.get('ollamaURL'),model:f.get('guestModel')}});await refresh();notice('接続設定を保存しました');});};
$('password-form').onsubmit=e=>{e.preventDefault();action(async()=>{const form=e.target;await api('passwords',Object.fromEntries(new FormData(form)));form.reset();await refresh();notice('パスワードを設定しました。チャットでログインできます。');});};
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;action(async()=>{
  if(button.dataset.action==='probe'){notice('Codexの起動とログイン状態を確認しています…');await api('codex/probe',{});await refresh();notice(state.codex.message);}
  if(button.dataset.action==='login'){notice('ChatGPTのログインを準備しています…');await api('codex/login',{});await refresh();notice('ログイン画面を開いて接続を完了してください');}
  if(button.dataset.action==='cancel-login'){await api('codex/cancel',{});await refresh();notice('ログインをキャンセルしました');}
  if(button.dataset.action==='ollama'){notice('PC内のOllamaを確認しています…');const result=await api('ollama/models',{url:settings.elements.ollamaURL.value});$('ollama-models').replaceChildren(...result.models.map(m=>new Option(m.name,m.name)));$('ollama-status').textContent=result.models.length?result.models.map(m=>m.name).join(' / '):'インストール済みのモデルがありません。Ollamaでモデルを用意してください。';notice(result.models.length+'個のモデルを確認しました');}
});});
await refresh(true).catch(e=>notice(e.message,true));
