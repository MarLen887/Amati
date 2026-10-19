import { useMemo, useState } from 'react';
import nerdamer from 'nerdamer';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Álgebra y cálculo simbólico con Nerdamer: resolver, derivar, integrar, simplificar, factorizar y expandir.
const OPS = [
  { id: 'solve', label: 'Resolver ecuación', needsVar: true, ph: 'x^2 - 5x + 6 = 0', run: (e, v) => `solve(${e}, ${v})` },
  { id: 'diff', label: 'Derivar', needsVar: true, ph: 'x^3 * sin(x)', run: (e, v) => `diff(${e}, ${v})` },
  { id: 'integrate', label: 'Integrar', needsVar: true, ph: 'x^2 + 3x', run: (e, v) => `integrate(${e}, ${v})` },
  { id: 'simplify', label: 'Simplificar', ph: '(x^2 - 1)/(x - 1)', run: (e) => `simplify(${e})` },
  { id: 'factor', label: 'Factorizar', ph: 'x^2 - 4', run: (e) => `factor(${e})` },
  { id: 'expand', label: 'Expandir', ph: '(x + 1)^3', run: (e) => `expand(${e})` },
];

const tex = (s) => {
  try { return katex.renderToString(s, { throwOnError: false, displayMode: true }); } catch { return ''; }
};

// «solve» devuelve un vector {a, b}: lo mostramos como lista de soluciones
function format(op, node) {
  const text = node.toString();
  if (op.id === 'solve') {
    const sols = text.replace(/^\[|\]$|^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    return { text, sols: sols.map((s) => ({ text: s, tex: nerdamer(s).toTeX() })) };
  }
  return { text, tex: node.toTeX() };
}

export default function Algebra() {
  const [opId, setOpId] = useState('solve');
  const [expr, setExpr] = useState('');
  const [v, setV] = useState('x');
  const [out, setOut] = useState(null);
  const [error, setError] = useState('');
  const op = OPS.find((o) => o.id === opId);

  function go(e) {
    e.preventDefault();
    setError(''); setOut(null);
    const src = expr.trim();
    if (!src) return;
    try {
      const node = nerdamer(op.run(src, v.trim() || 'x'));
      const r = format(op, node);
      if (!r.text || /undefined|NaN/.test(r.text)) throw new Error('sin resultado');
      setOut({ ...r, input: tex(nerdamer(src.split('=')[0]).toTeX() + (src.includes('=') ? `=${nerdamer(src.split('=')[1]).toTeX()}` : '')) });
    } catch {
      setError('No pude resolver esa expresión. Revisa que esté bien escrita (usa * para multiplicar si hace falta, por ejemplo 2*x).');
    }
  }

  const numeric = useMemo(() => {
    if (!out || opId === 'solve') return '';
    try {
      const n = nerdamer(out.text).evaluate().text();
      return /^-?[\d.e+-]+$/.test(n) && n !== out.text ? n : '';
    } catch { return ''; }
  }, [out, opId]);

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="chips" role="group" aria-label="Operación">
          {OPS.map((o) => <button key={o.id} type="button" className={`chip ${o.id === opId ? 'active' : ''}`} aria-pressed={o.id === opId} onClick={() => { setOpId(o.id); setOut(null); setError(''); }}>{o.label}</button>)}
        </div>
        <form className="stack" onSubmit={go}>
          <div className="row gap wrap">
            <input className="grow mono-ish calc-input" value={expr} onChange={(e) => setExpr(e.target.value)} placeholder={`Ej. ${op.ph}`} aria-label="Expresión" spellCheck="false" autoComplete="off" />
            {op.needsVar && (
              <label className="row gap small" style={{ flexDirection: 'row', alignItems: 'center' }}>
                respecto a
                <input value={v} onChange={(e) => setV(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1))} style={{ width: '3rem', textAlign: 'center' }} aria-label="Variable" maxLength={1} />
              </label>
            )}
            <button className="btn primary" type="submit">{op.label}</button>
          </div>
          <button type="button" className="link-btn small" style={{ alignSelf: 'start' }} onClick={() => setExpr(op.ph)}>Usar el ejemplo: {op.ph}</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {out && (
        <section className="panel stack" aria-live="polite">
          <h2 className="h3">Resultado</h2>
          <div className="math-preview" dangerouslySetInnerHTML={{ __html: out.input }} />
          {out.sols ? (
            out.sols.length === 0 ? <p className="muted">La ecuación no tiene solución con esta variable.</p> : (
              <ul className="stack-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {out.sols.map((s, i) => <li key={i} className="row gap"><span className="tag">{v || 'x'}{out.sols.length > 1 ? ` ${i + 1}` : ''}</span><span dangerouslySetInnerHTML={{ __html: katex.renderToString(`${v || 'x'} = ${s.tex}`, { throwOnError: false }) }} /> <span className="small muted mono-ish">({s.text})</span></li>)}
              </ul>
            )
          ) : (
            <>
              <div className="math-preview" dangerouslySetInnerHTML={{ __html: tex(out.tex + (opId === 'integrate' ? '+ C' : '')) }} />
              <p className="small muted mono-ish">{out.text}{opId === 'integrate' ? ' + C' : ''}</p>
              {numeric && <p className="small">Valor numérico: <strong>{numeric}</strong></p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
