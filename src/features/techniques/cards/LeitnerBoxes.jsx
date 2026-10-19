import { LEITNER_INTERVALS, leitnerBox } from './schedulers.js';

// Las 5 cajas del sistema Leitner; la caja de la tarjeta actual se resalta.
export default function LeitnerBoxes({ card, cards = [] }) {
  const current = card ? leitnerBox(card) : 0;
  const counts = LEITNER_INTERVALS.map((_, i) => cards.filter((c) => leitnerBox(c) === i + 1).length);
  return (
    <div className="leitner" role="img" aria-label={`Tarjeta en la caja ${current} de 5`}>
      {LEITNER_INTERVALS.map((d, i) => (
        <div key={i} className={`leitner-box ${current === i + 1 ? 'current' : ''}`}>
          <strong>Caja {i + 1}</strong>
          <span className="small muted">cada {d} {d === 1 ? 'día' : 'días'}</span>
          <span className="leitner-count">{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
