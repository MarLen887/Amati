import test from 'node:test';
import assert from 'node:assert/strict';
import { bestSlot, freeWindows, hhmm, layoutColumns, occurrencesOn, parseHHMM, proposeAuto, slotFits, slotStarts, studyDates, weekStart } from './agendaUtils.js';

// 2026-11-02 es lunes
const monday = new Date(2026, 10, 2, 8, 0);
const classes = [
  { id: 'a', kind: 'class', recur: 'weekly', days: [1, 3], startMin: 9 * 60, endMin: 11 * 60, title: 'Cálculo' },
  { id: 'b', kind: 'activity', recur: 'none', date: '2026-11-02', startMin: 17 * 60, endMin: 18 * 60, title: 'Gimnasio' },
];

test('hhmm y parseHHMM son inversos', () => {
  assert.equal(hhmm(450), '07:30');
  assert.equal(parseHHMM('07:30'), 450);
  assert.equal(parseHHMM('25:99'), null);
  assert.equal(parseHHMM(''), null);
});

test('weekStart devuelve el lunes de la semana', () => {
  assert.equal(weekStart(new Date(2026, 10, 8)).getDate(), 2); // domingo 8 -> lunes 2
  assert.equal(weekStart(new Date(2026, 10, 2)).getDate(), 2);
});

test('occurrencesOn mezcla semanales y de una sola vez', () => {
  const lunes = occurrencesOn(classes, monday);
  assert.deepEqual(lunes.map((e) => e.id), ['a', 'b']);
  const martes = occurrencesOn(classes, new Date(2026, 10, 3));
  assert.equal(martes.length, 0);
  const miercoles = occurrencesOn(classes, new Date(2026, 10, 4));
  assert.deepEqual(miercoles.map((e) => e.id), ['a']);
});

test('freeWindows deja respiro alrededor de las clases y respeta el horario', () => {
  const wins = freeWindows(occurrencesOn(classes, monday));
  assert.deepEqual(wins, [{ s: 7 * 60, e: 8 * 60 + 50 }, { s: 11 * 60 + 10, e: 16 * 60 + 50 }, { s: 18 * 60 + 10, e: 22 * 60 }]);
});

test('freeWindows no ofrece horas que ya pasaron', () => {
  const wins = freeWindows(occurrencesOn(classes, monday), { fromMin: 13 * 60 });
  assert.equal(wins[0].s, 13 * 60);
});

test('un bloque de estudio omitido no ocupa el día, uno aprobado sí', () => {
  const base = occurrencesOn(classes, monday);
  const skipped = [...base, { kind: 'study', status: 'skipped', startMin: 12 * 60, endMin: 12 * 60 + 30 }];
  const approved = [...base, { kind: 'study', status: 'approved', startMin: 12 * 60, endMin: 12 * 60 + 30 }];
  assert.equal(freeWindows(skipped).length, 3);
  assert.equal(freeWindows(approved).length, 4);
});

test('slotStarts y slotFits trabajan en :00 y :30', () => {
  const starts = slotStarts({ s: 11 * 60 + 10, e: 12 * 60 + 40 });
  assert.deepEqual(starts, [11 * 60 + 30, 12 * 60]);
  assert.equal(slotFits([{ s: 600, e: 660 }], 630), true);
  assert.equal(slotFits([{ s: 600, e: 660 }], 640), false);
});

test('bestSlot prefiere la tarde y justo después de una actividad', () => {
  const occ = occurrencesOn(classes, monday);
  const pick = bestSlot(occ, freeWindows(occ));
  assert.ok(pick.start >= 16 * 60 && pick.start <= 19 * 60, `inicio ${hhmm(pick.start)}`);
});

test('proposeAuto da un bloque por día con hueco y salta los que ya tienen uno', () => {
  const dates = [0, 1, 2].map((i) => new Date(2026, 10, 2 + i));
  const withStudy = [...classes, { id: 's', kind: 'study', recur: 'none', date: '2026-11-03', status: 'approved', startMin: 18 * 60, endMin: 18 * 60 + 30 }];
  const out = proposeAuto(withStudy, dates, new Date(2026, 10, 1, 8));
  assert.deepEqual(out.map((p) => p.date), ['2026-11-02', '2026-11-04']);
  assert.ok(out.every((p) => p.endMin - p.startMin === 30));
});

test('studyDates salta sábado y domingo salvo que se pidan', () => {
  const fri = new Date(2026, 10, 6); // viernes
  assert.deepEqual(studyDates(fri, { count: 3 }).map((d) => d.getDay()), [5, 1, 2]);
  assert.deepEqual(studyDates(fri, { count: 3, weekends: true }).map((d) => d.getDay()), [5, 6, 0]);
});

test('proposeAuto con perDay 2 da dos opciones distintas y separadas', () => {
  const out = proposeAuto(classes, [new Date(2026, 11, 7)], new Date(2026, 11, 1, 8), { perDay: 2 });
  assert.equal(out.length, 2);
  assert.ok(Math.abs(out[1].startMin - out[0].startMin) >= 60, 'separadas al menos una hora');
  assert.ok(out[0].startMin < out[1].startMin);
});

test('layoutColumns reparte eventos traslapados', () => {
  const occ = [
    { startMin: 600, endMin: 720 },
    { startMin: 660, endMin: 780 },
    { startMin: 900, endMin: 960 },
  ];
  const out = layoutColumns(occ);
  assert.deepEqual(out.map((o) => [o.col, o.cols]), [[0, 2], [1, 2], [0, 1]]);
});
