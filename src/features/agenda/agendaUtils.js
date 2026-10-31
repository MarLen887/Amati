import { addDays, dayKey, startOfDay } from '../../core/lib/dates.js';

// Utilidades puras de la Agenda (sin Firebase ni React): fechas, repeticiones, huecos libres y distribución en pantalla.
// Los horarios se guardan como minutos desde medianoche (startMin / endMin) y los días de la semana como getDay(): 0 = domingo.

export const STUDY_MIN = 30; // duración de un bloque de estudio
export const DAY_START = 7 * 60; // desde cuándo se buscan huecos
export const DAY_END = 22 * 60; // hasta cuándo
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // la semana empieza en lunes

export const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[2]) < 60 && v >= 0 && v <= 1440 ? v : null;
}

export const minutesOfDate = (d) => d.getHours() * 60 + d.getMinutes();

// Lunes de la semana de `d` (a medianoche)
export function weekStart(d = new Date()) {
  const x = startOfDay(d);
  const back = (x.getDay() + 6) % 7;
  return addDays(x, -back);
}

// Ocurrencias de los eventos en un día concreto: los semanales por día de la semana y los de una sola vez por fecha
export function occurrencesOn(events, date) {
  const key = dayKey(date);
  const dow = date.getDay();
  return events
    .filter((e) => (e.recur === 'weekly' ? (e.days || []).includes(dow) : e.date === key))
    .map((e) => ({ ...e, occDate: key }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

const isStudy = (e) => e.kind === 'study';
const countsAsBusy = (e) => !(isStudy(e) && e.status === 'skipped');

// Huecos libres del día (>= minLen) entre DAY_START y DAY_END. `buffer` deja un respiro alrededor de clases y actividades.
// Para hoy, `fromMin` evita proponer horas que ya pasaron.
export function freeWindows(occ, { dayStart = DAY_START, dayEnd = DAY_END, minLen = STUDY_MIN, buffer = 10, fromMin = 0 } = {}) {
  const busy = occ
    .filter(countsAsBusy)
    .map((e) => ({ s: Math.max(0, e.startMin - (isStudy(e) ? 0 : buffer)), e: Math.min(1440, e.endMin + (isStudy(e) ? 0 : buffer)) }))
    .sort((a, b) => a.s - b.s);
  const merged = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e);
    else merged.push({ ...b });
  }
  const out = [];
  let cursor = Math.max(dayStart, fromMin);
  for (const b of merged) {
    if (b.s - cursor >= minLen) out.push({ s: cursor, e: Math.min(b.s, dayEnd) });
    cursor = Math.max(cursor, b.e);
  }
  if (dayEnd - cursor >= minLen) out.push({ s: cursor, e: dayEnd });
  return out.filter((w) => w.e - w.s >= minLen);
}

// Horas de inicio posibles (en :00 o :30) para un bloque de `len` minutos dentro de un hueco
export function slotStarts(win, len = STUDY_MIN, step = 30) {
  const out = [];
  for (let s = Math.ceil(win.s / step) * step; s + len <= win.e; s += step) out.push(s);
  return out;
}

export const slotFits = (windows, start, len = STUDY_MIN) => windows.some((w) => start >= w.s && start + len <= w.e);

// Mejor hora para estudiar en un día: tarde-noche temprana, de preferencia justo después de una clase o actividad
export function bestSlot(occ, windows, len = STUDY_MIN) {
  const ends = occ.filter(countsAsBusy).map((e) => e.endMin);
  let best = null;
  for (const w of windows) {
    for (const s of slotStarts(w, len)) {
      let score = -Math.abs(s - 17.5 * 60) / 60 * 1.5; // ideal alrededor de las 17:30
      if (ends.some((e) => s >= e && s - e <= 60)) score += 3; // aprovecha lo visto en clase
      if (s < 8 * 60 || s + len > 21.5 * 60) score -= 5;
      if (!best || score > best.score) best = { start: s, score, afterEvent: ends.some((e) => s >= e && s - e <= 60) };
    }
  }
  return best;
}

// Los próximos `count` días en que se busca tiempo de estudio: de lunes a viernes, salvo que se pidan también los fines de semana
export function studyDates(now = new Date(), { count = 7, weekends = false } = {}) {
  const out = [];
  for (let i = 0; out.length < count && i < 28; i++) {
    const d = addDays(startOfDay(now), i);
    if (weekends || (d.getDay() !== 0 && d.getDay() !== 6)) out.push(d);
  }
  return out;
}

// Propuesta automática (sin IA): hasta `perDay` opciones por día con hueco (horas distintas, separadas), saltando
// los días que ya tienen un bloque de estudio
export function proposeAuto(events, dates, now = new Date(), { perDay = 1 } = {}) {
  const todayKey = dayKey(now);
  const out = [];
  for (const d of dates) {
    const key = dayKey(d);
    const occ = occurrencesOn(events, d);
    if (occ.some((e) => isStudy(e) && e.status !== 'skipped')) continue;
    const fromMin = key === todayKey ? Math.ceil((minutesOfDate(now) + 15) / 30) * 30 : 0;
    let working = occ;
    const picks = [];
    for (let i = 0; i < perDay; i++) {
      const pick = bestSlot(working, freeWindows(working, { fromMin }));
      if (!pick) break;
      picks.push(pick);
      // la opción elegida cuenta como ocupada (con margen) para que la siguiente quede en otra hora
      working = [...working, { kind: 'activity', startMin: pick.start - 20, endMin: pick.start + STUDY_MIN + 20 }];
    }
    picks.sort((a, b) => a.start - b.start).forEach((pick, i) => {
      out.push({
        date: key, startMin: pick.start, endMin: pick.start + STUDY_MIN, source: 'auto',
        reason: pick.afterEvent ? 'Justo después de tu clase o actividad' : i > 0 ? 'Otra opción en tu día' : 'Un hueco libre en tu día',
      });
    });
  }
  return out;
}

// Reparte eventos que se traslapan en columnas para dibujarlos lado a lado
export function layoutColumns(occ) {
  const items = occ.map((e) => ({ e, col: 0, cols: 1 }));
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = [];
    for (const it of cluster) {
      let c = cols.findIndex((end) => end <= it.e.startMin);
      if (c === -1) { c = cols.length; cols.push(0); }
      cols[c] = it.e.endMin;
      it.col = c;
    }
    cluster.forEach((it) => { it.cols = cols.length; });
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.e.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.e.endMin);
    if (cluster.length === 1) clusterEnd = it.e.endMin;
  }
  if (cluster.length) flush();
  return items;
}
