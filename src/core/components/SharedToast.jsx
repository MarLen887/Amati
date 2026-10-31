import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, X } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { sharedKey } from '../data/db.js';

// Aviso dentro de la app cuando alguien comparte un apunte: complementa el correo, que a veces cae en spam o no se ve.
// Cada apunte nuevo se anuncia una sola vez por sesión; se cierra solo a los 12 s o con la X.
const AUTO_HIDE = 12_000;

export default function SharedToast() {
  const { sharedNew } = useData();
  const announced = useRef(new Set());
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fresh = sharedNew.filter((n) => !announced.current.has(sharedKey(n)));
    if (!fresh.length) return;
    fresh.forEach((n) => announced.current.add(sharedKey(n)));
    setItems(fresh);
  }, [sharedNew]);

  useEffect(() => {
    if (!items.length) return undefined;
    const t = setTimeout(() => setItems([]), AUTO_HIDE);
    return () => clearTimeout(t);
  }, [items]);

  if (!items.length) return null;
  const one = items.length === 1 ? items[0] : null;
  const who = one && (one.sharedBy?.name || one.sharedBy?.email || 'Alguien');
  const close = () => setItems([]);

  return (
    <div className="shared-toast" role="status" aria-live="polite">
      <Users size={20} aria-hidden="true" className="shared-toast-icon" />
      <p className="shared-toast-text">
        {one ? <><strong>{who}</strong> te compartió «{one.title || 'Apunte sin título'}»</> : <>Tienes <strong>{items.length}</strong> apuntes compartidos nuevos</>}
      </p>
      <Link className="btn small primary" to={one ? `/apuntes/compartido/${one.ownerUid}/${one.id}` : '/apuntes'} onClick={close}>Ver</Link>
      <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={close}><X size={16} aria-hidden="true" /></button>
    </div>
  );
}
