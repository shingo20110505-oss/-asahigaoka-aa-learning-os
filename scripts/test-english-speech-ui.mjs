// Browser integration for dictionary/reader controls. Synthesis events are mocked;
// this verifies UI and lifecycle behavior, not audible output on a physical device.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {app,close} from './workspace-fixture.mjs';

const {chromium}=await import(process.env.RISE_PLAYWRIGHT_MODULE?pathToFileURL(process.env.RISE_PLAYWRIGHT_MODULE).href:'playwright');
const results=path.resolve('test-results/english-speech');
await fs.mkdir(results,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.RISE_BROWSER_EXECUTABLE?{executablePath:process.env.RISE_BROWSER_EXECUTABLE}:process.env.RISE_USE_CHROME?{channel:'chrome'}:{})});
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addInitScript(()=>{
  const localUS={voiceURI:'fixture-local-en-us',name:'Local English US',lang:'en-US',localService:true,default:true};
  const localGB={voiceURI:'fixture-local-en-gb',name:'Local English GB',lang:'en-GB',localService:true,default:false};
  const remote={voiceURI:'fixture-remote-en-us',name:'Remote English',lang:'en-US',localService:false,default:false};
  const japanese={voiceURI:'fixture-local-ja',name:'Local Japanese',lang:'ja-JP',localService:true,default:false};
  let voices=[remote,japanese,localUS,localGB],current=null;
  const listeners=new Map(),calls=[];
  class Utterance {constructor(text){this.text=text;this.rate=1;this.lang='';this.voice=null;}}
  const synth={
    speaking:false,pending:false,paused:false,
    getVoices:()=>[...voices],
    addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);},
    removeEventListener(type,listener){listeners.get(type)?.delete(listener);},
    speak(utterance){
      current=utterance;this.speaking=true;
      calls.push({text:utterance.text,rate:utterance.rate,voiceURI:utterance.voice?.voiceURI,localService:utterance.voice?.localService});
      queueMicrotask(()=>{if(current===utterance&&!this.paused&&!utterance.__started){utterance.__started=true;utterance.onstart?.({type:'start',utterance});}});
    },
    cancel(){
      const canceled=current;current=null;this.speaking=false;this.pending=false;
      // Retain paused to exercise engines where cancel does not clear that flag.
      queueMicrotask(()=>canceled?.onerror?.({type:'error',error:'canceled',utterance:canceled}));
    },
    pause(){if(current){this.paused=true;current.onpause?.({type:'pause',utterance:current});}},
    resume(){
      const wasPaused=this.paused;this.paused=false;
      if(wasPaused&&current){if(current.__started)current.onresume?.({type:'resume',utterance:current});else{current.__started=true;current.onstart?.({type:'start',utterance:current});}}
    }
  };
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
  window.__speechFixture={
    calls,
    setVoiceMode(mode){voices=mode==='empty'?[]:mode==='remote'?[remote,japanese]:mode==='us'?[localUS]:[remote,japanese,localUS,localGB];for(const listener of listeners.get('voiceschanged')||[])listener({type:'voiceschanged'});synth.onvoiceschanged?.({type:'voiceschanged'});},
    finish(){const ended=current;current=null;synth.speaking=false;ended?.onend?.({type:'end',utterance:ended});},
    fail(error='synthesis-failed'){const failed=current;current=null;synth.speaking=false;failed?.onerror?.({type:'error',error,utterance:failed});},
    get snapshot(){return {speaking:synth.speaking,paused:synth.paused,current:current?.text||null,calls:[...calls]};}
  };
});
const page=await context.newPage(),errors=[],checks=[];
page.setDefaultTimeout(30000);
page.on('pageerror',error=>errors.push(error.message));
const go=async route=>{await page.goto(app.url+'/#/'+route);await page.locator('#main>.loading').waitFor({state:'hidden'});};
const route=async route=>{await page.evaluate(route=>{location.hash='#/'+route;},route);};
const snapshot=()=>page.evaluate(()=>window.__speechFixture.snapshot);
const state=()=>page.evaluate(async()=>{const {Store}=await import('./src/store.mjs');const store=new Store();await store.open();const value=structuredClone(store.state);store.db.close();store.channel?.close();return value;});
const openAudio=async()=>{await page.locator('[data-audio="rate"]').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});};
const search=async text=>{await page.locator('[data-search]').fill(text);await page.waitForFunction(text=>document.querySelector('[data-search]')?.value===text&&document.querySelector('.english-word-toggle strong')?.textContent.toLowerCase()===text.toLowerCase(),text);};
const waitSpeaking=()=>page.waitForFunction(()=>window.__speechFixture.snapshot.speaking&&!window.__speechFixture.snapshot.paused);
const stopDictionary=async()=>{const button=page.locator('[data-action="audio-stop"]');if(await button.isEnabled())await button.click();};
const noOverflow=async(label)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+label);
const screenshot=async name=>page.screenshot({path:path.join(results,name+'.png'),fullPage:false});

