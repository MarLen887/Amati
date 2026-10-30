import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Botón «Volver» de todas las vistas: visible, con flecha animada y área táctil cómoda.
export default function BackLink({ to, children = 'Volver', className = '', ...rest }) {
  return (
    <Link to={to} className={`back-link ${className}`} {...rest}>
      <span className="back-link-icon" aria-hidden="true"><ArrowLeft size={18} strokeWidth={2.2} /></span>
      <span className="back-link-text">{children}</span>
    </Link>
  );
}
