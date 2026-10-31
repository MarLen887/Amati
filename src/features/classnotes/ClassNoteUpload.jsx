import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, CircleAlert, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { saveClassNote } from '../../core/data/db.js';
import { ACCEPT, has } from './api/integrations.js';
import { preloadGoogleIdentity } from './api/drive.js';
import { describeProvider, isImage, processUpload } from './api/pipeline.js';
import BackLink from '../../core/components/BackLink.jsx';

const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromInput = (v) => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const STAGE_LABEL = { prepare: 'Preparando el archivo', upload: 'Guardando el archivo', ocr: 'Extrayendo el texto con IA' };

function StageList({ stages, progress }) {
  return (
    <ol className="stage-list" aria-live="polite">
      {Object.entries(STAGE_LABEL).map(([k, label]) => {
        const st = stages[k] || 'pending';
        if (st === 'skip') return null;
        return (
          <li key={k} className={st}>
            {st === 'doing' ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : st === 'done' ? <Check size={16} aria-hidden="true" /> : st === 'error' ? <CircleAlert size={16} aria-hidden="true" /> : <span className="dot-color" />}
            {label}{k === 'upload' && st === 'doing' && progress > 0 ? ` · ${Math.round(progress * 100)}%` : ''}
          </li>
        );
      })}
    </ol>
  );
}

export default function ClassNoteUpload() {
  const { user } = useAuth();
  const { subjects } = useData();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const kind = params.get('tipo');
  const accept = kind === 'pdf' ? 'application/pdf' : kind === 'foto' ? 'image/jpeg,image/png,image/webp' : ACCEPT;
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(params.get('materia') || '');
  const [date, setDate] = useState(toInput(new Date()));
  const [ocr, setOcr] = useState(has.gemini);
  const [text, setText] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (has.drive) preloadGoogleIdentity().catch(() => {});
  }, []);

  const preview = useMemo(() => (file && isImage(file) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  function pick(f) {
    if (!f) return;
    setFile(f);
    setError('');
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  }

  async function submit(e) {
    e.preventDefault();
    if (!file && !text.trim()) return setError('Elige un archivo o escribe el texto de tu nota.');
    setBusy(true);
    setError('');
    setStages({});
    setProgress(0);
    try {
      let result = { file: null, text: text.trim(), warnings: [] };
      let source = text.trim() ? 'manual' : 'none';
      if (file) {
        const r = await processUpload(file, {
          ocr,
          onStage: (k, st) => setStages((s) => ({ ...s, [k]: st })),
          onProgress: setProgress,
        });
        const merged = [text.trim(), r.text].filter(Boolean).join('\n\n');
        result = { file: r.file, text: merged, warnings: r.warnings };
        source = r.text ? 'gemini' : source;
      }
      const id = await saveClassNote(user.uid, null, {
        title: title || file?.name || 'Nota de clase',
        subjectId,
        classDate: fromInput(date),
        text: result.text,
        file: result.file,
        ocr: source,
      });
      nav(`/clases/${id}`, { state: { warnings: result.warnings } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const route = file ? describeProvider(file) : null;

  return (
    <div className="stack-lg narrow-wide">
      <div>
        <BackLink to="/apuntes">Apuntes</BackLink>
        <h1>Subir apuntes</h1>
      </div>

      <form className="stack" onSubmit={submit}>
        <label
          className={`dropzone ${drag ? 'over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        >
          <input type="file" accept={accept} hidden disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
          {file ? (
            <div className="dropzone-file">
              {preview ? <img src={preview} alt="Vista previa" /> : <FileText size={36} aria-hidden="true" />}
              <div className="grow">
                <strong>{file.name}</strong>
                <span className="small muted">{fmtSize(file.size)}</span>
              </div>
              {!busy && <button type="button" className="icon-btn" aria-label="Quitar archivo" onClick={(e) => { e.preventDefault(); setFile(null); }}><X size={18} /></button>}
            </div>
          ) : (
            <>
              <Upload size={28} aria-hidden="true" />
              <strong>Arrastra una foto o PDF, o toca para elegir</strong>
              <span className="small muted">JPG, PNG, WebP o PDF · hasta 25 MB</span>
            </>
          )}
        </label>

        {route && (
          <p className="notice small">
            {route}
            {ocr && has.gemini ? ' y Gemini extraerá el texto.' : '.'}
          </p>
        )}

        <div className="panel stack">
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ej. Clase 5 · Termodinámica" disabled={busy} />
          </label>
          <div className="grid-2">
            <label>
              Materia
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={busy}>
                <option value="">Sin materia</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              Fecha de la clase
              <input type="date" value={date} max={toInput(new Date())} onChange={(e) => setDate(e.target.value)} disabled={busy} required />
            </label>
          </div>
          {file && (
            <label className="checkbox">
              <input type="checkbox" checked={ocr && has.gemini} disabled={!has.gemini || busy} onChange={(e) => setOcr(e.target.checked)} />
              Extraer el texto con IA (Gemini){!has.gemini && ' — no disponible por ahora'}
            </label>
          )}
          <label>
            {file ? 'Texto adicional (opcional)' : 'Texto de la nota'}
            <textarea value={text} rows={file ? 3 : 8} maxLength={150000} onChange={(e) => setText(e.target.value)} disabled={busy}
              placeholder={file ? 'Si quieres, agrega algo que no esté en el archivo.' : 'También puedes pegar o escribir tus notas sin subir un archivo.'} />
          </label>
        </div>

        {busy && <StageList stages={stages} progress={progress} />}
        {error && <p className="error" role="alert">{error}</p>}

        <div className="row gap end">
          <Link to="/apuntes" className="btn ghost">Cancelar</Link>
          <button className="btn primary" disabled={busy || (!file && !text.trim())}>
            {busy ? 'Procesando…' : file ? 'Subir y procesar' : 'Guardar nota'}
          </button>
        </div>
      </form>

    </div>
  );
}
