// Gutendex (Project Gutenberg) — libros de dominio público, con descarga libre.
// https://gutendex.com/books/
import { normalizeLangs } from './languages.js';

const FORMAT_LABELS = [
  ['application/pdf', 'PDF', 'pdf'],
  ['application/epub+zip', 'EPUB', 'epub'],
  ['text/plain', 'Texto (TXT)', 'txt'],
  ['text/html', 'Web (HTML)', 'html'],
  ['application/x-mobipocket-ebook', 'Kindle (MOBI)', 'mobi'],
];

// "Cervantes Saavedra, Miguel de" -> "Miguel de Cervantes Saavedra"
const flipName = (n) => (n.includes(',') ? n.split(',').slice(1).join(' ').trim() + ' ' + n.split(',')[0].trim() : n);

export async function searchGutendex(query, { signal, langs = [] } = {}) {
  const p = new URLSearchParams({ search: query });
  if (langs.length) p.set('languages', langs.join(','));
  const res = await fetch(`https://gutendex.com/books/?${p}`, { signal });
  if (!res.ok) throw new Error(`Gutendex respondió ${res.status}.`);
  const data = await res.json();
  return (data.results || []).slice(0, 20).map((b) => {
    const f = b.formats || {};
    const downloads = FORMAT_LABELS.flatMap(([mime, label, type]) => {
      const key = Object.keys(f).find((k) => k.startsWith(mime));
      return key ? [{ label, url: f[key], type }] : [];
    });
    return {
      source: 'Gutendex',
      title: b.title,
      subtitle: '',
      authors: (b.authors || []).map((a) => flipName(a.name)),
      year: null, // Gutendex no informa el año de publicación
      description: (b.summaries?.[0] || '').replace(/\s*\(This is an automatically generated summary\.\)\s*$/, ''),
      cover: f['image/jpeg'] || null,
      isbns: [],
      languages: normalizeLangs(b.languages),
      subjects: (b.subjects || []).slice(0, 8),
      gutenbergId: String(b.id),
      downloads,
      publicDomain: !b.copyright,
      restricted: Boolean(b.copyright),
      links: { gutenberg: `https://www.gutenberg.org/ebooks/${b.id}` },
    };
  });
}
