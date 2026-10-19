// Idiomas admitidos en el buscador: español, inglés, francés y alemán.
// Cada fuente usa códigos distintos; aquí se traducen y se normalizan a ISO 639-1 (es, en, fr, de).
export const LANGS = [
  { id: 'es', label: 'Español', marc: 'spa', names: ['Spanish', 'Español'] },
  { id: 'en', label: 'English', marc: 'eng', names: ['English'] },
  { id: 'fr', label: 'Français', marc: 'fre', names: ['French', 'Français'] },
  { id: 'de', label: 'Deutsch', marc: 'ger', names: ['German', 'Deutsch'] },
];
export const DEFAULT_LANGS = LANGS.map((l) => l.id);

const ALIASES = {
  spa: 'es', es: 'es', spanish: 'es', español: 'es',
  eng: 'en', en: 'en', english: 'en',
  fre: 'fr', fra: 'fr', fr: 'fr', french: 'fr', français: 'fr',
  ger: 'de', deu: 'de', de: 'de', german: 'de', deutsch: 'de',
};

// "spa" | "es-MX" | "English" -> "es" | "en"; cualquier otro idioma (p. ej. chino) -> ""
export function normalizeLang(code) {
  const c = String(code || '').toLowerCase().trim();
  return ALIASES[c] || ALIASES[c.split('-')[0]] || '';
}

export const normalizeLangs = (list) => [...new Set([].concat(list || []).map(normalizeLang).filter(Boolean))];

const pick = (ids) => LANGS.filter((l) => ids.includes(l.id));

// Cláusula de Lucene para Open Library: language:spa OR language:eng …
export const openLibraryClause = (ids) => `(${pick(ids).map((l) => `language:${l.marc}`).join(' OR ')})`;

// Internet Archive guarda el idioma como código o como nombre
export const archiveClause = (ids) =>
  `(${pick(ids).flatMap((l) => [`language:${l.marc}`, `language:${l.id}`, ...l.names.map((n) => `language:"${n}"`)]).join(' OR ')})`;

// Se conserva el libro si alguno de sus idiomas está permitido
export const matchesLangs = (book, ids) => (book.languages || []).some((l) => ids.includes(l));
