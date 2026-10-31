import { useEffect, useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin, Trigger } from '@react-pdf-viewer/highlight';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import { Highlighter, Trash2 } from 'lucide-react';
import Loader from '../../core/components/Loader.jsx';
import '../../styles/pdf.css';

const themeNow = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
};

// Lector de PDF (React PDF Viewer) con resaltado y comentarios.
// annotations: [{ id, quote, comment, highlightAreas }]  ·  onChange(nuevas) las guarda quien lo use.
export default function PdfReader({ blob, annotations = [], onChange, readOnly = false }) {
  // La dirección temporal se crea y se libera dentro del efecto: si se creara al renderizar, React (modo estricto)
  // la liberaría antes de que el visor la use y el PDF fallaría con «Unexpected server response (0)».
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  const [selected, setSelected] = useState(null);

  // Barra compacta: página «1 / 3» siempre en una sola línea, zoom y búsqueda; el resto sobra en pantallas chicas
  const layout = defaultLayoutPlugin({
    sidebarTabs: (defaults) => defaults.slice(0, 2), // miniaturas e índice
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(t) => (
          <div className="pdf-toolbar">
            <div className="pdf-tb-group"><t.ShowSearchPopover /></div>
            <div className="pdf-tb-group pdf-tb-pages">
              <t.GoToPreviousPage />
              <span className="pdf-page-ind"><t.CurrentPageInput /><span aria-hidden="true">/</span><t.NumberOfPages /></span>
              <t.GoToNextPage />
            </div>
            <div className="pdf-tb-group pdf-tb-zoom"><t.ZoomOut /><t.Zoom /><t.ZoomIn /></div>
            <div className="pdf-tb-group"><t.EnterFullScreen /></div>
          </div>
        )}
      </Toolbar>
    ),
  });

  const highlight = highlightPlugin({
    trigger: readOnly ? Trigger.None : Trigger.TextSelection,
    renderHighlightTarget: (p) => (
      <div className="pdf-target" style={{ left: `${p.selectionRegion.left}%`, top: `${p.selectionRegion.top + p.selectionRegion.height}%` }}>
        <button type="button" className="btn small primary" onClick={() => {
          const note = { id: Math.random().toString(36).slice(2), quote: p.selectedText.slice(0, 500), comment: '', highlightAreas: p.highlightAreas };
          onChange?.([...annotations, note]);
          setSelected(note.id);
          p.cancel();
        }}>
          <Highlighter size={14} aria-hidden="true" /> Resaltar
        </button>
      </div>
    ),
    renderHighlights: (p) => (
      <div>
        {annotations.map((n) => n.highlightAreas.filter((a) => a.pageIndex === p.pageIndex).map((a, i) => (
          <div key={`${n.id}-${i}`} className={`pdf-hl ${n.id === selected ? 'on' : ''}`}
            style={p.getCssProperties(a, p.rotation)} onClick={() => setSelected(n.id)} title={n.comment || n.quote} />
        )))}
      </div>
    ),
  });

  const patch = (id, fields) => onChange?.(annotations.map((n) => (n.id === id ? { ...n, ...fields } : n)));

  return (
    <div className="pdf-reader">
      <div className="pdf-main">
        <Worker workerUrl={workerUrl}>
          {url ? <Viewer fileUrl={url} theme={themeNow()} plugins={[layout, highlight]} /> : <Loader label="Abriendo PDF…" />}
        </Worker>
      </div>
      <aside className="pdf-notes" aria-label="Anotaciones">
        <h3 className="h3">Anotaciones ({annotations.length})</h3>
        {annotations.length === 0 && <p className="small muted">{readOnly ? 'Sin anotaciones.' : 'Selecciona texto en el PDF y pulsa «Resaltar».'}</p>}
        <ul className="pdf-note-list">
          {annotations.map((n) => (
            <li key={n.id} className={n.id === selected ? 'on' : ''}>
              <button type="button" className="pdf-quote" onClick={() => { setSelected(n.id); highlight.jumpToHighlightArea(n.highlightAreas[0]); }}>
                «{n.quote.length > 140 ? `${n.quote.slice(0, 140)}…` : n.quote}»
                <span className="small muted"> · pág. {n.highlightAreas[0].pageIndex + 1}</span>
              </button>
              <textarea rows={2} value={n.comment} maxLength={500} placeholder="Tu comentario…" readOnly={readOnly}
                onChange={(e) => patch(n.id, { comment: e.target.value })} aria-label="Comentario de la anotación" />
              {!readOnly && (
                <button type="button" className="btn small ghost danger" onClick={() => onChange?.(annotations.filter((x) => x.id !== n.id))}>
                  <Trash2 size={13} aria-hidden="true" /> Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
