// Pronunciación con la voz del navegador (Web Speech API): gratis y sin conexión.
const VOICES = { es: 'es-MX', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR', de: 'de-DE', it: 'it-IT' };
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
export function speak(text, lang = 'en') {
  if (!canSpeak || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICES[lang] || lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
