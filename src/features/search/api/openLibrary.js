// Open Library API — obras, ediciones, autores y portadas (datos abiertos, sin llave).
// https://openlibrary.org/search.json?q=calculo
const FIELDS =
  'key,title,subtitle,author_name,first_publish_year,cover_i,subject,edition_count,isbn,language,publisher,number_of_pages_median,ebook_access,ia,has_fulltext';

import { normalizeLangs, openLibraryClause } from './languages.js';

export async function searchOpenLibrary(query, { signal, max = 12, langs = [] } = {}) {
  const q = langs.length ? `(${query}) AND ${openLibraryClause(langs)}` : query;
  const p = new URLSearchParams({ q, limit: String(max), fields: FIELDS });
  const res = await fetch(`https://openlibrary.org/search.json?${p}`, { signal });
  if (!res.ok) throw new Error(`Open Library respondió ${res.status}.`);
  const data = await res.json();
  return (data.docs || []).map((d) => {
    const ia = d.ia?.[0];
    // ebook_access: public = descarga libre · borrowable/printdisabled = préstamo · no_ebook = sin versión digital
    const open = d.ebook_access === 'public' && ia;
    return {
      source: 'OpenLibrary',
      title: d.title || 'Sin título',
      subtitle: d.subtitle || '',
      authors: d.author_name || [],
      year: d.first_publish_year || null,
      description: '',
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      isbns: (d.isbn || []).slice(0, 12),
      pages: d.number_of_pages_median || null,
      publisher: (d.publisher || [])[0] || '',
      languages: normalizeLangs(d.language),
      subjects: (d.subject || []).slice(0, 12),
      editions: d.edition_count || null,
      olKey: d.key,
      openLibraryId: (d.key || '').split('/').pop() || '',
      archiveId: ia || '',
      downloads: open ? [{ label: 'PDF (Internet Archive)', url: `https://archive.org/download/${ia}/${ia}.pdf`, type: 'pdf' }] : [],
      restricted: d.ebook_access === 'borrowable' || d.ebook_access === 'printdisabled',
      links: { openLibrary: d.key ? `https://openlibrary.org${d.key}` : null, archive: ia ? `https://archive.org/details/${ia}` : null },
    };
  });
}

// La búsqueda no trae la sinopsis: se pide al abrir el libro.
export async function fetchOpenLibraryDescription(olKey, { signal } = {}) {
  if (!olKey) return '';
  const res = await fetch(`https://openlibrary.org${olKey}.json`, { signal });
  if (!res.ok) return '';
  const w = await res.json();
  const d = typeof w.description === 'string' ? w.description : w.description?.value || '';
  return d.split('----------')[0].trim();
}
