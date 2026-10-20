import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createSubject } from '../../core/data/db.js';
import SubjectEditor from './SubjectEditor.jsx';

// Ventana para registrar una materia sin salir de lo que se está haciendo.
// onCreated(id, data) se llama al terminar; onClose cierra la ventana.
export function NewSubjectModal({ onCreated, onClose }) {
  const { user } = useAuth();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-subject-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel stack modal-card">
        <div className="row between">
          <h2 id="new-subject-title" className="h3">Nueva materia</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="small muted">Solo necesitas el nombre; el color y la fecha de examen son opcionales.</p>
        <SubjectEditor
          submitLabel="Guardar"
          onCancel={onClose}
          onSave={async (d) => {
            const ref = await createSubject(user.uid, d);
            onCreated(ref.id, d);
          }}
        />
      </div>
    </div>
  );
}

// Botón para abrir el modal de nueva materia (para listas y filtros)
export function AddSubjectButton({ onCreated, children, className = 'btn ghost' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && <NewSubjectModal onClose={() => setOpen(false)} onCreated={(id, d) => { setOpen(false); onCreated?.(id, d); }} />}
    </>
  );
}

const NEW = '__new__';

// Selector de materia con la opción «Agregar materia…», que abre el modal y deja elegida la nueva.
export default function SubjectSelect({ value, onChange, emptyLabel = 'Sin materia', ...rest }) {
  const { subjects } = useData();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(null); // { id, name } hasta que la lista en vivo la incluya

  const known = subjects.some((s) => s.id === value);
  const pending = !known && created && created.id === value ? created : null;

  return (
    <>
      <select
        {...rest}
        value={value || ''}
        onChange={(e) => (e.target.value === NEW ? setOpen(true) : onChange(e.target.value))}
      >
        <option value="">{emptyLabel}</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        {pending && <option value={pending.id}>{pending.name}</option>}
        <option value={NEW}>＋ Agregar materia…</option>
      </select>
      {open && (
        <NewSubjectModal
          onClose={() => setOpen(false)}
          onCreated={(id, d) => {
            setCreated({ id, name: d.name.trim() });
            setOpen(false);
            onChange(id);
          }}
        />
      )}
    </>
  );
}
