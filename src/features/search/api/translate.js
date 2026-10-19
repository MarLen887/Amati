// Traducción al español de las preguntas de OpenTDB (que solo existen en inglés).
// Usa MyMemory (gratuita, sin llave; ~5 000 caracteres al día por IP, 50 000 si se agrega un correo en
// VITE_MYMEMORY_EMAIL). Las traducciones se guardan en el navegador para no repetir consultas.
const EMAIL = import.meta.env.VITE_MYMEMORY_EMAIL;
const CACHE_KEY = 'amati-translations-v1';
const MAX_CACHE = 600;
const MAX_LEN = 450; // MyMemory acepta ~500 bytes por consulta

let cache = null;
function loadCache() {
  if (cache) return cache;
  try {
    cache = new Map(Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY)) || {}));
  } catch {
    cache = new Map();
  }
  return cache;
}
function persist() {
  try {
    const entries = [...loadCache().entries()].slice(-MAX_CACHE);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* sin almacenamiento */
  }
}

export class QuotaError extends Error {}

async function translateOne(text, target, signal) {
  const c = loadCache();
  const key = `${target}|${text}`;
  if (c.has(key)) return c.get(key);
  if (text.length > MAX_LEN || !/[a-zA-Z]/.test(text)) return text; // números, símbolos o textos largos se dejan igual
  const p = new URLSearchParams({ q: text, langpair: `en|${target}` });
  if (EMAIL) p.set('de', EMAIL);
  const res = await fetch(`https://api.mymemory.translated.net/get?${p}`, { signal });
  if (res.status === 429) throw new QuotaError('Se alcanzó el límite diario de traducción.');
  if (!res.ok) throw new Error(`El traductor respondió ${res.status}.`);
  const data = await res.json();
  const out = data.responseData?.translatedText || '';
  if (data.quotaFinished || /MYMEMORY WARNING/i.test(out) || String(data.responseStatus) === '429') {
    throw new QuotaError('Se alcanzó el límite diario de traducción.');
  }
  if (!out) return text;
  c.set(key, out);
  return out;
}

// Traduce preguntas (a español, francés o alemán), respuestas correctas y opciones. Conserva el original en `orig`.
export async function translateQuestions(questions, { target = 'es', signal, onProgress } = {}) {
  const texts = [...new Set(questions.flatMap((q) => [q.question, q.correct, ...q.options]))];
  const map = new Map();
  let done = 0;
  let next = 0;
  let failure = null;
  const worker = async () => {
    while (next < texts.length && !failure) {
      const t = texts[next++];
      try {
        map.set(t, await translateOne(t, target, signal));
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        failure = e;
        return;
      }
      onProgress?.(++done, texts.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  persist();
  if (failure) throw failure;
  return questions.map((q) => ({
    ...q,
    question: map.get(q.question) ?? q.question,
    correct: map.get(q.correct) ?? q.correct,
    options: q.options.map((o) => map.get(o) ?? o),
    orig: { question: q.question, correct: q.correct },
    translated: true,
  }));
}
