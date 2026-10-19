import { Link } from 'react-router-dom';
import {
  Apple, ArrowLeftRight, MapPin, Sheet, ChartPie, BookOpenText, Shuffle, Database, GitBranch, LifeBuoy, Terminal, Atom, BookSearch, Bone, Briefcase, CalendarCheck, Calculator, ChartColumn, ChartLine, CircuitBoard,
  ClipboardList, Code, Cpu, Dna, FlaskConical, Globe, History, Landmark, Languages, LayoutDashboard, Music, Network, Palette,
  Orbit, PenLine, Pill, Quote, Shapes, Sigma, SpellCheck, Star, Stethoscope, TrendingUp, Workflow, Wrench,
} from 'lucide-react';
import { AREA_MAP, CATEGORY_MAP } from './tools.js';

const ICONS = {
  Apple, ArrowLeftRight, MapPin, Sheet, ChartPie, BookOpenText, Shuffle, Database, GitBranch, LifeBuoy, Terminal, Atom, BookSearch, Bone, Briefcase, CalendarCheck, Calculator, ChartColumn, ChartLine, CircuitBoard,
  ClipboardList, Code, Cpu, Dna, FlaskConical, Globe, History, Landmark, Languages, LayoutDashboard, Music, Network, Palette,
  Orbit, PenLine, Pill, Quote, Shapes, Sigma, SpellCheck, Stethoscope, TrendingUp, Workflow,
};

export function ToolIcon({ name, size = 22 }) {
  const I = ICONS[name] || Wrench;
  return <I size={size} strokeWidth={1.8} aria-hidden="true" />;
}

// Puntos de color: a qué áreas sirve la herramienta
export function AreaDots({ areas }) {
  return (
    <span className="area-dots" aria-label={`Áreas: ${areas.map((a) => AREA_MAP[a].short).join(', ')}`}>
      {areas.map((a) => <span key={a} className="dot" title={AREA_MAP[a].name} style={{ '--area': AREA_MAP[a].color }} />)}
    </span>
  );
}

function FavButton({ tool, fav, onFav }) {
  return (
    <button type="button" className={`fav-btn ${fav ? 'on' : ''}`} aria-pressed={!!fav} aria-label={`${fav ? 'Quitar de' : 'Agregar a'} favoritas: ${tool.name}`} onClick={() => onFav(tool.id)}>
      <Star size={16} aria-hidden="true" fill={fav ? 'currentColor' : 'none'} />
    </button>
  );
}

const Open = ({ tool, children, className }) =>
  tool.status === 'ready' && tool.to
    ? <Link to={tool.to} className={className}>{children}</Link>
    : <div className={`${className} is-soon`}>{children}</div>;

// Tarjeta: icono, nombre, descripción corta y a quién sirve
export function ToolCard({ tool, fav, onFav, showAreas = false }) {
  const area = tool.areas.length === 1 ? AREA_MAP[tool.areas[0]] : null;
  return (
    <article className="panel tool-card" style={area ? { '--area': area.color } : undefined}>
      <FavButton tool={tool} fav={fav} onFav={onFav} />
      <Open tool={tool} className="tool-body">
        <span className="tool-icon"><ToolIcon name={tool.icon} /></span>
        <strong>{tool.name}</strong>
        <span className="small muted">{tool.short}</span>
        <span className="row gap wrap tool-meta">
          {showAreas ? <AreaDots areas={tool.areas} /> : <span className="tag">{CATEGORY_MAP[tool.category].name}</span>}
          {tool.status === 'soon' && <span className="tag soon-tag">Próximamente</span>}
        </span>
      </Open>
    </article>
  );
}

// Fila compacta para la vista de lista
export function ToolRow({ tool, fav, onFav }) {
  return (
    <div className="tool-row">
      <Open tool={tool} className="tool-row-body">
        <span className="tool-icon sm"><ToolIcon name={tool.icon} size={18} /></span>
        <span className="tool-row-text">
          <strong>{tool.name}</strong>
          <span className="small muted">{tool.short}</span>
        </span>
        <AreaDots areas={tool.areas} />
        <span className="tag tool-cat">{CATEGORY_MAP[tool.category].name}</span>
        {tool.status === 'soon' && <span className="tag soon-tag">Próximamente</span>}
      </Open>
      <FavButton tool={tool} fav={fav} onFav={onFav} />
    </div>
  );
}
