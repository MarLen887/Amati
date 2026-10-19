// Traducción para las herramientas de idiomas.
//  1) LibreTranslate (código abierto) si configuras tu instancia: VITE_LIBRETRANSLATE_URL (+ VITE_LIBRETRANSLATE_KEY si la pide).
//     Las instancias públicas ya no son gratuitas sin llave: lo más simple es levantar la tuya con Docker (ver README).
//  2) Si no hay instancia, se usa MyMemory (gratuita, sin llave, ~5 000 caracteres al día por IP).
const LT_URL = (import.meta.env.VITE_LIBRETRANSLATE_URL || '').replace(/\/$/, '');
const LT_KEY = import.meta.env.VITE_LIBRETRANSLATE_KEY || '';
const MM_EMAIL = import.meta.env.VITE_MYMEMORY_EMAIL || '';

export const LANGS = [
  ['es', 'Español'], ['en', 'Inglés'], ['fr', 'Francés'], ['pt', 'Portugués'], ['de', 'Alemán'], ['it', 'Italiano'],
];
export const provider = LT_URL ? 'LibreTranslate' : 'MyMemory';
export const canAutoDetect = Boolean(LT_URL);

async function viaLibre(text, from, to, signal) {
  let res;
  try {
    res = await fetch(`${LT_URL}/translate`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text', ...(LT_KEY ? { api_key: LT_KEY } : {}) }),
    });
  } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('No se pudo conectar con LibreTranslate. Revisa VITE_LIBRETRANSLATE_URL.'); }
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
  if (from === 'auto') throw new Error('Con MyMemory elige el idioma de origen (la detección automática requiere LibreTranslate).');
  const out = [];
  for (const part of chunks(text)) {
    if (!part.trim()) { out.push(part); continue; }
    const p = new URLSearchParams({ q: part, langpair: `${from}|${to}` });
    if (MM_EMAIL) p.set('de', MM_EMAIL);
    let res;
    try { res = await fetch(`https://api.mymemory.translated.net/get?${p}`, { signal }); } catch (e) { if (e.name === 'AbortError') throw e; throw new Error('No se pudo conectar con el traductor.'); }
    const data = await res.json().catch(() => ({}));
    const t = data.responseData?.translatedText || '';
    if (res.status === 429 || data.quotaFinished || /MYMEMORY WARNING/i.test(t)) throw new Error('Se alcanzó el límite diario de traducción gratuita. Inténtalo mañana o configura tu propia instancia de LibreTranslate.');
    if (!res.ok) throw new Error(`El traductor respondió ${res.status}.`);
    out.push(t);
  }
  return { text: out.join('') };
}

export function translate(text, from, to, signal) {
  return LT_URL ? viaLibre(text, from, to, signal) : viaMyMemory(text, from, to, signal);
}
