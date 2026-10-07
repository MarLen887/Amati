// Lectura de tarjetas en bloque desde texto pegado o archivo CSV/TXT.
// Formato por línea: pregunta <separador> respuesta [<separador> tema]
export const SEPARATORS = [
  { id: 'auto', label: 'Detectar automáticamente' },
  { id: '\t', label: 'Tabulador (copiado de Excel / Sheets)' },
  { id: ';', label: 'Punto y coma ( ; )' },
  { id: ',', label: 'Coma ( , ) — CSV' },
  { id: '|', label: 'Barra vertical ( | )' },
  { id: ' - ', label: 'Guion con espacios ( - )' },
];
export const MAX_ROWS = 500;

function detect(lines) {
  const sample = lines.slice(0, 20);
  for (const sep of ['\t', ';', '|', ' - ', ',']) {
    const hits = sample.filter((l) => l.includes(sep)).length;
    if (hits >= Math.ceil(sample.length * 0.6)) return sep;
  }
  return '\t';
}

// Separa respetando comillas dobles (formato CSV)
function splitLine(line, sep) {
  if (sep.length > 1) return line.split(sep);
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const HEADER = /^(pregunta|frente|front|question)$/i;

export function parseCards(text, sepChoice = 'auto') {
  // Se conserva el número de línea original para señalar errores
  const numbered = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l, i) => ({ text: l.trimEnd(), n: i + 1 }))
    .filter((l) => l.text.trim());
  const lines = numbered.map((l) => l.text);
  if (!lines.length) return { sep: null, rows: [], errors: [] };
  const sep = sepChoice === 'auto' ? detect(lines) : sepChoice;
  const rows = [];
  const errors = [];
  lines.forEach((line, i) => {
    const [front = '', back = '', topic = ''] = splitLine(line, sep).map((c) => c.trim());
    if (i === 0 && HEADER.test(front)) return; // encabezado
    if (!front || !back) {
      errors.push({ line: numbered[i].n, text: line, reason: 'Falta la pregunta o la respuesta' });
      return;
    }
    if (front.length > 2000 || back.length > 4000) {
      errors.push({ line: numbered[i].n, text: line.slice(0, 60), reason: 'Texto demasiado largo' });
      return;
    }
    rows.push({ front, back, topic: topic.slice(0, 80) });
  });
  return { sep, rows: rows.slice(0, MAX_ROWS), errors, truncated: rows.length > MAX_ROWS };
}

// CSV de tarjetas (compatible con la importación)
export function cardsToCsv(cards, subjectMap = {}) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = 'pregunta,respuesta,tema,materia';
  const body = cards.map((c) => [c.front, c.back, c.topic, subjectMap[c.subjectId]?.name].map(cell).join(','));
  return '﻿' + [head, ...body].join('\n');
}
