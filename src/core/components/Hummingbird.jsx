// Colibrí geométrico animado (inspirado en el logo): aletea, flota y entra volando.
// Es decorativo; con "reducir movimiento" se queda quieto.
export default function Hummingbird({ size = 56, className = '' }) {
  return (
    <span className={`hummingbird ${className}`} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <g className="hb-body">
          {/* cola */}
          <path d="M17 38 L5 50 L12 49 L9 56 L21 42 Z" className="hb-tail" />
          {/* cuerpo */}
          <path d="M18 40 C22 30 32 25 41 26 C45 27 46 31 43 35 C38 42 28 45 18 40 Z" className="hb-belly" />
          <path d="M20 39 C25 33 33 29 41 28 C38 34 31 39 20 39 Z" className="hb-chest" />
          {/* cabeza */}
          <circle cx="44" cy="24" r="7" className="hb-head" />
          <circle cx="46" cy="22.5" r="1.6" className="hb-eye" />
          <circle cx="46.5" cy="22" r="0.5" fill="#fff" />
          {/* pico */}
          <path d="M50 24 L62 21.5 L50.5 26 Z" className="hb-beak" />
          {/* ala trasera y delantera (aletean) */}
          <path d="M30 31 C26 18 27 9 33 4 C35 13 35 22 33 31 Z" className="hb-wing hb-wing-back" />
          <path d="M31 31 C24 20 22 11 26 5 C31 12 34 21 34 31 Z" className="hb-wing hb-wing-front" />
        </g>
      </svg>
    </span>
  );
}
