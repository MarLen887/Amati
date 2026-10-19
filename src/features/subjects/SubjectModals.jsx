import { useEffect, useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { deleteSubject, updateSubject } from '../../core/data/db.js';
import SubjectEditor from './SubjectEditor.jsx';

function Modal({ title, titleId, onClose, children, busy = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="panel stack modal-card">
        <div className="row between">
          <h2 id={titleId} className="h3">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" disabled={busy} onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Cambiar nombre, color (y fecha de examen) de una materia
export function EditSubjectModal({ subject, onClose }) {
  const { user } = useAuth();
  return (
    <Modal title="Editar materia" titleId="edit-subject-title" onClose={onClose}>
      <SubjectEditor
        initial={subject}
        onCancel={onClose}
        onSave={async (d) => {
          await updateSubject(user.uid, subject.id, d);
          onClose();
        }}
      />
    </Modal>
  );
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Eliminar una materia con todo su contenido: avisa qué se pierde y pide confirmar antes de borrar
export function DeleteSubjectModal({ subject, onClose, onDeleted }) {
  const { user } = useAuth();
  const { cards, notes, libros, classNotes } = useData();
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const items = [
    [cards.filter((c) => c.subjectId === subject.id).length, 'tarjeta', 'tarjetas'],
    [notes.filter((n) => n.subjectId === subject.id).length, 'apunte escrito', 'apuntes escritos'],
    [classNotes.filter((n) => n.subjectId === subject.id).length, 'nota de clase subida', 'notas de clase subidas'],
    [libros.filter((l) => l.subjectId === subject.id).length, 'libro o PDF guardado', 'libros o PDFs guardados'],
  ].filter(([n]) => n > 0);

  async function confirmDelete() {
    setBusy(true);
    setError('');
    try {
      await deleteSubject(user.uid, subject.id);
      onDeleted?.();
      onClose();
    } catch (e) {
      setError('No se pudo eliminar la materia. ' + e.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Eliminar «${subject.name}»`} titleId="delete-subject-title" onClose={onClose} busy={busy}>
      <div className="notice warn" role="alert">
        <TriangleAlert size={18} aria-hidden="true" />
        <div className="stack-sm">
          <p><strong>Esta acción es permanente y no se puede deshacer.</strong></p>
          <p className="small">Se borrará la materia y todo su contenido:</p>
          {items.length > 0 ? (
            <ul className="small">{items.map(([n, one, many]) => <li key={one}>{plural(n, one, many)}</li>)}</ul>
          ) : (
            <p className="small">Esta materia todavía no tiene contenido.</p>
          )}
        </div>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={sure} disabled={busy} onChange={(e) => setSure(e.target.checked)} />
        Entiendo que se eliminará de forma permanente, junto con su contenido.
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row gap end">
        <button type="button" className="btn ghost" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="btn danger-solid" disabled={!sure || busy} onClick={confirmDelete}>
          {busy ? 'Eliminando…' : 'Eliminar permanentemente'}
        </button>
      </div>
    </Modal>
  );
}
