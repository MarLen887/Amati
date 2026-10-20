import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { setSubjectTools } from '../../core/data/db.js';
import EmptyState from '../../core/components/EmptyState.jsx';
import { AREAS, AREA_MAP, isGeneral, TOOLS } from '../tools/tools.js';
import { ToolIcon } from '../tools/ToolCard.jsx';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const READY = TOOLS.filter((t) => t.status === 'ready');

// Elegir las herramientas de esta materia (se guarda al marcar o desmarcar)
function AddToolsModal({ subject, onClose }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picked = subject.toolIds || [];

  const sections = useMemo(() => {
    const needle = norm(q.trim());
    const match = (t) => !needle || norm(`${t.name} ${t.short}`).includes(needle);
    const out = AREAS.map((a) => ({ key: a.id, title: a.name, items: READY.filter((t) => !isGeneral(t) && t.areas.includes(a.id) && match(t)) }));
    out.push({ key: 'general', title: 'Para todas las carreras', items: READY.filter((t) => isGeneral(t) && match(t)) });
    return out.filter((s) => s.items.length);
  }, [q]);

  async function toggle(id) {
    setBusy(true);
    setError('');
    try {
      await setSubjectTools(user.uid, subject.id, picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    } catch (e) {
      setError('No se pudo guardar. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-tools-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="panel stack modal-card tools-picker">
        <div className="row between">
          <h2 id="add-tools-title" className="h3">Herramientas para {subject.name}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        </div>
        <label className="search-inline">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar herramienta…" aria-label="Buscar herramienta" autoFocus />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="tools-picker-list">
          {sections.length === 0 && <p className="muted small">Ninguna herramienta coincide.</p>}
          {sections.map((s) => (
            <section key={s.key} className="stack-sm">
              <h3 className="small muted">{s.title}</h3>
              <ul className="tools-picker-items">
                {s.items.map((t) => (
                  <li key={t.id}>
                    <label className="checkbox tool-check">
                      <input type="checkbox" checked={picked.includes(t.id)} disabled={busy} onChange={() => toggle(t.id)} />
                      <span className="tool-icon sm"><ToolIcon name={t.icon} size={16} /></span>
                      <span className="tool-check-text"><strong>{t.name}</strong><span className="small muted">{t.short}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="row end"><button type="button" className="btn primary" onClick={onClose}>Listo</button></div>
      </div>
    </div>
  );
}

// Herramientas que el alumno eligió para esta materia
export default function SubjectTools({ subject }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ids = subject.toolIds || [];
  const tools = ids.map((id) => READY.find((t) => t.id === id)).filter(Boolean);

  const remove = (id) => setSubjectTools(user.uid, subject.id, ids.filter((x) => x !== id));

  return (
    <section className="stack">
      <div className="row between wrap gap">
        <p className="small muted grow">Las herramientas que más usas en esta materia, a un clic.</p>
        <button type="button" className="btn small primary" onClick={() => setOpen(true)}><Plus size={14} aria-hidden="true" /> Agregar herramientas</button>
      </div>

      {tools.length === 0 ? (
        <section className="panel">
          <EmptyState title="Aún no agregas herramientas" actions={<button type="button" className="btn primary" onClick={() => setOpen(true)}>Elegir herramientas</button>}>
            <p>Por ejemplo, una calculadora para Cálculo o un diccionario para Inglés.</p>
          </EmptyState>
        </section>
      ) : (
        <ul className="tool-grid">
          {tools.map((t) => {
            const area = t.areas.length === 1 ? AREA_MAP[t.areas[0]] : null;
            return (
              <li key={t.id}>
                <article className="panel tool-card" style={area ? { '--area': area.color } : undefined}>
                  <button type="button" className="fav-btn on" aria-label={`Quitar ${t.name} de esta materia`} title="Quitar de esta materia" onClick={() => remove(t.id)}>
                    <X size={16} aria-hidden="true" />
                  </button>
                  <Link to={t.to} className="tool-body">
                    <span className="tool-icon"><ToolIcon name={t.icon} /></span>
                    <strong>{t.name}</strong>
                    <span className="small muted">{t.short}</span>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {open && <AddToolsModal subject={subject} onClose={() => setOpen(false)} />}
    </section>
  );
}
