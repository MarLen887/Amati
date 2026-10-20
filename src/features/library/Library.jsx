import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Brain, CircleAlert, ExternalLink, FileText, FileUp, Lightbulb, NotebookPen, Search as SearchIcon, X } from 'lucide-react';
import { useData } from '../../core/context/DataContext.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import { searchCrossref } from '../search/api/crossref.js';
import { searchGoogleBooks } from '../search/api/googleBooks.js';
import { searchGutendex } from '../search/api/gutendex.js';
import { DEFAULT_LANGS, LANGS, matchesLangs, normalizeLang } from '../search/api/languages.js';
import { searchOpenLibrary } from '../search/api/openLibrary.js';
import { isInScope } from '../search/api/scope.js';
import { fetchCategories, matchCategories } from '../search/api/openTrivia.js';
import { unifyBooks } from '../search/api/unify.js';
import { searchWikipedia } from '../search/api/wikipedia.js';
import BookCard from '../search/BookCard.jsx';
import TriviaPanel from '../search/TriviaPanel.jsx';
import { plainNote } from '../notes/GenerateResources.jsx';
import LibroList from './LibroList.jsx';
import UploadPdf from './UploadPdf.jsx';

const RECENT_KEY = 'amati-recent-searches';
const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};
const pushRecent = (q) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((r) => r !== q)].slice(0, 6)));
  } catch {
    /* sin almacenamiento */
  }
};

const CATEGORIES = [
  { id: 'libros', label: 'Libros', Icon: BookOpen },
  { id: 'articulos', label: 'Artículos', Icon: FileText },
  { id: 'trivia', label: 'Trivia', Icon: Brain },
  { id: 'apuntes', label: 'Apuntes', Icon: NotebookPen },
  { id: 'temas', label: 'Temas', Icon: Lightbulb },
];

const BOOK_SOURCES = { OpenLibrary: searchOpenLibrary, Gutendex: searchGutendex, GoogleBooks: searchGoogleBooks };
const NAMES = { OpenLibrary: 'Open Library', InternetArchive: 'Internet Archive', Gutendex: 'Gutenberg', GoogleBooks: 'Google Books', trivia: 'OpenTDB', Crossref: 'Crossref', Wikipedia: 'Wikipedia' };

// Recursos recomendados para empezar (libros de dominio público descargables)
const RECOMMENDED = [
  { q: 'Don Quijote', by: 'Cervantes', tone: 'a' },
  { q: 'Platón', by: 'Filosofía clásica', tone: 'b' },
  { q: 'Darwin', by: 'El origen de las especies', tone: 'c' },
  { q: 'Frankenstein', by: 'Mary Shelley', tone: 'd' },
];

