import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createCardsBulk, saveAnnotations } from '../../core/data/db.js';
import { makeCards, summarize } from '../classnotes/api/gemini.js';
import { has } from '../classnotes/api/integrations.js';
import PdfPanel from './PdfPanel.jsx';
import QuizPanel from '../notes/QuizPanel.jsx';
import BackLink from '../../core/components/BackLink.jsx';

// Lector de un PDF propio de la biblioteca: anotar, extraer texto (OCR) y pasarlo por la IA.
export default function PdfBook() {
  const { id } = useParams();
  const { user } = useAuth();
  const { libros, subjectMap } = useData();
  const libro = libros.find((l) => l.id === id);
  const [info, setInfo] = useState(null); // { text, method }
  const [summary, setSummary] = useState('');
  const [cards, setCards] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  if (!libro) return <p>PDF no encontrado. <Link to="/biblioteca">Ir a la biblioteca</Link></p>;
  if (libro.kind !== 'pdf' || !libro.file) return <p>Este libro no tiene un PDF propio. <Link to="/biblioteca">Volver</Link></p>;

  async function run(key, fn) {
    setBusy(key); setError(''); setMsg('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  return (
    <div className="stack-lg">
      <div>
        <BackLink to="/biblioteca">Biblioteca</BackLink>
        <h1>{libro.title}</h1>
        <p className="muted small">{[libro.author, subjectMap[libro.subjectId]?.name].filter(Boolean).join(' · ')}</p>
      </div>

      <PdfPanel
        file={libro.file}
        annotations={libro.annotations || []}
        onSaveAnnotations={(list) => saveAnnotations(user.uid, 'libros', libro.id, list)}
        onAnalyzed={(r) => { setInfo(r); setSummary(''); setCards(null); }}
      />

      {error && <p className="error" role="alert">{error}</p>}
      {msg && <p className="notice" role="status">{msg}</p>}

      {info && (
        <section className="panel stack">
          <h2 className="h3">Texto extraído <span className="tag">{info.method === 'ocr' ? 'OCR' : 'PDF con texto'}</span></h2>
          <textarea readOnly rows={12} value={info.text} aria-label="Texto extraído del PDF" />
          {has.gemini ? (
            <div className="row gap wrap">
              <button className="btn ghost" disabled={!!busy} onClick={() => run('sum', async () => setSummary(await summarize(info.text)))}>
                <Sparkles size={16} aria-hidden="true" /> {busy === 'sum' ? 'Resumiendo…' : 'Resumir con IA'}
              </button>
              <button className="btn ghost" disabled={!!busy || !libro.subjectId} title={libro.subjectId ? '' : 'Asigna una materia al PDF para guardar tarjetas'}
                onClick={() => run('cards', async () => setCards(await makeCards(info.text, 10)))}>
                <Layers size={16} aria-hidden="true" /> {busy === 'cards' ? 'Creando…' : 'Crear tarjetas con IA'}
              </button>
            </div>
          ) : <p className="small muted">Conecta Gemini (VITE_GEMINI_API_KEY) para resumir y crear tarjetas.</p>}
        </section>
      )}

      {info && <QuizPanel getText={() => info.text} />}

      {summary && (
        <section className="panel stack">
          <h2 className="h3">Resumen</h2>
          <p className="pre">{summary}</p>
        </section>
      )}

      {cards && (
        <section className="panel stack">
          <h2 className="h3">Tarjetas propuestas ({cards.length})</h2>
          <ul className="trivia-list">{cards.map((c, i) => <li key={i}>{c.front} <span className="muted small">→ {c.back}</span></li>)}</ul>
          <div className="row gap">
            <button className="btn primary" disabled={!!busy} onClick={() => run('save', async () => {
              const n = await createCardsBulk(user.uid, libro.subjectId, cards.map((c) => ({ ...c, topic: c.topic || libro.title.slice(0, 80) })));
              setCards(null);
              setMsg(`Se crearon ${n} tarjetas en ${subjectMap[libro.subjectId]?.name}.`);
            })}>Guardar tarjetas</button>
            <button className="btn ghost" onClick={() => setCards(null)}>Descartar</button>
          </div>
        </section>
      )}
    </div>
  );
}
