import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { createCard, deleteCard, deleteSubject, updateCard } from '../lib/db.js';
import { cardStatus, isDue } from '../lib/srs.js';
import { fmtShort } from '../lib/dates.js';
import { studyUrl } from '../lib/studyFilter.js';
import { CircleCheck, Play, Shuffle, Sparkles, Upload } from 'lucide-react';
import CardForm from '../components/CardForm.jsx';
import ImportCards from '../components/ImportCards.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ExamCountdown from '../components/ExamCountdown.jsx';

const STATUS_LABEL = { new: 'Nueva', learning: 'Aprendiendo', mastered: 'Dominada' };

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subjects, cards, subjectMap, loading, now } = useData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const subject = subjectMap[id];
  const subjectCards = useMemo(
    () => cards.filter((c) => c.subjectId === id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [cards, id],
  );
  const topics = useMemo(
    () => [...new Set(subjectCards.map((c) => c.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [subjectCards],
  );

  if (loading) return <p className="muted">Cargando…</p>;
  if (!subject) return <p>Materia no encontrada. <Link to="/materias">Volver</Link></p>;

  const q = search.trim().toLowerCase();
  const visible = subjectCards.filter(
    (c) =>
      (!topicFilter || c.topic === topicFilter) &&
      (!q || (c.front || '').toLowerCase().includes(q) || (c.back || '').toLowerCase().includes(q)),
  );
  const due = subjectCards.filter((c) => isDue(c, now) && (!topicFilter || c.topic === topicFilter)).length;

  async function remove(c) {
    if (confirm('¿Eliminar esta tarjeta?')) await deleteCard(user.uid, c);
  }

  async function removeSample() {
    if (!confirm('¿Eliminar la materia de ejemplo y sus tarjetas?')) return;
    await deleteSubject(user.uid, id);
    navigate('/materias');
  }

  return (
    <div className="stack-lg">
      <div>
        <Link to="/materias" className="small">← Materias</Link>
        <div className="row between wrap gap">
          <h1 className="row gap">
            <span className="dot-color lg" style={{ background: subject.color }} />
            {subject.name}
          </h1>
          <div className="row gap">
            {due > 0 ? (
              <Link to={studyUrl(id, topicFilter)} className="btn ghost">
                <Play size={14} fill="currentColor" /> Comenzar{topicFilter ? ' este tema' : ''} ({due})
              </Link>
            ) : subjectCards.length > 0 && (
              <Link to={studyUrl(id, topicFilter, true)} className="btn ghost">
                <Shuffle size={14} /> Practicar{topicFilter ? ' este tema' : ''}
              </Link>
            )}
            {!adding && !importing && (
              <button className="btn ghost" onClick={() => { setImporting(true); setImported(0); }}>
                <Upload size={14} /> Importar
              </button>
            )}
            {!adding && !importing && <button className="btn primary" onClick={() => setAdding(true)}>+ Nueva tarjeta</button>}
          </div>
        </div>
      </div>

      {subject.sample && (
        <div className="sample-banner">
          <Sparkles size={18} aria-hidden="true" />
          <span className="grow">
            Esta es una <strong>materia de ejemplo</strong> para que pruebes Amati. Cuando quieras, elimínala y crea las tuyas.
          </span>
          <button className="btn small ghost danger" onClick={removeSample}>Eliminar ejemplo</button>
        </div>
      )}

      {subject.examDate && <ExamCountdown subject={subject} cards={subjectCards} now={now} />}

      {imported > 0 && (
        <p className="notice saved-toast" role="status">
          <CircleCheck size={16} aria-hidden="true" /> Se importaron {imported} {imported === 1 ? 'tarjeta' : 'tarjetas'}.
        </p>
      )}

      {importing && (
        <section className="panel">
          <h2 className="h3">Importar tarjetas</h2>
          <ImportCards
            subjectId={id}
            onCancel={() => setImporting(false)}
            onDone={(n) => { setImporting(false); setImported(n); }}
          />
        </section>
      )}

      {adding && (
        <section className="panel">
          <h2 className="h3">Nueva tarjeta</h2>
          <CardForm
            subjects={subjects}
            initial={null}
            defaultSubjectId={id}
            topics={topics}
            submitLabel="Guardar y agregar otra"
            onSubmit={(d, imgs) => createCard(user.uid, d, imgs)}
            onCancel={() => setAdding(false)}
            onDone={() => navigate('/materias')}
            key={`new-${id}`}
          />
          <p className="small muted">"Guardar y agregar otra" deja el formulario listo para la siguiente tarjeta. "Realizado" guarda y te regresa a Materias.</p>
        </section>
      )}

      {subjectCards.length > 0 && (
        <div className="row gap wrap">
          <input className="grow" type="search" placeholder="Buscar tarjeta…" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Buscar tarjeta" />
          {topics.length > 0 && (
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} aria-label="Filtrar por tema">
              <option value="">Todos los temas</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      )}

      {subjectCards.length === 0 && !adding && !importing && (
        <section className="panel">
          <EmptyState
            title="Aún no hay tarjetas"
            actions={
              <>
                <button className="btn primary" onClick={() => setAdding(true)}>+ Crear la primera</button>
                <button className="btn ghost" onClick={() => setImporting(true)}><Upload size={14} /> Importar varias</button>
              </>
            }
          >
            <p>Escribe una pregunta y su respuesta, o importa varias a la vez desde Excel o Google Sheets.</p>
          </EmptyState>
        </section>
      )}

      {subjectCards.length > 0 && visible.length === 0 && (
        <EmptyState compact title="Sin resultados">
          <p>Ninguna tarjeta coincide con tu búsqueda.</p>
        </EmptyState>
      )}

      <ul className="card-list">
        {visible.map((c) =>
          editing === c.id ? (
            <li key={c.id} className="panel">
              <CardForm subjects={subjects} initial={c} topics={topics}
                onSubmit={async (d, imgs) => { await updateCard(user.uid, c, d, imgs); setEditing(null); }}
                onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={c.id} className="panel flash-item">
              <div className="flash-meta">
                {c.topic && <span className="tag">{c.topic}</span>}
                <span className={`status ${cardStatus(c)}`}>{STATUS_LABEL[cardStatus(c)]}</span>
                <span className="muted small">
                  {isDue(c, now) ? 'Pendiente hoy' : `Próximo repaso: ${fmtShort(c.dueDate)}`}
                </span>
              </div>
              <div className="flash-row">
                {c.frontImage?.url && <img className="flash-thumb" src={c.frontImage.url} alt="" loading="lazy" />}
                <p className="flash-front">{c.front || <span className="muted">(imagen)</span>}</p>
              </div>
              <div className="flash-row">
                {c.backImage?.url && <img className="flash-thumb" src={c.backImage.url} alt="" loading="lazy" />}
                <p className="flash-back">{c.back || <span className="muted">(imagen)</span>}</p>
              </div>
              <div className="row gap end">
                <button className="btn small ghost" onClick={() => setEditing(c.id)}>Editar</button>
                <button className="btn small ghost danger" onClick={() => remove(c)}>Eliminar</button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
