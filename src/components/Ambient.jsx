// Fondo ambiental "cozy": manchas de color que respiran despacio y pequeñas
// tarjetas/hojas que flotan hacia arriba. Es decorativo (aria-hidden) y se
// desactiva con "reducir movimiento" del sistema.
const PARTICLES = [
  { left: '6%', size: 14, delay: 0, duration: 26, kind: 'card' },
  { left: '18%', size: 10, delay: 9, duration: 31, kind: 'leaf' },
  { left: '32%', size: 8, delay: 4, duration: 24, kind: 'dot' },
  { left: '47%', size: 12, delay: 14, duration: 29, kind: 'card' },
  { left: '61%', size: 10, delay: 2, duration: 33, kind: 'leaf' },
  { left: '74%', size: 7, delay: 18, duration: 22, kind: 'dot' },
  { left: '86%', size: 13, delay: 7, duration: 28, kind: 'card' },
  { left: '94%', size: 9, delay: 12, duration: 35, kind: 'leaf' },
];

export default function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`particle ${p.kind}`}
          style={{
            left: p.left,
            width: p.kind === 'card' ? p.size * 1.4 : p.size,
            height: p.size,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
