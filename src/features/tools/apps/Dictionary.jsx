import { useEffect, useState } from 'react';
import { ExternalLink, Languages, Search, Volume2 } from 'lucide-react';
import { translate } from '../lib/translate.js';
import { canSpeak, speak } from '../lib/speak.js';

// Diccionario de inglés. Información básica: Dictionary API (gratuita, sin llave).
// Información avanzada (ejemplos reales, etimología, frecuencia): Wordnik, con llave gratuita VITE_WORDNIK_API_KEY
// (https://developer.wordnik.com). Con la llave en el navegador, protégela por dominio y no la uses con datos privados.
const DICT = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const WORDNIK = 'https://api.wordnik.com/v4/word.json';
const WK = import.meta.env.VITE_WORDNIK_API_KEY || '';
const EXAMPLES = ['implement', 'ubiquitous', 'resilient', 'scope', 'leverage', 'ambiguous'];
const POS = { noun: 'sustantivo', verb: 'verbo', adjective: 'adjetivo', adverb: 'adverbio', pronoun: 'pronombre', preposition: 'preposición', conjunction: 'conjunción', interjection: 'interjección', exclamation: 'exclamación' };

async function wk(word, path, params = {}) {
  const qs = new URLSearchParams({ api_key: WK, ...params });
  const res = await fetch(`${WORDNIK}/${encodeURIComponent(word)}/${path}?${qs}`);
  if (res.status === 401 || res.status === 403) throw new Error('La llave de Wordnik no es válida.');
  if (res.status === 429) throw new Error('Wordnik alcanzó su límite de consultas por hora.');
  if (!res.ok) throw new Error(`Wordnik respondió ${res.status}.`);
  return res.json();
}
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

