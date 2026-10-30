/* Service worker de limpieza. Amati ya no usa modo sin conexión.
   Los dispositivos que instalaron la versión anterior reciben este archivo, que borra los archivos guardados,
   se desinstala y recarga la página una vez. No intercepta ninguna petición: todo va directo a la red. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (e) { /* nada */ }
    try { await self.registration.unregister(); } catch (e) { /* nada */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    } catch (e) { /* nada */ }
  })());
});
