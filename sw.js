/* Editor C, de Diego Segurotti (ArtPrograms Studio). Uso libre dentro de este sitio, sin fines comerciales. Prohibido copiar, redistribuir o vender sin permiso. PolyForm Strict License 1.0.0. */
// Service worker de Editor C. build.js completa la versión (hash del contenido) y la lista de archivos.
// Primera visita: precachea todo. Después sirve desde la caché (sin conexión). Una versión nueva queda
// "en espera" hasta que la persona acepta recargar (la página manda SKIP_WAITING).
'use strict';
const VERSION = '236360c5ddc6';
const CACHE = 'editor-c-' + VERSION;
const FILES = ["./","index.html","manifest.webmanifest","assets/styles.css","assets/compiler.js","assets/runtime.js","assets/examples.js","assets/app.js","assets/SourceCodePro.ttf","assets/kb-data.js","assets/config.js","assets/kb.js","assets/compartir.js","assets/nombres.js","assets/favicon.svg","assets/favicon-32.png","assets/favicon.ico","assets/icon-192.png","assets/icon-512.png","assets/icon-maskable-512.png","assets/apple-touch-icon.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^editor-c-/.test(k) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
  else if (e.data && e.data.type === 'VERSION' && e.source) e.source.postMessage({ type: 'VERSION', version: VERSION });
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const idx = await c.match(new URL('index.html', self.registration.scope).href); if (idx) return idx; }
    return fetch(req);
  }));
});
