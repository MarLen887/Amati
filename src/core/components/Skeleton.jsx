// Esqueleto de carga: bloques con la forma de la pantalla, en lugar de un «Cargando…» suelto.
// variant: 'cards' (cuadrícula), 'list' (filas) o 'detail' (título + contenido).
export default function Skeleton({ variant = 'cards', label = 'Cargando…' }) {
  return (
    <div className={`skeleton skeleton-${variant}`} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="sk-line sk-title" aria-hidden="true" />
      {variant === 'cards' && (
        <div className="sk-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="sk-block" />)}
        </div>
      )}
      {variant === 'list' && (
        <div className="sk-rows" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="sk-line sk-row" />)}
        </div>
      )}
      {variant === 'detail' && (
        <div className="sk-rows" aria-hidden="true">
          <div className="sk-line" />
          <div className="sk-line sk-short" />
          <div className="sk-block tall" />
        </div>
      )}
    </div>
  );
}
