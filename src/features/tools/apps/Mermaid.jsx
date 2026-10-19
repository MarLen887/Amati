import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download } from 'lucide-react';
import { download, isDark } from '../lib/theme.js';

// Diagramas con Mermaid.js: escribe el texto y se dibuja al instante (flujo, UML, secuencia, arquitectura, mapas).
const TEMPLATES = [
  {
    id: 'flow', label: 'Diagrama de flujo',
    code: `flowchart TD
  A([Inicio]) --> B[Leer un número]
  B --> C{¿Es par?}
  C -- Sí --> D[Mostrar «par»]
  C -- No --> E[Mostrar «impar»]
  D --> F([Fin])
  E --> F`,
  },
  {
    id: 'uml', label: 'UML (clases)',
    code: `classDiagram
  class Persona {
    +String nombre
    +int edad
    +saludar() String
  }
  class Alumno {
    +String matricula
    +inscribir(curso)
  }
  class Profesor {
    +String departamento
    +calificar(alumno)
  }
  Persona <|-- Alumno
  Persona <|-- Profesor
  Profesor "1" --> "*" Alumno : enseña`,
  },
  {
    id: 'seq', label: 'Secuencia',
    code: `sequenceDiagram
  actor U as Usuario
  participant W as App web
  participant API as Servidor
  participant DB as Base de datos
  U->>W: Inicia sesión
  W->>API: POST /login
  API->>DB: Buscar usuario
  DB-->>API: Datos del usuario
  API-->>W: Token
  W-->>U: Bienvenido`,
  },
  {
    id: 'arch', label: 'Arquitectura',
    code: `flowchart LR
  subgraph Cliente
    A[Navegador]
  end
  subgraph Servidor
    B[API REST] --> C[Lógica de negocio]
  end
  subgraph Datos
    D[(Base de datos)]
    E[(Caché)]
  end
  A --> B
  C --> D
  C --> E`,
  },
  {
    id: 'mind', label: 'Mapa conceptual',
    code: `mindmap
  root((Fotosíntesis))
    Fase luminosa
      Tilacoides
      ATP y NADPH
    Fase oscura
      Ciclo de Calvin
      Glucosa
    Factores
      Luz
      CO₂
      Agua`,
  },
];

let counter = 0;

export default function MermaidTool() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const box = useRef(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (!code.trim()) { setSvg(''); setError(''); return; }
      const id = `mmd-${++counter}`;
      try {
        mermaid.initialize({
          startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'default',
          htmlLabels: false, flowchart: { htmlLabels: false },
        });
        await mermaid.parse(code);
        const out = await mermaid.render(id, code);
        if (alive) { setSvg(out.svg); setError(''); }
      } catch (e) {
        if (alive) setError(String(e.message || e).split('\n')[0]);
      } finally {
        document.getElementById(`d${id}`)?.remove(); // Mermaid deja aquí un elemento temporal cuando falla
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [code]);

  function downloadSvg() {
    if (svg) download('diagrama.svg', svg, 'image/svg+xml');
  }

  function downloadPng() {
    const el = box.current?.querySelector('svg');
    if (!el) return;
    const vb = el.viewBox.baseVal;
    const w = Math.ceil(vb?.width || el.clientWidth) * 2;
    const h = Math.ceil(vb?.height || el.clientHeight) * 2;
    const clone = el.cloneNode(true);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => b && download('diagrama.png', b), 'image/png');
    };
    img.onerror = () => setError('No se pudo crear la imagen PNG. Descarga el SVG.');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  }

  return (
    <div className="stack-lg">
      <div className="chips" role="group" aria-label="Plantillas">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="chip" onClick={() => setCode(t.code)}>{t.label}</button>
        ))}
      </div>

      <div className="diagram-split">
        <section className="panel stack">
          <label>
            <span className="side-title">Código del diagrama</span>
            <textarea className="mono-ish diagram-code" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={16} />
          </label>
          <p className="small muted">
            Elige una plantilla para empezar y cámbiala. Guía de sintaxis en{' '}
            <a href="https://mermaid.js.org/intro/syntax-reference.html" target="_blank" rel="noreferrer noopener">mermaid.js.org</a>.
          </p>
        </section>

        <section className="panel stack">
          <div className="row between wrap gap">
            <span className="side-title">Vista previa</span>
            <span className="row gap">
              <button type="button" className="btn small ghost" disabled={!svg} onClick={downloadSvg}><Download size={14} aria-hidden="true" /> SVG</button>
              <button type="button" className="btn small ghost" disabled={!svg} onClick={downloadPng}><Download size={14} aria-hidden="true" /> PNG</button>
            </span>
          </div>
          {error && <p className="error small" role="alert">Revisa la sintaxis: {error}</p>}
          <div ref={box} className="diagram-preview" dangerouslySetInnerHTML={{ __html: svg }} />
        </section>
      </div>
    </div>
  );
}
