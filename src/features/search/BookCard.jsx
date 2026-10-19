import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, Check, ChevronDown, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { saveLibro } from '../../core/data/db.js';
import CopyrightNotice from '../library/CopyrightNotice.jsx';
import { fetchOpenLibraryDescription } from './api/openLibrary.js';
import { SOURCE_NAMES } from './api/unify.js';

const READ_WITH = [
  { tipo: 'pq4r', label: 'PQ4R' },
  { tipo: 'sq3r', label: 'SQ3R' },
  { tipo: 'feynman', label: 'Feynman' },
];

// Un libro ya unificado (Open Library + Internet Archive + Gutendex + Google Books).
const NO_DESCRIPTION = 'Descripción no disponible por el momento, estamos trabajando en ello. Gracias por tu comprensión.';

// Primeras dos oraciones de la sinopsis (sin etiquetas HTML ni espacios de más)
function twoSentences(text) {
  const clean = String(text || '').replace(/<[^>]+>/g, ' ').replace(/s+/g, ' ').trim();
  const parts = clean.match(/[^.!?¡¿]*[^s.!?][^.!?]*[.!?]+(?=s|$)/g);
  if (!parts) return clean.length > 280 ? `${clean.slice(0, 280).trimEnd()}…` : clean;
  const out = parts.slice(0, 2).join(' ').trim();
  return out.length > 400 ? `${out.slice(0, 400).trimEnd()}…` : out;
}

export default function BookCard({ book, subjects, savedIn = [] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [description, setDescription] = useState(book.description);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(savedIn.includes(subjectId));
  const [error, setError] = useState('');

  // Si ninguna fuente trajo sinopsis, se intenta con la ficha de Open Library
  useEffect(() => {
    if (description || !book.olKey) return undefined;
    let alive = true;
    fetchOpenLibraryDescription(book.olKey)
      .then((d) => alive && d && setDescription(d))
      .catch(() => {});
    return () => { alive = false; };
  }, [book.olKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => setOpen((o) => !o);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await saveLibro(user.uid, subjectId, { ...book, description });
      setSaved(true);
    } catch (e) {
      setError('No se pudo guardar. ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const meta = [book.year, book.pages && `${book.pages} págs.`, book.editions && `${book.editions} ediciones`, book.publisher]
    .filter(Boolean)
    .join(' · ');
  const links = [
    [book.links.openLibrary, 'Open Library'],
    [book.links.archive, 'Internet Archive'],
    [book.links.gutenberg, 'Gutenberg'],
    [book.links.googleInfo, 'Google Books'],
    [book.links.preview, 'Vista previa'],
  ].filter(([u]) => u);

  return (
    <li className="panel book-card">
      <div className="book-top">
        {book.cover ? (
          <img className="book-cover" src={book.cover} alt={`Portada de ${book.title}`} loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="book-cover empty" aria-hidden="true"><BookMarked size={26} /></div>
        )}
        <div className="grow">
          <h3>{book.title}{book.subtitle ? <span className="muted">: {book.subtitle}</span> : null}</h3>
          <p className="small">{book.authors.join(', ') || 'Autor desconocido'}</p>
          {meta && <p className="small muted">{meta}</p>}
          <p className={`book-desc small ${description ? '' : 'muted'}`}>{description ? twoSentences(description) : NO_DESCRIPTION}</p>
          <div className="row gap wrap">
            {book.publicDomain && <span className="tag pick-tag">Dominio público</span>}
            {book.downloadable && <span className="tag pick-tag"><Download size={11} aria-hidden="true" /> Descargable</span>}
            {book.languages.map((l) => <span key={l} className="tag lang-tag" title="Idioma">{l.toUpperCase()}</span>)}
            {book.sources.map((s) => <span key={s} className={`tag src-${s}`}>{SOURCE_NAMES[s]}</span>)}
          </div>
        </div>
      </div>

      {book.downloadable ? (
        <div className="download-row">
          {book.downloads.slice(0, 6).map((d) => (
            <a key={d.url} className="btn small primary" href={d.url} target="_blank" rel="noreferrer noopener">
              <Download size={14} aria-hidden="true" /> {d.label}
            </a>
          ))}
        </div>
      ) : (
        <CopyrightNotice compact />
      )}

      <button type="button" className="btn link" aria-expanded={open} onClick={toggle}>
        <ChevronDown size={14} aria-hidden="true" className={open ? 'flip' : ''} /> {open ? 'Ocultar' : 'Ver detalles y guardar'}
      </button>

      {open && (
        <div className="stack unfold">
          {book.subjects.length > 0 && (
            <div className="row gap wrap">
              {book.subjects.slice(0, 8).map((s) => <span key={s} className="tag">{s}</span>)}
            </div>
          )}
          {links.length > 0 && (
            <div className="row gap wrap small">
              {links.map(([u, label]) => <a key={u} href={u} target="_blank" rel="noreferrer noopener">{label} <ExternalLink size={12} aria-hidden="true" /></a>)}
            </div>
          )}

          <div className="book-actions">
            <div className="stack-sm">
              <span className="field-label">Guardar en mi biblioteca</span>
              <div className="row gap wrap">
                <select value={subjectId} aria-label="Materia" onChange={(e) => { setSubjectId(e.target.value); setSaved(savedIn.includes(e.target.value)); }}>
                  <option value="">Sin materia</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" className="btn small primary" disabled={saving || saved} onClick={save}>
                  {saved ? <><Check size={14} aria-hidden="true" /> Guardado</> : saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              {saved && <p className="small"><Link to="/biblioteca?vista=guardados">Ver mis libros</Link></p>}
              {error && <p className="error">{error}</p>}
            </div>
            <div className="stack-sm">
              <span className="field-label">Leerlo con una técnica guiada</span>
              <div className="chips">
                {READ_WITH.map((r) => (
                  <Link key={r.tipo} className="chip"
                    to={`/apuntes/nuevo?${new URLSearchParams({ tipo: r.tipo, fuente: book.title, ...(subjectId ? { materia: subjectId } : {}) })}`}>
                    {r.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
