import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Copy, Languages, Volume2 } from 'lucide-react';
import { canAutoDetect, LANGS, provider, translate } from '../lib/translate.js';
import { canSpeak, speak } from '../lib/speak.js';

// Traductor: español ↔ inglés, francés, portugués, alemán e italiano.
const MAX = 3000;
const PAIRS = [['es', 'en'], ['en', 'es'], ['es', 'fr'], ['es', 'pt']];

export default function Translator() {
  const [from, setFrom] = useState('es');
  const [to, setTo] = useState('en');
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [detected, setDetected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function go(t = text, f = from, tg = to) {
    if (!t.trim()) { setOut(''); return; }
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true); setError(''); setDetected('');
    try {
      const r = await translate(t.trim(), f, tg, abort.current.signal);
      setOut(r.text || ''); setDetected(r.detected || '');
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); } finally { setBusy(false); }
  }

  function swap() {
    if (from === 'auto') return;
    const [f, t] = [to, from];
    setFrom(f); setTo(t); setText(out); setOut(text);
    if (out) go(out, f, t);
  }

  const options = canAutoDetect ? [['auto', 'Detectar idioma'], ...LANGS] : LANGS;

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <div className="chips">{PAIRS.map(([a, b]) => <button key={a + b} type="button" className={`chip ${from === a && to === b ? 'active' : ''}`} onClick={() => { setFrom(a); setTo(b); if (text.trim()) go(text, a, b); }}>{a.toUpperCase()} → {b.toUpperCase()}</button>)}</div>
        </div>
        <div className="translate-grid">
          <div className="stack-sm">
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Idioma de origen">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <textarea rows={8} value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="Escribe o pega el texto a traducir…" aria-label="Texto original"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } }} />
            <div className="row gap between"><span className="small muted">{text.length} / {MAX}</span>
              {canSpeak && text && from !== 'auto' && <button type="button" className="btn small ghost" onClick={() => speak(text, from)}><Volume2 size={13} aria-hidden="true" /> Escuchar</button>}</div>
          </div>
          <button type="button" className="btn ghost swap-btn" onClick={swap} disabled={from === 'auto'} aria-label="Intercambiar idiomas"><ArrowLeftRight size={16} aria-hidden="true" /></button>
          <div className="stack-sm">
            <select value={to} onChange={(e) => { setTo(e.target.value); if (text.trim()) go(text, from, e.target.value); }} aria-label="Idioma de destino">{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <textarea rows={8} value={out} readOnly placeholder="La traducción aparecerá aquí." aria-label="Traducción" aria-live="polite" />
            <div className="row gap between">
              <span className="small muted">{detected ? `Idioma detectado: ${detected}` : ''}</span>
              <span className="row gap">
                {canSpeak && out && <button type="button" className="btn small ghost" onClick={() => speak(out, to)}><Volume2 size={13} aria-hidden="true" /> Escuchar</button>}
                {out && <button type="button" className="btn small ghost" onClick={() => navigator.clipboard?.writeText(out)}><Copy size={13} aria-hidden="true" /> Copiar</button>}
              </span>
            </div>
          </div>
        </div>
        <div className="row gap wrap">
          <button className="btn primary" disabled={busy || !text.trim()} onClick={() => go()}><Languages size={16} aria-hidden="true" /> {busy ? 'Traduciendo…' : 'Traducir'}</button>
          <span className="small muted">Ctrl + Enter también traduce</span>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      <p className="small muted">Traducción automática con {provider}{provider === 'MyMemory' ? ' (gratuita, con límite diario)' : ''}. Revisa las traducciones importantes: pueden contener errores.</p>
    </div>
  );
}
