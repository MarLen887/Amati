// Avisos por correo sin servidor propio, con EmailJS (plan gratuito: 200 correos al mes).
// Se configura en .env.local; si falta algo, los avisos simplemente no se envían.
const env = import.meta.env;
const cfg = {
  serviceId: env.VITE_EMAILJS_SERVICE_ID || '',
  templateId: env.VITE_EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_SHARE || '',
  publicKey: env.VITE_EMAILJS_PUBLIC_KEY || '',
};

export const emailJsReady = Boolean(cfg.serviceId && cfg.templateId && cfg.publicKey);

// Avisa a alguien que le compartieron un apunte. Plantilla de EmailJS con las variables:
// {{to_email}}, {{from_name}}, {{note_title}}, {{link}} y {{reply_to}} (el correo de quien comparte: ponlo en «Reply To» de la
// plantilla para que, al responder, la respuesta llegue a esa persona y no a la cuenta que envía).
export async function sendShareEmail({ to, fromName, replyTo = '', noteTitle, link }) {
  if (!emailJsReady) return false;
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: cfg.serviceId,
      template_id: cfg.templateId,
      user_id: cfg.publicKey,
      template_params: { to_email: to, from_name: fromName, reply_to: replyTo, note_title: noteTitle, link },
    }),
  });
  if (!res.ok) throw new Error(`EmailJS respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}
