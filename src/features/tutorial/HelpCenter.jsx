import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp, Film, Route, Search } from 'lucide-react';
import { PRIVACY_NOTICE } from '../auth/AuthPages.jsx';
import { FAQ } from './faq.js';
import { useTutorial } from './TutorialContext.jsx';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Centro de ayuda (Perfil): video de bienvenida, recorrido con globos y preguntas frecuentes con búsqueda
export default function HelpCenter() {
  const tutorial = useTutorial();
  const [q, setQ] = useState('');

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
      ) : groups.map((g) => (
        <div key={g.group} className="faq-group">
          <h3>{g.group}</h3>
          {g.items.map((i) => (
            <details key={i.q} className="faq-item" open={Boolean(q.trim()) && total <= 3}>
              <summary>{i.q}</summary>
              <div>{i.a.split('\n').map((p, k) => <p key={k}>{p}</p>)}</div>
            </details>
          ))}
        </div>
      ))}

      <details className="privacy">
        <summary>Aviso de privacidad</summary>
        <p>{PRIVACY_NOTICE}</p>
      </details>
    </section>
  );
}
