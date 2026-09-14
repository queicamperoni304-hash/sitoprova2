/* FitVais — service worker.
   Rete prima, ricaduta sulla cache: online vedi subito le modifiche, offline funziona lo stesso.
   Cambia VERSIONE a ogni pubblicazione: la cache vecchia si cancella. */

const VERSIONE = 'fitvais-1';

const RISORSE = [
  './',
  './index.html',
  './app.js',
  './stile.css',
  './manifest.webmanifest',
  './icona-192.png',
  './icona-512.png',
  './icona-maskable-512.png',
  'https://fonts.googleapis.com/css2?family=Anton&family=Chivo:wght@400;700&display=swap'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(VERSIONE).then(function (cache) {
      // Le risorse remote possono mancare: non devono far fallire l'installazione.
      return Promise.all(RISORSE.map(function (risorsa) {
        return cache.add(new Request(risorsa, { cache: 'reload' })).catch(function () { return null; });
      }));
    })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chiavi) {
      return Promise.all(chiavi.map(function (chiave) {
        return chiave === VERSIONE ? null : caches.delete(chiave);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (evento) {
  if (evento.data && evento.data.tipo === 'SALTA_ATTESA') self.skipWaiting();
});

self.addEventListener('fetch', function (evento) {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);

  // Le chiamate all'API di Anthropic non vanno mai in cache.
  if (url.hostname === 'api.anthropic.com') return;

  evento.respondWith(
    fetch(richiesta).then(function (risposta) {
      if (risposta && (risposta.ok || risposta.type === 'opaque')) {
        const copia = risposta.clone();
        caches.open(VERSIONE).then(function (cache) { cache.put(richiesta, copia); });
      }
      return risposta;
    }).catch(function () {
      return caches.match(richiesta).then(function (salvata) {
        if (salvata) return salvata;
        if (richiesta.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
