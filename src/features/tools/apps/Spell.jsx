import { useMemo, useRef, useState } from 'react';
import { CircleCheck, ExternalLink, Pencil, SpellCheck, Sparkles, Wand2 } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';

// Corrector de ortografía, gramática y estilo con LanguageTool (API pública gratuita: ~20 revisiones por minuto
// y hasta 20 000 caracteres por texto). Para más volumen, usa tu propio servidor con VITE_LANGUAGETOOL_URL.
const URL_LT = (import.meta.env.VITE_LANGUAGETOOL_URL || 'https://api.languagetool.org').replace(/\/$/, '');
const MAX = 20000;

const LANGS = [
  ['auto', 'Detectar idioma'], ['es', 'Español'], ['en-US', 'Inglés (EE. UU.)'], ['en-GB', 'Inglés (Reino Unido)'],
  ['fr', 'Francés'], ['de-DE', 'Alemán'], ['pt-PT', 'Portugués'], ['it', 'Italiano'],
];
const KIND = {
  misspelling: { label: 'Ortografía', cls: 'sp' },
  grammar: { label: 'Gramática', cls: 'gr' },
  typographical: { label: 'Tipografía', cls: 'ty' },
  style: { label: 'Estilo', cls: 'st' },
};
const kindOf = (m) => {
  const t = m.rule?.issueType;
  if (KIND[t]) return KIND[t];
  if (m.rule?.category?.id === 'TYPOS') return KIND.misspelling;
  return t === 'uncategorized' || !t ? KIND.grammar : KIND.style;
};

const EXAMPLES = [
  ['Español', 'es', 'Ayer fuimos al cine y habian muchas personas haciendo fila. El ensallo que escribi tiene varios herrores, pero espero que a ti te guste.'],
  ['English', 'en-US', 'Their going to the libary tomorow. She dont like to study, but he do it every days.'],
];

async function check(text, language, signal) {
  const body = new URLSearchParams({ text, language, level: 'default', ...(language === 'auto' ? { preferredVariants: 'en-US,de-DE,pt-PT' } : {}) });
  let res;
  try { res = await fetch(`${URL_LT}/v2/check`, { method: 'POST', body, signal }); } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('No se pudo conectar con LanguageTool. Revisa tu conexión.'); }
  if (res.status === 429) throw new Error('LanguageTool recibió demasiadas revisiones seguidas. Espera un minuto.');
  if (res.status === 413) throw new Error('El texto es demasiado largo. Revísalo por partes.');
  if (!res.ok) throw new Error(`LanguageTool respondió ${res.status}.`);
  return res.json();
}

