import { ask } from '../classnotes/api/gemini.js';
import { has } from '../classnotes/api/integrations.js';
import { addDays, dayKey, startOfDay } from '../../core/lib/dates.js';
import { daysUntil } from '../techniques/cards/srs.js';
import { freeWindows, hhmm, minutesOfDate, occurrencesOn, parseHHMM, proposeAuto, slotFits, studyDates, STUDY_MIN } from './agendaUtils.js';

// Propone bloques de estudio de 30 min en los huecos libres de los próximos días entre semana (lunes a viernes, o también
// fines de semana si se pide), con hasta PER_DAY opciones por día para que la persona elija. Los huecos los calcula el código
// (así nunca se empalma con una clase); la IA solo elige las mejores horas y explica por qué. Sin IA o si falla,
// se usa la propuesta automática. Nada se agenda sin que la persona lo apruebe.
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const PER_DAY = 2;
const label = (e) => (e.kind === 'class' ? 'clase' : e.kind === 'study' ? 'estudio' : 'actividad');

export async function proposeStudyBlocks({ events, subjects = [], days = 7, weekends = false, now = new Date(), signal }) {
  const dates = studyDates(now, { count: days, weekends });
  const todayKey = dayKey(now);

  // Solo cuentan los eventos que siguen vigentes: se descartan propuestas sin aprobar de una vez anterior
  const base = events.filter((e) => !(e.kind === 'study' && e.status === 'proposed'));
  const auto = proposeAuto(base, dates, now, { perDay: PER_DAY });
  if (!has.gemini || auto.length === 0) return auto;

  const plan = dates.map((d) => {
    const key = dayKey(d);
    const occ = occurrencesOn(base, d);
    const fromMin = key === todayKey ? Math.ceil((minutesOfDate(now) + 15) / 30) * 30 : 0;
    return { key, d, occ, windows: freeWindows(occ, { fromMin }), hasStudy: occ.some((e) => e.kind === 'study' && e.status !== 'skipped') };
  }).filter((p) => p.windows.length && !p.hasStudy);
  if (!plan.length) return [];

  // No se envían títulos: solo tipo y horas
  const dayLines = plan.map((p) => {
    const busy = p.occ.map((e) => `${hhmm(e.startMin)}-${hhmm(e.endMin)} ${label(e)}`).join(', ') || 'nada';
    return `- ${p.key} (${WEEKDAYS[p.d.getDay()]}): ocupado: ${busy}. Huecos libres: ${p.windows.map((w) => `${hhmm(w.s)}-${hhmm(w.e)}`).join(', ')}`;
  }).join('\n');
  const exams = subjects
    .filter((s) => s.examDate && daysUntil(s.examDate, now) >= 0 && daysUntil(s.examDate, now) <= 14)
    .map((s) => `- ${s.name}: examen en ${daysUntil(s.examDate, now)} días`).join('\n') || 'ninguno';

  const prompt = `Organizas el tiempo de estudio de un universitario. Propón bloques de estudio de ${STUDY_MIN} minutos.
Reglas:
- Hasta ${PER_DAY} OPCIONES por día para que la persona elija una (horas distintas, separadas al menos una hora), solo dentro de los huecos libres indicados.
- La hora de inicio debe ser en punto o y media (por ejemplo 17:00 o 17:30) y el bloque completo debe caber en el hueco.
- Evita antes de las 8:00 y después de las 21:30. Prefiere la tarde y, si se puede, justo después de una clase.
- Si hay un examen cercano, prioriza los días previos. Ofrece opciones en todos los días que tengan huecos buenos.
Responde SOLO con JSON: {"propuestas":[{"fecha":"AAAA-MM-DD","inicio":"HH:MM","motivo":"máximo 10 palabras, en español"}]}

Días disponibles:
${dayLines}

Exámenes próximos:
${exams}`;

  try {
    const raw = await ask(prompt, { json: true, signal });
    const data = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim());
    const byKey = Object.fromEntries(plan.map((p) => [p.key, p]));
    const taken = {}; // fecha -> horas ya elegidas
    const out = [];
    for (const it of Array.isArray(data?.propuestas) ? data.propuestas : []) {
      const p = byKey[it?.fecha];
      const start = parseHHMM(it?.inicio);
      if (!p || start === null || start % 5 !== 0 || !slotFits(p.windows, start)) continue; // se descarta lo que no cabe
      const list = (taken[p.key] ||= []);
      if (list.length >= PER_DAY || list.some((s) => Math.abs(s - start) < 60)) continue; // opciones distintas y separadas
      list.push(start);
      out.push({ date: p.key, startMin: start, endMin: start + STUDY_MIN, reason: String(it.motivo || 'Un buen hueco en tu día').slice(0, 120), source: 'ia' });
    }
    out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
    return out.length ? out : auto;
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    return auto; // la IA falló o se saturó: la propuesta automática sigue siendo útil
  }
}
