import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createCard, deleteCard, updateCard } from '../../core/data/db.js';
import { cardStatus, isDue } from '../techniques/cards/srs.js';
import { fmtShort } from '../../core/lib/dates.js';
import { CircleCheck, Compass, FileText, Layers, Library as LibraryIcon, Lightbulb, NotebookPen, Pencil, PenLine, Play, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, Wrench } from 'lucide-react';
import CardForm from './CardForm.jsx';
import ImportCards from './ImportCards.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import ExamCountdown from './ExamCountdown.jsx';
import { DeleteSubjectModal, EditSubjectModal } from './SubjectModals.jsx';
import SubjectTools from './SubjectTools.jsx';
import SubjectRecentTechnique from './SubjectRecentTechnique.jsx';
import { NotesList } from '../notes/Notes.jsx';
import LibroList from '../library/LibroList.jsx';
import MoreMenu from '../../core/components/MoreMenu.jsx';
import UploadPdf from '../library/UploadPdf.jsx';
import { ClassNotesList } from '../classnotes/ClassNotes.jsx';
import { NOTE_TYPES, techniqueUrl } from '../techniques/techniques.js';
import TechniqueChip from '../techniques/TechniqueChip.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';
import BackLink from '../../core/components/BackLink.jsx';
import '../../styles/subject-detail.css';
import { useConfirm } from '../../core/components/ConfirmDialog.jsx';

const STATUS_LABEL = { new: 'Nueva', learning: 'Aprendiendo', mastered: 'Dominada' };

function TipsCard() {
  return (
    <details className="tips">
      <summary><Lightbulb size={16} aria-hidden="true" /> Consejos para escribir buenas tarjetas</summary>
      <ul className="small">
        <li><strong>Una idea por tarjeta.</strong> Si necesitas «y» en la respuesta, probablemente son dos tarjetas.</li>
        <li><strong>Pregunta concreta.</strong> «¿Cuáles son las 3 fases de la mitosis?» mejor que «Mitosis».</li>
        <li><strong>Respuesta corta</strong> que puedas decir de memoria en pocos segundos.</li>
        <li>Con el <strong>tema</strong> puedes agrupar tarjetas y estudiar solo una parte.</li>
      </ul>
    </details>
  );
}

