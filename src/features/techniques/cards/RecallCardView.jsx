import { useState } from 'react';
import { RatingRow } from './FlashcardView.jsx';

// Niveles de confianza (autorregulación metacognitiva): se declaran ANTES de ver la respuesta.
export const CONFIDENCE = [
  { id: 3, label: 'Estoy seguro', cls: 'sure' },
  { id: 2, label: 'Más o menos', cls: 'maybe' },
  { id: 1, label: 'No me acuerdo', cls: 'unsure' },
];

// Práctica de recuperación e interrogación elaborativa:
// primero escribes de memoria, luego se revela la respuesta y comparas.
export default function RecallCardView({ card, subject, mode, onReveal, revealed, onRate, busy, practiceCard, technique }) {
  const [answer, setAnswer] = useState('');
  const [why, setWhy] = useState('');
  const elaborative = mode === 'elaborative';

  return (
    <div className="recall stack" key={card.id}>
      <div className="panel recall-card card-enter">
        <div className="flash-meta">
          {subject && <span className="tag" style={{ borderColor: subject.color }}>{subject.name}</span>}
          {card.topic && <span className="tag">{card.topic}</span>}
        </div>
        {card.frontImage?.url && <img className="flash-img" src={card.frontImage.url} alt="Imagen de la pregunta" />}
        {card.front && <p className="flash-question">{card.front}</p>}
      </div>

      {!revealed ? (
        <div className="stack">
          <label>
            {elaborative ? '1. Tu respuesta' : 'Escribe lo que recuerdas, sin mirar tus apuntes'}
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} maxLength={2000} autoFocus
              placeholder="Con tus propias palabras…" />
          </label>
          {elaborative && (
            <label>
              2. ¿Por qué tiene sentido? ¿Con qué otra cosa que ya sabes se relaciona?
              <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} maxLength={2000}
                placeholder="Empieza con «Esto es así porque…»" />
            </label>
          )}
          <div>
            <p className="small muted center-text">¿Qué tan seguro estás? Elige para ver la respuesta.</p>
            <div className="confidence-row">
              {CONFIDENCE.map((c) => (
                <button key={c.id} type="button" className={`btn confidence ${c.cls}`} onClick={() => onReveal(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="compare-grid">
            <div className="panel compare-mine">
              <p className="eyebrow">Lo que escribiste</p>
              <p className="pre">{answer.trim() || <span className="muted">(sin respuesta)</span>}</p>
              {elaborative && (
                <>
                  <p className="eyebrow">Tu explicación</p>
                  <p className="pre">{why.trim() || <span className="muted">(sin explicación)</span>}</p>
                </>
              )}
            </div>
            <div className="panel compare-right">
              <p className="eyebrow">Respuesta de la tarjeta</p>
              {card.backImage?.url && <img className="flash-img" src={card.backImage.url} alt="Imagen de la respuesta" />}
              {card.back && <p className="pre">{card.back}</p>}
            </div>
          </div>
          <RatingRow card={card} subject={subject} technique={technique} onRate={onRate} busy={busy}
            practiceCard={practiceCard} prompt="Sé honesto al compararlas: ¿qué tan bien lo recordaste?" />
        </div>
      )}
    </div>
  );
}
