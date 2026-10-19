import { useEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';

// Menú de tres puntos para acciones secundarias (editar, eliminar…): no compiten con la acción principal.
// items: [{ label, onClick, danger?, icon? }]
export default function MoreMenu({ items, label = 'Más acciones' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="more-menu" ref={ref}>
      <button type="button" className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(!open)}>
        <Ellipsis size={20} aria-hidden="true" />
      </button>
      {open && (
        <div className="menu-pop unfold" role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : ''}
              onClick={() => { setOpen(false); it.onClick(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
