import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createSampleSubject, createSubject } from '../../core/data/db.js';
import { cardStatus, isDue } from '../techniques/cards/srs.js';
import EmptyState from '../../core/components/EmptyState.jsx';
import MoreMenu from '../../core/components/MoreMenu.jsx';
import { ExamChip } from './ExamCountdown.jsx';
import SubjectEditor from './SubjectEditor.jsx';
import { DeleteSubjectModal, EditSubjectModal } from './SubjectModals.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';
import BackLink from '../../core/components/BackLink.jsx';

export function SampleButton({ className = 'btn ghost' }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button className={className} disabled={busy}
      onClick={async () => { setBusy(true); try { await createSampleSubject(user.uid); } finally { setBusy(false); } }}>
      <Sparkles size={16} aria-hidden="true" /> {busy ? 'Creando…' : 'Probar con una materia de ejemplo'}
    </button>
  );
}

// Tarjeta de materia: primero estudiar, luego progreso y examen; editar/eliminar quedan en el menú ⋯
export function SubjectCard({ s, cards, now, onEdit, onRemove }) {
  const sc = cards.filter((c) => c.subjectId === s.id);
  const due = sc.filter((c) => isDue(c, now)).length;
  const mastered = sc.filter((c) => cardStatus(c) === 'mastered').length;
  const pct = sc.length ? Math.round((mastered / sc.length) * 100) : 0;
  const nav = useNavigate();
  const menu = [
    { label: 'Abrir materia', onClick: () => nav(`/materias/${s.id}`) },
    ...(!s.sample ? [{ label: 'Editar', onClick: onEdit }] : []),
    { label: s.sample ? 'Eliminar ejemplo' : 'Eliminar', onClick: onRemove, danger: true },
  ];
  return (
    <li className="panel subject-card" style={{ borderTopColor: s.color, '--sc': s.color }}>
      <div className="row between gap">
        <Link to={`/materias/${s.id}`} className="subject-link grow">
          <div className="row gap wrap">
            <h3>{s.name}</h3>
            {s.sample && <span className="tag sample-tag">Ejemplo</span>}
          </div>
        </Link>
        <MoreMenu items={menu} label={`Más acciones de ${s.name}`} />
      </div>
      <div className="subject-stats">
        <span className="stat-pill ok">{pct}% completado</span>
        {due > 0 && <span className="stat-pill pending">{due} {due === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}</span>}
        <ExamChip subject={s} now={now} />
      </div>
      <div className="progress-track thin" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--ok)' }} />
      </div>
      {sc.length > 0 ? (
        <Link to={`/tecnicas?materia=${s.id}`} className="btn primary block">Estudiar</Link>
      ) : (
        <Link to={`/materias/${s.id}?agregar=1`} className="btn primary block"><Plus size={14} aria-hidden="true" /> Agregar tarjetas</Link>
      )}
    </li>
  );
}

export default function Subjects() {
  const { user } = useAuth();
  const { subjects, cards, loading, now } = useData();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null); // materia que se edita en el modal
  const [deleting, setDeleting] = useState(null); // materia que se elimina en el modal
  const [adding, setAdding] = useState(params.get('nueva') === '1');

  if (loading) return <Skeleton variant="cards" />;

  return (
    <div className="stack-lg">
      <header className="page-head row between wrap gap">
        <div>
          <BackLink to="/tecnicas">Estudiar</BackLink>
          <h1>Mis materias</h1>
        </div>
        {!adding && subjects.length > 0 && (
          <button className="btn ghost" data-tour="subjects-add" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Nueva materia</button>
        )}
      </header>

      {subjects.length === 0 && !adding && (
        <section className="panel">
          <EmptyState
            title="Tu primera materia"
            actions={
              <>
                <button className="btn primary" data-tour="subjects-add" onClick={() => setAdding(true)}><Plus size={16} /> Crear materia</button>
                <SampleButton />
              </>
            }
          >
            <p>Una materia reúne tus tarjetas, apuntes y libros. Solo necesitas el nombre.</p>
          </EmptyState>
        </section>
      )}

      {adding && (
        <section className="panel">
          <h2 className="h3">Nueva materia</h2>
          <p className="small muted">Una materia reúne tus apuntes, recursos y tarjetas. Solo necesitas el nombre; lo demás es opcional.</p>
          <SubjectEditor
            onSave={async (d) => {
              await createSubject(user.uid, d);
              setParams({}, { replace: true });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <ul className="subject-grid" data-tour="subjects-main">
        {subjects.map((s) => (
          <SubjectCard key={s.id} s={s} cards={cards} now={now} onEdit={() => setEditing(s)} onRemove={() => setDeleting(s)} />
        ))}
      </ul>

      {editing && <EditSubjectModal subject={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteSubjectModal subject={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
