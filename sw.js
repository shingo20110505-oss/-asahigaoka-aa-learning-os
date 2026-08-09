'use strict';

const VERSION = '2.2.1';
const CACHE_NAME = `asahigaoka-aa-os-${VERSION}`;
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
  new URL('chronologia.html', BASE).href,
  new URL('icons/favicon-32.png', BASE).href,
  new URL('icons/apple-touch-icon-180.png', BASE).href,
  new URL('icons/icon-192.png', BASE).href,
  new URL('icons/icon-512.png', BASE).href,
  new URL('icons/icon-maskable-512.png', BASE).href
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      const response = await fetch(url, {cache: 'reload'});
      if (!response.ok) throw new Error(`Precache failed: ${url}`);
      await cache.put(url, response);
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('asahigaoka-aa-os-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match(APP_URL)) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  if (!url.href.startsWith(BASE)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response('', {status: 504, statusText: 'Offline'});
    }
  })());
});
