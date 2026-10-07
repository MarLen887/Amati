import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { MAX_INPUT_MB } from '../lib/images.js';

// Selector de imagen para un lado de la tarjeta, con vista previa y opción de quitarla.
// value: { file, existingUrl, removed }
export default function ImageField({ label, value, onChange }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value.file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value.file]);

  const shown = preview || (!value.removed && value.existingUrl);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('El archivo debe ser una imagen.');
    if (f.size > MAX_INPUT_MB * 1024 * 1024) return setError(`La imagen pesa más de ${MAX_INPUT_MB} MB.`);
    setError('');
    onChange({ ...value, file: f, removed: false });
  }

  return (
    <div className="image-field">
      {shown ? (
        <div className="image-preview">
          <img src={shown} alt={`Imagen de ${label}`} />
          <button type="button" className="icon-btn image-remove" aria-label={`Quitar imagen de ${label}`}
            onClick={() => onChange({ ...value, file: null, removed: true })}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="btn small ghost" onClick={() => input.current?.click()}>
          <ImagePlus size={16} aria-hidden="true" /> Agregar imagen
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
