import { useState } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';

const emptyRow = () => ({ cue: '', note: '' });

// Apuntes Cornell: filas pista/nota alineadas + resumen. content = { rows: [{cue, note}], summary }
// Modo autoexamen: se cubren las notas y se revelan una a una (práctica de recuperación).
export default function CornellEditor({ content, onChange }) {
  const rows = content.rows?.length ? content.rows : [emptyRow(), emptyRow(), emptyRow()];
  const [quiz, setQuiz] = useState(false);
  const [shown, setShown] = useState({});

  const setRows = (next) => onChange({ ...content, rows: next });
  const setRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="stack">
      <div className="row between wrap gap">
        <p className="small muted grow">
          <strong>Pistas</strong> (izquierda): preguntas o palabras clave, se llenan después. <strong>Notas</strong> (derecha): lo que escuchas o lees.
        </p>
        <button type="button" className={`btn small ${quiz ? 'primary' : 'ghost'}`} onClick={() => { setQuiz(!quiz); setShown({}); }}>
          {quiz ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {quiz ? 'Salir del autoexamen' : 'Autoexamen: cubrir notas'}
        </button>
      </div>

      <div className="cornell" role="group" aria-label="Hoja Cornell">
        <div className="cornell-head"><span>Pistas / preguntas</span><span>Notas</span></div>
        {rows.map((r, i) => (
          <div className="cornell-row" key={i}>
            <textarea value={r.cue} rows={2} onChange={(e) => setRow(i, { cue: e.target.value })}
              aria-label={`Pista ${i + 1}`} placeholder="¿Qué pregunta responde esta nota?" maxLength={300} />
            {quiz && !shown[i] ? (
              <button type="button" className="cornell-cover" onClick={() => setShown({ ...shown, [i]: true })}>
                Intenta recordar… <span className="small">toca para revelar</span>
              </button>
            ) : (
              <textarea value={r.note} rows={2} onChange={(e) => setRow(i, { note: e.target.value })}
                aria-label={`Nota ${i + 1}`} placeholder="Apunta aquí lo importante" maxLength={3000} />
            )}
            {!quiz && rows.length > 1 && (
              <button type="button" className="icon-btn cornell-del" aria-label={`Quitar fila ${i + 1}`}
                onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {!quiz && (
          <button type="button" className="btn small ghost cornell-add" onClick={() => setRows([...rows, emptyRow()])}>
            <Plus size={14} aria-hidden="true" /> Agregar fila
          </button>
        )}
      </div>

      <label>
        Resumen (al final, en tus palabras)
        <textarea value={content.summary || ''} rows={3} maxLength={2000}
          onChange={(e) => onChange({ ...content, rows, summary: e.target.value })}
          placeholder="En 2 o 3 frases: ¿cuál es la idea central de esta hoja?" />
      </label>
    </div>
  );
}
