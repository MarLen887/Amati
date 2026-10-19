import { Link, useLocation } from 'react-router-dom';
import { Coffee, Timer } from 'lucide-react';
import { formatClock, usePomodoro } from './PomodoroContext.jsx';
import PomodoroRing from './PomodoroRing.jsx';

// Indicador flotante: si sales de la pantalla del Pomodoro, el tiempo sigue y puedes volver.
export default function PomodoroPill() {
  const { state, remainingMs, timeUp } = usePomodoro();
  const { pathname } = useLocation();
  if (!state?.active || state.phase === 'ended' || pathname === '/pomodoro') return null;

  const isBreak = state.phase === 'break';
  const total = (isBreak ? state.config.break : state.config.focus) * 60_000;
  const label = timeUp ? (isBreak ? 'Descanso listo' : 'Hora del descanso') : formatClock(remainingMs);

  return (
    <Link to={state.url} className={`pomo-pill ${isBreak ? 'break' : ''}`} aria-label={`Volver al Pomodoro: ${label}`}>
      <PomodoroRing progress={1 - remainingMs / total} size={26} stroke={3} tone={isBreak ? 'break' : 'focus'} />
      {isBreak ? <Coffee size={15} aria-hidden="true" /> : <Timer size={15} aria-hidden="true" />}
      <span>{label}</span>
      <span className="pomo-pill-cta">Volver</span>
    </Link>
  );
}
