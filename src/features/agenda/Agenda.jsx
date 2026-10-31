import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Plus, Sparkles, X } from 'lucide-react';
import Loader from '../../core/components/Loader.jsx';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { addStudyLog, deleteEvent, saveEvent } from '../../core/data/db.js';
import { addDays, dayKey, fmtLong, startOfDay } from '../../core/lib/dates.js';
import { has } from '../classnotes/api/integrations.js';
import EventForm from './EventForm.jsx';
import { notifyEnabled, setNotifyPref } from './StudyReminders.jsx';
import { hhmm, layoutColumns, minutesOfDate, occurrencesOn, weekStart, WEEK_ORDER } from './agendaUtils.js';
import { proposeStudyBlocks } from './scheduleAI.js';
import '../../styles/agenda.css';

const TL_START = 6; // la línea de tiempo muestra de 6:00 a 23:00
const TL_END = 23;
const STATUS_LABEL = { proposed: 'Por aprobar', approved: 'Aprobado', done: 'Estudiado', skipped: 'Omitido' };
const dow = (d) => d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

export default function Agenda() {
  const { user } = useAuth();
  const { events, subjects } = useData();
  const [now, setNow] = useState(() => new Date());
  const [sel, setSel] = useState(() => startOfDay(new Date()));
  const [form, setForm] = useState(null); // { event?, preset? }
  const [block, setBlock] = useState(null); // bloque de estudio abierto
  const [busy, setBusy] = useState(false);
  const [weekends, setWeekends] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);

  const weekDays = useMemo(() => { const s = weekStart(sel); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }, [sel]);
  const dayOcc = useMemo(() => occurrencesOn(events, sel), [events, sel]);
  const todayKey = dayKey(now);
  const selKey = dayKey(sel);
  const hasSchedule = events.some((e) => e.kind !== 'study');
  const proposals = useMemo(
    () => events.filter((e) => e.kind === 'study' && e.status === 'proposed' && e.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin),
    [events, todayKey],
  );
  const mySchedule = useMemo(() => events.filter((e) => e.kind !== 'study').sort((a, b) => a.startMin - b.startMin), [events]);

  async function generate() {
    setBusy(true); setNote(''); setError('');
    try {
      const list = await proposeStudyBlocks({ events, subjects, weekends, now: new Date() });
      await Promise.all(events.filter((e) => e.kind === 'study' && e.status === 'proposed').map((e) => deleteEvent(user.uid, e.id)));
      await Promise.all(list.map((p) => saveEvent(user.uid, null, { title: 'Tiempo de estudio', kind: 'study', recur: 'none', date: p.date, startMin: p.startMin, endMin: p.endMin, status: 'proposed', reason: p.reason, source: p.source })));
      setNote(list.length
        ? `Te propongo ${plural(list.length, 'opción', 'opciones')} de 30 min. Elige las que te sirvan: solo las que apruebes te avisarán.`
        : 'No encontré huecos libres de 30 minutos en los próximos días. Revisa tu horario.');
    } catch {
      setError('No se pudieron generar las propuestas. Inténtalo de nuevo.');
    } finally { setBusy(false); }
  }

  const setStatus = (e, status) => saveEvent(user.uid, e.id, { status }).catch(() => setError('No se pudo actualizar. Inténtalo de nuevo.'));
  // Las opciones de un mismo día son alternativas: al aprobar una se descartan las demás de ese día
  const approveOne = (p) => Promise.all([
    setStatus(p, 'approved'),
    ...proposals.filter((o) => o.date === p.date && o.id !== p.id).map((o) => deleteEvent(user.uid, o.id)),
  ]);
  const approveAll = () => Promise.all([...new Set(proposals.map((p) => p.date))].map((d) => approveOne(proposals.find((p) => p.date === d))));

  function addAt(e) {
    if (e.target !== e.currentTarget) return; // un clic sobre un bloque no crea otro
    const r = e.currentTarget.getBoundingClientRect();
    const min = TL_START * 60 + ((e.clientY - r.top) / r.height) * (TL_END - TL_START) * 60;
    const start = Math.max(TL_START * 60, Math.min((TL_END - 1) * 60, Math.round(min / 30) * 30));
    setForm({ preset: { kind: 'activity', recur: 'none', date: selKey, startMin: start, endMin: start + 60 } });
  }

  const nowMin = minutesOfDate(now);
  const showNow = selKey === todayKey && nowMin >= TL_START * 60 && nowMin <= TL_END * 60;
  const laid = layoutColumns(dayOcc);

  return (
    <div className="stack-lg agenda-page">
      <header className="page-head stack-sm">
        <h1>Agenda</h1>
        <p className="muted">Tu horario y tus actividades en un solo lugar. Amati te ayuda a encontrar 30 minutos para estudiar; tú decides cuáles aceptar.</p>
      </header>

      <div className="agenda-layout">
        <section className="stack agenda-main" aria-label="Calendario">
          <div className="week-nav">
            <button type="button" className="icon-btn" aria-label="Semana anterior" onClick={() => setSel(addDays(sel, -7))}><ChevronLeft size={18} aria-hidden="true" /></button>
            <h2 className="h3 week-title capitalize">{weekDays[0].toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" className="icon-btn" aria-label="Semana siguiente" onClick={() => setSel(addDays(sel, 7))}><ChevronRight size={18} aria-hidden="true" /></button>
            <button type="button" className="btn small ghost" onClick={() => setSel(startOfDay(new Date()))}>Hoy</button>
          </div>

          <ol className="week-strip" aria-label="Días de la semana" data-tour="agenda-week">
            {weekDays.map((d) => {
              const k = dayKey(d);
              const occ = occurrencesOn(events, d);
              const fixed = occ.filter((e) => e.kind !== 'study').length;
              const study = occ.filter((e) => e.kind === 'study' && e.status !== 'skipped');
              return (
                <li key={k}>
                  <button type="button" className={`wd ${k === selKey ? 'sel' : ''} ${k === todayKey ? 'today' : ''}`} aria-pressed={k === selKey} aria-label={`${fmtLong(d)}: ${plural(fixed, 'actividad', 'actividades')}${study.length ? ', con tiempo de estudio' : ''}`} onClick={() => setSel(d)}>
                    <span className="wd-name">{dow(d)}</span>
                    <span className="wd-num">{d.getDate()}</span>
                    <span className="wd-dots" aria-hidden="true">
                      {Array.from({ length: Math.min(fixed, 3) }, (_, i) => <i key={i} className="dot fixed" />)}
                      {study.map((s) => <i key={s.id} className={`dot study ${s.status}`} />)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="day-head">
            <h3 className="h3 capitalize">{fmtLong(sel)}</h3>
            <button type="button" className="btn small primary" onClick={() => setForm({ preset: { recur: 'none', date: selKey } })}><Plus size={15} aria-hidden="true" /> Agregar</button>
          </div>

          <div className="timeline" style={{ '--hours': TL_END - TL_START }} onClick={addAt} role="group" aria-label={`Horario del ${fmtLong(sel)}`}>
            {Array.from({ length: TL_END - TL_START + 1 }, (_, i) => (
              <div key={i} className="hour" style={{ '--h': i }}><span>{String(TL_START + i).padStart(2, '0')}:00</span></div>
            ))}
            {showNow && <div className="now-line" style={{ '--t': (nowMin - TL_START * 60) / 60 }} aria-hidden="true"><span>{hhmm(nowMin)}</span></div>}
            {laid.map(({ e, col, cols }) => {
              const s = Math.max(e.startMin, TL_START * 60);
              const en = Math.min(e.endMin, TL_END * 60);
              if (en <= s) return null;
              const study = e.kind === 'study';
              return (
                <button key={`${e.id}@${selKey}`} type="button"
                  className={`ev ev-${e.kind} ${study ? `ev-${e.status}` : ''}`}
                  style={{ '--top': (s - TL_START * 60) / 60, '--len': (en - s) / 60, '--col': col, '--cols': cols }}
                  onClick={() => (study ? setBlock(e) : setForm({ event: e }))}>
                  <strong>{study ? 'Estudio' : e.title}</strong>
                  <span>{hhmm(e.startMin)} – {hhmm(e.endMin)}{study ? ` · ${STATUS_LABEL[e.status] || ''}` : ''}</span>
                </button>
              );
            })}
          </div>
          {dayOcc.length === 0 && <p className="small muted center-text">Nada agendado. Toca la línea de tiempo para agregar algo, o pide propuestas de estudio.</p>}
        </section>

        <aside className="stack agenda-side" aria-label="Tiempo de estudio">
          <section className="panel stack ai-card" data-tour="agenda-ai">
            <div className="row gap">
              <span className="ai-spark" aria-hidden="true"><Sparkles size={20} /></span>
              <h2 className="h3">Encontrar tiempo de estudio</h2>
            </div>
            <p className="small muted">
              {has.gemini ? 'La IA busca los mejores huecos de 30 minutos' : 'Busco huecos libres de 30 minutos'} entre semana, con dos opciones por día para que elijas, sin empalmarse con tus clases. No se agenda nada sin tu aprobación.
            </p>
            {!hasSchedule && <p className="small notice warn">Agrega primero tus clases y actividades para que las propuestas se ajusten a tu día.</p>}
            <button type="button" className="btn primary" disabled={busy} onClick={generate}>
              <Sparkles size={16} aria-hidden="true" /> {busy ? 'Buscando…' : 'Proponer tiempos de estudio'}
            </button>
            <label className="checkbox small"><input type="checkbox" checked={weekends} onChange={(e) => setWeekends(e.target.checked)} /> Incluir sábado y domingo</label>
            {busy && <Loader size="sm" label="Buscando tus mejores huecos…" />}
            {note && <p className="small" role="status">{note}</p>}
            {error && <p className="error small" role="alert">{error}</p>}

            {proposals.length > 0 && (
              <div className="stack-sm">
                <div className="row between">
                  <h3 className="h3 small-h">Por aprobar</h3>
                  <button type="button" className="link-btn small" onClick={approveAll}>Aprobar la primera de cada día</button>
                </div>
                <p className="small muted">Cada día tiene hasta 2 opciones: al aprobar una, se descarta la otra.</p>
                <ul className="proposal-list">
                  {proposals.map((p) => {
                    const d = new Date(`${p.date}T00:00:00`);
                    return (
                      <li key={p.id} className="proposal">
                        <button type="button" className="proposal-info" onClick={() => setBlock(p)}>
                          <strong className="capitalize">{dow(d)} {d.getDate()} · {hhmm(p.startMin)}</strong>
                          <span className="small muted">{p.reason || 'Un hueco libre en tu día'}</span>
                        </button>
                        <button type="button" className="icon-btn ok" aria-label={`Aprobar ${dow(d)} ${d.getDate()} a las ${hhmm(p.startMin)}`} onClick={() => approveOne(p)}><Check size={18} aria-hidden="true" /></button>
                        <button type="button" className="icon-btn" aria-label={`Descartar ${dow(d)} ${d.getDate()}`} onClick={() => deleteEvent(user.uid, p.id)}><X size={18} aria-hidden="true" /></button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <Notifications />

          <section className="panel stack-sm">
            <div className="row between">
              <h2 className="h3">Mi horario</h2>
              <button type="button" className="btn small ghost" onClick={() => setForm({ preset: { kind: 'class', recur: 'weekly' } })}><CalendarPlus size={15} aria-hidden="true" /> Clase</button>
            </div>
            {mySchedule.length === 0 ? <p className="small muted">Aún no agregas clases ni actividades.</p> : (
              <ul className="schedule-list">
                {mySchedule.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => setForm({ event: e })}>
                      <i className={`dot ${e.kind === 'class' ? 'fixed' : 'activity'}`} aria-hidden="true" />
                      <span className="grow"><strong>{e.title}</strong><span className="small muted"> · {e.recur === 'weekly' ? (e.days || []).slice().sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)).map((d) => dow(new Date(2026, 10, 1 + d))).join(', ') : e.date} · {hhmm(e.startMin)}–{hhmm(e.endMin)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {form && <EventForm event={form.event} preset={form.preset} onClose={() => setForm(null)} />}
      {block && <StudyBlockDialog block={events.find((e) => e.id === block.id) || block} now={now} onClose={() => setBlock(null)} onEdit={(e) => { setBlock(null); setForm({ event: e }); }} />}
    </div>
  );
}

// Avisos: la ventana dentro de Amati siempre aparece; la notificación del navegador es opcional
function Notifications() {
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported');
  const [on, setOn] = useState(notifyEnabled());

  async function enable() {
    const r = await Notification.requestPermission();
    setPerm(r);
    if (r === 'granted') { setNotifyPref(true); setOn(true); }
  }

  return (
    <section className="panel stack-sm">
      <div className="row gap"><Bell size={18} aria-hidden="true" /><h2 className="h3">Avisos</h2></div>
      <p className="small muted">Cuando empiece un tiempo de estudio aprobado, Amati te muestra un aviso en pantalla. Funciona mientras tengas Amati abierta en el navegador.</p>
      {perm === 'granted' ? (
        <label className="checkbox">
          <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setNotifyPref(e.target.checked); }} />
          Avisarme también con una notificación del navegador
        </label>
      ) : perm === 'denied' ? (
        <p className="small muted"><BellOff size={14} aria-hidden="true" /> Bloqueaste las notificaciones. Puedes activarlas desde el candado junto a la dirección de la página.</p>
      ) : perm === 'default' ? (
        <button type="button" className="btn small ghost" onClick={enable}><Bell size={14} aria-hidden="true" /> Activar notificaciones del navegador</button>
      ) : <p className="small muted">Tu navegador no admite notificaciones; verás el aviso dentro de Amati.</p>}
    </section>
  );
}

// Detalle de un bloque de estudio: aprobar, cambiar la hora, registrar lo estudiado u omitirlo
function StudyBlockDialog({ block, now, onClose, onEdit }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dur = block.endMin - block.startMin;
  const date = new Date(`${block.date}T00:00:00`);
  const past = block.date < dayKey(now) || (block.date === dayKey(now) && minutesOfDate(now) >= block.endMin);

  async function run(fn) {
    setBusy(true); setError('');
    try { await fn(); onClose(); } catch { setError('No se pudo guardar. Inténtalo de nuevo.'); setBusy(false); }
  }
  const status = (s) => run(() => saveEvent(user.uid, block.id, { status: s }));
  const registerDone = () => run(async () => {
    await addStudyLog(user.uid, { minutes: dur, label: 'Bloque de estudio', blockId: block.id, date });
    await saveEvent(user.uid, block.id, { status: 'done' });
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, busy]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="blk-title" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="panel stack modal-card">
        <div className="row between">
          <h2 id="blk-title" className="h3">Tiempo de estudio</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>
        <p className="row gap"><Clock size={16} aria-hidden="true" /> <span className="capitalize">{fmtLong(date)}</span> · {hhmm(block.startMin)} – {hhmm(block.endMin)} ({dur} min)</p>
        <p><span className={`tag status-${block.status}`}>{STATUS_LABEL[block.status] || block.status}</span> {block.reason && <span className="muted small">{block.reason}</span>}</p>

        {block.status === 'approved' && past && (
          <div className="stack-sm">
            <p>¿Estudiaste en este tiempo?</p>
            <p className="small muted">Cuenta cualquier método. Si estudiaste dentro de Amati (un repaso o Pomodoro), esos minutos ya se suman solos: registra solo lo que hiciste por tu cuenta.</p>
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}

        <div className="row gap wrap shared-actions-left">
          {block.status === 'proposed' && <button type="button" className="btn primary" disabled={busy} onClick={() => status('approved')}><Check size={16} aria-hidden="true" /> Aprobar</button>}
          {block.status === 'approved' && past && <button type="button" className="btn primary" disabled={busy} onClick={registerDone}><Check size={16} aria-hidden="true" /> Sí, registrar {dur} min</button>}
          {block.status === 'approved' && past && <button type="button" className="btn ghost" disabled={busy} onClick={() => status('skipped')}>No pude</button>}
          {block.status !== 'done' && <button type="button" className="btn ghost" disabled={busy} onClick={() => onEdit(block)}>Cambiar hora</button>}
          <button type="button" className="btn ghost danger" disabled={busy} onClick={() => run(() => deleteEvent(user.uid, block.id))}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
