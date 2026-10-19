import { useState } from 'react';
import { CircleCheck, CircleX, ListChecks } from 'lucide-react';
import { makeQuiz } from '../classnotes/api/quiz.js';
import { has } from '../classnotes/api/integrations.js';

const MIN_CHARS = 80;

// Baraja las opciones y recalcula cuál es la correcta (la IA tiende a poner la respuesta en las primeras)
function shuffleQuestion(q) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

// Quiz de práctica generado con Gemini a partir de un texto. No guarda nada: es para repasar al momento.
// getText: () => texto del material
export default function QuizPanel({ getText }) {
  const [quiz, setQuiz] = useState(null);
  const [picked, setPicked] = useState({}); // índice de pregunta -> opción elegida
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!has.gemini) return null;

  async function generate() {
    const text = getText().trim();
    if (text.length < MIN_CHARS) {
      setError('Escribe un poco más para poder crear el quiz.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const list = await makeQuiz(text, 5);
      if (list.length === 0) throw new Error('No se pudo crear el quiz con este texto. Inténtalo de nuevo.');
      setQuiz(list.map(shuffleQuestion));
      setPicked({});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const answered = quiz ? Object.keys(picked).length : 0;
  const score = quiz ? quiz.filter((q, i) => picked[i] === q.answer).length : 0;
  const done = quiz && answered === quiz.length;

  return (
    <section className="panel stack">
      <h2 className="h3 row gap"><ListChecks size={18} aria-hidden="true" /> Practicar con un quiz</h2>
      {!quiz && <p className="small muted">Responde preguntas de opción múltiple sobre este material. El texto se envía a Gemini para crearlas.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {quiz && (
        <ol className="quiz-list">
          {quiz.map((q, qi) => {
            const chosen = picked[qi];
            const revealed = chosen !== undefined;
            return (
              <li key={qi} className="stack-sm">
                <p><strong>{q.question}</strong></p>
                <div className="quiz-options" role="group" aria-label={`Pregunta ${qi + 1}`}>
                  {q.options.map((o, oi) => {
                    const state = !revealed ? '' : oi === q.answer ? 'correct' : oi === chosen ? 'wrong' : '';
                    return (
                      <button key={oi} type="button" className={`quiz-option ${state}`} disabled={revealed}
                        onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}>
                        {state === 'correct' && <CircleCheck size={16} aria-hidden="true" />}
                        {state === 'wrong' && <CircleX size={16} aria-hidden="true" />}
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
                {revealed && (
                  <p className="small muted" role="status">
                    {chosen === q.answer ? '¡Correcto! ' : 'Incorrecto. '}{q.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {done && (
        <p className="notice" role="status">
          Obtuviste <strong>{score} de {quiz.length}</strong>. {score === quiz.length ? '¡Excelente!' : 'Repasa las que fallaste e inténtalo de nuevo.'}
        </p>
      )}

      <div className="row gap">
        <button type="button" className="btn ghost" disabled={busy} onClick={generate}>
          <ListChecks size={16} aria-hidden="true" /> {busy ? 'Creando quiz…' : quiz ? 'Nuevo quiz' : 'Crear quiz'}
        </button>
        {quiz && <button type="button" className="btn link" onClick={() => { setQuiz(null); setPicked({}); }}>Cerrar</button>}
      </div>
    </section>
  );
}
