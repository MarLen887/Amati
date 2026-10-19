import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, Download, ExternalLink, FileText, Search } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { deleteLibro } from '../../core/data/db.js';
import CopyrightNotice from './CopyrightNotice.jsx';

const SOURCE_TAG = { OpenLibrary: 'Open Library', InternetArchive: 'Internet Archive', Gutenberg: 'Gutenberg', GoogleBooks: 'Google Books', Usuario: 'Mi PDF' };

// Libros guardados (de las APIs) y PDFs propios. Con subjectId muestra solo los de esa materia.
export default function LibroList({ subjectId = '', showFilters = true }) {
  const { user } = useAuth();
  const { libros, subjects } = useData();
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState(subjectId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return libros
      .filter((l) => !subject || l.subjectId === subject)
      .filter((l) => !needle || `${l.title} ${l.author}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [libros, subject, q]);

  return (
    <div className="stack">
      {showFilters && libros.length > 0 && (
        <div className="row gap wrap">
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o autor…" aria-label="Buscar en mi biblioteca" />
          </label>
          {!subjectId && (
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filtrar por materia">
              <option value="">Todas las materias</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <p className="muted small">{libros.length === 0 ? 'Todavía no hay libros aquí.' : 'Ningún libro coincide con tu búsqueda.'}</p>
      ) : (
        <ul className="note-list">
          {list.map((l) => (
            <li key={l.id} className="panel libro-item">
              {l.coverUrl ? <img className="libro-cover" src={l.coverUrl} alt="" loading="lazy" />
                : <span className="technique-icon">{l.kind === 'pdf' ? <FileText size={20} /> : <BookMarked size={20} />}</span>}
              <div className="grow note-link">
                <strong>{l.title}</strong>
                <span className="small muted">{[l.author, l.year].filter(Boolean).join(' · ')}</span>
                <span className="row gap wrap">
                  <span className="tag">{SOURCE_TAG[l.source] || l.source}</span>
                  {l.kind === 'pdf' && l.file?.bytes && <span className="tag">{Math.max(1, Math.round(l.file.bytes / 1024))} KB</span>}
                </span>
                {l.downloadable === false && <CopyrightNotice compact />}
              </div>
              <div className="row gap wrap libro-actions">
                {l.kind === 'pdf' && l.file && <Link className="btn small primary" to={`/biblioteca/pdf/${l.id}`}>Leer y anotar</Link>}
                {l.downloadable && l.downloads?.slice(0, 3).map((d) => (
                  <a key={d.url} className="btn small ghost" href={d.url} target="_blank" rel="noreferrer noopener">
                    <Download size={14} aria-hidden="true" /> {d.label}
                  </a>
                ))}
                {!l.downloadable && l.link && (
                  <a className="btn small ghost" href={l.link} target="_blank" rel="noreferrer noopener" aria-label={`Ver información de ${l.title}`}>
                    <ExternalLink size={14} aria-hidden="true" /> Información
                  </a>
                )}
                <Link className="btn small ghost" to={`/apuntes/nuevo?${new URLSearchParams({ tipo: 'pq4r', fuente: l.title, ...(l.subjectId ? { materia: l.subjectId } : {}) })}`}>PQ4R</Link>
                <button className="btn small ghost danger" onClick={() => confirm(`¿Quitar «${l.title}» de tu biblioteca?`) && deleteLibro(user.uid, l.id)}>Quitar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
