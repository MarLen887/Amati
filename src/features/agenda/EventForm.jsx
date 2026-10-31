import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { deleteEvent, saveEvent } from '../../core/data/db.js';
import { dayKey } from '../../core/lib/dates.js';
import { hhmm, parseHHMM, WEEK_ORDER } from './agendaUtils.js';

const DAY_LABEL = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
const DAY_FULL = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes', 6: 'sábado', 0: 'domingo' };
const KINDS = [['class', 'Clase'], ['activity', 'Actividad']];

// Agregar o editar una clase, una actividad o un bloque de estudio. `preset` trae valores iniciales (por ejemplo, la hora que tocaste).
export default function EventForm({ event, preset = {}, onClose }) {
  const { user } = useAuth();
  const editing = Boolean(event?.id);
  const isStudy = (event?.kind || preset.kind) === 'study';
  const init = { kind: 'class', recur: 'weekly', days: [], date: dayKey(), startMin: 9 * 60, endMin: 10 * 60, title: '', ...preset, ...event };
  const [kind, setKind] = useState(init.kind);
  const [title, setTitle] = useState(init.title);
  const [recur, setRecur] = useState(isStudy ? 'none' : init.recur);
  const [days, setDays] = useState(init.days || []);
  const [date, setDate] = useState(init.date || dayKey());
  const [start, setStart] = useState(hhmm(init.startMin));
  const [end, setEnd] = useState(hhmm(init.endMin));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    first.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [onClose, busy]);

  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  async function submit(e) {
    e.preventDefault();
    const s = parseHHMM(start);
    const en = parseHHMM(end);
    if (!isStudy && !title.trim()) return setError('Escribe un nombre (por ejemplo, Cálculo o Gimnasio).');
    if (s === null || en === null) return setError('Revisa las horas.');
    if (en <= s) return setError('La hora de fin debe ser después de la de inicio.');
    if (recur === 'weekly' && days.length === 0) return setError('Elige al menos un día de la semana.');
    if (recur === 'none' && !date) return setError('Elige la fecha.');
    setBusy(true);
    setError('');
    try {
      const body = {
        title: isStudy ? 'Tiempo de estudio' : title.trim().slice(0, 100),
        kind: isStudy ? 'study' : kind,
        recur,
        startMin: s,
        endMin: en,
        ...(recur === 'weekly' ? { days: [...days].sort(), date: '' } : { date, days: [] }),
        ...(isStudy ? { status: event?.status || 'approved' } : {}),
      };
      await saveEvent(user.uid, event?.id || null, body);
      onClose();
    } catch (err) {
      console.error('Agenda: no se pudo guardar el evento', err);
      setError(err?.code === 'permission-denied'
        ? 'Amati todavía no tiene permiso para guardar tu horario. Avisa a quien administra Amati para que lo active.'
        : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try { await deleteEvent(user.uid, event.id); onClose(); } catch { setError('No se pudo eliminar. Inténtalo de nuevo.'); setBusy(false); }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ev-title" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="panel stack modal-card" onSubmit={submit} noValidate>
        <div className="row between">
          <h2 id="ev-title" className="h3">{isStudy ? 'Tiempo de estudio' : editing ? 'Editar' : 'Agregar a mi horario'}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>

        {!isStudy && (
          <>
            <div className="chips" role="group" aria-label="Tipo">
              {KINDS.map(([k, l]) => (
                <button key={k} type="button" className={`chip ${kind === k ? 'active' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
              ))}
            </div>
            <label>Nombre
              <input ref={first} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'class' ? 'Cálculo diferencial' : 'Entrenamiento, trabajo, comida…'} />
            </label>
          </>
        )}

        {!isStudy && (
          <div className="chips" role="group" aria-label="Repetición">
            <button type="button" className={`chip ${recur === 'weekly' ? 'active' : ''}`} aria-pressed={recur === 'weekly'} onClick={() => setRecur('weekly')}>Cada semana</button>
            <button type="button" className={`chip ${recur === 'none' ? 'active' : ''}`} aria-pressed={recur === 'none'} onClick={() => setRecur('none')}>Solo un día</button>
          </div>
        )}

        {recur === 'weekly' ? (
          <div className="stack-sm">
            <span className="small muted">Días</span>
            <div className="day-chips" role="group" aria-label="Días de la semana">
              {WEEK_ORDER.map((d) => (
                <button key={d} type="button" className={`day-chip ${days.includes(d) ? 'on' : ''}`} aria-pressed={days.includes(d)} aria-label={DAY_FULL[d]} onClick={() => toggleDay(d)}>{DAY_LABEL[d]}</button>
              ))}
            </div>
          </div>
        ) : (
          <label>Fecha
            <input ref={isStudy ? first : undefined} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

        <div className="time-row">
          <label>Inicio<input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label>Fin<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="row gap wrap between">
          {editing ? <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>Eliminar</button> : <span />}
          <div className="row gap">
            <button type="button" className="btn ghost" disabled={busy} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
