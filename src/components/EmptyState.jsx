import Hummingbird from './Hummingbird.jsx';

// Estado vacío amable: colibrí + invitación + acción (en vez de solo texto).
export default function EmptyState({ title, children, actions, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <Hummingbird size={compact ? 52 : 76} className="empty-bird" />
      {title && <h2 className={compact ? 'h3' : ''}>{title}</h2>}
      {children && <div className="empty-text">{children}</div>}
      {actions && <div className="row gap wrap center">{actions}</div>}
    </div>
  );
}
