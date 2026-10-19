import { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';

const EXAMPLES = [
  ['Energía', 'E = mc^2'],
  ['Integral', '\\int_0^\\infty e^{-x}\\,dx = 1'],
  ['Fracción', '\\frac{a+b}{c}'],
  ['Raíz', 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'],
  ['Sumatoria', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'],
];

// Diálogo para escribir o editar una fórmula LaTeX con vista previa en vivo (KaTeX).
export default function MathDialog({ init, onSubmit, onDelete, onClose }) {
  const [latex, setLatex] = useState(init.latex || '');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || '\\ ', { displayMode: init.block, throwOnError: false });
    } catch {
      return '';
    }
  }, [latex, init.block]);

  return (
    <div className="math-backdrop" role="dialog" aria-modal="true" aria-label={init.block ? 'Fórmula en bloque' : 'Fórmula en línea'}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form className="panel stack math-dialog" onSubmit={(e) => { e.preventDefault(); if (latex.trim()) onSubmit(latex.trim()); }}>
        <h2>{init.pos !== undefined ? 'Editar fórmula' : init.block ? 'Fórmula en bloque' : 'Fórmula en línea'}</h2>
        <label>
          Escribe en LaTeX
          <textarea ref={ref} rows={3} value={latex} onChange={(e) => setLatex(e.target.value)} className="mono-ish" placeholder="E = mc^2" />
        </label>
        <div className="chips" aria-label="Ejemplos">
          {EXAMPLES.map(([n, l]) => <button key={n} type="button" className="chip" onClick={() => setLatex(l)}>{n}</button>)}
        </div>
        <div className="math-preview" aria-live="polite" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="row gap">
          {onDelete && <button type="button" className="btn ghost danger" onClick={onDelete}>Quitar</button>}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={!latex.trim()}>{init.pos !== undefined ? 'Actualizar' : 'Insertar'}</button>
        </div>
      </form>
    </div>
  );
}
