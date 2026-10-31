// Indicador de carga: un brote que crece en su maceta. Aparece solo si la carga tarda más de ~0.3 s (así no parpadea
// en cargas rápidas) y se queda quieto con «reducir movimiento».
// size: 'lg' (pantalla o página), 'md' (sección) o 'sm' (en línea, junto al texto)
export default function Loader({ label = 'Cargando…', size = 'md', className = '' }) {
  return (
    <div className={`sprout-loader sprout-${size} ${className}`.trim()} role="status" aria-live="polite">
      <svg className="sprout-art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
        <path className="sprout-stem" d="M60 70 V36" />
        <path className="sprout-leaf sprout-leaf-a" d="M60 52 q-22 -2 -24 -20 q20 0 24 20Z" />
        <path className="sprout-leaf sprout-leaf-b" d="M60 44 q22 -2 24 -20 q-20 0 -24 20Z" />
        <path className="sprout-pot" d="M44 70 H76 L72 90 H48 Z" />
      </svg>
      <span className="sprout-label">{label}</span>
    </div>
  );
}
