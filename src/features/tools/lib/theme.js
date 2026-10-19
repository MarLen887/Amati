// ¿La app está en modo oscuro? (preferencia manual de Amati o, si no hay, la del sistema)
export function isDark() {
  const manual = document.documentElement.dataset.theme;
  if (manual === 'dark') return true;
  if (manual === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

// Descarga un texto o un Blob como archivo
export function download(filename, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
