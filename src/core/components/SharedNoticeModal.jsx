import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { sharedKey } from '../data/db.js';
import { useTutorial } from '../../features/tutorial/TutorialContext.jsx';

// Aviso en ventana cuando alguien comparte un apunte: complementa el correo, que a veces cae en spam o no se ve.
// Cada apunte nuevo se anuncia una sola vez por sesión. No interrumpe un repaso, un Pomodoro ni el recorrido guiado:
// espera a que termine. «Más tarde» lo cierra sin marcarlo como visto (el globo de Apuntes se queda).
const QUIET = ['/estudiar', '/pomodoro'];
const MAX_LIST = 5;

export default function SharedNoticeModal() {
  const { sharedNew } = useData();
  const { pathname } = useLocation();
  const tutorial = useTutorial();
  const announced = useRef(new Set());
  const [items, setItems] = useState([]);
  const cardRef = useRef(null);

  const hold = QUIET.some((p) => pathname.startsWith(p)) || Boolean(tutorial?.active);

  useEffect(() => {
    if (hold) return;
    const fresh = sharedNew.filter((n) => !announced.current.has(sharedKey(n)));
    if (!fresh.length) return;
    fresh.forEach((n) => announced.current.add(sharedKey(n)));
    setItems((cur) => [...cur, ...fresh]);
  }, [sharedNew, hold]);

  const open = items.length > 0;
  const close = () => setItems([]);

  // Foco en el botón principal al abrir (y de regreso a donde estaba al cerrar); Escape cierra; Tab se queda dentro
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    cardRef.current?.querySelector('[data-primary]')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setItems([]); return; }
      if (e.key !== 'Tab') return;
      const f = cardRef.current?.querySelectorAll('a[href], button:not(:disabled)');
      if (!f?.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, [open]);

  if (!open) return null;

  const one = items.length === 1 ? items[0] : null;
  const who = (n) => n.sharedBy?.name || n.sharedBy?.email || 'Alguien';
  const href = (n) => `/apuntes/compartido/${n.ownerUid}/${n.id}`;
  const shown = items.slice(0, MAX_LIST);

  return (
    <div className="modal-backdrop shared-backdrop" role="dialog" aria-modal="true" aria-labelledby="shared-title" aria-describedby="shared-desc"
      onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={cardRef} className="panel stack shared-card">
        <span className="shared-icon" aria-hidden="true"><Users size={30} /></span>
        <h2 id="shared-title" className="h3">{one ? 'Te compartieron un apunte' : `Te compartieron ${items.length} apuntes`}</h2>

        {one ? (
          <div id="shared-desc" className="stack-sm">
            <p className="shared-note-title">«{one.title || 'Apunte sin título'}»</p>
            <p className="muted">De <strong>{who(one)}</strong>. Pueden editarlo juntos.</p>
          </div>
        ) : (
          <div id="shared-desc" className="stack-sm">
            <ul className="shared-list">
              {shown.map((n) => (
                <li key={sharedKey(n)}>
                  <Link to={href(n)} onClick={close}>
                    <strong>{n.title || 'Apunte sin título'}</strong>
                    <span className="small muted">De {who(n)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {items.length > MAX_LIST && <p className="small muted">Y {items.length - MAX_LIST} más en Apuntes.</p>}
          </div>
        )}

        <p className="small muted">También te lo enviamos por correo. Si no lo ves en tu bandeja de entrada, revisa Spam.</p>

        <div className="row gap wrap shared-actions">
          <button type="button" className="btn ghost" onClick={close}>Más tarde</button>
          <Link data-primary className="btn primary" to={one ? href(one) : '/apuntes'} onClick={close}>{one ? 'Abrir apunte' : 'Ir a Apuntes'}</Link>
        </div>
      </div>
    </div>
  );
}
