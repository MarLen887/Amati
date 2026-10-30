import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ImageIcon, NotebookPen, PenLine, Plus, Search, Upload, Users } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { watchSharedNotes } from '../../core/data/db.js';
import { AddSubjectButton } from '../subjects/SubjectSelect.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import { fmtShort } from '../../core/lib/dates.js';
import { NOTE_TYPES, TECHNIQUE_MAP, techniqueUrl } from '../techniques/techniques.js';
import TechniqueChip from '../techniques/TechniqueChip.jsx';

const FILTERS = [
  ['all', 'Todos'],
  ['file', 'Subidos'],
  ['written', 'Escritos'],
  ['shared', 'Compartidos conmigo'],
];

const plain = (n) => {
  const c = n.content || {};
  if (n.type === 'cornell') return (c.rows || []).map((r) => `${r.cue} ${r.note}`).join(' ') + ' ' + (c.summary || '');
  if (n.type === 'outline' || n.type === 'libre') return c.text || '';
  return `${c.source || ''} ${Object.values(c.steps || {}).join(' ')}`;
};

// Apuntes: todo el contenido propio (fotos, PDFs y notas escritas con una técnica) en un solo lugar.
export default function Apuntes() {
  const { user } = useAuth();
  const { classNotes, notes, subjects, subjectMap } = useData();
  const [shared, setShared] = useState([]);
  const [sharedError, setSharedError] = useState('');
  useEffect(() => watchSharedNotes(user.email, (list) => { setShared(list); setSharedError(''); }, (e) => {
    console.error('Apuntes compartidos:', e);
    setShared([]);
    setSharedError(e?.code === 'permission-denied' ? 'permisos' : e?.code === 'failed-precondition' ? 'índice' : 'conexión');
  }), [user.email]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');

  const items = useMemo(() => {
    const files = classNotes.map((n) => ({
      key: `f-${n.id}`, kind: 'file', title: n.title, subjectId: n.subjectId, date: n.classDate || n.createdAt || new Date(),
      text: n.text || '', href: `/clases/${n.id}`, thumb: n.file?.thumb, Icon: n.file?.kind === 'pdf' ? FileText : ImageIcon,
      tag: n.file?.kind === 'pdf' ? 'PDF' : 'Foto', ai: n.ocr === 'gemini',
    }));
    const written = notes.map((n) => ({
      key: `w-${n.id}`, kind: 'written', title: n.title, subjectId: n.subjectId, date: n.updatedAt || n.createdAt || new Date(),
      text: plain(n), href: `/apuntes/${n.id}`, thumb: null, Icon: NotebookPen,
      tag: TECHNIQUE_MAP[NOTE_TYPES[n.type]?.technique]?.name || n.type,
    }));
    const others = shared.filter((n) => n.ownerUid !== user.uid).map((n) => ({
      key: `s-${n.id}`, kind: 'shared', title: n.title, subjectId: '', date: n.updatedAt || n.createdAt || new Date(),
      text: plain(n), href: `/apuntes/compartido/${n.ownerUid}/${n.id}`, thumb: null, Icon: Users, tag: 'Compartido',
    }));
    const needle = q.trim().toLowerCase();
    return [...files, ...written, ...others]
      .filter((i) => filter === 'all' || i.kind === filter)
      .filter((i) => !subject || i.subjectId === subject)
      .filter((i) => !needle || `${i.title} ${i.text}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date - a.date);
  }, [classNotes, notes, shared, filter, q, subject, user.uid]);

  const total = classNotes.length + notes.length + shared.length;

  return (
    <div className="stack-lg">
      <header className="page-head row between wrap gap">
        <h1>Tus apuntes</h1>
        <span className="row gap wrap">
          <Link to="/apuntes/nuevo?tipo=libre" className="btn primary"><PenLine size={16} aria-hidden="true" /> Nuevo apunte</Link>
          <Link to="/clases/nueva" className="btn ghost" data-tour="notes-upload"><Upload size={16} aria-hidden="true" /> Subir apuntes</Link>
          <AddSubjectButton><Plus size={16} aria-hidden="true" /> Agregar materia</AddSubjectButton>
        </span>
      </header>

      {sharedError && (
        <p className="error" role="alert">
          No pudimos cargar «Compartidos conmigo» ({sharedError}). Si te compartieron un apunte y no lo ves, avisa a quien administra Amati.
        </p>
      )}

      <section className="stack-sm" aria-label="Crear un apunte" data-tour="notes-create">
        <p className="small muted">Crear un apunte. Pasa el puntero sobre una técnica para ver de qué trata:</p>
        <div className="chips">
          {Object.entries(NOTE_TYPES).map(([k, v]) => (
            <TechniqueChip key={k} noteType={k} primary={k === 'libre'} to={techniqueUrl(v.technique)} />
          ))}
        </div>
      </section>

      {total === 0 ? (
        <section className="panel">
          <EmptyState title="Tus apuntes aparecerán aquí" actions={
            <>
              <Link to="/clases/nueva?tipo=foto" className="btn ghost">Subir foto</Link>
              <Link to="/clases/nueva?tipo=pdf" className="btn ghost">Subir PDF</Link>
              <Link to="/apuntes/nuevo?tipo=libre" className="btn primary">Escribir un apunte</Link>
            </>
          }>
            <p>Sube una foto o PDF para convertirlo en material de estudio.</p>
          </EmptyState>
        </section>
      ) : (
        <>
          <div className="row gap wrap">
            <div className="chips" role="group" aria-label="Tipo de apunte">
              {FILTERS.map(([id, label]) => (
                <button key={id} type="button" className={`chip ${filter === id ? 'active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
            <label className="search-inline grow">
              <Search size={16} aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus apuntes…" aria-label="Buscar en tus apuntes" />
            </label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filtrar por materia">
              <option value="">Todas las materias</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {items.length === 0 ? (
            <p className="muted small">Ningún apunte coincide con tu búsqueda.</p>
          ) : (
            <ul className="classnote-grid">
              {items.map((i) => (
                <li key={i.key}>
                  <Link to={i.href} className="panel classnote-card">
                    {i.thumb ? <img src={i.thumb} alt="" loading="lazy" className="classnote-thumb" />
                      : <div className="classnote-thumb empty" aria-hidden="true"><i.Icon size={28} /></div>}
                    <div className="classnote-body">
                      <strong>{i.title}</strong>
                      <span className="small muted">{subjectMap[i.subjectId]?.name ? `${subjectMap[i.subjectId].name} · ` : ''}{fmtShort(i.date)}</span>
                      <p className="small snippet">{i.text.trim() ? i.text.trim().slice(0, 110) : 'Sin texto todavía'}</p>
                      <span className="row gap wrap">
                        <span className="tag">{i.tag}</span>
                        {i.ai && <span className="tag pick-tag">Texto con IA</span>}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="small muted">
            ¿Prefieres escribir tus apuntes? <Link to="/tecnicas?meta=notes">Elige un método (Cornell, esquema…)</Link>
          </p>
        </>
      )}
    </div>
  );
}
