import { useRef, useState } from 'react';
import { Check, CircleCheck, ImagePlus } from 'lucide-react';
import ImageField from '../../core/components/ImageField.jsx';

const emptyImage = (existingUrl = null) => ({ file: null, existingUrl, removed: false });

// Cada lado acepta texto, imagen o ambos (al menos uno de los dos).
// Si ya se sabe la materia (defaultSubjectId) no se vuelve a preguntar: captura rápida.
// Ctrl/⌘ + Enter guarda y deja listo el formulario para la siguiente tarjeta.
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
  const frontRef = useRef(null);

  const hasImg = (img) => Boolean(img.file || (img.existingUrl && !img.removed));
  const isEmpty = !front.trim() && !back.trim() && !hasImg(frontImg) && !hasImg(backImg);
  const fixedSubject = Boolean(defaultSubjectId) && !initial;
  const hasAnyImage = hasImg(frontImg) || hasImg(backImg);

  // Guarda la tarjeta actual. Devuelve true si se guardó correctamente.
  async function save() {
    if (!front.trim() && !hasImg(frontImg)) {
      setError('Falta la pregunta: escríbela o agrega una imagen.');
      frontRef.current?.focus();
      return false;
    }
    if (!back.trim() && !hasImg(backImg)) {
      setError('Falta la respuesta: escríbela o agrega una imagen.');
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
        frontRef.current?.focus();
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

  // Listo: guarda lo que esté escrito (si hay algo) y termina
  async function handleDone() {
    if (isEmpty || (await save())) onDone();
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  }

  const subjectName = subjects.find((s) => s.id === subjectId)?.name;

  return (
    <form className="card-form" onSubmit={handleSubmit} onKeyDown={onKeyDown}>
      <div className="grid-2">
        {fixedSubject ? (
          <p className="small muted fixed-subject">Se guardará en <strong>{subjectName}</strong></p>
        ) : (
          <label>
            Materia
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Tema <span className="muted">(opcional, agrupa tus tarjetas)</span>
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

      <div className="card-pair">
        <div className="card-side front-side">
          <label>
            <span className="side-title">Pregunta <span className="muted">(frente)</span></span>
            <textarea ref={frontRef} value={front} onChange={(e) => setFront(e.target.value)} rows={3} maxLength={2000}
              autoFocus={!initial}
              placeholder="Ej. ¿Cuántos huesos tiene el cuerpo humano adulto?" />
          </label>
        </div>
        <div className="card-side back-side">
          <label>
            <span className="side-title">Respuesta <span className="muted">(reverso)</span></span>
            <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3} maxLength={4000}
              placeholder="Ej. 206 huesos" />
          </label>
        </div>
      </div>

      <details className="optional-images" open={Boolean(initial) && hasAnyImage}>
        <summary><ImagePlus size={16} aria-hidden="true" /> Agregar imágenes <span className="muted">(opcional)</span></summary>
        <div className="card-pair">
          <ImageField label="la pregunta" value={frontImg} onChange={setFrontImg} />
          <ImageField label="la respuesta" value={backImg} onChange={setBackImg} />
        </div>
      </details>

      {error && <p className="error" role="alert">{error}</p>}
      {justSaved && (
        <p className="notice saved-toast" role="status">
          <CircleCheck size={16} aria-hidden="true" /> Tarjeta guardada
          {savedCount > 1 && <span className="muted"> · {savedCount} en esta sesión</span>}
        </p>
      )}
      <div className="row gap between wrap">
        {!initial ? <span className="small muted kbd-hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> guarda y sigue con otra</span> : <span />}
        <div className="row gap wrap">
          {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
          {onDone && (
            <button type="button" className="btn ghost" disabled={saving} onClick={handleDone}>
              <Check size={16} aria-hidden="true" /> {savedCount > 0 || !isEmpty ? 'Listo' : 'Cerrar'}
            </button>
          )}
          <button className="btn primary" disabled={saving}>
            {saving ? 'Guardando…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
