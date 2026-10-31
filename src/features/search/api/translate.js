// Traducción de las preguntas de OpenTDB (que solo existen en inglés).
// Con llave de Gemini se traducen por lotes (entiende el contexto de una pregunta de trivia). Sin ella se usa MyMemory
// (gratuita, sin llave; ~5 000 caracteres al día por IP, 50 000 si se agrega un correo en VITE_MYMEMORY_EMAIL),
// que a veces devuelve resultados ajenos. Las traducciones se guardan en el navegador para no repetir consultas.
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
const EMAIL = import.meta.env.VITE_MYMEMORY_EMAIL;
const CACHE_KEY = 'amati-translations-v2'; // v2: descarta las traducciones basura que dejó MyMemory
const LANG_NAMES = { es: 'español', fr: 'francés', de: 'alemán', pt: 'portugués', it: 'italiano' };
const BATCH = 30;
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

// Traduce un lote de textos con Gemini: devuelve un arreglo del mismo tamaño y orden
async function translateBatch(texts, target, signal) {
  const prompt = `Traduce al ${LANG_NAMES[target] || target} cada elemento de este arreglo JSON (son preguntas, respuestas y opciones de una trivia, en inglés). Conserva nombres propios, números, fechas y el sentido de cada elemento; no agregues explicaciones.
Responde SOLO con un arreglo JSON de ${texts.length} cadenas, en el mismo orden.

${JSON.stringify(texts)}`;
  const raw = await ask(prompt, { json: true, signal });
  let list;
  try { list = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim()); } catch { throw new Error('el traductor devolvió un formato inesperado'); }
  if (!Array.isArray(list) || list.length !== texts.length || list.some((x) => typeof x !== 'string' || !x.trim())) throw new Error('el traductor devolvió un formato inesperado');
  return list;
}

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
  if (has.gemini) {
    const c = loadCache();
    const pending = [];
    for (const t of texts) {
      const hit = c.get(`${target}|${t}`);
      if (hit) map.set(t, hit);
      else if (/[a-zA-Z]/.test(t)) pending.push(t);
    }
    for (let i = 0; i < pending.length; i += BATCH) {
      const part = pending.slice(i, i + BATCH);
      const out = await translateBatch(part, target, signal);
      part.forEach((t, k) => { map.set(t, out[k]); c.set(`${target}|${t}`, out[k]); });
      onProgress?.(Math.min(i + BATCH, pending.length), pending.length);
    }
    persist();
    return rebuild(questions, map);
  }
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
  return rebuild(questions, map);
}

const rebuild = (questions, map) => questions.map((q) => ({
  ...q,
  question: map.get(q.question) ?? q.question,
  correct: map.get(q.correct) ?? q.correct,
  options: q.options.map((o) => map.get(o) ?? o),
  orig: { question: q.question, correct: q.correct },
  translated: true,
}));
