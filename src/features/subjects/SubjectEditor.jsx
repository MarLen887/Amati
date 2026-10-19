import { useState } from 'react';
import { CalendarX } from 'lucide-react';
import ColorPicker, { SUBJECT_COLORS } from '../../core/components/ColorPicker.jsx';

// "AAAA-MM-DD" <-> Date en hora local
export const toInput = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
export const fromInput = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function SubjectEditor({ initial, onSave, onCancel, submitLabel = 'Crear materia y agregar tarjetas →' }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[0]);
  const [exam, setExam] = useState(toInput(initial?.examDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSave({ name, color, examDate: fromInput(exam) });
      if (!initial) {
        setName('');
        setExam('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="subject-editor">
      <label>
        <span className="side-title">Nombre de la materia</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Anatomía, Cálculo II, Historia de México"
          maxLength={80} required autoFocus />
      </label>
      <div className="stack-sm">
        <span className="field-label">Color <span className="muted">(para reconocerla rápido)</span></span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <details className="optional-images" open={Boolean(exam)}>
        <summary><CalendarX size={16} aria-hidden="true" /> Fecha de examen <span className="muted">(opcional)</span></summary>
        <div className="stack-sm">
          <div className="row gap">
            <input id={`exam-${initial?.id || 'new'}`} type="date" value={exam} min={toInput(new Date())}
              aria-label="Fecha de examen" onChange={(e) => setExam(e.target.value)} className="grow" />
            {exam && (
              <button type="button" className="btn small ghost" onClick={() => setExam('')}>Quitar</button>
            )}
          </div>
          <p className="small muted">Amati ajustará los repasos para que llegues preparado, sin desveladas.</p>
        </div>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row gap end">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary" disabled={busy || !name.trim()}>
          {initial ? 'Guardar cambios' : busy ? 'Creando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
