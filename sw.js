'use strict';
// difficulty1 compatibility marker; current release uses difficulty2 + challenge1.

const VERSION = '2.2.9';
const CACHE_NAME = `asahigaoka-aa-os-${VERSION}-companion750-loginzip1-analytics1-prodtest1-examples2-quality1-readingnatural3-settingsguard2-chrono1000-v24content1-quotes1-storage1-difficulty2-challenge1-glosstap1-answeraudio33-chronodeep3`;
const BASE = self.registration.scope;
const APP_URL = new URL('./', BASE).href;
const OFFLINE_URL = new URL('offline.html', BASE).href;
const APP_SHELL = [
  APP_URL,
  new URL('index.html', BASE).href,
  new URL('offline.html', BASE).href,
  new URL('manifest.webmanifest', BASE).href,
  new URL('learning-engine-v15.js', BASE).href,
  new URL('curriculum-v2-data.js', BASE).href,
  new URL('learning-engine-v2.js', BASE).href,
  new URL('learning-engine-v22.js', BASE).href,
  new URL('learning-engine-v22.css', BASE).href,
  new URL('japanese-vocabulary-10000.js', BASE).href,
  new URL('japanese-public-domain.js', BASE).href,
  new URL('chronologia.html', BASE).href,
  new URL('chronologia-live-companion.js', BASE).href,
  new URL('chronologia-daily-companion.js', BASE).href,
  new URL('chronologia-deep-explanations-v3.js', BASE).href,
  new URL('chronologia-deep-polish-v1.js', BASE).href,
  new URL('chronologia-v7-runtime.js', BASE).href,
  new URL('chronologia-v7-data-1.js', BASE).href,
  new URL('chronologia-v7-data-2a.js', BASE).href,
  new URL('chronologia-v7-data-2b.js', BASE).href,
  new URL('chronologia-v7-data-3.js', BASE).href,
  new URL('chronologia-v7-data-4.js', BASE).href,
  new URL('chronologia-v7-overrides.js', BASE).href,
  new URL('aa-companion-v2.js', BASE).href,
  new URL('storage-resilience-v1.js', BASE).href,
  new URL('reading-gloss-tap-v1.js', BASE).href,
  new URL('answer-feedback-audio-v1.js', BASE).href,
  new URL('aa-companion-mobile-fix.js', BASE).href,
  new URL('companion-settings-only-guard-v1.js', BASE).href,
  new URL('voice-selftest-v1.js', BASE).href,
  new URL('companion7-runtime.js', BASE).href,
  new URL('login-companion-v1.js', BASE).href,
  new URL('analytics-daily-v1.js', BASE).href,
  new URL('login-production-test-v1.js', BASE).href,
  new URL('companion7-check.js', BASE).href,
  new URL('v23-loader.js', BASE).href,
  new URL('v23-core.js', BASE).href,
  new URL('v23-japanese.js', BASE).href,
  new URL('v23-math.js', BASE).href,
  new URL('v23-science.js', BASE).href,
  new URL('v23-social.js', BASE).href,
  new URL('v23-english-gloss1.js', BASE).href,
  new URL('v23-english-gloss2.js', BASE).href,
  new URL('v23-english-gloss3.js', BASE).href,
  new URL('v23-english-gloss-vocab.js', BASE).href,
  new URL('v23-english-main.js', BASE).href,
  new URL('curriculum-expansion-v24.js', BASE).href,
  new URL('source-quote-bank-v1.js', BASE).href,
  new URL('difficulty-challenge-v1.js', BASE).href,
  new URL('reading-natural-v2.js', BASE).href,
  new URL('reading-natural-v3.js', BASE).href,
  new URL('learning-engine-v23.js', BASE).href,
  new URL('explanation-examples-v2.js', BASE).href,
  new URL('question-quality-v1.js', BASE).href,
  new URL('difficulty-engine-v1.js', BASE).href,
  new URL('v23-pet-settings.js', BASE).href,
  new URL('v23-compat-audit.js', BASE).href,
  new URL('icons/favicon-32.png', BASE).href,
  new URL('icons/apple-touch-icon-180.png', BASE).href,
  new URL('icons/icon-192.png', BASE).href,
  new URL('icons/icon-512.png', BASE).href,
  new URL('icons/icon-maskable-512.png', BASE).href
];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await Promise.all(APP_SHELL.map(async url=>{const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error(`Precache failed: ${url}`);await cache.put(url,response)}));await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('asahigaoka-aa-os-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}return response}catch(_){return(await caches.match(request))||(await caches.match(APP_URL))||(await caches.match(OFFLINE_URL))}})());return}if(!url.href.startsWith(BASE))return;const fresh=/\/(aa-companion-v2|storage-resilience-v1|reading-gloss-tap-v1|answer-feedback-audio-v1|aa-companion-mobile-fix|companion-settings-only-guard-v1|voice-selftest-v1|companion7-runtime|login-companion-v1|analytics-daily-v1|login-production-test-v1|curriculum-expansion-v24|source-quote-bank-v1|difficulty-challenge-v1|reading-natural-v2|reading-natural-v3|explanation-examples-v2|question-quality-v1|difficulty-engine-v1|companion7-check|chronologia-live-companion|chronologia-deep-explanations-v3|chronologia-deep-polish-v1|chronologia-v7-runtime|chronologia-v7-data-1|chronologia-v7-data-2a|chronologia-v7-data-2b|chronologia-v7-data-3|chronologia-v7-data-4|chronologia-v7-overrides|v23-loader|v23-pet-settings|v23-compat-audit)\.js$/.test(url.pathname);event.respondWith((async()=>{if(fresh){try{const response=await fetch(request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}return response}catch(_){return(await caches.match(request))||new Response('',{status:504,statusText:'Offline'})}}const cached=await caches.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone())}return response}catch(_){return new Response('',{status:504,statusText:'Offline'})}})())});