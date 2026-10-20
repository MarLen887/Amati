import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { cloudinaryConfigured, uploadToCloudinary } from '../../core/lib/cloudinary.js';
import { saveOwnPdf } from '../../core/data/db.js';

const MAX_MB = 10; // límite del plan gratuito de Cloudinary para archivos que no son imagen o video

// El usuario sube sus propios PDF (libros, guías, artículos) a su biblioteca.
export default function UploadPdf({ subjectId = '', onDone, onCancel }) {
  const { user } = useAuth();
  const { subjects } = useData();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState(subjectId);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function pick(f) {
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf') return setError('El archivo debe ser un PDF.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`El PDF pesa más de ${MAX_MB} MB.`);
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await uploadToCloudinary(file, { folder: 'amati/biblioteca', onProgress: setProgress });
      await saveOwnPdf(user.uid, {
        subjectId: subject,
        title,
        author,
        file: { provider: r.provider, id: r.id, url: r.url, bytes: r.bytes, name: file.name, kind: 'pdf' },
      });
      onDone?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!cloudinaryConfigured) {
    return <p className="notice warn small">La subida de PDFs no está disponible por el momento.</p>;
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <h2 className="h3">Subir un PDF a mi biblioteca</h2>
      <label className="btn ghost file-pick">
        <FileUp size={16} aria-hidden="true" /> {file ? file.name : 'Elegir PDF'}
        <input type="file" accept="application/pdf" hidden disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <p className="small muted">Solo sube material propio o que tengas derecho a compartir. Máximo {MAX_MB} MB.</p>
      <label>
        Título
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} required disabled={busy} />
      </label>
      <div className="grid-2">
        <label>
          Autor <span className="muted">(opcional)</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={100} disabled={busy} />
        </label>
        <label>
          Materia
          <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy}>
            <option value="">Sin materia</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      {busy && <p className="small muted" role="status">Subiendo… {Math.round(progress * 100)}%</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row gap end">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancelar</button>}
        <button className="btn primary" disabled={busy || !file || !title.trim()}>{busy ? 'Subiendo…' : 'Subir PDF'}</button>
      </div>
    </form>
  );
}
