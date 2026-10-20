import { Link } from 'react-router-dom';
import { Clock, Flame, Layers, ShieldCheck } from 'lucide-react';
import { useData } from '../../core/context/DataContext.jsx';
import { cardStatus } from '../techniques/cards/srs.js';
import { formatMinutes, useStudyStats } from './stats.js';

// Progreso: solo cuatro números, sin gráficas.
function Metric({ Icon, value, label, tone, hint }) {
  return (
    <li className={`metric ${tone}`}>
      <span className="metric-icon" aria-hidden="true"><Icon size={22} strokeWidth={2} /></span>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
      {hint && <span className="small muted">{hint}</span>}
    </li>
  );
}

export default function Progress() {
  const { cards, dueCards, loading } = useData();
  const stats = useStudyStats();

  if (loading) return <p className="muted">Cargando…</p>;

  const mastered = cards.filter((c) => cardStatus(c) === 'mastered').length;
  const days = stats.streak;
  const pending = dueCards.length;

  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>Progreso</h1>
        <p className="muted">Tu avance, a tu ritmo. Sin rankings ni comparaciones.</p>
      </header>

      <ul className="metric-grid" data-tour="progress-metrics">
        <Metric Icon={Flame} tone="streak" value={stats.loaded ? `${days} ${days === 1 ? 'día' : 'días'}` : '…'} label="Racha" />
        <Metric Icon={ShieldCheck} tone="ok" value={mastered} label="Tarjetas dominadas" />
        <Metric Icon={Layers} tone="pending" value={pending} label="Pendientes hoy" />
        <Metric Icon={Clock} tone="time" value={stats.loaded ? formatMinutes(stats.weekMinutes) : '…'} label="Tiempo estudiado esta semana" />
      </ul>

      {pending > 0 && (
        <p className="center-text">
          <Link to="/tecnicas" className="btn primary">Estudiar ahora</Link>
        </p>
      )}
    </div>
  );
}
