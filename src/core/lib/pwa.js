// Amati ya no usa service worker (modo sin conexión): causó errores al abrir pantallas en el celular y en la web.
// Esta función elimina el que haya quedado instalado en algún dispositivo y borra sus archivos guardados.
export function removeOldServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then(() => (window.caches ? caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('amati-')).map((k) => caches.delete(k)))) : null))
    .catch(() => {});
}
