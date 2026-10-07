// Frases de inspiración para la pantalla "Hoy": una sola por día, elegida al azar.
// Solo frases cortas (50 caracteres o menos) para que quepan en el celular.
export const QUOTES = [
  'Si te cansas, aprende a descansar, no a renunciar.',
  'El experto en algo fue una vez un principiante.',
  'Tu futuro se crea por lo que haces hoy, no mañana.',
  'El aprendizaje nunca agota la mente.',
  'No dejes para mañana lo que puedas aprender hoy.',
  'Todo esfuerzo da su fruto.',
  'Transforma tus dudas en determinación.',
  'Atrévete a ser brillante.',
  'Los grandes logros nacen de grandes sacrificios.',
  'Haz de tu aprendizaje un hábito de vida.',
  'No cuentes las horas, haz que las horas cuenten.',
  'Un viaje de mil millas comienza con un solo paso.',
  'Tu único límite verdadero es tu propia mente.',
  'Nunca es tarde para expandir tu mente.',
  'La educación es tu pasaporte hacia el futuro.',
  'La educación es el arma más poderosa.',
  'Nunca dejes de aprender.',
  'El conocimiento es poder.',
  'Haz que hoy cuente.',
  'Supera tus propios límites.',
  'Tu esfuerzo valdrá la pena.',
  'Sé más fuerte que tus excusas.',
  'La paciencia es amarga, pero su fruto es dulce.',
  'Hoy lector, mañana líder.',
  'El éxito depende del esfuerzo.',
  'Convierte los obstáculos en oportunidades.',
  'Pequeños pasos, grandes resultados.',
  'La sabiduría comienza con el deseo de aprender.',
  'Todo es práctica.',
  'Sueña en grande, estudia duro.',
];

const KEY = 'amati-quote';

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Una frase al azar por día: se sortea la primera vez que se abre la app ese día y se
// guarda en el dispositivo, así no cambia al recargar. Al día siguiente sale otra distinta.
export function quoteOfTheDay(date = new Date()) {
  const today = dayKey(date);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.day === today && QUOTES[saved.index]) return QUOTES[saved.index];
    let index = Math.floor(Math.random() * QUOTES.length);
    if (QUOTES.length > 1 && index === saved?.index) index = (index + 1) % QUOTES.length;
    localStorage.setItem(KEY, JSON.stringify({ day: today, index }));
    return QUOTES[index];
  } catch {
    // Sin almacenamiento: frase fija según el día
    const n = [...today].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    return QUOTES[Math.abs(n) % QUOTES.length];
  }
}
