// Open Trivia Database — preguntas de opción múltiple por categoría (en inglés, sin llave).
// Límite de la API: 1 petición cada 5 segundos por IP.

// Palabras (español e inglés, sin acentos) que llevan a cada categoría de OpenTDB.
const CATEGORY_HINTS = {
  9: { es: 'Cultura general', words: ['cultura general', 'general', 'trivia', 'curiosidades'] },
  10: { es: 'Libros', words: ['libro', 'livre', 'buch', 'literatura', 'novela', 'poesia', 'escritor', 'book', 'author'] },
  11: { es: 'Cine', words: ['cine', 'pelicula', 'film', 'movie', 'director'] },
  12: { es: 'Música', words: ['musica', 'musique', 'musik', 'cancion', 'banda', 'music', 'orquesta'] },
  13: { es: 'Teatro y musicales', words: ['teatro', 'musical', 'obra'] },
  14: { es: 'Televisión', words: ['television', 'serie', 'tv'] },
  15: { es: 'Videojuegos', words: ['videojuego', 'gaming', 'game'] },
  16: { es: 'Juegos de mesa', words: ['mesa', 'ajedrez', 'board'] },
  17: { es: 'Ciencias naturales', words: ['ciencia', 'biologia', 'quimica', 'fisica', 'natural', 'sciences', 'biologie', 'chimie', 'physique', 'naturwissenschaft', 'chemie', 'physik', 'celula', 'genetica', 'ecologia', 'medicina', 'anatomia', 'fotosintesis', 'atomo', 'energia', 'planeta', 'science', 'nature', 'biology', 'chemistry', 'physics'] },
  18: { es: 'Computación', words: ['computacion', 'informatique', 'informatik', 'computadora', 'programacion', 'software', 'informatica', 'algoritmo', 'internet', 'redes', 'sistemas', 'computer', 'programming', 'code'] },
  19: { es: 'Matemáticas', words: ['matematica', 'mathematiques', 'mathematik', 'algebra', 'calculo', 'geometria', 'estadistica', 'probabilidad', 'aritmetica', 'trigonometria', 'math', 'statistics'] },
  20: { es: 'Mitología', words: ['mitologia', 'dioses', 'mito', 'mythology', 'griega', 'romana'] },
  21: { es: 'Deportes', words: ['deporte', 'futbol', 'basquet', 'olimpico', 'sport', 'soccer'] },
  22: { es: 'Geografía', words: ['geografia', 'geographie', 'pais', 'capital', 'continente', 'rio', 'montana', 'mapa', 'geography'] },
  23: { es: 'Historia', words: ['historia', 'histoire', 'geschichte', 'guerre', 'krieg', 'guerra', 'revolucion', 'imperio', 'antigua', 'medieval', 'independencia', 'history'] },
  24: { es: 'Política', words: ['politica', 'gobierno', 'derecho', 'constitucion', 'democracia', 'presidente', 'politics', 'ley'] },
  25: { es: 'Arte', words: ['arte', 'kunst', 'peinture', 'pintura', 'escultura', 'pintor', 'renacimiento', 'art', 'museo'] },
  26: { es: 'Celebridades', words: ['celebridad', 'famoso', 'actor'] },
  27: { es: 'Animales', words: ['animal', 'tier', 'zoologia', 'mamifero', 'especie', 'fauna', 'animals'] },
  28: { es: 'Vehículos', words: ['vehiculo', 'auto', 'carro', 'avion', 'motor', 'vehicle'] },
  29: { es: 'Cómics', words: ['comic', 'historieta', 'superheroe'] },
  30: { es: 'Gadgets y tecnología', words: ['gadget', 'tecnologia', 'electronica', 'dispositivo', 'smartphone'] },
  31: { es: 'Anime y manga', words: ['anime', 'manga'] },
  32: { es: 'Caricaturas', words: ['caricatura', 'animacion', 'cartoon'] },
};

// Minúsculas, sin acentos ni signos
export const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();

let categoriesCache = null;
export async function fetchCategories({ signal } = {}) {
  if (categoriesCache) return categoriesCache;
  const res = await fetch('https://opentdb.com/api_category.php', { signal });
  if (!res.ok) throw new Error(`OpenTDB respondió ${res.status}.`);
  const data = await res.json();
  categoriesCache = data.trivia_categories.map((c) => ({ id: c.id, name: c.name, es: CATEGORY_HINTS[c.id]?.es || c.name }));
  return categoriesCache;
}

// OpenTDB no tiene búsqueda por texto: se relaciona el tema con las categorías disponibles.
export function matchCategories(query, categories) {
  const q = norm(query);
  if (!q) return [];
  return categories
    .map((c) => {
      let score = 0;
      for (const w of CATEGORY_HINTS[c.id]?.words || []) if (q.includes(w)) score += w.length;
      if (q.includes(norm(c.es))) score += 5;
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const dec = (s) => decodeURIComponent(s);
const WAIT = 'OpenTDB pide esperar unos segundos entre consultas. Inténtalo de nuevo en 5 segundos.';

export async function fetchQuestions({ category, difficulty = '', amount = 10, signal } = {}) {
  const p = new URLSearchParams({ amount: String(amount), type: 'multiple', encode: 'url3986' });
  if (category) p.set('category', String(category));
  if (difficulty) p.set('difficulty', difficulty);
  const res = await fetch(`https://opentdb.com/api.php?${p}`, { signal });
  if (res.status === 429) throw new Error(WAIT);
  if (!res.ok) throw new Error(`OpenTDB respondió ${res.status}.`);
  const data = await res.json();
  if (data.response_code === 5) throw new Error(WAIT);
  if (data.response_code === 1) {
    throw new Error('No hay suficientes preguntas con esa combinación. Prueba con menos preguntas u otra dificultad.');
  }
  const stamp = Date.now();
  return data.results.map((r, i) => {
    const correct = dec(r.correct_answer);
    return {
      id: `${stamp}-${i}`,
      category: dec(r.category),
      difficulty: r.difficulty,
      question: dec(r.question),
      correct,
      options: shuffle([correct, ...r.incorrect_answers.map(dec)]),
    };
  });
}
