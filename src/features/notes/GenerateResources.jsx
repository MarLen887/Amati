import { useState } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createCardsBulk } from '../../core/data/db.js';
import { makeCards, summarize } from '../classnotes/api/gemini.js';
import { has } from '../classnotes/api/integrations.js';
import QuizPanel from './QuizPanel.jsx';

const MIN_CHARS = 80;

// Texto legible de un apunte, sea cual sea su técnica (para enviarlo a la IA)
export function plainNote(n) {
  const c = n.content || {};
  if (n.type === 'cornell') return (c.rows || []).map((r) => `${r.cue} ${r.note}`).join('\n') + '\n' + (c.summary || '');
  if (n.type === 'outline' || n.type === 'libre') return c.text || '';
  return `${c.source || ''}\n${Object.values(c.steps || {}).join('\n')}`;
}

// Genera un resumen y tarjetas de estudio con Gemini a partir de un apunte. Nada se guarda sin que el alumno lo confirme.
// getText: () => texto actual del apunte · subjectId: materia donde se guardan las tarjetas
export default function GenerateResources({ getText, title = '', subjectId = '', topic = '' }) {
  const { user } = useAuth();
  const { subjectMap } = useData();
  const [busy, setBusy] = useState('');
  const [summary, setSummary] = useState('');
  const [cards, setCards] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  if (!has.gemini) {
    return <p className="small muted">Conecta Gemini (VITE_GEMINI_API_KEY) para generar resúmenes y tarjetas desde tus apuntes.</p>;
  }

  async function run(key, fn) {
    const text = getText().trim();
    if (text.length < MIN_CHARS) {
      setError('Escribe un poco más en el apunte para poder generar recursos.');
      return;
    }
    setBusy(key);
    setError('');
    setMsg('');
    try {
      await fn(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
    <section className="panel stack">
      <h2 className="h3 row gap"><Sparkles size={18} aria-hidden="true" /> Generar recursos con IA</h2>
      <p className="small muted">
        Crea un resumen o tarjetas de estudio a partir de este apunte. El texto se envía a Gemini para generarlos; revisa el resultado antes de guardarlo.
      </p>
      <div className="row gap wrap">
        <button type="button" className="btn ghost" disabled={!!busy} onClick={() => run('sum', async (t) => setSummary(await summarize(t)))}>
          <Sparkles size={16} aria-hidden="true" /> {busy === 'sum' ? 'Resumiendo…' : 'Resumir'}
        </button>
        <button type="button" className="btn ghost" disabled={!!busy} onClick={() => run('cards', async (t) => setCards(await makeCards(t, 10)))}>
          <Layers size={16} aria-hidden="true" /> {busy === 'cards' ? 'Creando…' : 'Crear tarjetas'}
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {msg && <p className="notice" role="status">{msg}</p>}

      {summary && (
        <div className="stack-sm">
          <h3 className="h3">Resumen</h3>
          <p className="pre">{summary}</p>
        </div>
      )}

      {cards && (
        cards.length === 0 ? (
          <p className="muted small">No se pudieron generar tarjetas con este texto.</p>
        ) : (
          <div className="stack-sm">
            <h3 className="h3">Tarjetas propuestas ({cards.length})</h3>
            <ul className="trivia-list">{cards.map((c, i) => <li key={i}>{c.front} <span className="muted small">→ {c.back}</span></li>)}</ul>
            {!subjectId && <p className="small muted">Asigna una materia al apunte para poder guardar las tarjetas.</p>}
            <div className="row gap">
              <button type="button" className="btn primary" disabled={!!busy || !subjectId} onClick={async () => {
                setBusy('save');
                setError('');
                try {
                  const n = await createCardsBulk(user.uid, subjectId, cards.map((c) => ({ ...c, topic: c.topic || topic || title.slice(0, 80) })));
                  setCards(null);
                  setMsg(`Se crearon ${n} tarjetas en ${subjectMap[subjectId]?.name || 'tu materia'}.`);
                } catch (e) {
                  setError('No se pudieron guardar las tarjetas. ' + e.message);
                } finally {
                  setBusy('');
                }
              }}>Guardar tarjetas</button>
              <button type="button" className="btn ghost" onClick={() => setCards(null)}>Descartar</button>
            </div>
          </div>
        )
      )}
    </section>
    <QuizPanel getText={getText} />
    </>
  );
}
