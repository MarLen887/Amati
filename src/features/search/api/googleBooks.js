// Google Books API — sinopsis, páginas y vista previa.
// Usa VITE_GOOGLE_BOOKS_API_KEY si existe; sin llave Google puede rechazar consultas (429) según el tráfico.
// Es una fuente "de mejor esfuerzo": cuando falla, las demás fuentes siguen respondiendo.
import { normalizeLangs } from './languages.js';

const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

const https = (u) => (u ? u.replace(/^http:/, 'https:').replace('&edge=curl', '') : null);

export async function searchGoogleBooks(query, { signal, max = 12, langs = [] } = {}) {
  const p = new URLSearchParams({ q: query, maxResults: String(max), printType: 'books' });
  if (langs.length === 1) p.set('langRestrict', langs[0]); // la API solo admite un idioma; con varios se filtra después
  if (API_KEY) p.set('key', API_KEY);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${p}`, { signal });
  if (!res.ok) {
    throw new Error(res.status === 429 ? 'Google Books alcanzó su límite de consultas.' : `Google Books respondió ${res.status}.`);
  }
  const data = await res.json();
  return (data.items || []).map((it) => {
    const v = it.volumeInfo || {};
    const acc = it.accessInfo || {};
    const ids = v.industryIdentifiers || [];
    const pdf = acc.pdf?.isAvailable && acc.pdf.downloadLink ? [{ label: 'PDF (Google Books)', url: acc.pdf.downloadLink, type: 'pdf' }] : [];
    return {
      source: 'GoogleBooks',
      title: v.title || 'Sin título',
      subtitle: v.subtitle || '',
      authors: v.authors || [],
      year: parseInt(v.publishedDate, 10) || null,
      description: v.description || '',
      cover: https(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail),
      isbns: ids.map((i) => i.identifier.replace(/-/g, '')),
      pages: v.pageCount || null,
      publisher: v.publisher || '',
      languages: normalizeLangs(v.language),
      subjects: v.categories || [],
      // Solo el contenido de dominio público (ALL_PAGES) o con PDF habilitado se puede descargar
      downloads: pdf,
      publicDomain: Boolean(acc.publicDomain),
      links: { googleInfo: https(v.infoLink), preview: https(v.previewLink) },
    };
  });
}
