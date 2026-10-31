import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { saveEvent } from '../../core/data/db.js';
import { dayKey } from '../../core/lib/dates.js';
import { useTutorial } from '../tutorial/TutorialContext.jsx';
import { hhmm, minutesOfDate } from './agendaUtils.js';

// Aviso cuando empieza un tiempo de estudio aprobado: ventana dentro de Amati y, si la persona lo activó,
// notificación del navegador. Funciona mientras Amati esté abierta en el navegador (también en segundo plano).
const QUIET = ['/estudiar', '/pomodoro'];
const GRACE = 10; // minutos después del inicio en que todavía se avisa
const SNOOZE_MS = 10 * 60_000;
const KEY = 'amati-reminded';
const NOTIFY_KEY = 'amati-agenda-notify';

export const notifyEnabled = () => {
  try { return localStorage.getItem(NOTIFY_KEY) !== 'off' && typeof Notification !== 'undefined' && Notification.permission === 'granted'; } catch { return false; }
};
export const setNotifyPref = (on) => { try { localStorage.setItem(NOTIFY_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ } };

const readDone = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
function markDone(id) {
  try {
    const all = readDone();
    all[id] = Date.now();
    const keep = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 60);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* sin almacenamiento */ }
}

export default function StudyReminders() {
  const { user } = useAuth();
  const { events } = useData();
  const { pathname } = useLocation();
  const tutorial = useTutorial();
  const [due, setDue] = useState(null);
  const snoozed = useRef({});
  const quiet = QUIET.some((p) => pathname.startsWith(p)) || Boolean(tutorial?.active);
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    function tick() {
      const now = new Date();
      const today = dayKey(now);
      const nowMin = minutesOfDate(now);
      const done = readDone();
      const hit = eventsRef.current.find((e) => {
        if (e.kind !== 'study' || e.status !== 'approved' || e.date !== today) return false;
        const id = `${e.id}@${today}`;
        if (done[id] || (snoozed.current[id] && snoozed.current[id] > Date.now())) return false;
        return nowMin >= e.startMin && nowMin < Math.min(e.endMin, e.startMin + GRACE);
      });
      if (!hit) return;
      const id = `${hit.id}@${today}`;
      if (quietRef.current) { markDone(id); return; } // ya está estudiando o en el recorrido: no se interrumpe
      markDone(id);
      setDue(hit);
      if (notifyEnabled() && (document.hidden || !document.hasFocus())) {
        try {
          const n = new Notification('Es hora de tu tiempo de estudio', { body: `${hhmm(hit.startMin)} – ${hhmm(hit.endMin)} · ${hit.endMin - hit.startMin} min`, tag: id, icon: '/icon-192.png' });
          n.onclick = () => { window.focus(); n.close(); };
        } catch { /* el navegador no permite notificaciones */ }
      }
    }
    tick();
    const t = setInterval(tick, 15_000);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const closeRef = useRef(null);
  useEffect(() => {
    if (!due) return undefined;
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setDue(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [due]);

  if (!due) return null;
  const dur = due.endMin - due.startMin;

  function snooze() {
    const id = `${due.id}@${dayKey()}`;
    try { const all = readDone(); delete all[id]; localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* sin almacenamiento */ }
    snoozed.current[id] = Date.now() + SNOOZE_MS;
    setDue(null);
  }
  async function skip() {
    try { await saveEvent(user.uid, due.id, { status: 'skipped' }); } catch { /* si falla, el bloque sigue aprobado */ }
    setDue(null);
  }

  return (
    <div className="modal-backdrop shared-backdrop" role="dialog" aria-modal="true" aria-labelledby="study-now-title" onMouseDown={(e) => e.target === e.currentTarget && setDue(null)}>
      <div className="panel stack shared-card">
        <span className="shared-icon" aria-hidden="true"><Bell size={30} /></span>
        <h2 id="study-now-title" className="h3">Es hora de tu tiempo de estudio</h2>
        <p className="shared-note-title">{hhmm(due.startMin)} – {hhmm(due.endMin)} · {dur} min</p>
        <p className="muted">Tú lo aprobaste: {due.reason ? due.reason.toLowerCase() : 'ya tienes este hueco libre'}. Con cualquier método cuenta.</p>
        <div className="row gap wrap shared-actions">
          <button type="button" className="btn ghost" onClick={skip}>Hoy no</button>
          <button type="button" className="btn ghost" onClick={snooze}>En 10 minutos</button>
          <Link ref={closeRef} className="btn primary" to="/tecnicas" onClick={() => setDue(null)}>Empezar a estudiar</Link>
        </div>
      </div>
    </div>
  );
}
