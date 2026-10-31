// Gemini API — OCR de fotos y PDFs, resúmenes y generación de tarjetas.
// La llave viaja en el navegador: restríngela a tu dominio en Google AI Studio / Cloud Console.
import { cfg } from './integrations.js';

const ERRORS = {
  400: 'Las funciones con IA no están disponibles por ahora. Inténtalo más tarde.',
  401: 'Las funciones con IA no están disponibles por ahora. Inténtalo más tarde.',
  403: 'Las funciones con IA no están disponibles por ahora. Inténtalo más tarde.',
  404: 'Las funciones con IA no están disponibles por ahora. Inténtalo más tarde.',
  429: 'La IA recibió demasiadas solicitudes. Inténtalo en unos minutos.',
};

// Los modelos de Gemini cambian y se saturan seguido (503), se retiran (404) o agotan su cuota gratuita (429):
// si el configurado falla por eso, se prueba con los siguientes de la lista (cada modelo tiene su propia cuota).
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3-flash-preview'];

async function generate(parts, { json = false, signal } = {}) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) },
  });
  let res = null;
  for (const model of [...new Set([cfg.gemini.model, ...FALLBACK_MODELS])]) {
    // Un modelo saturado a veces ni responde: tras 25 s se prueba con el siguiente en lugar de dejar la pantalla colgada
    const timeout = AbortSignal.timeout(25000);
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.gemini.key },
        body,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      res = null;
      continue;
    }
    if (res.status !== 503 && res.status !== 404 && res.status !== 429) break; // saturado, retirado o sin cuota: prueba el siguiente
  }
  if (!res) throw new Error('Gemini tardó demasiado en responder. Inténtalo de nuevo en un momento.');
  if (!res.ok) console.error(`Amati: Gemini respondió ${res.status} (revisa la llave y VITE_GEMINI_MODEL)`); // el detalle técnico va a la consola, no al usuario
  if (!res.ok) throw new Error(ERRORS[res.status] || (res.status >= 500 ? 'Gemini no está disponible ahora mismo.' : `Gemini respondió ${res.status}.`));
  const data = await res.json();
  if (data.promptFeedback?.blockReason) throw new Error('Gemini bloqueó el contenido de este archivo.');
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini no devolvió texto. Prueba con una foto más nítida.');
  return text;
}

// Pregunta libre a Gemini (la usan las herramientas para explicar, generar retos, etc.)
export const ask = (prompt, { json = false, signal } = {}) => generate([{ text: prompt }], { json, signal });

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(blob);
  });
}

const OCR_PROMPT = `Eres un transcriptor de apuntes de clase. Extrae TODO el texto del archivo adjunto (puede ser una foto de libreta, una diapositiva o un PDF).
Reglas:
- Conserva el idioma original y no traduzcas ni resumas.
- Respeta la estructura: títulos como líneas de encabezado, listas con guiones, numeraciones y sangrías.
- Fórmulas y símbolos: escríbelos en texto plano (por ejemplo x^2, H2O).
- Si algo no se lee, escribe [ilegible]. No inventes contenido.
- Devuelve únicamente el texto transcrito, sin comentarios ni introducciones.`;

export async function extractText(blob, { signal } = {}) {
  const data = await toBase64(blob);
  return generate([{ inline_data: { mime_type: blob.type || 'application/pdf', data } }, { text: OCR_PROMPT }], { signal });
}

export function summarize(text, { signal } = {}) {
  return generate(
    [{ text: `Resume estos apuntes de clase en español para estudiar: primero 2 o 3 frases con la idea central y luego una lista con los puntos clave y definiciones. Usa solo lo que está en el texto.\n\nAPUNTES:\n${text.slice(0, 60000)}` }],
    { signal },
  );
}

export async function makeCards(text, count = 10, { signal } = {}) {
  const raw = await generate(
    [{
      text: `A partir de estos apuntes crea hasta ${count} tarjetas de estudio (pregunta y respuesta) en el idioma de los apuntes.
Reglas: una sola idea por tarjeta, preguntas concretas, respuestas cortas, usando solo lo que dicen los apuntes.
Responde SOLO con un arreglo JSON: [{"front": "pregunta", "back": "respuesta", "topic": "tema breve"}]

APUNTES:
${text.slice(0, 60000)}`,
    }],
    { json: true, signal },
  );
  let list;
  try {
    list = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim());
  } catch {
    throw new Error('Gemini devolvió un formato inesperado. Inténtalo de nuevo.');
  }
  return (Array.isArray(list) ? list : [])
    .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
    .slice(0, count)
    .map((c) => ({ front: c.front.trim().slice(0, 1000), back: c.back.trim().slice(0, 2000), topic: String(c.topic || '').trim().slice(0, 80) }));
}
