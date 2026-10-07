import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, Play, Plus, Shuffle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { createSampleSubject, createSubject, deleteSubject, updateSubject } from '../lib/db.js';
import { cardStatus, isDue } from '../lib/srs.js';
import { studyUrl } from '../lib/studyFilter.js';
import ColorPicker, { SUBJECT_COLORS } from '../components/ColorPicker.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ExamChip } from '../components/ExamCountdown.jsx';

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
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la materia"
        maxLength={80} required aria-label="Nombre de la materia" />
      <div className="stack-sm">
        <span className="field-label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="stack-sm">
        <label htmlFor={`exam-${initial?.id || 'new'}`} className="field-label">Fecha de examen (opcional)</label>
        <div className="row gap">
          <input id={`exam-${initial?.id || 'new'}`} type="date" value={exam} min={toInput(new Date())}
            onChange={(e) => setExam(e.target.value)} className="grow" />
          {exam && (
            <button type="button" className="btn small ghost" onClick={() => setExam('')}>
              <CalendarX size={14} aria-hidden="true" /> Quitar
            </button>
          )}
        </div>
        <p className="small muted">Amati ajustará los repasos para que llegues preparado, sin desveladas.</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row gap end">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary" disabled={busy}>{initial ? 'Guardar' : 'Agregar materia'}</button>
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

export default function Subjects() {
  const { user } = useAuth();
  const { subjects, cards, loading, now } = useData();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  if (loading) return <p className="muted">Cargando…</p>;

  async function remove(s) {
    const n = cards.filter((c) => c.subjectId === s.id).length;
    const what = s.sample ? 'la materia de ejemplo' : `"${s.name}"`;
    if (!confirm(`¿Eliminar ${what}${n ? ` y sus ${n} tarjetas` : ''}? Esta acción no se puede deshacer.`)) return;
    await deleteSubject(user.uid, s.id);
  }

  return (
    <div className="stack-lg">
      <div className="row between wrap gap">
        <h1>Materias</h1>
        {!adding && subjects.length > 0 && (
          <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Nueva materia</button>
        )}
      </div>

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
            <p>Crea una materia para organizar tus tarjetas, o prueba Amati con 5 tarjetas de ejemplo que puedes borrar cuando quieras.</p>
          </EmptyState>
        </section>
      )}

      {adding && (
        <section className="panel">
          <h2 className="h3">Nueva materia</h2>
          <SubjectEditor
            onSave={async (d) => { await createSubject(user.uid, d); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <ul className="subject-grid">
        {subjects.map((s) => {
          const sc = cards.filter((c) => c.subjectId === s.id);
          const due = sc.filter((c) => isDue(c, now)).length;
          const mastered = sc.filter((c) => cardStatus(c) === 'mastered').length;
          if (editing === s.id) {
            return (
              <li key={s.id} className="panel">
                <SubjectEditor initial={s}
                  onSave={async (d) => { await updateSubject(user.uid, s.id, d); setEditing(null); }}
                  onCancel={() => setEditing(null)} />
              </li>
            );
          }
          return (
            <li key={s.id} className="panel subject-card" style={{ borderTopColor: s.color }}>
              <Link to={`/materias/${s.id}`} className="subject-link">
                <div className="row gap wrap">
                  <h3>{s.name}</h3>
                  {s.sample && <span className="tag sample-tag">Ejemplo</span>}
                </div>
                <p className="muted">
                  {sc.length} {sc.length === 1 ? 'tarjeta' : 'tarjetas'} · {due} pendientes · {mastered} dominadas
                </p>
                <ExamChip subject={s} now={now} />
              </Link>
              <div className="row gap wrap">
                {due > 0 ? (
                  <Link to={studyUrl(s.id)} className="btn small primary"><Play size={14} fill="currentColor" /> Comenzar ({due})</Link>
                ) : sc.length > 0 ? (
                  <Link to={studyUrl(s.id, '', true)} className="btn small primary"
                    title="No hay pendientes: práctica libre sin alterar tu calendario">
                    <Shuffle size={14} /> Practicar
                  </Link>
                ) : (
                  <button className="btn small primary" disabled title="Esta materia aún no tiene tarjetas">
                    <Play size={14} /> Comenzar
                  </button>
                )}
                <Link to={`/materias/${s.id}`} className="btn small ghost">Ver tarjetas</Link>
                {!s.sample && <button className="btn small ghost" onClick={() => setEditing(s.id)}>Editar</button>}
                <button className="btn small ghost danger" onClick={() => remove(s)}>
                  {s.sample ? 'Eliminar ejemplo' : 'Eliminar'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