try{
  await go('english-words?q=go');
  await page.locator('.english-word-toggle').first().waitFor();
  assert.equal((await page.locator('.english-word-toggle strong').first().innerText()).toLowerCase(),'go');
  const goID=await page.locator('.english-word-toggle').first().getAttribute('data-id');
  const previous={repetitions:4,lapses:2,interval:3,due:123456789,rating:'hard',legacySeen:17};
  await page.evaluate(async({goID,previous})=>{
    const {Store}=await import('./src/store.mjs');const store=new Store();await store.open();
    await store.change(s=>{s.vocabulary[goID]={...previous};s.review['speech-ui-existing']={repetitions:7,due:987654321};s.settings.speechRate=.75;s.settings.readerSpeechRate=.6;s.settings.speechVoiceURI='fixture-local-en-gb';});
    store.db.close();store.channel?.close();
  },{goID,previous});
  await page.reload();await page.locator('.english-word-toggle').first().waitFor();
  await page.locator(`[data-action="favorite"][data-id="${goID}"]`).click();
  await page.waitForFunction(id=>document.querySelector(`[data-action="favorite"][data-id="${id}"]`)?.getAttribute('aria-pressed')==='true',goID);
  let saved=await state();
  assert.deepEqual(saved.vocabulary[goID],{...previous,favorite:true});
  assert.deepEqual(saved.review['speech-ui-existing'],{repetitions:7,due:987654321});
  await page.locator('[data-toggle="favoriteOnly"]').check();
  assert.equal(await page.locator('.english-word-toggle').count(),1);
  await page.locator('[data-toggle="favoriteOnly"]').uncheck();
  checks.push('exact headword search and favorites preserve review history');

  await openAudio();
  const voice=page.locator('[data-audio="voiceURI"]');
  assert.equal(await voice.inputValue(),'fixture-local-en-gb');
  const voiceOptions=await voice.locator('option').allTextContents();
  assert.ok(voiceOptions.some(text=>text.includes('Local English GB')));
  assert.ok(!voiceOptions.some(text=>text.includes('Remote English')||text.includes('Local Japanese')));
  assert.equal(await page.locator('[data-audio="rate"]').inputValue(),'0.75');
  await page.locator('[data-audio="repeat"]').selectOption('2');
  await search('school');
  await page.locator('.english-word-toggle').first().click();
  const readWord=page.locator('[data-action="speak"][data-text="school"]').first();
  const countBefore=(await snapshot()).calls.length;
  await readWord.click();await waitSpeaking();
  let playing=await snapshot();
  assert.deepEqual(playing.calls.at(-1),{text:'school',rate:.75,voiceURI:'fixture-local-en-gb',localService:true});
  await page.evaluate(()=>window.__speechFixture.finish());
  await page.waitForFunction(n=>window.__speechFixture.calls.length===n+2,countBefore);
  await page.evaluate(()=>window.__speechFixture.finish());
  await page.waitForFunction(()=>/完了/.test(document.querySelector('#english-audio-status')?.textContent||''));
  checks.push('local English voice selection, shared saved rate and word repeat');

  await page.locator('[data-audio="repeat"]').selectOption('1');
  await readWord.click();await waitSpeaking();
  await page.locator('[data-action="audio-pause"]').click();
  assert.equal((await snapshot()).paused,true);
  await stopDictionary();
  await readWord.click();await waitSpeaking();
  assert.equal((await snapshot()).paused,false);
  await stopDictionary();
  const example=page.locator('[data-action="speak-example"]').first(),exampleText=await example.getAttribute('data-text');
  await example.click();await waitSpeaking();
  assert.equal((await snapshot()).calls.at(-1).text,exampleText);
  await stopDictionary();
  await page.locator('[data-action="listen-page"]').click();await waitSpeaking();await stopDictionary();
  checks.push('pause-stop-new playback recovers, examples and visible-list playback use controller');

  await page.locator('[data-search]').fill('');
  await page.locator('[data-select="stage"]').selectOption('basic');
  await page.locator('[data-pref="studySize"]').selectOption('20');
  await page.locator('[data-action="start"]').click();
  assert.match(await page.locator('.session-bar').innerText(),/1\s*\/\s*20/);
  await page.locator('[data-action="flip"]').click();
  await page.locator('[data-action="rate"][data-rating="good"]').waitFor();
  await page.locator('[data-action="end"]').click();
  await openAudio();
  await page.locator('[data-audio="rate"]').selectOption('1.15');
  await noOverflow('dictionary desktop');
  await page.setViewportSize({width:390,height:844});
  await noOverflow('dictionary phone');await screenshot('dictionary-phone');
  checks.push('20-word study session and responsive dictionary controls');

  await page.locator('[data-action="audio-test"]').click();await waitSpeaking();
  await page.locator('[data-action="audio-pause"]').click();
  await route('reading/rv3-000001');
  await page.locator('.reader h1').waitFor();
  assert.equal((await snapshot()).speaking,false);
  await page.locator('#reader-extra summary').click();
  assert.equal(await page.locator('[name="speechRate"]').inputValue(),'1.15');
  assert.equal(await page.locator('[name="speechVoiceURI"]').inputValue(),'fixture-local-en-gb');
  await page.locator('[data-action="speak-paragraph"]').first().click();await waitSpeaking();
  assert.equal((await snapshot()).calls.at(-1).rate,1.15);
  await page.locator('[data-action="pause-speech"]').click();
  assert.equal((await snapshot()).paused,true);
  await page.locator('[data-action="stop-speech"]').click();
  await page.locator('[data-action="speak"]').click();await waitSpeaking();
  assert.equal((await snapshot()).paused,false);
  await page.locator('[data-action="stop-speech"]').click();
  await page.locator('[data-action="test-speech"]').click();await waitSpeaking();
  assert.match((await snapshot()).calls.at(-1).text,/RISE/);
  await page.locator('[data-action="stop-speech"]').click();
  await page.locator('#reader-extra summary').click();
  assert.ok(await page.locator('#reading-audio-status').isVisible());
  const token=page.locator('.reader-word').first(),tokenText=await token.innerText();
  await token.click();await page.locator('[data-action="lookup-speak"]').click();await waitSpeaking();
  assert.equal((await snapshot()).calls.at(-1).text,tokenText);
  await page.locator('[data-action="lookup-close"]').click();
  await noOverflow('reader phone');await screenshot('reader-phone');
  checks.push('reader paragraphs, full text, test and word lookup share voice/settings; status stays visible');

  await context.setOffline(true);
  await route('english-words?q=go');
  await page.locator('#english-results').waitFor();
  assert.equal((await snapshot()).speaking,false);
  await openAudio();
  await page.locator('[data-action="audio-test"]').click();await waitSpeaking();
  await stopDictionary();
  saved=await state();
  assert.equal(saved.settings.speechRate,1.15);
  assert.equal(saved.vocabulary[goID].favorite,true);
  assert.deepEqual(saved.review['speech-ui-existing'],{repetitions:7,due:987654321});
  await context.setOffline(false);
  checks.push('cached route switching stops prior speech and retains local settings/history offline');

  await page.evaluate(()=>window.__speechFixture.setVoiceMode('empty'));
  await page.waitForFunction(()=>![...document.querySelectorAll('[data-audio="voiceURI"] option')].some(option=>option.value==='fixture-local-en-us'));
  const delayedCalls=(await snapshot()).calls.length;
  await page.locator('[data-action="audio-test"]').click();
  assert.equal((await snapshot()).calls.length,delayedCalls);
  await page.evaluate(()=>window.__speechFixture.setVoiceMode('ready'));
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-audio="voiceURI"] option')].some(option=>option.value==='fixture-local-en-us'));
  await page.locator('[data-action="audio-test"]').click();await waitSpeaking();await stopDictionary();
  await page.evaluate(()=>window.__speechFixture.setVoiceMode('us'));
  assert.match(await voice.locator('option:checked').innerText(),/利用できません/);
  const missingCalls=(await snapshot()).calls.length;
  await page.locator('[data-action="audio-test"]').click();
  assert.equal((await snapshot()).calls.length,missingCalls);
  await voice.selectOption('');
  await page.locator('[data-action="audio-test"]').click();await waitSpeaking();
  assert.equal((await snapshot()).calls.at(-1).voiceURI,'fixture-local-en-us');
  await page.evaluate(()=>window.__speechFixture.fail('synthesis-failed'));
  assert.equal(await page.locator('#english-audio-status').getAttribute('data-status'),'error');
  assert.match(await page.locator('#english-audio-status').innerText(),/再生できません/);
  assert.ok(await page.locator('#toast.visible').isVisible());
  checks.push('late voices can be retried, missing saved voice is explicit, synthesis errors are visible');

  assert.ok((await snapshot()).calls.every(call=>call.localService===true),'every utterance must explicitly use a local voice');
  assert.deepEqual(errors,[]);
  const result={ok:true,checks,speech:'mock synthesis events; physical-device audio not asserted',screenshots:results};
  await fs.writeFile(path.join(results,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}catch(error){
  await page.screenshot({path:path.join(results,'failure.png')}).catch(()=>{});
  console.error(JSON.stringify({checks,errors,speech:await snapshot().catch(()=>null)}));
  console.error(await page.locator('body').innerText().catch(()=>''));
  throw error;
}finally{await browser.close();await close();}
