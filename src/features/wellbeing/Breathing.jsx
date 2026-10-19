import { useEffect, useState } from 'react';

// Respiración guiada de 15 segundos: inhala 4 s, sostén 4 s, exhala 7 s.
const PHASES = [
  { id: 'inhale', text: 'Inhala', seconds: 4 },
  { id: 'hold', text: 'Sostén', seconds: 4 },
  { id: 'exhale', text: 'Exhala lentamente', seconds: 7 },
];
const TOTAL = PHASES.reduce((a, p) => a + p.seconds, 0);

export default function Breathing({ onDone, onSkip }) {
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    if (elapsed >= TOTAL) return;
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [started, elapsed]);

  let acc = 0;
  let phase = PHASES[0];
  let phaseLeft = PHASES[0].seconds;
  for (const p of PHASES) {
    if (elapsed < acc + p.seconds) {
      phase = p;
      phaseLeft = acc + p.seconds - elapsed;
      break;
    }
    acc += p.seconds;
  }
  const finished = elapsed >= TOTAL;

  return (
    <div className="breathing">
      <h2>Un momento para ti</h2>
      <p className="muted">
        Antes de repasar, respira con calma durante 15 segundos. Puedes omitirlo si lo prefieres.
      </p>

      <div className={`breath-circle ${started && !finished ? phase.id : ''} ${finished ? 'done' : ''}`}>
        <div className="breath-inner">
          {!started && <span>¿Listo?</span>}
          {started && !finished && (
            <>
              <strong>{phase.text}</strong>
              <span className="breath-count">{phaseLeft}</span>
            </>
          )}
          {finished && <strong>Bien hecho</strong>}
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(elapsed / TOTAL) * 100}%` }} />
      </div>

      <div className="row center gap">
        {!started && (
          <button className="btn primary" onClick={() => setStarted(true)}>
            Comenzar respiración
          </button>
        )}
        {finished && (
          <>
            <button className="btn ghost" onClick={() => { setElapsed(0); }}>
              Otra ronda
            </button>
            <button className="btn primary" onClick={onDone}>
              Continuar
            </button>
          </>
        )}
        {!finished && (
          <button className="btn ghost" onClick={onSkip}>
            Omitir
          </button>
        )}
      </div>
    </div>
  );
}
