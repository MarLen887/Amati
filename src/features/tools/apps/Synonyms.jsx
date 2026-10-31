import { useState } from 'react';
import { Copy, Search, Sparkles } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';

// Sinónimos, antónimos, rimas y asociaciones. Inglés: Datamuse (gratuita, sin llave, 100 000 consultas/día).
// Datamuse no cubre relaciones de significado en español, así que en español se usa Gemini (si está configurado).
const API = 'https://api.datamuse.com/words';
const MODES = [
  { id: 'syn', label: 'Sinónimos', hint: 'Palabras que significan lo mismo', param: 'rel_syn', ai: 'sinónimos' },
  { id: 'ml', label: 'Relacionadas', hint: 'Palabras con significado parecido o del mismo tema', param: 'ml', ai: 'palabras relacionadas por significado o tema' },
  { id: 'ant', label: 'Antónimos', hint: 'Lo contrario', param: 'rel_ant', ai: 'antónimos' },
  { id: 'rhy', label: 'Rimas', hint: 'Palabras que riman', param: 'rel_rhy', ai: 'palabras que riman (rima consonante)' },
  { id: 'trg', label: 'Asociadas', hint: 'Palabras que suelen aparecer junto a esta', param: 'rel_trg', ai: 'palabras que suelen aparecer junto a esta (asociaciones)' },
];
const EXAMPLES = { en: ['important', 'energy', 'happy', 'create'], es: ['importante', 'energía', 'feliz', 'crear'] };

async function datamuse(word, param) {
  let res;
  try { res = await fetch(`${API}?${param}=${encodeURIComponent(word)}&max=40&md=p`); } catch { throw new Error('No se pudo conectar con Datamuse. Revisa tu conexión.'); }
  if (!res.ok) throw new Error(`Datamuse respondió ${res.status}.`);
  return (await res.json()).map((w) => ({ word: w.word, pos: (w.tags || []).find((t) => ['n', 'v', 'adj', 'adv'].includes(t)) }));
}

async function viaAi(word, mode) {
  const raw = await ask(`Dame hasta 20 ${mode.ai} de la palabra en español "${word}". Responde SOLO con un arreglo JSON de cadenas, de la más a la menos adecuada, sin repetir la palabra original.`, { json: true });
  const list = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim());
  return (Array.isArray(list) ? list : []).filter((x) => typeof x === 'string').slice(0, 20).map((w) => ({ word: w.trim() }));
}

const POS = { n: 'sustantivo', v: 'verbo', adj: 'adjetivo', adv: 'adverbio' };

export default function Synonyms() {
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('syn');
  const [q, setQ] = useState('');
  const [word, setWord] = useState('');
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const m = MODES.find((x) => x.id === mode);
  const spanishOk = has.gemini;

  async function search(term = q, md = mode, lg = lang) {
    const w = term.trim().toLowerCase();
    if (!w) return;
    setQ(w); setWord(w); setBusy(true); setError(''); setItems(null);
    const cfg = MODES.find((x) => x.id === md);
    try {
      setItems(lg === 'en' ? await datamuse(w, cfg.param) : await viaAi(w, cfg));
    } catch (e) { setError(e instanceof SyntaxError ? 'La IA no devolvió una lista válida. Inténtalo de nuevo.' : e.message); } finally { setBusy(false); }
  }

  const copy = (t) => { navigator.clipboard?.writeText(t); setCopied(t); setTimeout(() => setCopied(''), 1200); };

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <div className="view-switch" role="group" aria-label="Idioma">
            <button type="button" className={lang === 'en' ? 'active' : ''} aria-pressed={lang === 'en'} onClick={() => { setLang('en'); setItems(null); }}>Inglés</button>
            <button type="button" className={lang === 'es' ? 'active' : ''} aria-pressed={lang === 'es'} onClick={() => { setLang('es'); setItems(null); }}>Español</button>
          </div>
          <div className="chips" role="group" aria-label="Qué buscar">
            {MODES.map((x) => <button key={x.id} type="button" title={x.hint} className={`chip ${mode === x.id ? 'active' : ''}`} aria-pressed={mode === x.id} onClick={() => { setMode(x.id); if (word) search(word, x.id); }}>{x.label}</button>)}
          </div>
        </div>
        <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === 'en' ? 'Escribe una palabra en inglés…' : 'Escribe una palabra en español…'} aria-label="Palabra" autoComplete="off" spellCheck="false" />
          </label>
          <button className="btn primary" disabled={busy || !q.trim() || (lang === 'es' && !spanishOk)}>{busy ? 'Buscando…' : 'Buscar'}</button>
        </form>
        <div className="chips">{EXAMPLES[lang].map((w) => <button key={w} type="button" className="chip" disabled={lang === 'es' && !spanishOk} onClick={() => search(w)}>{w}</button>)}</div>
        {lang === 'es' && !spanishOk && <p className="notice warn small">Las relaciones de significado en español no están disponibles por ahora. En inglés funcionan sin problema.</p>}
        {lang === 'es' && spanishOk && <p className="small muted row gap"><Sparkles size={13} aria-hidden="true" /> En español los resultados los genera la IA; revisa que se ajusten a tu contexto.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {items && (
        <section className="panel stack" aria-live="polite">
          <h2 className="h3">{m.label} de «{word}» <span className="tag">{items.length}</span></h2>
          {items.length === 0 ? <p className="muted">No encontré {m.label.toLowerCase()} para esa palabra. Prueba con otra forma de la palabra o cambia el tipo de búsqueda.</p> : (
            <ul className="word-chips">
              {items.map((it) => (
                <li key={it.word}>
                  <button type="button" className="word-chip" onClick={() => search(it.word)} title="Buscar esta palabra">
                    {it.word}{it.pos && <span className="small muted"> {POS[it.pos]}</span>}
                  </button>
                  <button type="button" className="word-copy" aria-label={`Copiar ${it.word}`} onClick={() => copy(it.word)}>{copied === it.word ? '✓' : <Copy size={12} aria-hidden="true" />}</button>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">Toca una palabra para explorar sus propias relaciones; el icono la copia.</p>
        </section>
      )}
      <p className="small muted">{lang === 'en' ? 'Datos de la API de Datamuse.' : 'Resultados generados con IA.'}</p>
    </div>
  );
}
