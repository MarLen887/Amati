import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TOOLS, AREA_MAP, CATEGORY_MAP } from './tools.js';
import { AreaDots, ToolIcon } from './ToolCard.jsx';
import '../../styles/tools.css';

// Cada herramienta se descarga solo cuando se abre (las librerías pesan bastante).
const APPS = {
  calc: lazy(() => import('./apps/Calculator.jsx')),
  algebra: lazy(() => import('./apps/Algebra.jsx')),
  graph: lazy(() => import('./apps/Grapher.jsx')),
  physics: lazy(() => import('./apps/Physics.jsx')),
  molecules: lazy(() => import('./apps/Molecules.jsx')),
  code: lazy(() => import('./apps/Code.jsx')),
  sql: lazy(() => import('./apps/SqlLab.jsx')),
  github: lazy(() => import('./apps/Github.jsx')),
  stack: lazy(() => import('./apps/StackHelp.jsx')),
  spell: lazy(() => import('./apps/Spell.jsx')),
  translate: lazy(() => import('./apps/Translator.jsx')),
  dictionary: lazy(() => import('./apps/Dictionary.jsx')),
  synonyms: lazy(() => import('./apps/Synonyms.jsx')),
  worldbank: lazy(() => import('./apps/WorldBank.jsx')),
  inegi: lazy(() => import('./apps/Inegi.jsx')),
  excel: lazy(() => import('./apps/Excel.jsx')),
  dashboard: lazy(() => import('./apps/Dashboard.jsx')),
  mermaid: lazy(() => import('./apps/Mermaid.jsx')),
  markmap: lazy(() => import('./apps/Markmap.jsx')),
  flow: lazy(() => import('./apps/FlowEditor.jsx')),
  timeline: lazy(() => import('./apps/TimelineTool.jsx')),
};

export default function ToolHost() {
  const { id } = useParams();
  const tool = TOOLS.find((t) => t.id === id);
  const App = APPS[id];
  if (!tool || !App) return <p>Herramienta no encontrada. <Link to="/herramientas">Ver herramientas</Link></p>;
  return (
    <div className="stack-lg tool-host">
      <div className="stack-sm">
        <Link to="/herramientas" className="small">← Herramientas</Link>
        <h1 className="row gap"><span className="tool-icon"><ToolIcon name={tool.icon} /></span> {tool.name}</h1>
        <p className="muted row gap wrap">
          {tool.short}
          <AreaDots areas={tool.areas} />
          <span className="tag">{CATEGORY_MAP[tool.category].name}</span>
          <span className="small muted">{tool.areas.length === 5 ? 'Todas las áreas' : tool.areas.map((a) => AREA_MAP[a].short).join(' · ')}</span>
        </p>
      </div>
      <Suspense fallback={<p className="muted">Cargando herramienta…</p>}>
        <App />
      </Suspense>
    </div>
  );
}
