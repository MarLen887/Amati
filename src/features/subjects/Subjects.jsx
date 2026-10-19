import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarX, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createSampleSubject, createSubject, deleteSubject, updateSubject } from '../../core/data/db.js';
import { cardStatus, isDue } from '../techniques/cards/srs.js';
import ColorPicker, { SUBJECT_COLORS } from '../../core/components/ColorPicker.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import MoreMenu from '../../core/components/MoreMenu.jsx';
import { ExamChip } from './ExamCountdown.jsx';

// "AAAA-MM-DD" <-> Date en hora local
const toInput = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const fromInput = (v) => {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function SubjectEditor({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[0]);
  const [exam, setExam] = useState(toInput(initial?.examDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSave({ name, color, examDate: fromInput(exam) });
      if (!initial) {
        setName('');
        setExam('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="subject-editor">
      <label>
        <span className="side-title">Nombre de la materia</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Anatomía, Cálculo II, Historia de México"
          maxLength={80} required autoFocus />
      </label>
      <div className="stack-sm">
        <span className="field-label">Color <span className="muted">(para reconocerla rápido)</span></span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <details className="optional-images" open={Boolean(exam)}>
        <summary><CalendarX size={16} aria-hidden="true" /> Fecha de examen <span className="muted">(opcional)</span></summary>
        <div className="stack-sm">
          <div className="row gap">
            <input id={`exam-${initial?.id || 'new'}`} type="date" value={exam} min={toInput(new Date())}
              aria-label="Fecha de examen" onChange={(e) => setExam(e.target.value)} className="grow" />
            {exam && (
              <button type="button" className="btn small ghost" onClick={() => setExam('')}>Quitar</button>
            )}
          </div>
          <p className="small muted">Amati ajustará los repasos para que llegues preparado, sin desveladas.</p>
        </div>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row gap end">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary" disabled={busy || !name.trim()}>
          {initial ? 'Guardar cambios' : busy ? 'Creando…' : 'Crear materia y agregar tarjetas →'}
        </button>
      </div>
    </form>
  );
}

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
    <li className="panel subject-card" style={{ borderTopColor: s.color }}>
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
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(params.get('nueva') === '1');

  if (loading) return <p className="muted">Cargando…</p>;

  async function remove(s) {
    const n = cards.filter((c) => c.subjectId === s.id).length;
    const what = s.sample ? 'la materia de ejemplo' : `"${s.name}"`;
    if (!confirm(`¿Eliminar ${what}${n ? ` y sus ${n} tarjetas` : ''}? Esta acción no se puede deshacer.`)) return;
    await deleteSubject(user.uid, s.id);
  }

  return (
    <div className="stack-lg">
      <header className="page-head row between wrap gap">
        <div>
          <Link to="/tecnicas" className="small">← Estudiar</Link>
          <h1>Mis materias</h1>
        </div>
        {!adding && subjects.length > 0 && (
          <button className="btn ghost" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Nueva materia</button>
        )}
      </header>

      {subjects.length === 0 && !adding && (
        <section className="panel">
          <EmptyState
            title="Tu primera materia"
            actions={
              <>
                <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Crear materia</button>
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
          <p className="small muted">Una materia agrupa tus tarjetas y apuntes. Solo necesitas el nombre; lo demás es opcional.</p>
          <SubjectEditor
            onSave={async (d) => {
              const ref = await createSubject(user.uid, d);
              setParams({}, { replace: true });
              nav(`/materias/${ref.id}?nuevo=1`);
            }}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <ul className="subject-grid">
        {subjects.map((s) =>
          editing === s.id ? (
            <li key={s.id} className="panel">
              <SubjectEditor initial={s}
                onSave={async (d) => { await updateSubject(user.uid, s.id, d); setEditing(null); }}
                onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <SubjectCard key={s.id} s={s} cards={cards} now={now} onEdit={() => setEditing(s.id)} onRemove={() => remove(s)} />
          ),
        )}
      </ul>
    </div>
  );
}
