// Crossref — artículos académicos (revistas científicas) con su DOI. Gratuita y sin llave.
// https://api.crossref.org/works?query=fotosintesis
import { normalizeLang } from './languages.js';

const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export async function searchCrossref(query, { signal, max = 12, langs = [] } = {}) {
  const p = new URLSearchParams({ query, rows: String(max * 2), filter: 'type:journal-article,has-abstract:true' });
  const res = await fetch(`https://api.crossref.org/works?${p}`, { signal });
  if (!res.ok) throw new Error(`Crossref respondió ${res.status}.`);
  const data = await res.json();
  return (data.message?.items || [])
    .map((it) => {
      const title = stripTags(it.title?.[0]);
      const lang = normalizeLang(it.language);
      return {
        id: it.DOI,
        title,
        authors: (it.author || []).slice(0, 4).map((a) => [a.given, a.family].filter(Boolean).join(' ')),
        year: it.issued?.['date-parts']?.[0]?.[0] || null,
        journal: it['container-title']?.[0] || '',
        url: it.URL || `https://doi.org/${it.DOI}`,
        abstract: stripTags(it.abstract).slice(0, 600),
        cited: it['is-referenced-by-count'] || 0,
        lang,
        rawLang: it.language || '',
      };
    })
    // Solo español, inglés, francés o alemán: si Crossref no indica idioma, se descartan los títulos en caracteres CJK
    .filter((a) => a.title && (a.lang ? langs.includes(a.lang) : !a.rawLang && !CJK.test(a.title) && langs.includes('en')))
    .slice(0, max);
}