export default function Spell() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('auto');
  const [matches, setMatches] = useState(null); // null = aún sin revisar
  const [reviewed, setReviewed] = useState('');
  const [detected, setDetected] = useState('');
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ id: null, text: '', loading: false });
  const area = useRef(null);

  async function run(t = text, l = lang) {
    if (!t.trim()) return;
    setBusy(true); setError(''); setAi({ id: null, text: '', loading: false });
    try {
      const data = await check(t, l);
      const list = data.matches.map((m, i) => ({ ...m, id: i })).sort((a, b) => a.offset - b.offset);
      setMatches(list); setReviewed(t); setSel(list[0]?.id ?? null);
      setDetected(data.language?.detectedLanguage?.name || data.language?.name || '');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // Aplica una sugerencia y ajusta las posiciones de los demás errores (sin volver a llamar a la API)
  function apply(m, rep) {
    const next = reviewed.slice(0, m.offset) + rep + reviewed.slice(m.offset + m.length);
    const delta = rep.length - m.length;
    const rest = matches.filter((x) => x.id !== m.id && (x.offset + x.length <= m.offset || x.offset >= m.offset + m.length))
      .map((x) => (x.offset >= m.offset + m.length ? { ...x, offset: x.offset + delta } : x));
    setReviewed(next); setText(next); setMatches(rest);
    setSel(rest.find((x) => x.offset >= m.offset)?.id ?? rest[0]?.id ?? null);
    setAi({ id: null, text: '', loading: false });
  }

  function fixAll() {
    let t = reviewed;
    for (const m of [...matches].sort((a, b) => b.offset - a.offset)) {
      const r = m.replacements?.[0]?.value;
      if (r !== undefined && kindOf(m) !== KIND.style) t = t.slice(0, m.offset) + r + t.slice(m.offset + m.length);
    }
    setText(t); setMatches(null); run(t);
  }

  async function explain(m) {
    setAi({ id: m.id, text: '', loading: true });
    const frag = reviewed.slice(Math.max(0, m.offset - 60), m.offset + m.length + 60);
    try {
      const out = await ask(`Eres un profesor de lengua amable. Explica en español sencillo, en 3 o 4 líneas, este error de redacción y la regla que lo explica, con un ejemplo correcto breve.
Fragmento: "${frag}"
Parte con problema: "${reviewed.slice(m.offset, m.offset + m.length)}"
Aviso de LanguageTool: ${m.message}
Sugerencias: ${(m.replacements || []).slice(0, 3).map((r) => r.value).join(', ') || 'ninguna'}`);
      setAi({ id: m.id, text: out, loading: false });
    } catch (e) { setAi({ id: m.id, text: `No pude generar la explicación: ${e.message}`, loading: false }); }
  }

  // Texto dividido en trozos normales y trozos con error (para subrayar)
  const segments = useMemo(() => {
    if (!matches) return [];
    const out = [];
    let pos = 0;
    for (const m of matches) {
      if (m.offset < pos) continue;
      if (m.offset > pos) out.push({ t: reviewed.slice(pos, m.offset) });
      out.push({ t: reviewed.slice(m.offset, m.offset + m.length) || ' ', m });
      pos = m.offset + m.length;
    }
    if (pos < reviewed.length) out.push({ t: reviewed.slice(pos) });
    return out;
  }, [matches, reviewed]);

  const counts = useMemo(() => {
    const c = {};
    (matches || []).forEach((m) => { const k = kindOf(m).label; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [matches]);
  const current = matches?.find((m) => m.id === sel);
  const editing = matches === null;

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap between">
          <div className="row gap wrap">
            <select value={lang} onChange={(e) => { setLang(e.target.value); }} aria-label="Idioma del texto">{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            {!editing && detected && <span className="tag">Detectado: {detected}</span>}
          </div>
          <span className="small muted">{text.length.toLocaleString('es-MX')} / {MAX.toLocaleString('es-MX')} caracteres</span>
        </div>

        {editing ? (
          <>
            <textarea ref={area} rows={11} value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="Escribe o pega aquí tu texto (ensayo, correo, tarea…) y pulsa «Revisar»." aria-label="Texto a revisar" spellCheck="false" />
            <div className="row gap wrap">
              <button className="btn primary" disabled={busy || !text.trim()} onClick={() => run()}><SpellCheck size={16} aria-hidden="true" /> {busy ? 'Revisando…' : 'Revisar texto'}</button>
              <span className="small muted">Pruébalo con:</span>
              {EXAMPLES.map(([n, l, t]) => <button key={n} type="button" className="chip" onClick={() => { setText(t); setLang(l); }}>{n}</button>)}
            </div>
          </>
        ) : (
          <>
            <div className="spell-view" aria-label="Texto revisado">
              {segments.map((s, i) => (s.m
                ? <mark key={i} className={`spell-hit ${kindOf(s.m).cls} ${s.m.id === sel ? 'on' : ''}`} onClick={() => setSel(s.m.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(s.m.id)}>{s.t}</mark>
                : <span key={i}>{s.t}</span>))}
            </div>
            <div className="row gap wrap">
              <button className="btn ghost" onClick={() => { setMatches(null); setTimeout(() => area.current?.focus(), 0); }}><Pencil size={15} aria-hidden="true" /> Editar texto</button>
              <button className="btn ghost" disabled={busy} onClick={() => run(reviewed)}>{busy ? 'Revisando…' : 'Volver a revisar'}</button>
              {matches.some((m) => m.replacements?.length && kindOf(m) !== KIND.style) && <button className="btn primary" onClick={fixAll}><Wand2 size={15} aria-hidden="true" /> Corregir ortografía y gramática</button>}
              <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(reviewed)}>Copiar texto</button>
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {matches && (
        <section className="panel stack" aria-live="polite">
          {matches.length === 0 ? (
            <p className="row gap"><CircleCheck size={18} aria-hidden="true" style={{ color: 'var(--teal)' }} /> <strong>¡Todo bien!</strong> No encontré errores en tu texto.</p>
          ) : (
            <>
              <div className="row gap wrap">
                <h2 className="h3">{matches.length} {matches.length === 1 ? 'sugerencia' : 'sugerencias'}</h2>
                {Object.entries(counts).map(([k, n]) => <span key={k} className="tag">{k}: {n}</span>)}
              </div>
              {current ? (
                <div className={`spell-card ${kindOf(current).cls}`}>
                  <div className="row gap wrap"><span className="tag">{kindOf(current).label}</span><strong>«{reviewed.slice(current.offset, current.offset + current.length)}»</strong></div>
                  <p>{current.message}</p>
                  {current.rule?.description && <p className="small muted">Regla: {current.rule.description}</p>}
                  {current.replacements?.length > 0 ? (
                    <div className="chips" aria-label="Sugerencias">{current.replacements.slice(0, 6).map((r) => <button key={r.value} type="button" className="chip" onClick={() => apply(current, r.value)}>{r.value || '(quitar)'}</button>)}</div>
                  ) : <p className="small muted">Sin sugerencia automática: revísalo con tu criterio.</p>}
                  <div className="row gap wrap">
                    <button type="button" className="btn small ghost" onClick={() => setMatches((l) => l.filter((x) => x.id !== current.id))}>Ignorar</button>
                    {has.gemini && <button type="button" className="btn small ghost" disabled={ai.loading} onClick={() => explain(current)}><Sparkles size={13} aria-hidden="true" /> {ai.loading && ai.id === current.id ? 'Explicando…' : 'Explícame la regla'}</button>}
                    {current.rule?.urls?.[0]?.value && <a className="small row gap" href={current.rule.urls[0].value} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} aria-hidden="true" /> Más información</a>}
                  </div>
                  {ai.id === current.id && ai.text && <p className="pre repo-ai">{ai.text}</p>}
                </div>
              ) : <p className="small muted">Elige un error subrayado en el texto o de la lista.</p>}
              <ul className="spell-list">
                {matches.map((m) => (
                  <li key={m.id}><button type="button" className={`spell-item ${m.id === sel ? 'on' : ''}`} onClick={() => setSel(m.id)}>
                    <span className={`dot-k ${kindOf(m).cls}`} aria-hidden="true" />
                    <span className="grow">«{reviewed.slice(m.offset, m.offset + m.length) || '…'}»{m.replacements?.[0] ? ` → ${m.replacements[0].value}` : ''}</span>
                    <span className="small muted">{kindOf(m).label}</span>
                  </button></li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      <p className="small muted">Revisión con LanguageTool. Tu texto se envía a su servidor ({new URL(URL_LT).host}) para revisarlo: no incluyas datos personales.</p>
    </div>
  );
}
