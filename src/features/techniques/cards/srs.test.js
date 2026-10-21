// Pruebas del repaso espaciado. Se ejecutan con `npm test` (usa el ejecutor de pruebas de Node, sin instalar nada).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTERED_INTERVAL, MAX_EASE, MAX_INTERVAL, MIN_EASE, START_EASE,
  cardStatus, daysUntil, examProgress, formatInterval, isDue, isExamReady, newCardFields, previewIntervals, schedule,
} from './srs.js';

const NOW = new Date(2026, 9, 20, 15, 30); // 20 oct 2026, a media tarde
const day = (n) => new Date(2026, 9, 20 + n);

test('una tarjeta nueva empieza sin repasos y vence hoy', () => {
  const c = newCardFields(NOW);
  assert.equal(c.ease, START_EASE);
  assert.equal(c.interval, 0);
  assert.equal(c.reps, 0);
  assert.equal(cardStatus(c), 'new');
  assert.ok(isDue(c, NOW));
});

test('«Bien» sigue la secuencia 2 → 3 días → intervalo × facilidad', () => {
  let c = newCardFields(NOW);
  c = { ...c, ...schedule(c, 'good', NOW) };
  assert.equal(c.interval, 2);
  c = { ...c, ...schedule(c, 'good', NOW) };
  assert.equal(c.interval, 3);
  c = { ...c, ...schedule(c, 'good', NOW) };
  assert.equal(c.interval, Math.round(3 * START_EASE)); // 8
  assert.equal(c.reps, 3);
});

test('«Fácil» programa más lejos que «Bien» y sube la facilidad', () => {
  const c = { ...newCardFields(NOW), interval: 10, reps: 4, ease: 2.5 };
  const good = schedule(c, 'good', NOW);
  const easy = schedule(c, 'easy', NOW);
  assert.ok(easy.interval > good.interval);
  assert.ok(easy.ease > c.ease);
});

test('«Difícil» acorta el intervalo, baja la facilidad y cuenta un lapso si ya estaba aprendida', () => {
  const c = { ...newCardFields(NOW), interval: 10, reps: 4, ease: 2.5, lapses: 0 };
  const r = schedule(c, 'hard', NOW);
  assert.equal(r.interval, 5);
  assert.equal(r.ease, 2.3);
  assert.equal(r.lapses, 1);
});

test('«Difícil» nunca programa a menos de 1 día', () => {
  const c = { ...newCardFields(NOW), interval: 1, reps: 3 };
  assert.equal(schedule(c, 'hard', NOW).interval, 1);
  assert.equal(schedule(newCardFields(NOW), 'hard', NOW).interval, 1);
});

test('la facilidad se mantiene entre los límites', () => {
  let c = { ...newCardFields(NOW), interval: 5, reps: 5, ease: MIN_EASE };
  assert.equal(schedule(c, 'hard', NOW).ease, MIN_EASE);
  c = { ...c, ease: MAX_EASE };
  assert.equal(schedule(c, 'easy', NOW).ease, MAX_EASE);
});

test('el intervalo nunca pasa del máximo', () => {
  const c = { ...newCardFields(NOW), interval: 170, reps: 9, ease: MAX_EASE };
  assert.equal(schedule(c, 'easy', NOW).interval, MAX_INTERVAL);
});

test('la fecha de vencimiento es el inicio del día + el intervalo', () => {
  const r = schedule({ ...newCardFields(NOW), interval: 4, reps: 3 }, 'good', NOW);
  assert.deepEqual(r.dueDate, day(r.interval));
  assert.equal(r.lastReviewed, NOW);
});

test('con examen, ningún repaso se programa después del día previo', () => {
  const c = { ...newCardFields(NOW), interval: 30, reps: 6, ease: 2.5 };
  const r = schedule(c, 'easy', NOW, { examDate: day(5) });
  assert.equal(r.interval, 4); // examen en 5 días → máximo 4
  assert.deepEqual(r.dueDate, day(4));
  // Si el examen es hoy o mañana, no se recorta (no hay día previo útil)
  assert.ok(schedule(c, 'easy', NOW, { examDate: day(1) }).interval > 1);
});

test('una calificación desconocida lanza un error claro', () => {
  assert.throws(() => schedule(newCardFields(NOW), 'regular', NOW), /Calificación desconocida/);
});

test('schedule no modifica la tarjeta original', () => {
  const c = { ...newCardFields(NOW), interval: 6, reps: 3 };
  const copy = { ...c };
  schedule(c, 'good', NOW);
  assert.deepEqual(c, copy);
});

test('previewIntervals devuelve un intervalo por cada respuesta', () => {
  const p = previewIntervals({ ...newCardFields(NOW), interval: 6, reps: 3 }, NOW);
  assert.deepEqual(Object.keys(p).sort(), ['easy', 'good', 'hard']);
  assert.ok(p.hard < p.good && p.good < p.easy);
});

test('estado de la tarjeta: nueva, en aprendizaje o dominada', () => {
  assert.equal(cardStatus({ reps: 0, lastReviewed: null }), 'new');
  assert.equal(cardStatus({ reps: 2, lastReviewed: NOW, interval: 5 }), 'learning');
  assert.equal(cardStatus({ reps: 5, lastReviewed: NOW, interval: MASTERED_INTERVAL }), 'mastered');
});

test('isDue: vence cuando su fecha ya llegó', () => {
  assert.ok(isDue({ dueDate: new Date(2026, 9, 19) }, NOW));
  assert.ok(!isDue({ dueDate: new Date(2026, 9, 21) }, NOW));
  assert.ok(!isDue({}, NOW)); // sin fecha no se considera vencida
});

test('daysUntil cuenta días completos y no depende de la hora', () => {
  assert.equal(daysUntil(day(0), NOW), 0);
  assert.equal(daysUntil(new Date(2026, 9, 22, 8, 0), NOW), 2);
  assert.equal(daysUntil(day(-3), NOW), -3);
  assert.equal(daysUntil(null, NOW), null);
});

test('formatInterval escribe el intervalo en español', () => {
  assert.equal(formatInterval(0), 'hoy');
  assert.equal(formatInterval(1), '1 día');
  assert.equal(formatInterval(12), '12 días');
  assert.equal(formatInterval(30), '1 mes');
  assert.equal(formatInterval(90), '3 meses');
});

test('isExamReady pide al menos 2 repasos y 3 días de intervalo', () => {
  assert.ok(!isExamReady({ reps: 1, interval: 5 }));
  assert.ok(!isExamReady({ reps: 3, interval: 2 }));
  assert.ok(isExamReady({ reps: 2, interval: 3 }));
});

test('examProgress resume el avance hacia el examen', () => {
  const ready = { reps: 3, interval: 6 };
  const pending = { reps: 0, interval: 0 };
  const p = examProgress([ready, ready, pending, pending], day(2), NOW);
  assert.equal(p.total, 4);
  assert.equal(p.ready, 2);
  assert.equal(p.remaining, 2);
  assert.equal(p.perDay, 1);
  assert.equal(p.pct, 50);
  assert.equal(p.status, 'ok');
  assert.equal(examProgress([], day(2), NOW).status, 'empty');
  assert.equal(examProgress([ready], day(2), NOW).status, 'ready');
  const many = Array.from({ length: 40 }, () => pending);
  assert.equal(examProgress(many, day(2), NOW).status, 'busy'); // 20 por día
});
