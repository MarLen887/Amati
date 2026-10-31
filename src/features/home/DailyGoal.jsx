import { useEffect, useRef, useState } from 'react';
import { Check, Flag, Target } from 'lucide-react';
import Hummingbird from '../../core/components/Hummingbird.jsx';
import Celebrate from '../../core/components/Celebrate.jsx';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { updateProfile } from '../../core/data/db.js';
import { GOAL_OPTIONS, useDailyProgress } from '../progress/dailyGoal.js';
import { formatMinutes } from '../progress/stats.js';
import '../../styles/goal.css';

const dayLetter = (d) => d.toLocaleDateString('es-MX', { weekday: 'narrow' }).toUpperCase();
const dayName = (d) => d.toLocaleDateString('es-MX', { weekday: 'long' });
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Número que sube hasta su valor (con «reducir movimiento» aparece directo)
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(reduceMotion() ? target : 0);
  const from = useRef(v);
  useEffect(() => {
    if (reduceMotion()) { setV(target); from.current = target; return undefined; }
    const start = performance.now();
    const a = from.current;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - (1 - k) ** 3;
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function message(p, left) {
  if (p.done) return p.todayMin > p.goalMin ? `Meta cumplida. Llevas ${p.todayMin - p.goalMin} min de más.` : 'Meta cumplida. Todo lo extra suma.';
  if (p.todayMin === 0) return 'Empieza con 5 minutos: ya cuentan.';
  if (p.todayMin < p.goalMin / 2) return 'Buen comienzo. Sigue a tu ritmo.';
  return `Casi lo logras: te ${left === 1 ? 'falta' : 'faltan'} ${left} min.`;
}

// «Meta de hoy»: barra con el colibrí que avanza hacia tu meta de minutos + tu semana. Sirve para cualquier método de estudio.
export default function DailyGoal({ now }) {
  const { user } = useAuth();
  const p = useDailyProgress(now);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [armed, setArmed] = useState(false); // la barra parte de 0 y avanza al montarse
  const [party, setParty] = useState(false);
  const count = useCountUp(p.todayMin);

  const pct = Math.min(1, p.todayMin / p.goalMin);
  const left = Math.max(0, p.goalMin - p.todayMin);
  const scale = Math.max(p.goalMin, ...p.days.map((d) => d.minutes), 1);

  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Celebración tranquila, una sola vez por día, cuando la meta ya está cumplida
  useEffect(() => {
    if (!p.done || !p.loaded) return undefined;
    const k = `amati-goal-party-${user.uid}`;
    let seen = '';
    try { seen = localStorage.getItem(k) || ''; } catch { /* sin almacenamiento */ }
    const today = p.days[6].key;
    if (seen === today) return undefined;
    try { localStorage.setItem(k, today); } catch { /* sin almacenamiento */ }
    setParty(true);
    const t = setTimeout(() => setParty(false), 7000);
    return () => clearTimeout(t);
  }, [p.done, p.loaded, p.days, user.uid]);

  async function pick(n) {
    setError('');
    try { await updateProfile(user.uid, { dailyGoalMin: n }); setEditing(false); } catch { setError('No se pudo guardar tu meta. Inténtalo de nuevo.'); }
  }

  return (
    <section className={`panel goal-hero ${p.done ? 'is-done' : ''}`} aria-label="Meta diaria de estudio" data-tour="daily-goal" aria-busy={!p.loaded}>
      {party && <Celebrate />}

      <header className="goal-head">
        <div className="goal-heading">
          <p className="eyebrow">Meta de hoy</p>
          <p className="goal-big" aria-hidden="true">
            <span className="goal-num">{count}</span>
            <span className="goal-of">de {p.goalMin} min</span>
          </p>
          <p className="goal-msg" role="status">{message(p, left)}</p>
        </div>
        <button type="button" className="goal-pill" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          <Target size={14} aria-hidden="true" /> {p.goalMin} min al día
        </button>
      </header>

      <div className="goal-lane">
        <div className="goal-track" role="progressbar" aria-label="Minutos estudiados hoy" aria-valuemin={0} aria-valuemax={p.goalMin} aria-valuenow={Math.min(p.todayMin, p.goalMin)}>
          <div className="goal-fill" style={{ '--p': armed ? pct : 0 }}><span className="goal-shine" /></div>
          {[0.25, 0.5, 0.75].map((m) => <span key={m} className={`goal-tick ${pct >= m ? 'on' : ''}`} style={{ left: `${m * 100}%` }} />)}
        </div>
        <span className="goal-bird" style={{ '--p': armed ? pct : 0 }}><Hummingbird size={46} /></span>
        <span className={`goal-flag ${p.done ? 'on' : ''}`} aria-hidden="true">{p.done ? <Check size={14} strokeWidth={3} /> : <Flag size={13} />}</span>
      </div>

      {editing && (
        <div className="goal-edit" role="group" aria-label="Minutos por día">
          <span className="small muted">Minutos por día:</span>
          {GOAL_OPTIONS.map((n) => (
            <button key={n} type="button" className={`chip ${p.goalMin === n ? 'active' : ''}`} aria-pressed={p.goalMin === n} onClick={() => pick(n)}>{n}</button>
          ))}
          {error && <p className="error small" role="alert">{error}</p>}
        </div>
      )}

      <div className="goal-week">
        <div className="goal-week-head">
          <p className="eyebrow">Tu semana</p>
          <p className="small muted">{p.daysMet} de 7 días con meta</p>
        </div>
        <ol className="week-bars" aria-label="Minutos de estudio por día">
          {p.days.map((d, i) => {
            const met = d.minutes >= p.goalMin;
            return (
              <li key={d.key} className={`${met ? 'met' : ''} ${d.isToday ? 'today' : ''}`} style={{ '--i': i }}>
                <span className="sr-only">{dayName(d.date)}: {d.minutes} min{met ? ', meta cumplida' : ''}</span>
                <span className="wk-val" aria-hidden="true">{d.minutes > 0 ? d.minutes : ''}</span>
                <span className="wk-box" aria-hidden="true">
                  <span className="wk-goal" style={{ bottom: `${(p.goalMin / scale) * 100}%` }} />
                  <span className="wk-bar" style={{ '--h': `${Math.max(d.minutes ? 8 : 3, (d.minutes / scale) * 100)}%` }} />
                </span>
                <span className="wk-day" aria-hidden="true">{dayLetter(d.date)}</span>
              </li>
            );
          })}
        </ol>
        <ul className="goal-stats">
          <li><strong>{formatMinutes(p.weekMin)}</strong> esta semana</li>
          {p.weekCards > 0 && <li><strong>{p.weekCards}</strong> {p.weekCards === 1 ? 'tarjeta repasada' : 'tarjetas repasadas'}</li>}
        </ul>
      </div>
    </section>
  );
}
