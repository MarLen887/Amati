// Traducción para las herramientas de idiomas.
//  1) LibreTranslate (código abierto) si configuras tu instancia: VITE_LIBRETRANSLATE_URL (+ VITE_LIBRETRANSLATE_KEY si la pide).
//     Las instancias públicas ya no son gratuitas sin llave: lo más simple es levantar la tuya con Docker (ver README).
//  2) Si hay llave de Gemini (VITE_GEMINI_API_KEY), se traduce con Gemini: entiende el contexto y detecta el idioma.
//  3) Si no, MyMemory (gratuita, sin llave, ~5 000 caracteres al día por IP). Su memoria de traducciones hecha por usuarios
//     a veces devuelve resultados ajenos (p. ej. «hello» → «testvalue»), por eso es el último recurso.
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
const LT_URL = (import.meta.env.VITE_LIBRETRANSLATE_URL || '').replace(/\/$/, '');
const LT_KEY = import.meta.env.VITE_LIBRETRANSLATE_KEY || '';
const MM_EMAIL = import.meta.env.VITE_MYMEMORY_EMAIL || '';

export const LANGS = [
  ['es', 'Español'], ['en', 'Inglés'], ['fr', 'Francés'], ['pt', 'Portugués'], ['de', 'Alemán'], ['it', 'Italiano'],
];
export const provider = LT_URL ? 'LibreTranslate' : has.gemini ? 'Gemini' : 'MyMemory';
export const canAutoDetect = Boolean(LT_URL) || has.gemini;

const NAMES = { es: 'español', en: 'inglés', fr: 'francés', pt: 'portugués', de: 'alemán', it: 'italiano' };

async function viaGemini(text, from, to, signal) {
  const origin = from === 'auto' ? 'Detecta el idioma de origen y traduce' : `Traduce del ${NAMES[from] || from}`;
  const prompt = `${origin} al ${NAMES[to] || to} el texto de abajo. Si es una sola palabra, da su traducción más común (y hasta dos alternativas separadas por coma). Conserva saltos de línea, formato y puntuación; no expliques nada.
Responde SOLO con un objeto JSON: {"source": "código ISO 639-1 del idioma de origen", "text": "la traducción"}

TEXTO:
${text}`;
  const raw = await ask(prompt, { json: true, signal });
  let data;
  try { data = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim()); } catch { throw new Error('El traductor devolvió un formato inesperado. Inténtalo de nuevo.'); }
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('El traductor no devolvió texto. Inténtalo de nuevo.');
  return { text: data.text, detected: from === 'auto' ? String(data.source || '').toLowerCase() : undefined };
}

async function viaLibre(text, from, to, signal) {
  let res;
  try {
    res = await fetch(`${LT_URL}/translate`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text', ...(LT_KEY ? { api_key: LT_KEY } : {}) }),
    });
  } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('No se pudo conectar con el traductor. Revisa tu conexión.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 429 ? 'LibreTranslate recibió demasiadas solicitudes. Espera un momento.' : data.error || `LibreTranslate respondió ${res.status}.`);
  return { text: data.translatedText, detected: data.detectedLanguage?.language };
}

// MyMemory acepta ~500 bytes por consulta: se parte el texto por oraciones
function chunks(text, max = 420) {
  const parts = text.match(/[^.!?\n]+[.!?]*\s*|\n+/g) || [text];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur); cur = ''; }
    cur += p;
    while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur) out.push(cur);
  return out;
}

async function viaMyMemory(text, from, to, signal) {
  if (from === 'auto') throw new Error('Elige el idioma de origen: la detección automática no está disponible por ahora.');
  const out = [];
  for (const part of chunks(text)) {
    if (!part.trim()) { out.push(part); continue; }
    const p = new URLSearchParams({ q: part, langpair: `${from}|${to}` });
    if (MM_EMAIL) p.set('de', MM_EMAIL);
    let res;
    try { res = await fetch(`https://api.mymemory.translated.net/get?${p}`, { signal }); } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('No se pudo conectar con el traductor.'); }
    const data = await res.json().catch(() => ({}));
    const t = data.responseData?.translatedText || '';
    if (res.status === 429 || data.quotaFinished || /MYMEMORY WARNING/i.test(t)) throw new Error('Se alcanzó el límite diario de traducción gratuita. Inténtalo mañana.');
    if (!res.ok) throw new Error(`El traductor respondió ${res.status}.`);
    out.push(t);
  }
  return { text: out.join('') };
}

export function translate(text, from, to, signal) {
  if (LT_URL) return viaLibre(text, from, to, signal);
  return has.gemini ? viaGemini(text, from, to, signal) : viaMyMemory(text, from, to, signal);
}
