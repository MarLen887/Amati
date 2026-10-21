import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, CircleHelp, Film, GraduationCap, Library, NotebookPen, Rocket, Route, Search, UserCog, Wrench, X } from 'lucide-react';
import { PRIVACY_NOTICE } from '../auth/AuthPages.jsx';
import { FAQ } from './faq.js';
import { useTutorial } from './TutorialContext.jsx';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const ICONS = { Empezar: Rocket, Materias: BookMarked, Apuntes: NotebookPen, Estudio: GraduationCap, Biblioteca: Library, Herramientas: Wrench, 'Cuenta y avisos': UserCog };

// Ventana con las preguntas de una sección (desplegables)
function FaqModal({ group, items, openAll, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const Icon = ICONS[group] || CircleHelp;
  return (
    <div className="video-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
        <div className="row between gap">
          <h2 id="help-modal-title" className="h3 row gap"><Icon size={18} aria-hidden="true" /> {group}</h2>
          <button ref={closeRef} type="button" className="btn small ghost" onClick={onClose}><X size={14} aria-hidden="true" /> Cerrar</button>
        </div>
        <div className="help-modal-body">
          {items.map((i) => (
            <details key={i.q} className="faq-item" open={openAll && items.length <= 3}>
              <summary>{i.q}</summary>
              <div>{i.a.split('\n').map((p, k) => <p key={k}>{p}</p>)}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

// Centro de ayuda (Perfil): video de bienvenida, recorrido con globos y preguntas frecuentes con búsqueda
export default function HelpCenter() {
  const tutorial = useTutorial();
  const [q, setQ] = useState('');
  const [openGroup, setOpenGroup] = useState(null);

  const groups = useMemo(() => {
    const needle = norm(q.trim());
    if (!needle) return FAQ;
    return FAQ
      .map((g) => ({ ...g, items: g.items.filter((i) => norm(`${i.q} ${i.a}`).includes(needle)) }))
      .filter((g) => g.items.length);
  }, [q]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="panel stack" data-tour="help-center" aria-label="Centro de ayuda">
      <h2 className="h3 row gap"><CircleHelp size={18} aria-hidden="true" /> Centro de ayuda</h2>

      <div className="help-actions">
        <button type="button" className="btn ghost" onClick={tutorial.openVideo}>
          <Film size={16} aria-hidden="true" /> Ver video de bienvenida
        </button>
        <button type="button" className="btn ghost" onClick={tutorial.startTour}>
          <Route size={16} aria-hidden="true" /> Repetir el recorrido
        </button>
        <Link to="/como-funciona" className="btn ghost">¿Cómo funciona Amati?</Link>
        {tutorial.autoHidden && (
          <button type="button" className="btn ghost" onClick={tutorial.showAgain}>
            Mostrar el tutorial al iniciar sesión
          </button>
        )}
      </div>

      <div className="stack-sm">
        <h3 className="h3">Preguntas frecuentes</h3>
        <label className="search-inline">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca una duda: tarjetas, compartir, recordatorios…" aria-label="Buscar en las preguntas frecuentes" />
        </label>
        {q.trim() && <p className="small muted" role="status">{total} {total === 1 ? 'resultado' : 'resultados'}</p>}
      </div>

      {groups.length === 0 ? (
        <p className="muted small">No encontramos esa duda. Prueba con otra palabra, o repite el recorrido para ver dónde está cada cosa.</p>
      ) : (
        <div className="help-cards">
          {groups.map((g) => {
            const Icon = ICONS[g.group] || CircleHelp;
            return (
              <button key={g.group} type="button" className="help-card" onClick={() => setOpenGroup(g.group)}>
                <Icon size={22} aria-hidden="true" />
                <strong>{g.group}</strong>
                <span className="small muted">{g.items.length} {g.items.length === 1 ? 'pregunta' : 'preguntas'}</span>
              </button>
            );
          })}
        </div>
      )}

      {openGroup && groups.find((g) => g.group === openGroup) && (
        <FaqModal group={openGroup} items={groups.find((g) => g.group === openGroup).items} openAll={Boolean(q.trim())} onClose={() => setOpenGroup(null)} />
      )}

      <details className="privacy">
        <summary>Aviso de privacidad</summary>
        <p>{PRIVACY_NOTICE}</p>
      </details>
    </section>
  );
}
