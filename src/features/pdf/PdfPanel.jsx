import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BookOpen, CircleCheck, CircleAlert, Loader2, ScanSearch } from 'lucide-react';
import { fetchStoredBlob } from '../classnotes/api/pipeline.js';
import Loader from '../../core/components/Loader.jsx';

// El lector, Tesseract y pdf.js pesan bastante: se descargan solo al abrir un PDF.
const PdfReader = lazy(() => import('./PdfReader.jsx'));

const STAGES = [
  ['detect', 'Detectar si tiene texto o es un escaneo'],
  ['ocr', 'Reconocer texto (OCR con Tesseract)'],
];
const MAX_ANNOTATIONS = 100;

// Lector + anotaciones + análisis de un PDF guardado (nota de clase o libro propio).
//   file: { provider, id, url, kind:'pdf' }   annotations/onSaveAnnotations: se guardan con debounce
//   onAnalyzed({ text, method, warnings }): quien lo use decide qué hacer con el texto
export default function PdfPanel({ file, annotations: initial = [], onSaveAnnotations, onAnalyzed, analyzeLabel = 'Extraer texto del PDF' }) {
  const [blob, setBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [annotations, setAnnotations] = useState(initial);
  const [stages, setStages] = useState({});
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const timer = useRef(null);
  const abort = useRef(null);

  useEffect(() => () => { clearTimeout(timer.current); abort.current?.abort(); }, []);
  // Los PDFs en la nube se abren solos; los de Google Drive esperan un clic (piden permiso en una ventana)
  useEffect(() => { if (file.provider !== 'drive') open(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureBlob() {
    if (blob) return blob;
    setLoading(true);
    try {
      const b = await fetchStoredBlob(file);
      setBlob(b);
      return b;
    } finally {
      setLoading(false);
    }
  }

  async function open() {
    setError('');
    try { await ensureBlob(); } catch (e) { setError(e.message); }
  }

  function change(next) {
    const list = next.slice(0, MAX_ANNOTATIONS);
    setAnnotations(list);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSaveAnnotations?.(list).catch((e) => setError('No se pudieron guardar las anotaciones. ' + e.message)), 1200);
  }

  async function analyze() {
    setError(''); setWarnings([]); setStages({}); setProgress(0); setAnalyzing(true);
    abort.current = new AbortController();
    try {
      const b = await ensureBlob();
      const { analyzePdf } = await import('./pipeline.js');
      const r = await analyzePdf(b, {
        name: file.name || 'documento.pdf', signal: abort.current.signal, onProgress: setProgress,
        onStage: (k, s) => setStages((p) => ({ ...p, [k]: s })),
      });
      setWarnings(r.warnings);
      onAnalyzed?.(r);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="stack pdf-panel" aria-label="Lector de PDF">
      <div className="row gap wrap">
        {!blob && (loading ? <p className="muted small" role="status">Descargando PDF…</p> : (
          <button type="button" className="btn primary" disabled={loading} onClick={open}>
            <BookOpen size={16} aria-hidden="true" /> {error ? 'Reintentar' : 'Abrir en el lector'}
          </button>
        ))}
        {onAnalyzed && (
          <button type="button" className="btn ghost" disabled={analyzing || loading} onClick={analyze}>
            <ScanSearch size={16} aria-hidden="true" /> {analyzing ? 'Procesando…' : analyzeLabel}
          </button>
        )}
      </div>

      {(analyzing || Object.keys(stages).length > 0) && (
        <ul className="stack-sm" aria-live="polite" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {STAGES.filter(([k]) => stages[k] && stages[k] !== 'skip').map(([k, label]) => (
            <li key={k} className="small row gap">
              {stages[k] === 'doing' ? <Loader2 size={14} className="spin" aria-hidden="true" />
                : stages[k] === 'error' ? <CircleAlert size={14} aria-hidden="true" /> : <CircleCheck size={14} aria-hidden="true" />}
              {label}{k === 'ocr' && stages[k] === 'doing' ? ` · ${Math.round(progress * 100)}%` : ''}
            </li>
          ))}
          {stages.ocr === 'doing' && <li className="pdf-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress * 100}%` }} /></li>}
        </ul>
      )}
      {warnings.map((w) => <p key={w} className="notice warn small"><CircleAlert size={16} aria-hidden="true" /> {w}</p>)}
      {error && <p className="error" role="alert">{error}</p>}

      {blob && (
        <Suspense fallback={<Loader label="Abriendo lector…" />}>
          <PdfReader blob={blob} annotations={annotations} onChange={change} />
        </Suspense>
      )}
    </section>
  );
}
