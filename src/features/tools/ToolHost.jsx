import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LOADERS } from './toolLoaders.js';
import { TOOLS, AREA_MAP, CATEGORY_MAP } from './tools.js';
import { AreaDots, ToolIcon } from './ToolCard.jsx';
import BackLink from '../../core/components/BackLink.jsx';
import '../../styles/tools.css';

// Cada herramienta se descarga solo cuando se abre (ver toolLoaders.js).
const APPS = Object.fromEntries(Object.entries(LOADERS).map(([id, load]) => [id, lazy(load)]));

export default function ToolHost() {
  const { id } = useParams();
  const tool = TOOLS.find((t) => t.id === id);
  const App = APPS[id];
  if (!tool || !App) return <p>Herramienta no encontrada. <Link to="/herramientas">Ver herramientas</Link></p>;
  return (
    <div className="stack-lg tool-host">
      <div className="stack-sm">
        <BackLink to="/herramientas">Herramientas</BackLink>
        <h1 className="row gap"><span className="tool-icon"><ToolIcon name={tool.icon} /></span> {tool.name}</h1>
        <p className="muted row gap wrap">
          {tool.short}
          <AreaDots areas={tool.areas} />
          <span className="tag">{CATEGORY_MAP[tool.category].name}</span>
          <span className="small muted">{tool.areas.length === 5 ? 'Todas las áreas' : tool.areas.map((a) => AREA_MAP[a].short).join(' · ')}</span>
        </p>
      </div>
      <Suspense fallback={<p className="muted row gap tool-loading" role="status"><LoaderCircle size={18} className="spin" aria-hidden="true" /> Cargando {tool.name}… la primera vez puede tardar un poco.</p>}>
        <App />
      </Suspense>
    </div>
  );
}
