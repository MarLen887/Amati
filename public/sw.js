/* Service worker mínimo de Amati: hace posible instalar la app y muestra una página amable si abres Amati sin internet.
   A propósito NO guarda en memoria las pantallas ni los archivos de la app (eso causó errores en versiones anteriores):
   solo guarda la página «Sin conexión». Todo lo demás va directo a la red. El modo sin conexión completo llegará después. */
const CACHE = 'amati-shell-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(new Request(OFFLINE, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borra lo que dejaron versiones anteriores del service worker
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('amati-') && k !== CACHE).map((k) => caches.delete(k)));
    } catch (e) { /* nada */ }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // solo al abrir una página; los archivos no se interceptan
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })),
  );
});
