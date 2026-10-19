// Preguntas de práctica de opción múltiple (4 opciones, una correcta) con explicación breve.
import { ask } from './gemini.js';

export async function makeQuiz(text, count = 5, { signal } = {}) {
  const raw = await ask(
    `A partir de este material crea ${count} preguntas de opción múltiple para practicar, en el idioma del material.
Reglas: usa solo lo que dice el material; cada pregunta tiene exactamente 4 opciones plausibles y una sola correcta; evita «todas las anteriores»; explica en una frase por qué es correcta.
Responde SOLO con un arreglo JSON: [{"question": "pregunta", "options": ["a", "b", "c", "d"], "answer": 0, "explanation": "por qué"}]
"answer" es el índice (0 a 3) de la opción correcta.

MATERIAL:
${text.slice(0, 60000)}`,
    { json: true, signal },
  );
  let list;
  try {
    list = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim());
  } catch {
    throw new Error('Gemini devolvió un formato inesperado. Inténtalo de nuevo.');
  }
  return (Array.isArray(list) ? list : [])
    .filter((q) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4
      && q.options.every((o) => typeof o === 'string' && o.trim()) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)
    .slice(0, count)
    .map((q) => ({
      question: q.question.trim().slice(0, 500),
      options: q.options.map((o) => o.trim().slice(0, 300)),
      answer: q.answer,
      explanation: String(q.explanation || '').trim().slice(0, 500),
    }));
}
