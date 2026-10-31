import { useSyncExternalStore } from 'react';

// Instalación de Amati como app (PWA).
// - En producción se registra un service worker mínimo (public/sw.js): hace posible instalar la app y muestra una
//   página «Sin conexión»; no guarda pantallas ni archivos. En desarrollo no se registra y se limpia cualquiera previo.
// - Se captura `beforeinstallprompt` desde el arranque (puede dispararse antes de que se abra el Perfil) para poder
//   mostrar un botón «Instalar» cuando el navegador lo permita (Chrome, Edge, Samsung Internet en Android y escritorio).
let deferred = null;
let installed = false;
let version = 0;
const listeners = new Set();
const notify = () => { version += 1; listeners.forEach((fn) => fn()); };

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Elimina service workers y cachés de versiones anteriores (se usa en desarrollo)
export function removeOldServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then(() => (window.caches ? caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('amati-')).map((k) => caches.delete(k)))) : null))
    .catch(() => {});
}

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; notify(); });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', notify);

  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}); });
  } else {
    removeOldServiceWorker();
  }
}

// Abre el cuadro de instalación del navegador. Devuelve 'accepted', 'dismissed' o 'unavailable'.
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  notify();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return 'unavailable';
  }
}

// Estado para la interfaz: puede instalarse con un clic, ya está instalada, o es iPhone/iPad (instalación manual)
export function useInstall() {
  useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => version, () => 0);
  return { canPrompt: Boolean(deferred), installed: installed || isStandalone(), ios: isIOS() };
}