export default function SubjectDetail() {
  const confirm = useConfirm();
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { subjects, cards, notes, libros, classNotes, subjectMap, loading, now } = useData();
  const [tab, setTab] = useState(
    { recursos: 'resources', clases: 'class', herramientas: 'tools' }[params.get('tab')] || 'notes',
  );
  const [adding, setAdding] = useState(params.get('agregar') === '1');
  const [cardsOpen, setCardsOpen] = useState(params.get('agregar') === '1');
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(null); // 'edit' | 'delete'
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [imported, setImported] = useState(0);

  const subject = subjectMap[id];
  const subjectCards = useMemo(
    () => cards.filter((c) => c.subjectId === id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [cards, id],
  );
  const subjectNotes = notes.filter((n) => n.subjectId === id);
  const subjectLibros = libros.filter((r) => r.subjectId === id);
  const subjectClassNotes = classNotes.filter((n) => n.subjectId === id);
  const topics = useMemo(
    () => [...new Set(subjectCards.map((c) => c.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [subjectCards],
  );

  if (loading) return <Skeleton variant="detail" />;
  if (!subject) return <p>Materia no encontrada. <Link to="/materias">Volver</Link></p>;

  const q = search.trim().toLowerCase();
  const visible = subjectCards.filter(
    (c) =>
      (!topicFilter || c.topic === topicFilter) &&
      (!q || (c.front || '').toLowerCase().includes(q) || (c.back || '').toLowerCase().includes(q)),
  );
  const due = subjectCards.filter((c) => isDue(c, now)).length;
  const mastered = subjectCards.filter((c) => cardStatus(c) === 'mastered').length;
  const masteredPct = subjectCards.length ? Math.round((mastered / subjectCards.length) * 100) : 0;
  const studyHref = `/tecnicas?materia=${id}${topicFilter ? `&tema=${encodeURIComponent(topicFilter)}` : ''}`;

  async function remove(c) {
    if (await confirm({ title: '¿Eliminar esta tarjeta?', message: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true })) await deleteCard(user.uid, c);
  }

  const openAdd = () => { setAdding(true); setImporting(false); setCardsOpen(true); };
  const openImport = () => { setImporting(true); setImported(0); setAdding(false); setCardsOpen(true); };

  return (
    <div className="stack-lg subject-page" style={{ '--sc': subject.color || undefined }}>
      <div className="stack">
        <BackLink to="/materias">Materias</BackLink>
        <header className="subject-hero">
          <div className="hero-top">
            <span className="subject-badge" aria-hidden="true">{(subject.name || '?').trim().charAt(0).toUpperCase()}</span>
            <div className="hero-title">
              <p className="eyebrow">Materia</p>
              <h1>{subject.name}</h1>
            </div>
            <div className="hero-actions">
              {subjectCards.length > 0 && (
                <Link to={studyHref} className="btn primary lg">
                  <Play size={16} fill="currentColor" aria-hidden="true" /> Estudiar{due > 0 ? ` · ${due}` : ''}
                </Link>
              )}
              {!subject.sample && (
                <MoreMenu label="Más acciones de la materia" items={[
                  { label: 'Editar materia', onClick: () => setModal('edit') },
                  { label: 'Eliminar materia', onClick: () => setModal('delete'), danger: true },
                ]} />
              )}
            </div>
          </div>
          <ul className="hero-stats" aria-label="Resumen de la materia">
            <li className={due > 0 ? 'hl' : ''}>
              <span className="hs-label"><Layers size={14} aria-hidden="true" /> Pendientes hoy</span>
              <span className="hs-value">{due}</span>
            </li>
            <li>
              <span className="hs-label"><ShieldCheck size={14} aria-hidden="true" /> Dominadas</span>
              <span className="hs-value">{mastered}<small> / {subjectCards.length}</small></span>
              <span className="mini-bar" aria-hidden="true"><i style={{ '--w': `${masteredPct}%` }} /></span>
            </li>
            <li>
              <span className="hs-label"><NotebookPen size={14} aria-hidden="true" /> Apuntes</span>
              <span className="hs-value">{subjectNotes.length + subjectClassNotes.length}</span>
            </li>
          </ul>
        </header>
      </div>

      {subject.sample && (
        <div className="sample-banner">
          <Sparkles size={18} aria-hidden="true" />
          <span className="grow">
            Esta es una <strong>materia de ejemplo</strong> para que pruebes Amati. Cuando quieras, elimínala y crea las tuyas.
          </span>
          <button className="btn small ghost danger" onClick={() => setModal('delete')}>Eliminar ejemplo</button>
        </div>
      )}

      {subject.examDate && <ExamCountdown subject={subject} cards={subjectCards} now={now} />}

      <SubjectRecentTechnique subjectId={id} cardCount={subjectCards.length} cardsOpen={cardsOpen} onToggleCards={() => setCardsOpen((o) => !o)} />

      {cardsOpen && (
      <section className="panel stack cards-section">
        <h2 className="h3 row gap"><Layers size={18} aria-hidden="true" /> Mis tarjetas <span className="tab-count">{subjectCards.length}</span>{due > 0 && <span className="stat-pill pending">{due} pendientes</span>}</h2>
          {!adding && !importing && (
            <div className="row gap wrap">
              <button className="btn ghost" onClick={openAdd}><Plus size={16} aria-hidden="true" /> Nueva tarjeta</button>
              <button className="btn ghost" onClick={openImport}><Upload size={14} aria-hidden="true" /> Importar varias</button>
            </div>
          )}

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
            <section className="panel stack">
              <h2 className="h3">Nueva tarjeta</h2>
              <CardForm
                subjects={subjects}
                initial={null}
                defaultSubjectId={id}
                topics={topics}
                submitLabel="Guardar y agregar otra"
                onSubmit={(d, imgs) => createCard(user.uid, d, imgs)}
                onCancel={() => setAdding(false)}
                onDone={() => setAdding(false)}
                key={`new-${id}`}
              />
              <TipsCard />
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
                    <button className="btn primary" onClick={openAdd}>+ Crear la primera</button>
                    <button className="btn ghost" onClick={openImport}><Upload size={14} /> Importar varias</button>
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
                  <div className="row end">
                    <MoreMenu label="Más acciones de la tarjeta" items={[
                      { label: 'Editar', onClick: () => setEditing(c.id) },
                      { label: 'Eliminar', onClick: () => remove(c), danger: true },
                    ]} />
                  </div>
                </li>
              ),
            )}
          </ul>
      </section>
      )}

      <div className="seg-tabs" role="tablist" aria-label="Contenido de la materia">
        <button role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>
          <NotebookPen size={16} aria-hidden="true" /> Apuntes <span className="tab-count">{subjectNotes.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'class'} onClick={() => setTab('class')}>
          <FileText size={16} aria-hidden="true" /> Clases <span className="tab-count">{subjectClassNotes.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'tools'} onClick={() => setTab('tools')}>
          <Wrench size={16} aria-hidden="true" /> Herramientas <span className="tab-count">{(subject.toolIds || []).length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'resources'} onClick={() => setTab('resources')}>
          <LibraryIcon size={16} aria-hidden="true" /> Biblioteca <span className="tab-count">{subjectLibros.length}</span>
        </button>
      </div>

      {tab === 'tools' && <SubjectTools subject={subject} />}

      {tab === 'class' && (
        <section className="stack">
          <div className="row between wrap gap">
            <p className="small muted grow">Fotos y PDFs de tus clases, con el texto extraído.</p>
            <Link to={`/clases/nueva?materia=${id}`} className="btn small primary"><Upload size={14} aria-hidden="true" /> Subir nota</Link>
          </div>
          <ClassNotesList subjectId={id} showFilters={false} />
        </section>
      )}

      {tab === 'resources' && (
        <section className="stack">
          <div className="row between wrap gap">
            <p className="small muted grow">Libros guardados desde el buscador y tus propios PDFs.</p>
            <div className="row gap wrap">
              <Link to={`/biblioteca?q=${encodeURIComponent(subject.name)}`} className="btn small ghost"><Search size={14} aria-hidden="true" /> Buscar libros</Link>
              {!uploadingPdf && <button className="btn small primary" onClick={() => setUploadingPdf(true)}><Upload size={14} aria-hidden="true" /> Subir PDF</button>}
            </div>
          </div>
          {uploadingPdf && <UploadPdf subjectId={id} onDone={() => setUploadingPdf(false)} onCancel={() => setUploadingPdf(false)} />}
          <LibroList subjectId={id} showFilters={false} />
        </section>
      )}

      {tab === 'notes' && (
        <section className="stack">
          <div className="create-head">
            <h2 className="h3">Crear un apunte</h2>
            <p className="small muted">Pasa el puntero sobre una técnica para ver de qué trata.</p>
          </div>
          <div className="create-tiles">
            {Object.entries(NOTE_TYPES).map(([k, v]) => (
              <TechniqueChip key={k} noteType={k} primary={k === 'libre'} to={techniqueUrl(v.technique, { subjectId: id })} />
            ))}
          </div>
          <NotesList subjectId={id} compact />
        </section>
      )}

      {modal === 'edit' && <EditSubjectModal subject={subject} onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteSubjectModal subject={subject} onClose={() => setModal(null)} onDeleted={() => navigate('/materias')} />}
    </div>
  );
}
