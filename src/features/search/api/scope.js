// Alcance de la Biblioteca: solo textos académicos, científicos, educativos y literarios.
// Las fuentes no comparten una clasificación, así que se revisan materias, título y sinopsis
// (ya sin acentos y en minúsculas) en español, inglés, francés y alemán.

const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ALLOW = new RegExp(
  [
    // literatura
    'literatur', 'literar', 'fiction', 'ficcion', 'novel', 'poetry', 'poesia', 'poem', 'poeti', 'drama', 'theat', 'teatro',
    'essay', 'ensayo', 'short stories', 'cuento', 'classic', 'clasic', 'fable', 'fabula', 'roman', 'poesie', 'gedicht', 'erzahl', 'dichtung',
    // ciencias
    'scien', 'cienc', 'scientif', 'math', 'matemat', 'calcul', 'algebra', 'geometr', 'trigonom', 'statistic', 'estadistic', 'probabil',
    'physic', 'fisica', 'chemi', 'quimic', 'biolog', 'medic', 'anatom', 'ecolog', 'astronom', 'geolog', 'geograf', 'geograph',
    'engineer', 'ingenier', 'comput', 'program', 'informatic', 'software', 'algorithm', 'algoritm', 'technolog', 'tecnolog', 'electr',
    'wissenschaft', 'mathemat', 'physik', 'chemie', 'biologie', 'informatik',
    // humanidades y ciencias sociales
    'philosoph', 'filosof', 'psycholog', 'psicolog', 'sociolog', 'anthropolog', 'antropolog', 'histor', 'geschichte', 'econom', 'wirtschaft',
    'politic', 'politik', 'law', 'derecho', 'juridic', 'recht', 'logic', 'logica', 'ethic', 'etica', 'linguist', 'grammar', 'gramatica',
    'dictionar', 'diccionario', 'encyclop', 'enciclop', 'rhetoric', 'retorica', 'archaeolog', 'arqueolog', 'art history', 'historia del arte',
    // educación y estudio
    'educat', 'educac', 'teaching', 'ensenanza', 'pedagog', 'didactic', 'textbook', 'libro de texto', 'study guide', 'academi', 'universit',
    'universidad', 'research', 'investigacion', 'thesis', 'tesis', 'lecture', 'conferencia', 'bildung', 'lehrbuch', 'unterricht', 'learning', 'aprendizaje',
  ].join('|'),
);

// Material fuera de alcance, aunque coincida con alguna palabra de arriba
const DENY = new RegExp(
  [
    'cookbook', 'recipe', 'receta', 'cocina', 'cuisine', 'erotic', 'porn', 'horoscop', 'astrolog', 'tarot', 'occult', 'ocult', 'esoter',
    'coloring', 'colorear', 'comic', 'manga', 'graphic novel', 'historieta', 'self-help', 'autoayuda', 'weight loss', 'bajar de peso',
    'diet', 'fitness', 'workout', 'magazine', 'revista', 'sheet music', 'partitura', 'gambling', 'crafts', 'manualidades', 'knitting', 'tejido',
  ].join('|'),
);

export function isInScope(book) {
  const text = strip([...(book.subjects || []), book.title, book.subtitle, book.description?.slice(0, 600), book.publisher].join(' | '));
  if (DENY.test(text)) return false;
  if (ALLOW.test(text)) return true;
  // Gutenberg es un acervo de clásicos y literatura de dominio público
  return (book.sources || []).includes('Gutendex');
}
