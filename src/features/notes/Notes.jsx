import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { deleteNote } from '../../core/data/db.js';
import { fmtShort } from '../../core/lib/dates.js';
import { NOTE_TYPES, TECHNIQUE_MAP } from '../techniques/techniques.js';
import TechniqueIcon from '../techniques/TechniqueIcon.jsx';
import { useConfirm } from '../../core/components/ConfirmDialog.jsx';

// Lista de apuntes. Si recibe subjectId, muestra solo los de esa materia (se usa dentro de la materia).
export function NotesList({ subjectId = '', compact = false }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { notes, subjectMap } = useData();
  const [type, setType] = useState('');
  const list = notes
    .filter((n) => (!subjectId || n.subjectId === subjectId) && (!type || n.type === type))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  async function remove(n) {
    if (await confirm({ title: `¿Eliminar el apunte "${n.title}"?`, message: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true })) await deleteNote(user.uid, n.id);
  }

  return (
    <div className="stack">
      {!compact && (
        <div className="chips" role="group" aria-label="Filtrar por tipo">
          <button type="button" className={`chip ${!type ? 'active' : ''}`} onClick={() => setType('')}>Todos</button>
          {Object.entries(NOTE_TYPES).map(([k, v]) => (
            <button key={k} type="button" className={`chip ${type === k ? 'active' : ''}`} onClick={() => setType(type === k ? '' : k)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <p className="muted small">Todavía no hay apuntes aquí.</p>
      ) : (
        <ul className="note-list">
          {list.map((n) => {
            const t = TECHNIQUE_MAP[NOTE_TYPES[n.type]?.technique];
            const s = subjectMap[n.subjectId];
            return (
              <li key={n.id} className="panel note-item">
                <span className="technique-icon">{t && <TechniqueIcon name={t.icon} />}</span>
                <Link to={`/apuntes/${n.id}`} className="grow note-link">
                  <strong>{n.title}</strong>
                  <span className="small muted">
                    {t?.name}{s ? ` · ${s.name}` : ''}{n.topic ? ` · ${n.topic}` : ''} · {fmtShort(n.updatedAt || n.createdAt || new Date())}
                  </span>
                </Link>
                <button className="btn small ghost danger" onClick={() => remove(n)}>Eliminar</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
