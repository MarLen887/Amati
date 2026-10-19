import { useState } from 'react';
import { ArrowBigUp, CircleCheck, ExternalLink, Search, Sparkles } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';

// Tutor de errores: busca en Stack Overflow (API de Stack Exchange) y, con IA, explica el error en palabras sencillas.
// Sin llave hay ~300 consultas al día por conexión; una llave gratuita (pública) sube el límite: VITE_STACKEXCHANGE_KEY.
const API = 'https://api.stackexchange.com/2.3';
const SITE = 'stackoverflow';
const KEY = import.meta.env.VITE_STACKEXCHANGE_KEY || '';
const EXAMPLES = ['TypeError: Cannot read properties of undefined (reading \'map\')', 'NullPointerException java', 'IndexError: list index out of range', 'CORS error fetch blocked', 'git push rejected non-fast-forward', 'SQL syntax error near'];

async function se(path, params) {
  const qs = new URLSearchParams({ site: SITE, ...params, ...(KEY ? { key: KEY } : {}) });
  let res;
  try { res = await fetch(`${API}${path}?${qs}`); } catch { throw new Error('No se pudo conectar con Stack Exchange. Revisa tu conexión.'); }
  const data = await res.json().catch(() => ({}));
  if (data.error_id === 502 || res.status === 429) throw new Error('Stack Exchange recibió demasiadas consultas desde tu conexión. Inténtalo en unos minutos.');
  if (!res.ok) throw new Error(data.error_message || `Stack Exchange respondió ${res.status}.`);
  return data;
}

// HTML de Stack Overflow -> texto con bloques de código. DOMParser no ejecuta scripts ni carga recursos.
function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks = [];
  for (const el of doc.body.children) {
    if (el.tagName === 'PRE') blocks.push({ code: true, text: el.textContent.replace(/\n$/, '') });
    else if (el.textContent.trim()) blocks.push({ code: false, text: el.textContent.trim() });
  }
  return blocks;
}
const decode = (s) => new DOMParser().parseFromString(s || '', 'text/html').body.textContent;

export default function StackHelp() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [answers, setAnswers] = useState({}); // question_id -> respuesta principal
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ text: '', loading: false });
  const [shown, setShown] = useState(null);

  async function search(term = q) {
    const text = term.trim();
    if (!text) return;
    setBusy(true); setError(''); setResults(null); setAnswers({}); setAi({ text: '', loading: false }); setShown(null);
    try {
      const data = await se('/search/advanced', { q: text.slice(0, 250), order: 'desc', sort: 'relevance', accepted: 'True', pagesize: 6, filter: 'default' });
      const items = data.items || [];
      setResults(items);
      if (items.length) {
        const ids = items.map((i) => i.question_id).join(';');
        const ans = await se(`/questions/${ids}/answers`, { order: 'desc', sort: 'votes', pagesize: 30, filter: 'withbody' });
        const best = {};
        for (const a of ans.items || []) {
          const cur = best[a.question_id];
          const q0 = items.find((i) => i.question_id === a.question_id);
          if (!cur || (a.answer_id === q0?.accepted_answer_id)) best[a.question_id] = a; // prefiere la aceptada
        }
        setAnswers(best);
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function explain() {
    setAi({ text: '', loading: true });
    const context = (results || []).slice(0, 3).map((r, i) => {
      const a = answers[r.question_id];
      return `Pregunta ${i + 1}: ${decode(r.title)}\nRespuesta mejor valorada: ${a ? htmlToBlocks(a.body).map((b) => b.text).join('\n').slice(0, 1400) : '(sin respuesta cargada)'}`;
    }).join('\n\n');
    try {
      const text = await ask(`Eres un tutor de programación amable. Un estudiante tiene este error o duda: "${q.trim().slice(0, 300)}".
Con base en lo que dicen estas preguntas y respuestas de Stack Overflow, explícale en español sencillo:
1) «Qué significa» el error, 2) «Causas más comunes» (lista corta), 3) «Cómo arreglarlo» paso a paso con un ejemplo breve de código si ayuda.
No inventes datos que no estén respaldados; si hay varias causas, dilo.

${context}`);
      setAi({ text, loading: false });
    } catch (e) { setAi({ text: `No pude generar la explicación: ${e.message}`, loading: false }); }
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={250} placeholder="Pega aquí tu error o escribe tu duda (mejor en inglés)…" aria-label="Error o duda" />
          </label>
          <button className="btn primary" disabled={busy || !q.trim()}>{busy ? 'Buscando…' : 'Buscar solución'}</button>
        </form>
        <div className="chips">{EXAMPLES.map((e) => <button key={e} type="button" className="chip" onClick={() => { setQ(e); search(e); }}>{e.length > 38 ? `${e.slice(0, 38)}…` : e}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {results && results.length === 0 && <p className="muted">No encontré preguntas resueltas para eso. Prueba con el mensaje del error en inglés, sin rutas ni nombres propios de tu proyecto.</p>}

      {results?.length > 0 && (
        <>
          {has.gemini && (
            <section className="panel stack">
              <button type="button" className="btn primary" style={{ alignSelf: 'start' }} disabled={ai.loading} onClick={explain}><Sparkles size={15} aria-hidden="true" /> {ai.loading ? 'Leyendo las respuestas…' : 'Explícamelo fácil'}</button>
              {ai.text && <p className="pre repo-ai">{ai.text}</p>}
            </section>
          )}
          <ul className="repo-list">
            {results.map((r) => {
              const a = answers[r.question_id];
              const open = shown === r.question_id;
              return (
                <li key={r.question_id} className="panel repo-card">
                  <a href={r.link} target="_blank" rel="noreferrer noopener" className="repo-name">{decode(r.title)} <ExternalLink size={12} aria-hidden="true" /></a>
                  <div className="small muted row gap wrap">
                    <span className="row gap"><ArrowBigUp size={14} aria-hidden="true" /> {r.score}</span>
                    <span>{r.answer_count} {r.answer_count === 1 ? 'respuesta' : 'respuestas'}</span>
                    <span className="row gap"><CircleCheck size={13} aria-hidden="true" /> resuelta</span>
                    {r.tags.slice(0, 4).map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                  {a && (
                    <>
                      <button type="button" className="link-btn small" style={{ alignSelf: 'start' }} onClick={() => setShown(open ? null : r.question_id)}>{open ? 'Ocultar la respuesta' : 'Ver la mejor respuesta'}</button>
                      {open && (
                        <div className="stack-sm so-answer">
                          {htmlToBlocks(a.body).slice(0, 14).map((b, i) => (b.code ? <pre key={i} className="code-out">{b.text}</pre> : <p key={i} className="small">{b.text}</p>))}
                          <span className="small muted">Respuesta de {decode(a.owner?.display_name || 'anónimo')} · {a.score} votos · <a href={`https://stackoverflow.com/a/${a.answer_id}`} target="_blank" rel="noreferrer noopener">ver original</a> (CC BY-SA)</span>
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="small muted">Contenido de Stack Overflow bajo licencia CC BY-SA, obtenido con la API de Stack Exchange.</p>
    </div>
  );
}
