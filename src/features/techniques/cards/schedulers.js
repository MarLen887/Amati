// Planificadores de repaso. Todos comparten los campos de la tarjeta (dueDate, interval, reps, ease, lapses)
// para que cambiar de técnica no pierda el avance; cada uno agrega sus propios campos:
//   SM-2 (srs)  -> ease
//   Leitner     -> box (1 a 5)
//   FSRS        -> stability, difficulty
import { addDays, startOfDay } from '../../../core/lib/dates.js';
import { formatInterval, MAX_EASE, MAX_INTERVAL, MIN_EASE, RATINGS, daysUntil, schedule as schedSm2, START_EASE } from './srs.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round2 = (v) => Math.round(v * 100) / 100;

// ---------- Leitner ----------
export const LEITNER_INTERVALS = [1, 3, 7, 14, 30]; // días de cada caja
export const LEITNER_BOXES = LEITNER_INTERVALS.length;

export function leitnerBox(card) {
  if (card.box >= 1 && card.box <= LEITNER_BOXES) return card.box;
  if (!card.lastReviewed && (card.reps ?? 0) === 0) return 1;
  const i = LEITNER_INTERVALS.findIndex((d) => d >= (card.interval ?? 0));
  return i === -1 ? LEITNER_BOXES : Math.max(1, i + 1);
}

function scheduleLeitner(card, rating, now = new Date(), { examDate = null } = {}) {
  const box = leitnerBox(card);
  const nextBox = rating === 'hard' ? 1 : clamp(box + (rating === 'easy' ? 2 : 1), 1, LEITNER_BOXES);
  let interval = LEITNER_INTERVALS[nextBox - 1];
  const left = daysUntil(examDate, now);
  if (left !== null && left >= 2) interval = Math.min(interval, left - 1);
  const interval0 = card.interval ?? 0;
  return {
    box: nextBox,
    ease: card.ease ?? START_EASE,
    interval,
    reps: rating === 'hard' ? Math.max(1, card.reps ?? 0) : (card.reps ?? 0) + 1,
    lapses: (card.lapses ?? 0) + (rating === 'hard' && interval0 >= 3 ? 1 : 0),
    dueDate: addDays(startOfDay(now), interval),
    lastReviewed: now,
  };
}

// ---------- FSRS (v4.5, parámetros por defecto) ----------
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const FACTOR = 19 / 81;
const TARGET_RETENTION = 0.9;
// Nuestro "Difícil" cuenta como olvido (Again); Bien = Good; Fácil = Easy.
const GRADE = { hard: 1, good: 3, easy: 4 };

const retrievability = (t, s) => Math.pow(1 + (FACTOR * t) / s, -0.5);
const clampD = (d) => clamp(d, 1, 10);

function fsrsState(card, now) {
  if (card.stability > 0 && card.difficulty > 0) return { s: card.stability, d: card.difficulty };
  if ((card.reps ?? 0) > 0 || card.lastReviewed) {
    // Tarjeta que venía de otra técnica: se deduce un estado inicial razonable
    const ease = card.ease ?? START_EASE;
    return { s: Math.max(1, card.interval ?? 1), d: clampD(10 - ((ease - MIN_EASE) / (MAX_EASE - MIN_EASE)) * 7) };
  }
  return null;
}

function scheduleFsrs(card, rating, now = new Date(), { examDate = null } = {}) {
  const g = GRADE[rating];
  const prev = fsrsState(card, now);
  let s;
  let d;
  let lapses = card.lapses ?? 0;
  if (!prev) {
    s = W[g - 1];
    d = clampD(W[4] - (g - 3) * W[5]);
  } else {
    const t = card.lastReviewed ? Math.max(0, (startOfDay(now) - startOfDay(card.lastReviewed)) / 86_400_000) : 0;
    const r = retrievability(t, prev.s);
    d = clampD(W[7] * W[4] + (1 - W[7]) * (prev.d - W[6] * (g - 3)));
    if (g === 1) {
      s = W[11] * Math.pow(prev.d, -W[12]) * (Math.pow(prev.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
      s = Math.min(s, prev.s);
      lapses += 1;
    } else {
      const bonus = g === 4 ? W[16] : 1;
      s = prev.s * (1 + Math.exp(W[8]) * (11 - prev.d) * Math.pow(prev.s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * bonus);
    }
  }
  s = Math.max(0.1, s);
  let interval = clamp(Math.round((s / FACTOR) * (Math.pow(TARGET_RETENTION, -2) - 1)), 1, MAX_INTERVAL);
  const left = daysUntil(examDate, now);
  if (left !== null && left >= 2) interval = Math.min(interval, left - 1);
  return {
    stability: round2(s),
    difficulty: round2(d),
    ease: card.ease ?? START_EASE,
    interval,
    reps: g === 1 ? Math.max(1, card.reps ?? 0) : (card.reps ?? 0) + 1,
    lapses,
    dueDate: addDays(startOfDay(now), interval),
    lastReviewed: now,
  };
}

// ---------- API ----------
const LABELS_DEFAULT = Object.fromEntries(RATINGS.map((r) => [r.id, { label: r.label, hint: r.hint }]));

const SCHEDULERS = {
  srs: { schedule: schedSm2, labels: LABELS_DEFAULT },
  recall: { schedule: schedSm2, labels: LABELS_DEFAULT },
  interleaved: { schedule: schedSm2, labels: LABELS_DEFAULT },
  elaborative: { schedule: schedSm2, labels: LABELS_DEFAULT },
  leitner: {
    schedule: scheduleLeitner,
    labels: {
      hard: { label: 'No la sabía', hint: 'Vuelve a la caja 1' },
      good: { label: 'La sabía', hint: 'Pasa a la siguiente caja' },
      easy: { label: 'Muy fácil', hint: 'Salta dos cajas' },
    },
    previewText: (next) => `Caja ${next.box}`,
  },
  fsrs: {
    schedule: scheduleFsrs,
    labels: {
      hard: { label: 'Otra vez', hint: 'No la recordé: la veré pronto' },
      good: { label: 'Bien', hint: 'La recordé' },
      easy: { label: 'Fácil', hint: 'La recordé sin esfuerzo' },
    },
  },
};

export function getScheduler(technique) {
  const s = SCHEDULERS[technique] || SCHEDULERS.srs;
  return {
    ...s,
    preview(card, now = new Date(), opts = {}) {
      return Object.fromEntries(
        RATINGS.map((r) => {
          const next = s.schedule(card, r.id, now, opts);
          return [r.id, s.previewText ? s.previewText(next) : formatInterval(next.interval)];
        }),
      );
    },
  };
}
