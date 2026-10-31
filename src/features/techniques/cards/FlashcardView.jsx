import { useEffect, useRef } from 'react';
import { RATINGS } from './srs.js';
import { getScheduler } from './schedulers.js';
import { practiceKeepsSchedule } from '../../../core/data/db.js';

// Botones Difícil / Bien / Fácil (los textos dependen de la técnica). Atajos: 1/2/3.
export function RatingRow({ card, subject, technique = 'srs', onRate, busy, practiceCard = false, prompt = '¿Qué tan fácil fue recordarla?' }) {
  const sched = getScheduler(technique);
  const preview = sched.preview(card, new Date(), { examDate: subject?.examDate });

  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (!busy && ['1', '2', '3'].includes(e.key)) onRate(RATINGS[Number(e.key) - 1].id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onRate]);

  return (
    <div className="rating-row">
      <p className="muted small center-text">{prompt}</p>
      <div className="rating-buttons">
        {RATINGS.map((r, i) => (
          <button key={r.id} className={`btn rate ${r.id}`} disabled={busy} onClick={() => onRate(r.id)}
            title={`${sched.labels[r.id].hint} (tecla ${i + 1})`}>
            <strong>{sched.labels[r.id].label}</strong>
            <span className="small">
              {practiceCard && practiceKeepsSchedule(r.id) ? 'mantiene fecha' : preview[r.id]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tarjeta con volteo 3D + botones de calificación.
// Atajos: espacio/Enter = voltear, 1/2/3 = calificar.
// Deslizar la tarjeta ya volteada: a la izquierda = Difícil, a la derecha = Bien. Los botones y las teclas siguen funcionando.
const SWIPE = 90; // píxeles para que cuente como calificación

export default function FlashcardView({ card, subject, flipped, onFlip, onRate, busy, practiceCard = false, technique = 'srs' }) {
  const scene = useRef(null);
  const drag = useRef(null);
  const labels = getScheduler(technique).labels;

  // Mueve la tarjeta y tiñe el aviso sin volver a renderizar en cada píxel
  function setDx(dx) {
    const el = scene.current;
    if (!el) return;
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 25}deg)` : '';
    el.style.setProperty('--swipe-o', String(Math.min(1, Math.abs(dx) / SWIPE) * 0.92));
    el.dataset.swipe = Math.abs(dx) > 24 ? (dx < 0 ? 'left' : 'right') : '';
  }
  function reset() {
    const el = scene.current;
    if (!el) return;
    el.classList.remove('dragging', 'flying');
    el.style.opacity = '';
    setDx(0);
  }
  function down(e) {
    if (!flipped || busy || e.button > 0 || e.target.closest('a, button, input, textarea, select')) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  }
  function move(e) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // gesto vertical: es para desplazar la pantalla
      d.moved = true;
      scene.current?.setPointerCapture?.(e.pointerId);
      scene.current?.classList.add('dragging');
    }
    setDx(dx);
  }
  function up(e) {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    scene.current?.classList.remove('dragging');
    const dx = e.clientX - d.x;
    if (Math.abs(dx) < SWIPE || busy) { reset(); return; }
    const rating = dx < 0 ? 'hard' : 'good';
    const settle = () => reset(); // si no se pudo guardar, la tarjeta vuelve a su lugar
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { Promise.resolve(onRate(rating)).finally(settle); return; }
    const el = scene.current;
    el.classList.add('flying');
    el.style.transform = `translateX(${dx < 0 ? -130 : 130}vw) rotate(${dx < 0 ? -18 : 18}deg)`;
    el.style.opacity = '0';
    setTimeout(() => Promise.resolve(onRate(rating)).finally(settle), 180);
  }

  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (!flipped && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        onFlip();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onFlip]);

  return (
    <>
      {/* key: cada tarjeta nueva entra deslizándose, sin mostrar la respuesta durante el giro */}
      <div ref={scene} className={`flash-scene card-enter ${flipped ? 'swipeable' : ''}`} key={card.id}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset}>
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
        <div className="swipe-overlay" aria-hidden="true">
          <span className="swipe-label left">{labels.hard.label}</span>
          <span className="swipe-label right">{labels.good.label}</span>
        </div>
      </div>
      {flipped && <p className="small muted center-text swipe-hint">Desliza la tarjeta: ← {labels.hard.label} · {labels.good.label} →</p>}

      {!flipped ? (
        <button className="btn primary lg block" onClick={onFlip}>
          Mostrar respuesta
        </button>
      ) : (
        <RatingRow card={card} subject={subject} technique={technique} onRate={onRate} busy={busy} practiceCard={practiceCard} />
      )}
    </>
  );
}
