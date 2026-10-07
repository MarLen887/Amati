// Módulo de repetición espaciada
// Algoritmo tipo SM-2 simplificado con 3 respuestas: Difícil / Bien / Fácil.
// - Difícil: acorta el intervalo (mitad del actual, mínimo 1 día) y reduce la facilidad.
// - Bien:    2 días -> 3 días -> intervalo × facilidad.
// - Fácil:   extiende más el intervalo y aumenta la facilidad.

import { addDays, startOfDay } from './dates.js';

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL = 180; // días
export const MASTERED_INTERVAL = 21; // días a partir de los cuales una tarjeta se considera dominada

export const RATINGS = [
  { id: 'hard', label: 'Difícil', hint: 'Me costó recordarla' },
  { id: 'good', label: 'Bien', hint: 'La recordé con algo de esfuerzo' },
  { id: 'easy', label: 'Fácil', hint: 'La recordé sin problema' },
];

export function newCardFields(now = new Date()) {
  return {
    ease: START_EASE,
    interval: 0,
    reps: 0,
    lapses: 0,
    dueDate: now,
    lastReviewed: null,
  };
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round2 = (v) => Math.round(v * 100) / 100;

// Días completos entre hoy y la fecha de examen (0 = el examen es hoy)
export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  return Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
}

// Calcula el nuevo estado de una tarjeta a partir de la retroalimentación.
// Con fecha de examen, ningún repaso se programa después del día previo al examen.
export function schedule(card, rating, now = new Date(), { examDate = null } = {}) {
  let ease = card.ease ?? START_EASE;
  const interval = card.interval ?? 0;
  let reps = card.reps ?? 0;
  let lapses = card.lapses ?? 0;
  let next;

  if (rating === 'hard') {
    next = reps === 0 ? 1 : Math.max(1, Math.round(interval * 0.5));
    ease = clamp(ease - 0.2, MIN_EASE, MAX_EASE);
    if (interval >= 3) lapses += 1;
    reps = reps === 0 ? 1 : reps;
  } else if (rating === 'good') {
    if (reps === 0) next = 2;
    else if (reps === 1) next = 3;
    else next = Math.max(interval + 1, Math.round(interval * ease));
    reps += 1;
  } else if (rating === 'easy') {
    if (reps === 0) next = 4;
    else if (reps === 1) next = 6;
    else next = Math.max(interval + 2, Math.round(interval * ease * 1.3));
    ease = clamp(ease + 0.15, MIN_EASE, MAX_EASE);
    reps += 1;
  } else {
    throw new Error(`Calificación desconocida: ${rating}`);
  }

  next = Math.min(next, MAX_INTERVAL);
  const left = daysUntil(examDate, now);
  if (left !== null && left >= 2) next = Math.min(next, left - 1);
  return {
    ease: round2(ease),
    interval: next,
    reps,
    lapses,
    dueDate: addDays(startOfDay(now), next),
    lastReviewed: now,
  };
}

// Intervalos que resultarían de cada respuesta (para mostrarlos en los botones).
export function previewIntervals(card, now = new Date(), opts = {}) {
  return Object.fromEntries(RATINGS.map((r) => [r.id, schedule(card, r.id, now, opts).interval]));
}

export function cardStatus(card) {
  if (!card.lastReviewed && (card.reps ?? 0) === 0) return 'new';
  if ((card.interval ?? 0) >= MASTERED_INTERVAL) return 'mastered';
  return 'learning';
}

export function isDue(card, now = new Date()) {
  return card.dueDate && card.dueDate <= now;
}

export function formatInterval(days) {
  if (days < 1) return 'hoy';
  if (days === 1) return '1 día';
  if (days < 30) return `${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 mes' : `${months} meses`;
}

// ---------- Preparación para el examen ----------
// Una tarjeta está "lista" cuando ya se recordó bien al menos dos veces seguidas.
export function isExamReady(card) {
  return (card.reps ?? 0) >= 2 && (card.interval ?? 0) >= 3;
}

// Resumen tranquilo del avance hacia el examen de una materia.
export function examProgress(cards, examDate, now = new Date()) {
  const left = daysUntil(examDate, now);
  const total = cards.length;
  const ready = cards.filter(isExamReady).length;
  const remaining = total - ready;
  const studyDays = Math.max(1, left ?? 1);
  const perDay = Math.ceil(remaining / studyDays);
  let status = 'ok';
  if (total === 0) status = 'empty';
  else if (remaining === 0) status = 'ready';
  else if (perDay > 15) status = 'busy';
  return { left, total, ready, remaining, perDay, pct: total ? Math.round((ready / total) * 100) : 0, status };
}
