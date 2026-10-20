import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, Copy, Download, ExternalLink, FileText, Layers, ScanText, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createCardsBulk, deleteClassNote, saveAnnotations, saveClassNote } from '../../core/data/db.js';
import { fmtLong } from '../../core/lib/dates.js';
import { cloudinaryUrl } from './api/cloudinary.js';
import { deleteDriveFile } from './api/drive.js';
import { extractText, makeCards, summarize } from './api/gemini.js';
import QuizPanel from '../notes/QuizPanel.jsx';
import { has } from './api/integrations.js';
import { fetchStoredBlob } from './api/pipeline.js';
import PdfPanel from '../pdf/PdfPanel.jsx';

function Viewer({ file }) {
  if (!file) return null;
  if (file.kind === 'image') {
    return (
      <a href={file.url} target="_blank" rel="noreferrer noopener" className="note-viewer">
        <img src={cloudinaryUrl(file.url, 'f_auto,q_auto,w_1400,c_limit')} alt="Foto de la nota de clase" loading="lazy" />
      </a>
    );
  }
  if (file.provider === 'drive') {
    return <iframe className="note-viewer pdf" title="Vista previa del PDF" src={`https://drive.google.com/file/d/${file.id}/preview`} />;
  }
  // PDF en Cloudinary: se abre en otra pestaña (requiere activar la entrega de PDF en su panel)
  return (
    <a href={file.url} target="_blank" rel="noreferrer noopener" className="note-viewer pdf-link">
      <FileText size={40} aria-hidden="true" />
      <strong>{file.name || 'Abrir PDF'}</strong>
      <span className="small muted">Abrir el PDF en una pestaña nueva</span>
    </a>
  );
}

