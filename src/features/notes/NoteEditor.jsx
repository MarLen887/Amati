import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CircleCheck, Layers, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createCardsBulk, createRichNote, deleteNote, saveNote } from '../../core/data/db.js';
import { GUIDES } from './guides.js';
import { NOTE_TYPES, saveLastTechnique, TECHNIQUE_MAP } from '../techniques/techniques.js';
import TechniqueIcon from '../techniques/TechniqueIcon.jsx';
import SubjectSelect from '../subjects/SubjectSelect.jsx';
import GuidedEditor from './GuidedEditor.jsx';
import OutlineEditor from './OutlineEditor.jsx';
import CornellEditor from './CornellEditor.jsx';
import GenerateResources, { plainNote } from './GenerateResources.jsx';
// El editor completo (TipTap, Yjs, KaTeX, Excalidraw) es pesado: se descarga solo al abrir un apunte libre
const RichNoteLazy = lazy(() => import('./rich/RichNote.jsx'));
const RichNote = (props) => <Suspense fallback={<p className="muted">Abriendo editor…</p>}><RichNoteLazy {...props} /></Suspense>;

const emptyContent = (type, source = '') =>
  type === 'cornell' ? { rows: [], summary: '' } : type === 'outline' ? { text: '' } : { source, steps: {} };

function NoteForm({ initial, type }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const tech = TECHNIQUE_MAP[NOTE_TYPES[type].technique];

  const [id, setId] = useState(initial?.id || null);
  const [title, setTitle] = useState(initial?.title || '');
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? params.get('materia') ?? '');
  const [topic, setTopic] = useState(initial?.topic ?? params.get('tema') ?? '');
  const [content, setContent] = useState(initial?.content || emptyContent(type, params.get('fuente') || ''));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => saveLastTechnique(tech.id), [tech.id]);

  const touch = (setter) => (v) => { setter(v); setDirty(true); setMsg(''); };

  async function save() {
    setBusy(true);
    setError('');
    try {
      const guessTitle = title.trim() || content.source?.trim() || `${NOTE_TYPES[type].label} · ${new Date().toLocaleDateString('es-MX')}`;
      const savedId = await saveNote(user.uid, id, { type, title: guessTitle, subjectId, topic, content });
      if (!title.trim()) setTitle(guessTitle);
      setDirty(false);
      setMsg('Apunte guardado');
      if (!id) {
        setId(savedId);
        nav(`/apuntes/${savedId}`, { replace: true });
      }
    } catch (e) {
      setError('No se pudo guardar. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !confirm('¿Eliminar este apunte? Esta acción no se puede deshacer.')) return;
    await deleteNote(user.uid, id);
    setDirty(false);
    nav(subjectId ? `/materias/${subjectId}` : '/apuntes');
  }

  const pairs = type === 'cornell' ? (content.rows || []).filter((r) => r.cue.trim() && r.note.trim()) : [];
  async function toCards() {
    if (!subjectId) { setError('Elige una materia para crear las tarjetas.'); return; }
    if (!confirm(`¿Crear ${pairs.length} ${pairs.length === 1 ? 'tarjeta' : 'tarjetas'} con las pistas (pregunta) y notas (respuesta)?`)) return;
    setBusy(true);
    try {
      const n = await createCardsBulk(user.uid, subjectId, pairs.map((r) => ({ front: r.cue, back: r.note, topic })));
      setMsg(`Se crearon ${n} tarjetas en tu materia.`);
    } catch (e) {
      setError('No se pudieron crear las tarjetas. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const Body = type === 'cornell' ? CornellEditor : type === 'outline' ? OutlineEditor : GuidedEditor;

  return (
    <div className="stack-lg">
      <div>
        <Link to={subjectId ? `/materias/${subjectId}` : '/apuntes'} className="small">← Volver</Link>
        <h1 className="row gap"><span className="technique-icon"><TechniqueIcon name={tech.icon} /></span> {tech.name}</h1>
        <p className="muted">{tech.short}</p>
      </div>

      <section className="panel stack">
        <label>
          Título
          <input value={title} onChange={(e) => touch(setTitle)(e.target.value)} maxLength={200}
            placeholder={GUIDES[type]?.sourcePlaceholder || 'Ej. Clase 4 · Revolución Industrial'} />
        </label>
        <div className="grid-2">
          <label>
            Materia
            <SubjectSelect value={subjectId} onChange={touch(setSubjectId)} />
          </label>
          <label>
            Tema (opcional)
            <input value={topic} onChange={(e) => touch(setTopic)(e.target.value)} maxLength={80} />
          </label>
        </div>
      </section>

      <Body type={type} content={content} onChange={(c) => { setContent(c); setDirty(true); setMsg(''); }} />

      {id && <GenerateResources getText={() => plainNote({ type, content })} title={title} subjectId={subjectId} topic={topic} />}

      {error && <p className="error">{error}</p>}
      {msg && <p className="notice saved-toast" role="status"><CircleCheck size={16} aria-hidden="true" /> {msg}</p>}

      <div className="sticky-actions">
        {id && <button type="button" className="btn ghost danger" onClick={remove}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>}
        {pairs.length > 0 && (
          <button type="button" className="btn ghost" disabled={busy} onClick={toCards}>
            <Layers size={16} aria-hidden="true" /> Convertir en {pairs.length} tarjetas
          </button>
        )}
        <span className="grow small muted">{dirty ? 'Cambios sin guardar' : id ? 'Todo guardado' : ''}</span>
        <button type="button" className="btn primary" disabled={busy || (!dirty && !!id)} onClick={save}>
          <Save size={16} aria-hidden="true" /> {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

// Crea el apunte libre en cuanto se abre y pasa a su dirección definitiva
function NewRichNote() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createRichNote(user.uid, { subjectId: params.get('materia') || '', topic: params.get('tema') || '' })
      .then((id) => nav(`/apuntes/${id}`, { replace: true }))
      .catch((e) => setError('No se pudo crear el apunte. ' + e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return error ? <p className="error">{error}</p> : <p className="muted">Creando apunte…</p>;
}

// Apunte libre que otra persona compartió conmigo
export function SharedNote() {
  const { owner, id } = useParams();
  return <RichNote key={id} ownerUid={owner} noteId={id} />;
}

export default function NoteEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { notes, notesLoaded } = useData();

  if (id) {
    if (!notesLoaded) return <p className="muted">Cargando…</p>;
    const note = notes.find((n) => n.id === id);
    if (!note) return <p>Apunte no encontrado. <Link to="/apuntes">Ver mis apuntes</Link></p>;
    if (note.type === 'libre') return <RichNote key={note.id} ownerUid={user.uid} noteId={note.id} />;
    return <NoteForm key={note.id} initial={note} type={note.type} />;
  }

  const type = params.get('tipo');
  if (!NOTE_TYPES[type]) {
    return <p>Elige primero una técnica. <Link to="/tecnicas">Ver técnicas</Link></p>;
  }
  if (type === 'libre') return <NewRichNote />;
  return <NoteForm key={`new-${type}`} type={type} />;
}