function Sparkline({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 260, h = 48;
  const pts = data.map((d, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - 3 - (d.count / max) * (h - 8)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`Frecuencia de uso de ${data[0].year} a ${data[data.length - 1].year}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--navy)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Dictionary() {
  const [q, setQ] = useState('');
  const [word, setWord] = useState('');
  const [entries, setEntries] = useState(null);
  const [adv, setAdv] = useState(null); // { examples, ety, freq, related }
  const [advErr, setAdvErr] = useState('');
  const [tr, setTr] = useState({}); // texto -> traducción
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem('amati-dict-hist')) || []; } catch { return []; } });
  useEffect(() => { try { localStorage.setItem('amati-dict-hist', JSON.stringify(hist)); } catch { /* sin almacenamiento */ } }, [hist]);

  async function lookup(term = q) {
    const w = term.trim().toLowerCase();
    if (!w) return;
    setQ(w); setWord(w); setBusy(true); setError(''); setEntries(null); setAdv(null); setAdvErr(''); setTr({});
    try {
      const res = await fetch(`${DICT}/${encodeURIComponent(w)}`).catch(() => { throw new Error('No se pudo conectar con el diccionario. Revisa tu conexión.'); });
      if (res.status === 404) throw new Error(`No encontré «${w}». Revisa la ortografía (este diccionario es de inglés) o prueba con la forma base de la palabra.`);
      if (!res.ok) throw new Error(`El diccionario respondió ${res.status}.`);
      setEntries(await res.json());
      setHist((h) => [w, ...h.filter((x) => x !== w)].slice(0, 12));
      translateText(w);
      if (WK) loadAdvanced(w);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function loadAdvanced(w) {
    const [ex, et, fr, rel] = await Promise.allSettled([
      wk(w, 'examples', { limit: 5, useCanonical: true }), wk(w, 'etymologies', { useCanonical: true }),
      wk(w, 'frequency', { startYear: 1900, endYear: 2012, useCanonical: true }), wk(w, 'relatedWords', { useCanonical: true, limitPerRelationshipType: 8 }),
    ]);
    const bad = [ex, et, fr, rel].find((r) => r.status === 'rejected' && /llave|límite/.test(r.reason?.message));
    if (bad) setAdvErr(bad.reason.message);
    setAdv({
      examples: ex.status === 'fulfilled' ? (ex.value.examples || []).slice(0, 5) : [],
      ety: et.status === 'fulfilled' ? et.value.map(stripTags).filter(Boolean) : [],
      freq: fr.status === 'fulfilled' ? fr.value : null,
      related: rel.status === 'fulfilled' ? rel.value : [],
    });
  }

  async function translateText(t) {
    if (tr[t]) return;
    setTr((m) => ({ ...m, [t]: '…' }));
    try { setTr((m) => ({ ...m, [t]: '' })); const r = await translate(t, 'en', 'es'); setTr((m) => ({ ...m, [t]: r.text })); } catch (e) { setTr((m) => ({ ...m, [t]: `(${e.message})` })); }
  }

  const first = entries?.[0];
  const phon = first?.phonetics?.find((p) => p.text && p.audio) || first?.phonetics?.find((p) => p.text) || first?.phonetics?.[0];
  const audios = [...new Set((entries || []).flatMap((e) => e.phonetics || []).filter((p) => p.audio).map((p) => p.audio))].slice(0, 2);
  const meanings = (entries || []).flatMap((e) => e.meanings);

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe una palabra en inglés (ej. implement)…" aria-label="Palabra en inglés" autoComplete="off" spellCheck="false" />
          </label>
          <button className="btn primary" disabled={busy || !q.trim()}>{busy ? 'Buscando…' : 'Buscar'}</button>
        </form>
        <div className="chips">{(hist.length ? hist : EXAMPLES).slice(0, 8).map((w) => <button key={w} type="button" className="chip" onClick={() => lookup(w)}>{w}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {first && (
        <section className="panel stack">
          <div className="row gap wrap">
            <h2 className="dict-word">{first.word}</h2>
            {phon?.text && <span className="muted mono-ish">{phon.text}</span>}
            {audios.map((a, i) => <button key={a} type="button" className="btn small ghost" onClick={() => new Audio(a).play().catch(() => {})}><Volume2 size={14} aria-hidden="true" /> Escuchar{audios.length > 1 ? ` ${i + 1}` : ''}</button>)}
            {!audios.length && canSpeak && <button type="button" className="btn small ghost" onClick={() => speak(first.word, 'en')}><Volume2 size={14} aria-hidden="true" /> Escuchar</button>}
          </div>
          <p className="row gap wrap"><Languages size={15} aria-hidden="true" /> <span className="small muted">En español:</span> <strong>{tr[word] && tr[word] !== '…' ? tr[word] : '…'}</strong></p>

          {meanings.map((m, i) => (
            <div key={i} className="stack-sm dict-meaning">
              <span className="tag">{POS[m.partOfSpeech] || m.partOfSpeech}</span>
              <ol className="dict-defs">
                {m.definitions.slice(0, 4).map((d, j) => (
                  <li key={j}>
                    <p>{d.definition}</p>
                    {d.example && <p className="small muted dict-ex">“{d.example}”</p>}
                    {tr[d.definition] ? <p className="small dict-tr">{tr[d.definition]}</p> : <button type="button" className="link-btn small" onClick={() => translateText(d.definition)}>Traducir al español</button>}
                  </li>
                ))}
              </ol>
              {m.synonyms?.length > 0 && <p className="small"><span className="muted">Sinónimos:</span> {m.synonyms.slice(0, 8).map((s) => <button key={s} type="button" className="link-btn" onClick={() => lookup(s)} style={{ marginRight: '0.5rem' }}>{s}</button>)}</p>}
              {m.antonyms?.length > 0 && <p className="small"><span className="muted">Antónimos:</span> {m.antonyms.slice(0, 6).map((s) => <button key={s} type="button" className="link-btn" onClick={() => lookup(s)} style={{ marginRight: '0.5rem' }}>{s}</button>)}</p>}
            </div>
          ))}
          {first.sourceUrls?.[0] && <a className="small row gap" href={first.sourceUrls[0]} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} aria-hidden="true" /> Fuente (Wiktionary)</a>}
        </section>
      )}

      {first && (
        <section className="panel stack" aria-label="Información avanzada">
          <h2 className="h3">Más a fondo <span className="tag">Wordnik</span></h2>
          {!WK ? (
            <p className="small muted">Para ver ejemplos reales, etimología y frecuencia de uso, agrega tu llave gratuita de Wordnik en <code>VITE_WORDNIK_API_KEY</code> (se pide en developer.wordnik.com).</p>
          ) : advErr ? <p className="error" role="alert">{advErr}</p> : !adv ? <p className="muted small">Consultando Wordnik…</p> : (
            <>
              {adv.examples.length > 0 && (
                <div className="stack-sm"><strong className="small">Ejemplos reales</strong>
                  <ul className="dict-defs plain">{adv.examples.map((e, i) => <li key={i} className="small"><span className="dict-ex">“{e.text}”</span>{e.title && <span className="muted"> — {e.title}{e.year ? `, ${e.year}` : ''}</span>}</li>)}</ul></div>
              )}
              {adv.ety.length > 0 && <div className="stack-sm"><strong className="small">Etimología</strong>{adv.ety.map((e, i) => <p key={i} className="small">{e}</p>)}</div>}
              {adv.freq?.frequency?.length > 1 && (
                <div className="stack-sm"><strong className="small">Frecuencia de uso (1900–2012)</strong><Sparkline data={adv.freq.frequency} /><span className="small muted">{adv.freq.totalCount?.toLocaleString('es-MX')} apariciones en su corpus</span></div>
              )}
              {adv.related.length > 0 && (
                <div className="stack-sm"><strong className="small">Palabras relacionadas</strong>
                  {adv.related.map((r) => <p key={r.relationshipType} className="small"><span className="muted">{r.relationshipType}:</span> {r.words.slice(0, 8).map((s) => <button key={s} type="button" className="link-btn" onClick={() => lookup(s)} style={{ marginRight: '0.5rem' }}>{s}</button>)}</p>)}</div>
              )}
              {!adv.examples.length && !adv.ety.length && !adv.freq && !adv.related.length && <p className="small muted">Wordnik no tiene información avanzada de esta palabra.</p>}
            </>
          )}
        </section>
      )}
      <p className="small muted">Definiciones: Dictionary API (Wiktionary). Traducción al español automática: revísala con criterio.</p>
    </div>
  );
}
