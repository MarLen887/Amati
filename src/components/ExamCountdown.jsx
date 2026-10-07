import { CalendarCheck, CalendarClock } from 'lucide-react';
import { examProgress } from '../lib/srs.js';
import { fmtShort } from '../lib/dates.js';

// Mensajes tranquilos: informan sin presionar.
function message(p) {
  if (p.status === 'empty') return 'Agrega tarjetas para preparar este examen.';
  if (p.status === 'ready') return 'Todo listo. Repasa con calma y descansa bien.';
  if (p.left === 0) return 'Es hoy. Confía en lo que repasaste.';
  if (p.status === 'busy') return `Vas avanzando. Unas ${p.perDay} tarjetas al día te dejan preparado.`;
  return `Vas a tiempo. Con unas ${p.perDay} ${p.perDay === 1 ? 'tarjeta' : 'tarjetas'} al día llegas preparado.`;
}

export function examLabel(left) {
  if (left === 0) return 'Examen hoy';
  if (left === 1) return 'Examen mañana';
  return `Examen en ${left} días`;
}

// Chip compacto para la tarjeta de materia
export function ExamChip({ subject, now }) {
  if (!subject.examDate) return null;
  const left = Math.round((new Date(subject.examDate).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  if (left < 0) return null;
  return (
    <span className={`exam-chip ${left <= 3 ? 'soon' : ''}`}>
      <CalendarClock size={13} aria-hidden="true" /> {examLabel(left)}
    </span>
  );
}

// Bloque completo: cuenta regresiva, avance y mensaje
export default function ExamCountdown({ subject, cards, now }) {
  const p = examProgress(cards, subject.examDate, now);
  if (p.left === null || p.left < 0) return null;
  return (
    <div className="exam-box">
      <div className="row between gap">
        <span className="row gap">
          <span className="dot-color" style={{ background: subject.color }} />
          <strong>{subject.name}</strong>
        </span>
        <span className={`exam-chip ${p.left <= 3 ? 'soon' : ''}`}>
          {p.status === 'ready' ? <CalendarCheck size={13} /> : <CalendarClock size={13} />}
          {examLabel(p.left)} · {fmtShort(subject.examDate)}
        </span>
      </div>
      <div className="progress-track thin" aria-label={`${p.ready} de ${p.total} tarjetas listas`}>
        <div className="progress-fill grow-bar" style={{ width: `${p.pct}%`, background: subject.color }} />
      </div>
      <p className="small muted">
        {p.ready}/{p.total} tarjetas listas · {message(p)}
      </p>
    </div>
  );
}
