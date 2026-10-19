import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, GitFork, Search, Sparkles, Star } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';

// Proyectos reales con la API de GitHub (búsqueda pública, sin llave: ~10 búsquedas por minuto).
const API = 'https://api.github.com';
const LANGS = ['', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Go', 'Rust', 'SQL'];
const SORTS = [['stars', 'Más estrellas'], ['updated', 'Recién actualizados'], ['', 'Más relevantes']];
const EXAMPLES = [['React para principiantes', 'react beginner', 'JavaScript'], ['Árboles binarios en Java', 'binary tree', 'Java'], ['API REST con Node', 'rest api express', 'JavaScript'], ['Portafolio estudiantil', 'student portfolio', ''], ['Juegos en Python', 'pygame game', 'Python']];
const SAVE = 'amati-github-saved';

async function gh(path, accept = 'application/vnd.github+json') {
  let res;
  try { res = await fetch(`${API}${path}`, { headers: { Accept: accept } }); } catch { throw new Error('No se pudo conectar con GitHub. Revisa tu conexión.'); }
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const wait = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 60;
    throw new Error(`GitHub limita las búsquedas sin cuenta. Inténtalo de nuevo en ${wait > 90 ? `${Math.ceil(wait / 60)} min` : `${wait} s`}.`);
  }
  if (!res.ok) throw new Error(`GitHub respondió ${res.status}.`);
  return accept.includes('raw') ? res.text() : res.json();
}

const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso)) / 86_400_000);
  return d < 1 ? 'hoy' : d < 31 ? `hace ${d} d` : d < 365 ? `hace ${Math.floor(d / 30)} meses` : `hace ${Math.floor(d / 365)} años`;
};

