import { Brain, Cloud, HardDrive } from 'lucide-react';
import { has } from './api/integrations.js';

// Qué servicios están conectados (se configuran en .env.local; ver README).
export default function ServiceStatus() {
  const items = [
    { ok: has.cloudinary, Icon: Cloud, name: 'Cloudinary', what: 'fotos de libreta', env: 'VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET' },
    { ok: has.drive, optional: true, Icon: HardDrive, name: 'Google Drive', what: 'PDFs en tu Drive (opcional)', env: 'VITE_GOOGLE_CLIENT_ID' },
    { ok: has.gemini, Icon: Brain, name: 'Gemini', what: 'extraer texto, resumir y crear tarjetas', env: 'VITE_GEMINI_API_KEY' },
  ];
  return (
    <ul className="service-status" aria-label="Servicios conectados">
      {items.map((s) => (
        <li key={s.name} className={s.ok ? 'ok' : 'off'} title={s.ok ? 'Conectado' : `Falta configurar ${s.env}`}>
          <s.Icon size={16} aria-hidden="true" />
          <span><strong>{s.name}</strong> <span className="muted small">{s.what}</span></span>
          <span className="state">{s.ok ? 'Conectado' : s.optional ? 'Opcional' : 'Sin configurar'}</span>
        </li>
      ))}
    </ul>
  );
}
