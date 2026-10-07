import { useEffect } from 'react';
import { formatInterval, previewIntervals, RATINGS } from '../lib/srs.js';
import { practiceKeepsSchedule } from '../lib/db.js';

// Tarjeta con volteo 3D + botones Difícil / Bien / Fácil.
// Atajos: espacio/Enter = voltear, 1/2/3 = calificar.
export default function FlashcardView({ card, subject, flipped, onFlip, onRate, busy, practiceCard = false }) {
  const preview = previewIntervals(card, new Date(), { examDate: subject?.examDate });

  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (!flipped && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        onFlip();
      } else if (flipped && !busy && ['1', '2', '3'].includes(e.key)) {
        onRate(RATINGS[Number(e.key) - 1].id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, busy, onFlip, onRate]);

  return (
    <>
      {/* key: cada tarjeta nueva entra deslizándose, sin mostrar la respuesta durante el giro */}
      <div className="flash-scene card-enter" key={card.id}>
        <div
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => !flipped && onFlip()}
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Respuesta' : 'Mostrar respuesta'}
        >
          <div className="flash-face front">
            <div className="flash-meta">
              {subject && <span className="tag" style={{ borderColor: subject.color }}>{subject.name}</span>}
              {card.topic && <span className="tag">{card.topic}</span>}
            </div>
            {card.frontImage?.url && <img className="flash-img" src={card.frontImage.url} alt="Imagen de la pregunta" />}
            {card.front && <p className="flash-question">{card.front}</p>}
            <p className="small muted center-text flip-hint">Toca para ver la respuesta</p>
          </div>
          <div className="flash-face back" aria-hidden={!flipped}>
            {card.front && <p className="small muted center-text">{card.front}</p>}
            <hr />
            {card.backImage?.url && <img className="flash-img" src={card.backImage.url} alt="Imagen de la respuesta" />}
            {card.back && <p className="flash-answer">{card.back}</p>}
          </div>
        </div>
      </div>

      {!flipped ? (
        <button className="btn primary lg block" onClick={onFlip}>
          Mostrar respuesta
        </button>
      ) : (
        <div className="rating-row">
          <p className="muted small center-text">¿Qué tan fácil fue recordarla?</p>
          <div className="rating-buttons">
            {RATINGS.map((r, i) => (
              <button key={r.id} className={`btn rate ${r.id}`} disabled={busy} onClick={() => onRate(r.id)}
                title={`${r.hint} (tecla ${i + 1})`}>
                <strong>{r.label}</strong>
                <span className="small">
                  {practiceCard && practiceKeepsSchedule(r.id) ? 'mantiene fecha' : formatInterval(preview[r.id])}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
