import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Rows3, Search, Star, X } from 'lucide-react';
import EmptyState from '../../core/components/EmptyState.jsx';
import { AREAS, AREA_MAP, CATEGORIES, CATEGORY_MAP, isGeneral, TOOLS } from './tools.js';
import { ToolCard, ToolRow, ToolIcon } from './ToolCard.jsx';
import '../../styles/tools.css';

// Preferencias del usuario en este dispositivo (vista, área propia, favoritas, filtros)
function usePref(key, initial) {
  const k = `amati-tools-${key}`;
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(k); return s === null ? initial : JSON.parse(s); } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }, [k, v]);
  return [v, setV];
}

const VIEWS = [
  { id: 'area', label: 'Por área', Icon: LayoutGrid, hint: 'Secciones por área de la universidad' },
  { id: 'need', label: 'Por necesidad', Icon: Rows3, hint: 'Secciones por lo que quieres hacer' },
  { id: 'list', label: 'Lista', Icon: List, hint: 'Compacta, para encontrar rápido' },
];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const toggle = (arr, id) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export default function Tools() {
  const [view, setView] = usePref('view', 'area');
  const [myArea, setMyArea] = usePref('my-area', '');
  const [favs, setFavs] = usePref('favs', []);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = norm(q.trim());
    return TOOLS.filter((t) => !myArea || isGeneral(t) || t.areas.includes(myArea))
      .filter((t) => !onlyFavs || favs.includes(t.id))
      .filter((t) => !needle || norm(`${t.name} ${t.short} ${CATEGORY_MAP[t.category].name} ${t.areas.map((a) => AREA_MAP[a].name).join(' ')}`).includes(needle));
  }, [q, onlyFavs, favs, myArea]);

  const filtered = onlyFavs || q.trim() !== '';
  const clear = () => { setOnlyFavs(false); setQ(''); };
  const toggleFav = (id) => setFavs((f) => toggle(f, id));
  const pickMyArea = (id) => setMyArea(id);

  // Secciones según la organización elegida
  const sections = useMemo(() => {
    if (view === 'list') return [{ key: 'all', title: '', items: list }];
    if (view === 'need') {
      return CATEGORIES.map((c) => ({ key: c.id, title: c.name, icon: c.icon, items: list.filter((t) => t.category === c.id) })).filter((s) => s.items.length);
    }
    const out = AREAS.map((a) => ({ key: a.id, title: a.name, color: a.color, icon: a.icon, mine: a.id === myArea, items: list.filter((t) => !isGeneral(t) && t.areas.includes(a.id)) }));
    out.sort((a, b) => Number(!!b.mine) - Number(!!a.mine));
    out.push({ key: 'general', title: 'Para todas las carreras', icon: 'Globe', items: list.filter(isGeneral) });
    return out.filter((s) => s.items.length);
  }, [view, list, myArea]);

  const favTools = useMemo(() => TOOLS.filter((t) => favs.includes(t.id)), [favs]);
  const Card = view === 'list' ? ToolRow : ToolCard;

  return (
    <div className="stack-lg tools-page">
      <header className="page-head stack-sm">
        <h1>Herramientas</h1>
        <p className="muted">Recursos para tu carrera y tus materias. Elige tu área y marca tus favoritas con la estrella.</p>
      </header>

      <section className="panel stack tools-onboard" aria-label="Elige tu área" data-tour="tools-area">
        <strong>Área</strong>
        <span className="small muted">Así te mostramos lo tuyo. Puedes cambiarla o ver todas cuando quieras.</span>
        <div className="chips" role="group" aria-label="Área">
          {AREAS.map((a) => (
            <button key={a.id} type="button" className={`chip area-chip ${myArea === a.id ? 'active' : ''}`} style={{ '--area': a.color }}
              aria-pressed={myArea === a.id} onClick={() => pickMyArea(a.id)}>
              <ToolIcon name={a.icon} size={14} /> {a.name}
            </button>
          ))}
          <button type="button" className={`chip ${myArea === '' ? 'active' : ''}`} aria-pressed={myArea === ''} onClick={() => pickMyArea('')}>Ver todas</button>
        </div>
      </section>

      <div className="tools-bar">
        <label className="search-inline grow">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar herramienta, materia o área…" aria-label="Buscar herramientas" />
        </label>
        <div className="view-switch" role="group" aria-label="Organización" data-tour="tools-views">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={view === v.id ? 'active' : ''} aria-pressed={view === v.id} title={v.hint} onClick={() => setView(v.id)}>
              <v.Icon size={15} aria-hidden="true" /> <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tools-controls">
        <button type="button" className={`chip ${onlyFavs ? 'active' : ''}`} aria-pressed={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}>
          <Star size={13} aria-hidden="true" /> Solo favoritas ({favs.length})
        </button>
      </div>

      {filtered && (
        <p className="small muted row gap wrap" role="status">
          {list.length} {list.length === 1 ? 'herramienta' : 'herramientas'}
          <button type="button" className="link-btn" onClick={clear}><X size={12} aria-hidden="true" /> Limpiar filtros</button>
        </p>
      )}

      {!filtered && favTools.length > 0 && (
        <section className="stack-sm" aria-label="Favoritas">
          <h2 className="h3 row gap"><Star size={16} aria-hidden="true" /> Tus favoritas</h2>
          <ul className={`tool-grid ${view === 'list' ? 'as-list' : ''}`}>
            {favTools.map((t) => <li key={t.id}><Card tool={t} fav onFav={toggleFav} /></li>)}
          </ul>
        </section>
      )}

      {sections.length === 0 ? (
        <section className="panel">
          <EmptyState title="Sin resultados" actions={<button type="button" className="btn ghost" onClick={clear}>Limpiar filtros</button>}>
            <p>Prueba con otra palabra o quita algún filtro.</p>
          </EmptyState>
        </section>
      ) : sections.map((s, i) => (
        <section key={`${view}-${s.key}-${q ? 'q' : ''}`} className="tool-section" style={s.color ? { '--area': s.color } : undefined} aria-label={s.title || 'Herramientas'}>
          {s.title ? (
            <details open={q.trim() !== '' || filtered || s.mine || s.key === 'general' || i < 2 || view !== 'area'}>
              <summary className="tool-section-head">
                <ToolIcon name={s.icon} size={18} />
                <h2 className="h3">{s.title}</h2>
                {s.mine && <span className="tag pick-tag">Mi área</span>}
                <span className="tag">{s.items.length}</span>
              </summary>
              <ul className="tool-grid">{s.items.map((t) => <li key={t.id}><Card tool={t} fav={favs.includes(t.id)} onFav={toggleFav} showAreas={view === 'need'} /></li>)}</ul>
            </details>
          ) : (
            <ul className="tool-grid as-list">{s.items.map((t) => <li key={t.id}><Card tool={t} fav={favs.includes(t.id)} onFav={toggleFav} /></li>)}</ul>
          )}
        </section>
      ))}

    </div>
  );
}
