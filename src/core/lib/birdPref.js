import { useSyncExternalStore } from 'react';

// Preferencia (por dispositivo) para mostrar el colibrí que se mueve por la pantalla.
const KEY = 'amati-bird';
const listeners = new Set();

const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };

export function setBirdEnabled(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
  listeners.forEach((fn) => fn());
}

export function useBirdEnabled() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    read,
    () => true,
  );
}
