export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Clave de día local "AAAA-MM-DD"
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

const shortFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const weekdayFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });

export const fmtShort = (d) => shortFmt.format(d);
export const fmtLong = (d) => longFmt.format(d);
export const fmtWeekday = (d) => weekdayFmt.format(d);