function Detail({ note }) {
  const { user } = useAuth();
  const { subjects, subjectMap } = useData();
  const nav = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text || '');
  const [subjectId, setSubjectId] = useState(note.subjectId || '');
  const [ocr, setOcr] = useState(note.ocr);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [cards, setCards] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const warnings = location.state?.warnings || [];
  const file = note.file;

  const touch = (fn) => (v) => { fn(v); setDirty(true); setMsg(''); };

  async function run(key, fn) {
    setBusy(key);
    setError('');
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  const save = () => run('save', async () => {
    await saveClassNote(user.uid, note.id, { title, subjectId, classDate: note.classDate, text, file, ocr });
    setDirty(false);
    setMsg('Cambios guardados');
  });

  const reread = () => run('ocr', async () => {
    const t = await extractText(await fetchStoredBlob(file));
    setText(t);
    setOcr('gemini');
    setDirty(true);
    setMsg('Texto extraído. Revísalo y pulsa Guardar.');
  });

  const doSummary = () => run('summary', async () => setSummary(await summarize(text)));

  const doCards = () => run('cards', async () => {
    const list = await makeCards(text, 10);
    if (list.length === 0) throw new Error('No se pudieron crear tarjetas con este texto.');
    setCards(list);
    setPicked(new Set(list.map((_, i) => i)));
  });

  const saveCards = () => run('savecards', async () => {
    const rows = cards.filter((_, i) => picked.has(i)).map((c) => ({ ...c, topic: c.topic || title.slice(0, 80) }));
    const n = await createCardsBulk(user.uid, subjectId, rows);
    setCards(null);
    setMsg(`Se crearon ${n} ${n === 1 ? 'tarjeta' : 'tarjetas'} en ${subjectMap[subjectId]?.name}.`);
  });

  const downloadOriginal = () => run('download', async () => {
    const url = URL.createObjectURL(await fetchStoredBlob(file));
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'apunte.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });

  async function remove() {
    const drive = file?.provider === 'drive';
    if (!confirm(`¿Eliminar "${note.title}"?${drive ? ' También se borrará el PDF de tu Google Drive.' : ''}`)) return;
    setBusy('delete');
    try {
      if (drive) await deleteDriveFile(file.id).catch(() => {}); // si no hay permiso, el archivo queda en tu Drive
      await deleteClassNote(user.uid, note.id);
      nav('/apuntes');
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`${title}\n\n${text}`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\w\-áéíóúñ ]+/gi, '').trim() || 'nota'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const study = (tipo) => `/apuntes/nuevo?${new URLSearchParams({ tipo, fuente: title, ...(subjectId ? { materia: subjectId } : {}) })}`;

  return (
    <div className="stack-lg">
      <div className="stack">
        <Link to="/apuntes" className="small">← Apuntes</Link>
        <input className="title-input" value={title} onChange={(e) => touch(setTitle)(e.target.value)} maxLength={200} aria-label="Título" />
        <p className="small muted">
          {note.classDate ? `Clase del ${fmtLong(note.classDate)}` : ''}
          {file && <>{file.provider === 'drive' ? ' · Google Drive' : ''}{file.kind === 'pdf'
            ? <> · <button type="button" className="link-btn" disabled={!!busy} onClick={downloadOriginal}>Descargar PDF <Download size={12} aria-hidden="true" /></button></>
            : file.url && <> · <a href={file.url} target="_blank" rel="noreferrer noopener">Abrir original <ExternalLink size={12} aria-hidden="true" /></a></>}</>}
        </p>
      </div>

      {warnings.map((w) => (
        <p key={w} className="notice warn small"><CircleAlert size={16} aria-hidden="true" /> {w}</p>
      ))}

      <div className="classnote-layout">
        {file && (
          <div className="classnote-resource">
            {file.kind === 'pdf' ? (
              <PdfPanel
                file={file}
                annotations={note.annotations || []}
                onSaveAnnotations={(list) => saveAnnotations(user.uid, 'classNotes', note.id, list)}
                analyzeLabel="Extraer texto del PDF (OCR si es escaneo)"
                onAnalyzed={(r) => {
                  setText(r.text.slice(0, 150000));
                  setOcr(r.method === 'ocr' ? 'tesseract' : 'pdf');
                  setDirty(true);
                  setMsg('Texto extraído del PDF. Revísalo y pulsa Guardar.');
                }}
              />
            ) : <Viewer file={file} />}
          </div>
        )}

        <section className="stack">
          <label>
            Materia
            <select value={subjectId} onChange={(e) => touch(setSubjectId)(e.target.value)}>
              <option value="">Sin materia</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Texto de la nota {ocr === 'gemini' && <span className="tag pick-tag">Extraído con IA · revísalo</span>}
            <textarea value={text} rows={16} maxLength={150000} onChange={(e) => touch(setText)(e.target.value)}
              placeholder={file ? 'Aún no hay texto. Usa «Extraer texto con IA» o escríbelo aquí.' : 'Escribe aquí tu nota.'} />
          </label>
          <div className="row gap wrap">
            <button className="btn primary" disabled={!dirty || busy === 'save'} onClick={save}>{busy === 'save' ? 'Guardando…' : 'Guardar'}</button>
            <button className="btn ghost" disabled={!text} onClick={() => navigator.clipboard?.writeText(text).then(() => setMsg('Texto copiado'))}><Copy size={14} aria-hidden="true" /> Copiar</button>
            <button className="btn ghost" disabled={!text} onClick={download}><Download size={14} aria-hidden="true" /> .txt</button>
            <button className="btn ghost danger" disabled={busy === 'delete'} onClick={remove}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>
          </div>
        </section>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {msg && <p className="notice saved-toast" role="status"><CircleCheck size={16} aria-hidden="true" /> {msg}</p>}

      <section className="panel stack">
        <h2 className="h3 row gap"><Sparkles size={18} aria-hidden="true" /> Estudiar esta nota</h2>
        {has.gemini ? (
          <div className="row gap wrap">
            {file && (
              <button className="btn ghost" disabled={!!busy} onClick={reread}>
                <ScanText size={16} aria-hidden="true" /> {busy === 'ocr' ? 'Leyendo…' : text ? 'Volver a extraer el texto' : 'Extraer texto con IA'}
              </button>
            )}
            <button className="btn ghost" disabled={!!busy || text.trim().length < 40} onClick={doSummary}>{busy === 'summary' ? 'Resumiendo…' : 'Resumir'}</button>
            <button className="btn ghost" disabled={!!busy || text.trim().length < 40 || !subjectId} onClick={doCards}
              title={subjectId ? '' : 'Elige una materia para guardar las tarjetas'}>
              <Layers size={16} aria-hidden="true" /> {busy === 'cards' ? 'Creando…' : 'Crear tarjetas'}
            </button>
          </div>
        ) : (
          <p className="small muted">Conecta Gemini (VITE_GEMINI_API_KEY) para extraer texto, resumir y crear tarjetas automáticamente.</p>
        )}
        <div className="stack-sm">
          <span className="field-label">Trabajarla con una técnica</span>
          <div className="chips">
            {[['feynman', 'Feynman'], ['cornell', 'Cornell'], ['outline', 'Esquema'], ['srl', 'Autorregulación']].map(([t, l]) => (
              <Link key={t} to={study(t)} className="chip">{l}</Link>
            ))}
          </div>
        </div>
      </section>

      <QuizPanel getText={() => text} />

      {summary && (
        <section className="panel stack">
          <h2 className="h3">Resumen</h2>
          <p className="pre">{summary}</p>
          <div className="row gap">
            <button className="btn small ghost" onClick={() => { setText((t) => `${t}\n\n--- Resumen ---\n${summary}`); setDirty(true); setSummary(''); }}>Agregar a la nota</button>
            <button className="btn small ghost" onClick={() => setSummary('')}>Cerrar</button>
          </div>
        </section>
      )}

      {cards && (
        <section className="panel stack">
          <h2 className="h3">Tarjetas propuestas</h2>
          <p className="small muted">Desmarca las que no quieras. Se guardarán en «{subjectMap[subjectId]?.name}».</p>
          <ul className="trivia-list">
            {cards.map((c, i) => (
              <li key={i}>
                <label className="checkbox">
                  <input type="checkbox" checked={picked.has(i)} onChange={(e) => { const s = new Set(picked); if (e.target.checked) s.add(i); else s.delete(i); setPicked(s); }} />
                  <span>{c.front} <span className="muted small">→ {c.back}</span></span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row gap">
            <button className="btn primary" disabled={busy === 'savecards' || picked.size === 0} onClick={saveCards}>Guardar {picked.size} tarjetas</button>
            <button className="btn ghost" onClick={() => setCards(null)}>Descartar</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ClassNoteDetail() {
  const { id } = useParams();
  const { classNotes, loading } = useData();
  if (loading) return <p className="muted">Cargando…</p>;
  const note = classNotes.find((n) => n.id === id);
  if (!note) return <p>Nota no encontrada. <Link to="/apuntes">Ver mis apuntes</Link></p>;
  return <Detail key={note.id} note={note} />;
}
