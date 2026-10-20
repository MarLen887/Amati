import { useState } from 'react';
import { CalendarX } from 'lucide-react';
import ColorPicker, { SUBJECT_COLORS } from '../../core/components/ColorPicker.jsx';
import { useData } from '../../core/context/DataContext.jsx';

// "AAAA-MM-DD" <-> Date en hora local
// Compara nombres sin importar mayúsculas, acentos ni espacios de más
const sameName = (a, b) => {
  const n = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return n(a) !== '' && n(a) === n(b);
};

export const toInput = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
export const fromInput = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function SubjectEditor({ initial, onSave, onCancel, submitLabel = 'Guardar' }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[0]);
  const [exam, setExam] = useState(toInput(initial?.examDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { subjects } = useData();
  // No se permiten dos materias con el mismo nombre (al editar, se ignora la propia materia)
  const duplicate = subjects.some((x) => x.id !== initial?.id && sameName(x.name, name));

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || duplicate) return;
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
          maxLength={80} required autoFocus aria-invalid={duplicate} aria-describedby={duplicate ? 'subject-dup' : undefined} />
        {duplicate && <span id="subject-dup" className="error small" role="alert">Ya tienes una materia con ese nombre. Elige otro.</span>}
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
        <button className="btn primary" disabled={busy || !name.trim() || duplicate}>
          {initial ? 'Guardar cambios' : busy ? 'Creando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
