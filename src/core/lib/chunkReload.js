// Algunas pantallas (Agenda, herramientas, editor de apuntes) se descargan solo cuando se abren. Si el celular guardó
// archivos de una versión anterior, esa descarga falla y aparece «Algo no salió como esperábamos».
// Aquí se resuelve solo: primero se recarga, y si vuelve a fallar se borra la memoria sin conexión y se recarga otra vez.
const KEY = 'amati-chunk-reload';
const HARD_KEY = 'amati-chunk-hard-reset';

export const isChunkError = (err) => /dynamically imported module|importing a module script failed|ChunkLoadError|Loading chunk|Failed to fetch dynamically|valid JavaScript MIME type|Unexpected token '<'/i
  .test(`${err?.name || ''} ${err?.message || err || ''}`);

// Borra el service worker y los archivos guardados, y recarga para bajar todo limpio
export async function hardReset() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs || []).map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* sin soporte: basta con recargar */ }
  window.location.reload();
}

// Primera falla: recarga. Segunda en menos de un minuto: restablece la memoria sin conexión. Después no insiste.
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) {
      if (sessionStorage.getItem(HARD_KEY)) return false;
      sessionStorage.setItem(HARD_KEY, '1');
      hardReset();
      return true;
    }
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { return false; } // sin almacenamiento: no se recarga solo
  window.location.reload();
  return true;
}

export function installChunkReload() {
  // Vite avisa con este evento cuando falla la descarga de un archivo de la app
  window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });
}
