// Selección de qué repasar: materia (o todas) y tema (o todos).
export const NO_TOPIC = '__sin_tema__';
export const SESSION_SIZE = 20; // ~10 minutos de repaso (Instrumento 2, reactivo 7)

export function matchesSelection(card, subjectId, topic) {
  if (subjectId && card.subjectId !== subjectId) return false;
  if (!topic) return true;
  if (topic === NO_TOPIC) return !card.topic;
  return card.topic === topic;
}

export function studyUrl(subjectId, topic, practice = false, technique = '') {
  const p = new URLSearchParams();
  if (subjectId) p.set('materia', subjectId);
  if (subjectId && topic) p.set('tema', topic);
  if (technique && technique !== 'srs') p.set('tecnica', technique);
  if (practice) p.set('modo', 'libre');
  const q = p.toString();
  return q ? `/estudiar?${q}` : '/estudiar';
}

// Temas de una materia con su número de tarjetas pendientes
export function topicsOf(cards, subjectId, dueIds) {
  const map = new Map();
  for (const c of cards) {
    if (c.subjectId !== subjectId) continue;
    const key = c.topic || NO_TOPIC;
    const t = map.get(key) || { id: key, label: c.topic || 'Sin tema', total: 0, due: 0 };
    t.total += 1;
    if (dueIds.has(c.id)) t.due += 1;
    map.set(key, t);
  }
  return [...map.values()].sort((a, b) =>
    a.id === NO_TOPIC ? 1 : b.id === NO_TOPIC ? -1 : a.label.localeCompare(b.label),
  );
}

export function pomodoroUrl(subjectId, topic) {
  return studyUrl(subjectId, topic).replace('/estudiar', '/pomodoro');
}

// Práctica intercalada: alterna tarjetas de distintos temas/materias (reparto por turnos).
export function interleave(cards, shuffleFn) {
  const groups = new Map();
  for (const c of shuffleFn(cards)) {
    const key = `${c.subjectId}|${c.topic || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const lists = shuffleFn([...groups.values()]);
  const out = [];
  let last = null;
  while (lists.some((l) => l.length)) {
    // el siguiente turno evita repetir el grupo anterior si hay otra opción
    const candidates = lists.filter((l) => l.length && l !== last);
    const pick = (candidates.length ? candidates : lists.filter((l) => l.length))
      .reduce((a, b) => (b.length > a.length ? b : a));
    out.push(pick.shift());
    last = pick;
  }
  return out;
}