export default function Github() {
  const [q, setQ] = useState('');
  const [lang, setLang] = useState('');
  const [sort, setSort] = useState('stars');
  const [begin, setBegin] = useState(false);
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // { full, text, loading }
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem(SAVE)) || []; } catch { return []; } });
  const [tab, setTab] = useState('search');
  useEffect(() => { try { localStorage.setItem(SAVE, JSON.stringify(saved)); } catch { /* sin almacenamiento */ } }, [saved]);

  async function search(term = q, l = lang, o = {}) {
    if (!term.trim()) return;
    setBusy(true); setError(''); setOpen(null); setTab('search');
    const b = o.begin ?? begin, s = o.sort ?? sort;
    try {
      const query = [term.trim(), l && `language:${l}`, b && 'good-first-issues:>2', 'archived:false'].filter(Boolean).join(' ');
      const data = await gh(`/search/repositories?q=${encodeURIComponent(query)}${s ? `&sort=${s}&order=desc` : ''}&per_page=12`);
      setItems(data.items); setTotal(data.total_count);
    } catch (e) { setError(e.message); setItems(null); } finally { setBusy(false); }
  }

  async function explain(r) {
    setOpen({ full: r.full_name, text: '', loading: true });
    try {
      const readme = (await gh(`/repos/${r.full_name}/readme`, 'application/vnd.github.raw').catch(() => '')).slice(0, 7000);
      const text = await ask(`Eres un tutor de programación. Explica en español sencillo este proyecto de GitHub a un estudiante universitario:
Nombre: ${r.full_name}
Descripción: ${r.description || '(sin descripción)'}
Lenguaje: ${r.language || 'varios'} · Temas: ${(r.topics || []).join(', ') || '—'}
README:
${readme || '(sin README)'}

Responde con estas secciones cortas: «Qué es», «Qué puedes aprender de él», «Cómo empezar a explorarlo» (3 pasos) y «Nivel» (principiante/intermedio/avanzado y por qué).`);
      setOpen({ full: r.full_name, text, loading: false });
    } catch (e) { setOpen({ full: r.full_name, text: `No pude generar la explicación: ${e.message}`, loading: false }); }
  }

  const isSaved = (r) => saved.some((s) => s.full_name === r.full_name);
  const toggleSave = (r) => setSaved((s) => (isSaved(r) ? s.filter((x) => x.full_name !== r.full_name) : [{ full_name: r.full_name, description: r.description, html_url: r.html_url, language: r.language, stargazers_count: r.stargazers_count, forks_count: r.forks_count, updated_at: r.updated_at, topics: r.topics, owner: { avatar_url: r.owner.avatar_url } }, ...s].slice(0, 50)));

  const list = tab === 'saved' ? saved : items;

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca en inglés para mejores resultados: react beginner, binary tree…" aria-label="Buscar proyectos" />
          </label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Lenguaje">{LANGS.map((l) => <option key={l} value={l}>{l || 'Cualquier lenguaje'}</option>)}</select>
          <button className="btn primary" disabled={busy || !q.trim()}>{busy ? 'Buscando…' : 'Buscar'}</button>
        </form>
        <div className="row gap wrap">
          <button type="button" className={`chip ${begin ? 'active' : ''}`} aria-pressed={begin} onClick={() => { setBegin(!begin); if (items) search(q, lang, { begin: !begin }); }}>Con issues para empezar</button>
          <select value={sort} onChange={(e) => { setSort(e.target.value); if (items) search(q, lang, { sort: e.target.value }); }} aria-label="Ordenar" className="small">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="chips">{EXAMPLES.map(([label, term, l]) => <button key={label} type="button" className="chip" onClick={() => { setQ(term); setLang(l); search(term, l); }}>{label}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <div className="view-switch" role="group" aria-label="Lista" style={{ alignSelf: 'start' }}>
        <button type="button" className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Resultados{items ? ` (${total > 1000 ? '1000+' : total})` : ''}</button>
        <button type="button" className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}>Mi portafolio ({saved.length})</button>
      </div>

      {list === null ? <p className="muted">Busca un tema o elige un ejemplo para ver proyectos reales.</p>
        : list.length === 0 ? <p className="muted">{tab === 'saved' ? 'Guarda proyectos con el marcador para armar tu lista de referencia.' : 'No encontré proyectos con esa búsqueda. Prueba con otras palabras en inglés.'}</p> : (
          <ul className="repo-list">
            {list.map((r) => (
              <li key={r.full_name} className="panel repo-card">
                <div className="row gap">
                  <img src={r.owner.avatar_url} alt="" width="36" height="36" loading="lazy" className="repo-avatar" />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <a href={r.html_url} target="_blank" rel="noreferrer noopener" className="repo-name">{r.full_name} <ExternalLink size={12} aria-hidden="true" /></a>
                    <div className="small muted row gap wrap">
                      <span className="row gap"><Star size={13} aria-hidden="true" /> {k(r.stargazers_count)}</span>
                      <span className="row gap"><GitFork size={13} aria-hidden="true" /> {k(r.forks_count)}</span>
                      {r.language && <span className="tag">{r.language}</span>}
                      <span>Actualizado {ago(r.updated_at)}</span>
                    </div>
                  </div>
                  <button type="button" className={`fav-btn ${isSaved(r) ? 'on' : ''}`} style={{ position: 'static' }} aria-pressed={isSaved(r)} aria-label={`${isSaved(r) ? 'Quitar de' : 'Guardar en'} mi portafolio: ${r.full_name}`} onClick={() => toggleSave(r)}>
                    {isSaved(r) ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
                  </button>
                </div>
                <p className="small">{r.description || 'Sin descripción.'}</p>
                {r.topics?.length > 0 && <div className="chips">{r.topics.slice(0, 5).map((t) => <span key={t} className="tag">{t}</span>)}</div>}
                {has.gemini && <button type="button" className="btn small ghost" style={{ alignSelf: 'start' }} disabled={open?.loading} onClick={() => explain(r)}><Sparkles size={14} aria-hidden="true" /> {open?.full === r.full_name && open.loading ? 'Leyendo el proyecto…' : 'Explicar con IA'}</button>}
                {open?.full === r.full_name && open.text && <p className="pre repo-ai">{open.text}</p>}
              </li>
            ))}
          </ul>
        )}
      <p className="small muted">Datos de la API pública de GitHub. Sin cuenta hay un límite de búsquedas por minuto.</p>
    </div>
  );
}
