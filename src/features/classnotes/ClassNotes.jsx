import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ImageIcon, Search } from 'lucide-react';
import { useData } from '../../core/context/DataContext.jsx';
import { fmtShort } from '../../core/lib/dates.js';


// Lista de notas de clase; con subjectId muestra solo las de esa materia.
export function ClassNotesList({ subjectId = '', showFilters = true }) {
  const { classNotes, subjects, subjectMap } = useData();
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState(subjectId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return classNotes
      .filter((n) => (!subject || n.subjectId === subject))
      .filter((n) => !needle || `${n.title} ${n.text}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.classDate || b.createdAt || 0) - (a.classDate || a.createdAt || 0));
  }, [classNotes, subject, q]);

  return (
    <div className="stack">
      {showFilters && classNotes.length > 0 && (
        <div className="row gap wrap">
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en títulos y en el texto de las notas…" aria-label="Buscar en notas de clase" />
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
        <p className="muted small">{classNotes.length === 0 ? 'Todavía no hay notas de clase aquí.' : 'Ninguna nota coincide con tu búsqueda.'}</p>
      ) : (
        <ul className="classnote-grid">
          {list.map((n) => {
            const s = subjectMap[n.subjectId];
            const Icon = n.file?.kind === 'pdf' ? FileText : ImageIcon;
            return (
              <li key={n.id}>
                <Link to={`/clases/${n.id}`} className="panel classnote-card">
                  {n.file?.thumb ? (
                    <img src={n.file.thumb} alt="" loading="lazy" className="classnote-thumb" />
                  ) : (
                    <div className="classnote-thumb empty" aria-hidden="true"><Icon size={28} /></div>
                  )}
                  <div className="classnote-body">
                    <strong>{n.title}</strong>
                    <span className="small muted">
                      {s ? `${s.name} · ` : ''}{fmtShort(n.classDate || n.createdAt || new Date())}
                    </span>
                    <p className="small snippet">{n.text ? n.text.slice(0, 110) : 'Sin texto extraído todavía'}</p>
                    <span className="row gap wrap">
                      {n.file && <span className="tag">{n.file.kind === 'pdf' ? 'PDF' : 'Foto'}</span>}
                      {n.ocr === 'gemini' && <span className="tag pick-tag">Texto con IA</span>}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
