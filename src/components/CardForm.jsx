import { useState } from 'react';
import { Check, CircleCheck } from 'lucide-react';
import ImageField from './ImageField.jsx';

const emptyImage = (existingUrl = null) => ({ file: null, existingUrl, removed: false });

// Cada lado acepta texto, imagen o ambos (al menos uno de los dos).
export default function CardForm({ subjects, initial, defaultSubjectId, topics = [], onSubmit, onCancel, onDone, submitLabel = 'Guardar' }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId || defaultSubjectId || subjects[0]?.id || '');
  const [topic, setTopic] = useState(initial?.topic || '');
  const [front, setFront] = useState(initial?.front || '');
  const [back, setBack] = useState(initial?.back || '');
  const [frontImg, setFrontImg] = useState(emptyImage(initial?.frontImage?.url));
  const [backImg, setBackImg] = useState(emptyImage(initial?.backImage?.url));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  const hasImg = (img) => Boolean(img.file || (img.existingUrl && !img.removed));
  const isEmpty = !front.trim() && !back.trim() && !hasImg(frontImg) && !hasImg(backImg);

  // Guarda la tarjeta actual. Devuelve true si se guardó correctamente.
  async function save() {
    if (!front.trim() && !hasImg(frontImg)) {
      setError('Escribe la pregunta o agrega una imagen al frente.');
      return false;
    }
    if (!back.trim() && !hasImg(backImg)) {
      setError('Escribe la respuesta o agrega una imagen al reverso.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(
        { subjectId, topic, front, back },
        {
          frontFile: frontImg.file,
          backFile: backImg.file,
          removeFront: frontImg.removed,
          removeBack: backImg.removed,
        },
      );
      if (!initial) {
        // Deja el formulario listo para la siguiente tarjeta del mismo tema
        setFront('');
        setBack('');
        setFrontImg(emptyImage());
        setBackImg(emptyImage());
        setSavedCount((n) => n + 1);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1600);
      }
      return true;
    } catch (err) {
      setError(err.message || 'No se pudo guardar la tarjeta.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await save();
  }

  // Realizado: guarda lo que esté escrito (si hay algo) y termina
  async function handleDone() {
    if (isEmpty || (await save())) onDone();
  }

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <div className="grid-2">
        <label>
          Materia
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label>
          Tema
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej. Sistema óseo"
            maxLength={80}
            list="topic-suggestions"
          />
          <datalist id="topic-suggestions">
            {topics.map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
      </div>
      <div className="card-side">
        <label>
          Pregunta (frente)
          <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3} maxLength={2000}
            placeholder="Ej. ¿Cuántos huesos tiene el cuerpo humano adulto?" />
        </label>
        <ImageField label="la pregunta" value={frontImg} onChange={setFrontImg} />
      </div>
      <div className="card-side">
        <label>
          Respuesta (reverso)
          <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} maxLength={4000}
            placeholder="Ej. 206 huesos" />
        </label>
        <ImageField label="la respuesta" value={backImg} onChange={setBackImg} />
      </div>
      {error && <p className="error">{error}</p>}
      {justSaved && (
        <p className="notice saved-toast" role="status">
          <CircleCheck size={16} aria-hidden="true" /> Tarjeta guardada
          {savedCount > 1 && <span className="muted"> · {savedCount} en esta sesión</span>}
        </p>
      )}
      <div className="row gap end wrap">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
        <button className={onDone ? 'btn ghost' : 'btn primary'} disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        {onDone && (
          <button type="button" className="btn primary" disabled={saving} onClick={handleDone}>
            <Check size={16} aria-hidden="true" /> Realizado
          </button>
        )}
      </div>
    </form>
  );
}