// Una fuente lenta no debe dejar esperando al resto
const timed = (promise, ms, name) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} tardó demasiado en responder.`)), ms))]);

function ArticleCard({ a }) {
  return (
    <li className="panel book-card">
      <h3>{a.title}</h3>
      <p className="small">{a.authors.join(', ') || 'Autor desconocido'}</p>
      <p className="small muted">{[a.journal, a.year, a.cited > 0 && `${a.cited} citas`].filter(Boolean).join(' · ')}</p>
      {a.abstract && <p className="book-desc small">{a.abstract.length > 360 ? `${a.abstract.slice(0, 360)}…` : a.abstract}</p>}
      <div className="row gap wrap">
        <a className="btn small ghost" href={a.url} target="_blank" rel="noreferrer noopener">Ver artículo <ExternalLink size={12} aria-hidden="true" /></a>
        <Link className="btn small ghost" to={`/apuntes/nuevo?${new URLSearchParams({ tipo: 'pq4r', fuente: a.title })}`}>Leer con PQ4R</Link>
      </div>
    </li>
  );
}

function TopicCard({ t }) {
  return (
    <li className="panel book-card">
      <div className="book-top">
        {t.thumb && <img className="book-cover" src={t.thumb} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <div className="grow">
          <h3>{t.title} <span className="tag lang-tag">{t.lang.toUpperCase()}</span></h3>
          <p className="book-desc small">{t.extract}</p>
        </div>
      </div>
      <div className="row gap wrap">
        <Link className="btn small ghost" to={`/apuntes/nuevo?${new URLSearchParams({ tipo: 'feynman', fuente: t.title })}`}>Aprender con Feynman</Link>
        <a className="btn small ghost" href={t.url} target="_blank" rel="noreferrer noopener">Leer más <ExternalLink size={12} aria-hidden="true" /></a>
      </div>
    </li>
  );
}

// Biblioteca: buscar recursos para aprender (libros, artículos, trivia, apuntes, temas) y ver lo guardado.
export default function Library() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const cat = CATEGORIES.some((c) => c.id === params.get('cat')) ? params.get('cat') : 'libros';
  const view = params.get('vista') === 'guardados' ? 'guardados' : 'explorar';
  const langs = useMemo(() => {
    const picked = (params.get('idiomas') || '').split(',').map(normalizeLang).filter(Boolean);
    return picked.length ? [...new Set(picked)] : DEFAULT_LANGS;
  }, [params]);
  const langKey = langs.join(',');
  const { subjects, libros, notes, classNotes, subjectMap } = useData();
  const [input, setInput] = useState(q);
  const [onlyDownloadable, setOnlyDownloadable] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const [raw, setRes] = useState({ status: 'idle' });
  // El resultado solo se muestra si corresponde a la búsqueda actual (evita mezclar categorías al cambiar rápido)
  const curKey = `${cat}|${q}|${langKey}`;
  const res = raw.key === curKey ? raw : { status: view === 'explorar' && q && cat !== 'apuntes' ? 'loading' : 'idle' };

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    if (view !== 'explorar' || !q || cat === 'apuntes') {
      setRes({ status: 'idle' });
      return;
    }
    const ctrl = new AbortController();
    const opts = { signal: ctrl.signal, langs };
    const key = `${cat}|${q}|${langKey}`;
    setRes({ key, status: 'loading' });
    pushRecent(q);
    setRecent(readRecent());

    if (cat === 'libros') {
      const names = Object.keys(BOOK_SOURCES);
      // Se piden más resultados por fuente porque después se descarta lo que queda fuera de alcance
      const bookOpts = { ...opts, max: 30 };
      Promise.allSettled(names.map((n) => timed(BOOK_SOURCES[n](q, bookOpts), 15000, NAMES[n]))).then((results) => {
        if (ctrl.signal.aborted) return;
        const lists = {};
        const src = {};
        names.forEach((n, i) => {
          lists[n] = results[i].status === 'fulfilled' ? results[i].value : [];
          src[n] = results[i].status === 'fulfilled' ? { ok: true, n: lists[n].length } : { ok: false, error: results[i].reason?.message };
        });
        setRes({ key, status: 'done', books: unifyBooks(lists).filter((b) => matchesLangs(b, langs) && isInScope(b)), src });
      });
    } else if (cat === 'articulos') {
      timed(searchCrossref(q, opts), 15000, 'Crossref')
        .then((items) => !ctrl.signal.aborted && setRes({ key, status: 'done', articles: items, src: { Crossref: { ok: true, n: items.length } } }))
        .catch((e) => !ctrl.signal.aborted && setRes({ key, status: 'done', articles: [], src: { Crossref: { ok: false, error: e.message } } }));
    } else if (cat === 'temas') {
      timed(searchWikipedia(q, opts), 15000, 'Wikipedia')
        .then((items) => !ctrl.signal.aborted && setRes({ key, status: 'done', topics: items, src: { Wikipedia: { ok: true, n: items.length } } }))
        .catch((e) => !ctrl.signal.aborted && setRes({ key, status: 'done', topics: [], src: { Wikipedia: { ok: false, error: e.message } } }));
    } else if (cat === 'trivia') {
      timed(fetchCategories(opts), 15000, 'OpenTDB')
        .then((cats) => !ctrl.signal.aborted && setRes({ key, status: 'done', cats, matched: matchCategories(q, cats), src: { trivia: { ok: true } } }))
        .catch((e) => !ctrl.signal.aborted && setRes({ key, status: 'done', cats: [], matched: [], src: { trivia: { ok: false, error: e.message } } }));
    }
    return () => ctrl.abort();
  }, [q, cat, langKey, view]);

  const savedBy = useMemo(() => {
    const m = {};
    for (const l of libros) (m[l.isbn || l.title] ||= []).push(l.subjectId);
    return m;
  }, [libros]);

  const localHits = useMemo(() => {
    if (cat !== 'apuntes' || !q) return [];
    const needle = q.toLowerCase();
    const files = classNotes.map((n) => ({ key: `f${n.id}`, title: n.title, text: n.text || '', href: `/clases/${n.id}`, subjectId: n.subjectId }));
    const written = notes.map((n) => ({ key: `w${n.id}`, title: n.title, text: plainNote(n), href: `/apuntes/${n.id}`, subjectId: n.subjectId }));
    return [...files, ...written].filter((i) => `${i.title} ${i.text}`.toLowerCase().includes(needle));
  }, [cat, q, classNotes, notes]);

  function go(next = {}) {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    const ncat = next.cat ?? cat;
    const nl = next.langs ?? langs;
    if (nq) p.set('q', nq);
    if (ncat !== 'libros') p.set('cat', ncat);
    if (nl.join(',') !== DEFAULT_LANGS.join(',')) p.set('idiomas', nl.join(','));
    if (next.vista ?? (view === 'guardados' ? 'guardados' : '')) p.set('vista', next.vista ?? 'guardados');
    setParams(p);
  }
  const submit = (e) => { e.preventDefault(); if (input.trim()) go({ q: input.trim(), vista: '' }); };

  const books = res.books ? (onlyDownloadable ? res.books.filter((b) => b.downloadable) : res.books) : [];
  // Las fuentes de libros son de mejor esfuerzo: si una falla se ve en su etiqueta, sin avisos que alarmen.
  // Solo se avisa cuando falla la única fuente de la categoría (artículos, temas o trivia).
  const failed = cat === 'libros' ? [] : Object.entries(res.src || {}).filter(([k, v]) => !v.ok);
  const allBooksFailed = cat === 'libros' && Object.values(res.src || {}).length > 0 && Object.values(res.src).every((v) => !v.ok);
  const showLangs = cat === 'libros' || cat === 'articulos' || cat === 'temas';

  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>Biblioteca</h1>
        <p className="muted">Encuentra libros, artículos y temas para aprender: textos académicos, científicos, educativos y literarios.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Biblioteca">
        <button role="tab" aria-selected={view === 'explorar'} className={view === 'explorar' ? 'active' : ''} onClick={() => go({ vista: '' })}>Explorar</button>
        <button role="tab" aria-selected={view === 'guardados'} className={view === 'guardados' ? 'active' : ''} onClick={() => go({ vista: 'guardados' })}>
          Mis libros <span className="tab-count">{libros.length}</span>
        </button>
      </div>

      {view === 'guardados' ? (
        <section className="stack">
          <div className="row between wrap gap">
            <p className="small muted grow">Libros que guardaste y tus propios PDFs.</p>
            {!uploading && <button className="btn primary" onClick={() => setUploading(true)}><FileUp size={16} aria-hidden="true" /> Subir PDF</button>}
          </div>
          {uploading && <UploadPdf onDone={() => setUploading(false)} onCancel={() => setUploading(false)} />}
          {libros.length === 0 && !uploading ? (
            <section className="panel">
              <EmptyState title="Aún no has guardado libros" actions={<button className="btn ghost" onClick={() => go({ vista: '' })}>Explorar libros</button>}>
                <p>Guarda libros desde Explorar o sube tus propios PDFs.</p>
              </EmptyState>
            </section>
          ) : (
            <LibroList />
          )}
        </section>
      ) : (
        <>
          <form className="search-bar" role="search" onSubmit={submit} data-tour="library-search">
            <SearchIcon size={18} aria-hidden="true" />
            <input type="search" value={input} onChange={(e) => setInput(e.target.value)} autoFocus={!q}
              placeholder="¿Qué quieres aprender? Ej. cálculo, Don Quijote…" aria-label="Buscar recursos" maxLength={120} />
            {input && <button type="button" className="icon-btn" aria-label="Borrar" onClick={() => { setInput(''); go({ q: '' }); }}><X size={16} /></button>}
            <button className="btn primary" disabled={!input.trim()}>Buscar</button>
          </form>

          <div className="chips" role="group" aria-label="Categoría" data-tour="library-cats">
            {CATEGORIES.map(({ id, label, Icon }) => (
              <button key={id} type="button" className={`chip ${cat === id ? 'active' : ''}`} aria-pressed={cat === id} onClick={() => go({ cat: id })}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {showLangs && (
            <details className="tips filters">
              <summary>Filtros {cat === 'libros' && onlyDownloadable ? '· solo descargables' : ''}</summary>
              <div className="stack">
                <div className="stack-sm" role="group" aria-label="Idiomas">
                  <span className="field-label">Idiomas</span>
                  <div className="chips">
                    {LANGS.map((l) => {
                      const on = langs.includes(l.id);
                      return (
                        <button key={l.id} type="button" className={`chip ${on ? 'active' : ''}`} aria-pressed={on}
                          onClick={() => {
                            const next = on ? langs.filter((x) => x !== l.id) : [...langs, l.id];
                            if (next.length) go({ langs: LANGS.map((x) => x.id).filter((x) => next.includes(x)) });
                          }}>
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {cat === 'libros' && (
                  <label className="checkbox">
                    <input type="checkbox" checked={onlyDownloadable} onChange={(e) => setOnlyDownloadable(e.target.checked)} />
                    Solo libros descargables
                  </label>
                )}
              </div>
            </details>
          )}

          {!q && (
            <section className="stack">
              <div className="stack-sm">
                <h2 className="h3">Recursos recomendados</h2>
                <ul className="reco-grid">
                  {RECOMMENDED.map((r) => (
                    <li key={r.q}>
                      <button type="button" className={`reco-card tone-${r.tone}`} onClick={() => go({ q: r.q, cat: 'libros' })}>
                        <BookOpen size={22} aria-hidden="true" />
                        <strong>{r.q}</strong>
                        <span className="small">{r.by}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {recent.length > 0 && (
                <div className="stack-sm">
                  <h2 className="h3">Búsquedas recientes</h2>
                  <div className="chips">
                    {recent.map((s) => <button key={s} className="chip" onClick={() => go({ q: s })}>{s}</button>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {q && res.status === 'loading' && <p className="muted" role="status">Buscando «{q}»…</p>}

          {q && res.status === 'done' && failed.length > 0 && (
            <div className="notice warn small" role="status">
              <CircleAlert size={16} aria-hidden="true" />
              <div>
                {failed.map(([k, v]) => <p key={k}>{NAMES[k]} no respondió: {v.error || 'error de conexión'}</p>)}
                {Object.keys(res.src).length > failed.length && <p>Los demás resultados se muestran con normalidad.</p>}
              </div>
            </div>
          )}

          {q && res.status === 'done' && cat === 'libros' && (
            <section className="stack">
              <p className="small muted src-pills">
                {Object.keys(res.src).map((k) => (
                  <span key={k} className={`src-pill ${res.src[k].ok ? 'ok' : 'bad'}`} title={res.src[k].error || ''}>
                    {NAMES[k]}{res.src[k].n != null ? ` · ${res.src[k].n}` : ''}
                  </span>
                ))}
              </p>
              {books.length === 0 ? (
                <EmptyState compact title={allBooksFailed ? 'No pudimos cargar los libros' : 'Sin libros para esta búsqueda'}>
                  <p>{allBooksFailed ? 'Revisa tu conexión e inténtalo de nuevo en un momento.' : onlyDownloadable ? 'Desmarca «Solo libros descargables» para ver también el material protegido.' : 'Prueba con otras palabras. La Biblioteca solo muestra textos académicos, científicos, educativos y literarios.'}</p>
                </EmptyState>
              ) : (
                <ul className="book-list">
                  {books.map((b) => <BookCard key={b.id} book={b} subjects={subjects} savedIn={savedBy[b.isbns[0]] || savedBy[b.title] || []} />)}
                </ul>
              )}
            </section>
          )}

          {q && res.status === 'done' && cat === 'articulos' && (
            res.articles.length === 0 ? (
              <EmptyState compact title="Sin artículos para esta búsqueda"><p>Prueba con términos más específicos.</p></EmptyState>
            ) : (
              <ul className="book-list">{res.articles.map((a) => <ArticleCard key={a.id} a={a} />)}</ul>
            )
          )}

          {q && res.status === 'done' && cat === 'temas' && (
            res.topics.length === 0 ? (
              <EmptyState compact title="Sin temas para esta búsqueda"><p>Prueba con otra palabra o idioma.</p></EmptyState>
            ) : (
              <ul className="book-list">{res.topics.map((t) => <TopicCard key={t.id} t={t} />)}</ul>
            )
          )}

          {q && res.status === 'done' && cat === 'trivia' && (
            res.cats.length === 0 ? (
              <p className="muted small">No se pudo cargar la trivia ahora. Inténtalo más tarde.</p>
            ) : (
              <TriviaPanel key={q} categories={res.cats} matched={res.matched} subjects={subjects} query={q} />
            )
          )}

          {q && cat === 'apuntes' && (
            localHits.length === 0 ? (
              <EmptyState compact title="Ningún apunte coincide"><p>Se busca en los títulos y en el texto de tus apuntes.</p></EmptyState>
            ) : (
              <ul className="note-list">
                {localHits.map((i) => (
                  <li key={i.key} className="panel note-item">
                    <Link to={i.href} className="grow note-link">
                      <strong>{i.title}</strong>
                      <span className="small muted">{subjectMap[i.subjectId]?.name || 'Sin materia'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}
    </div>
  );
}
