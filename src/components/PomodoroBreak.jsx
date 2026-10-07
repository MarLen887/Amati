import { useEffect, useState } from 'react';
import { Coffee, Droplets, Eye, Move, Wind } from 'lucide-react';
import { formatClock, usePomodoro } from '../context/PomodoroContext.jsx';
import PomodoroRing from './PomodoroRing.jsx';
import Breathing from './Breathing.jsx';

const TIPS = [
  { Icon: Move, text: 'Ponte de pie y estira hombros y espalda.' },
  { Icon: Droplets, text: 'Toma un poco de agua.' },
  { Icon: Eye, text: 'Mira algo lejano durante 20 segundos para descansar la vista.' },
  { Icon: Wind, text: 'Suelta los hombros y respira despacio.' },
  { Icon: Coffee, text: 'Aléjate de la pantalla un momento; aquí te esperamos.' },
];

// Pantalla de descanso: círculo que se llena despacio, sugerencias y respiración opcional.
export default function PomodoroBreak({ onContinue, onFinish }) {
  const { state, remainingMs, timeUp } = usePomodoro();
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [breathing, setBreathing] = useState(false);

  // Cambia la sugerencia cada 40 segundos
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 40_000);
    return () => clearInterval(t);
  }, []);

  const total = state.config.break * 60_000;
  const progress = 1 - remainingMs / total;
  const { Icon, text } = TIPS[tip];

  if (breathing) {
    return (
      <div className="narrow">
        <Breathing onDone={() => setBreathing(false)} onSkip={() => setBreathing(false)} />
      </div>
    );
  }

  return (
    <div className="narrow pomo-break stack-lg">
      <div className="center-text">
        <p className="eyebrow">Bloque {state.blocks} completado</p>
        <h1>{timeUp ? 'Descanso terminado' : 'Tiempo de descanso'}</h1>
        <p className="muted">
          {timeUp ? '¿Listo para otro bloque? Tú decides, sin prisa.' : 'Lo estás haciendo bien. Date un respiro.'}
        </p>
      </div>

      <div className="pomo-break-ring">
        <PomodoroRing progress={progress} size={190} stroke={8} tone="break">
          {timeUp ? <strong>Listo</strong> : <span className="muted">{formatClock(remainingMs)}</span>}
        </PomodoroRing>
      </div>

      {!timeUp && (
        <p className="pomo-tip" key={tip}>
          <Icon size={18} aria-hidden="true" /> {text}
        </p>
      )}

      <div className="stack">
        {timeUp ? (
          <button className="btn primary lg block" onClick={() => onContinue(false)}>Comenzar otro bloque</button>
        ) : (
          <>
            <button className="btn ghost block" onClick={() => setBreathing(true)}>
              <Wind size={16} aria-hidden="true" /> Respirar 15 segundos
            </button>
            <button className="btn ghost block" onClick={() => onContinue(true)}>Saltar descanso</button>
          </>
        )}
        <button className="btn link" onClick={onFinish}>Terminar por hoy</button>
      </div>
    </div>
  );
}
