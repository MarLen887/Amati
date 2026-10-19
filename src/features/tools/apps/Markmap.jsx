import { useEffect, useMemo, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap as MarkmapView } from 'markmap-view';
import { Download, Maximize2 } from 'lucide-react';
import { download } from '../lib/theme.js';

// Mapas mentales con Markmap: escribe o pega un esquema (con sangría o en Markdown) y se dibuja solo.
const SAMPLE = `Sistema cardiovascular
  Corazón
    Aurículas
    Ventrículos
    Válvulas
  Vasos sanguíneos
    Arterias
    Venas
    Capilares
  Sangre
    Plasma
    Glóbulos rojos
    Plaquetas
  Funciones
    Transportar oxígeno
    Regular la temperatura`;

const transformer = new Transformer();

// Si el texto no usa marcas de Markdown (#, -, *), se interpreta la sangría como niveles del mapa
function toMarkdown(text) {
  const lines = text.replace(/\t/g, '  ').split('\n').filter((l) => l.trim());
  if (!lines.length) return '';
  if (lines.some((l) => /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s)/.test(l))) return text;
  const stack = []; // anchos de sangría por nivel
  const out = [];
  lines.forEach((l, i) => {
    const indent = l.length - l.trimStart().length;
    if (i === 0) { out.push(`# ${l.trim()}`); return; }
    while (stack.length && indent <= stack[stack.length - 1]) stack.pop();
    stack.push(indent);
    out.push(`${'  '.repeat(stack.length - 1)}- ${l.trim()}`);
  });
  return out.join('\n');
}

export default function MarkmapTool() {
  const [text, setText] = useState(SAMPLE);
  const svgRef = useRef(null);
  const mmRef = useRef(null);
  const markdown = useMemo(() => toMarkdown(text), [text]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    if (!markdown.trim()) {
      mmRef.current?.destroy?.();
      mmRef.current = null;
      svg.innerHTML = '';
      return undefined;
    }
    const { root } = transformer.transform(markdown);
    if (!mmRef.current) svg.innerHTML = '';
    if (!mmRef.current) mmRef.current = MarkmapView.create(svg, { duration: 300, maxWidth: 260 }, root);
    else { mmRef.current.setData(root); mmRef.current.fit(); }
    return undefined;
  }, [markdown]);

  useEffect(() => () => { mmRef.current?.destroy?.(); mmRef.current = null; }, []);

  function downloadSvg() {
    const el = svgRef.current;
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.fontFamily = 'Segoe UI, Arial, sans-serif';
    const box = el.getBoundingClientRect();
    clone.setAttribute('width', Math.round(box.width));
    clone.setAttribute('height', Math.round(box.height));
    download('mapa-mental.svg', new XMLSerializer().serializeToString(clone), 'image/svg+xml');
  }

  return (
    <div className="stack-lg">
      <div className="diagram-split">
        <section className="panel stack">
          <label>
            <span className="side-title">Tu esquema</span>
            <textarea className="mono-ish diagram-code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={16} />
          </label>
          <p className="small muted">
            La primera línea es el tema central. Cada nivel de sangría es una rama más profunda. También acepta Markdown (<code>#</code> títulos y <code>-</code> listas).
          </p>
          <div className="row gap wrap">
            <button type="button" className="btn small ghost" onClick={() => setText(SAMPLE)}>Ejemplo</button>
            <button type="button" className="btn small ghost" onClick={() => download('esquema.md', markdown, 'text/markdown')} disabled={!markdown}>
              <Download size={14} aria-hidden="true" /> Markdown
            </button>
          </div>
        </section>

        <section className="panel stack">
          <div className="row between wrap gap">
            <span className="side-title">Mapa mental</span>
            <span className="row gap">
              <button type="button" className="btn small ghost" onClick={() => mmRef.current?.fit()}><Maximize2 size={14} aria-hidden="true" /> Ajustar</button>
              <button type="button" className="btn small ghost" onClick={downloadSvg} disabled={!markdown}><Download size={14} aria-hidden="true" /> SVG</button>
            </span>
          </div>
          <svg ref={svgRef} className="markmap-svg" aria-label="Mapa mental generado" role="img" />
          <p className="small muted">Arrastra para mover, usa la rueda para acercar y haz clic en un círculo para plegar o desplegar una rama.</p>
        </section>
      </div>
    </div>
  );
}
