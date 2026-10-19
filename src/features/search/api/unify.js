// Unifica Open Library, Gutendex y Google Books en un solo resultado por libro,
// quedándose con lo mejor de cada fuente:
//   Portada        -> Open Library > Google Books > Gutendex > Internet Archive
//   Sinopsis       -> Google Books > Gutendex > Internet Archive > Open Library (al abrir)
//   Ediciones/temas-> Open Library
//   Descargas      -> todas las fuentes (se suman, sin repetir enlaces)
import { norm } from './openTrivia.js';

const COVER_ORDER = ['OpenLibrary', 'GoogleBooks', 'Gutendex', 'InternetArchive'];
const DESC_ORDER = ['GoogleBooks', 'Gutendex', 'InternetArchive', 'OpenLibrary'];
export const SOURCE_NAMES = { OpenLibrary: 'Open Library', InternetArchive: 'Internet Archive', Gutendex: 'Gutenberg (dominio público)', GoogleBooks: 'Google Books' };

const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const rank = (order) => (a, b) => order.indexOf(a.source) - order.indexOf(b.source);
const firstWith = (parts, order, key) => [...parts].sort(rank(order)).find((p) => p[key])?.[key];

function keyOf(b) {
  const lastName = norm(b.authors[0] || '').split(' ').pop() || '';
  return `${norm(b.title).replace(/^(el|la|los|las|the|a|an) /, '').slice(0, 50)}|${lastName}`;
}

function finalize(parts, order) {
  const base = [...parts].sort(rank(COVER_ORDER))[0];
  const years = parts.map((p) => p.year).filter(Boolean).sort((x, y) => x - y);
  const downloads = [];
  for (const p of parts) for (const d of p.downloads || []) if (!downloads.some((x) => x.url === d.url)) downloads.push({ ...d, source: p.source });
  const restricted = parts.some((p) => p.restricted);
  return {
    id: parts.flatMap((p) => p.isbns || [])[0] || parts.find((p) => p.olKey)?.olKey || `${keyOf(base)}#${order}`,
    order,
    title: base.title,
    subtitle: base.subtitle || '',
    authors: parts.find((p) => p.authors.length)?.authors || [],
    year: years[0] || null,
    description: firstWith(parts, DESC_ORDER, 'description') || '',
    cover: firstWith(parts, COVER_ORDER, 'cover') || null,
    isbns: uniq(parts.flatMap((p) => p.isbns || [])),
    pages: firstWith(parts, DESC_ORDER, 'pages') || null,
    publisher: firstWith(parts, DESC_ORDER, 'publisher') || '',
    languages: uniq(parts.flatMap((p) => p.languages || [])),
    subjects: uniq(parts.flatMap((p) => p.subjects || [])).slice(0, 10),
    editions: firstWith(parts, COVER_ORDER, 'editions') || null,
    olKey: firstWith(parts, COVER_ORDER, 'olKey') || '',
    openLibraryId: firstWith(parts, COVER_ORDER, 'openLibraryId') || '',
    archiveId: firstWith(parts, COVER_ORDER, 'archiveId') || '',
    gutenbergId: firstWith(parts, COVER_ORDER, 'gutenbergId') || '',
    links: Object.assign({}, ...parts.map((p) => p.links || {})),
    sources: uniq(parts.map((p) => p.source)),
    downloads,
    publicDomain: parts.some((p) => p.publicDomain),
    // Descargable si alguna fuente ofrece un archivo. Si no, es material protegido por derechos de autor.
    downloadable: downloads.length > 0,
    restricted: restricted || downloads.length === 0,
  };
}

// lists: { OpenLibrary: [...], InternetArchive: [...], Gutendex: [...], GoogleBooks: [...] }
export function unifyBooks(lists) {
  const groups = [];
  const byIsbn = new Map();
  const byKey = new Map();

  // intercala las fuentes para que ninguna domine la lista
  const arrays = Object.values(lists);
  const max = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < max; i++) {
    for (const arr of arrays) {
      const book = arr[i];
      if (!book) continue;
      const found = (book.isbns || []).map((x) => byIsbn.get(x)).find(Boolean) || byKey.get(keyOf(book));
      if (found) {
        found.push(book);
        (book.isbns || []).forEach((x) => byIsbn.set(x, found));
        continue;
      }
      const g = [book];
      groups.push(g);
      (book.isbns || []).forEach((x) => byIsbn.set(x, g));
      byKey.set(keyOf(book), g);
    }
  }

  // primero lo que varias fuentes confirman; después, por orden de aparición
  return groups
    .map((g, i) => finalize(g, i))
    .sort((a, b) => b.sources.length - a.sources.length || Number(b.downloadable) - Number(a.downloadable) || a.order - b.order);
}
