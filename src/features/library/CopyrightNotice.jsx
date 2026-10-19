import { ShieldAlert } from 'lucide-react';

export const COPYRIGHT_MESSAGE =
  'De acuerdo con la Ley de Derechos de Autor, este material no se puede descargar. Gracias por tu comprensión.';

// Aviso para libros que no tienen una versión descargable (material protegido por derechos de autor).
export default function CopyrightNotice({ compact = false }) {
  return (
    <div className={`copyright-notice ${compact ? 'compact' : ''}`} role="alert">
      <ShieldAlert size={compact ? 16 : 20} aria-hidden="true" />
      <p>{COPYRIGHT_MESSAGE}</p>
    </div>
  );
}
