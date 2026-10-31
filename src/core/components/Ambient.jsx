// Fondo ambiental "cozy": manchas de color que respiran despacio y muchas tarjetas, hojas y puntos que flotan hacia
// arriba, en tres planos de profundidad (lejos: pequeños y tenues; cerca: más grandes y nítidos). Es decorativo
// (aria-hidden) y se desactiva con "reducir movimiento" del sistema.
// Las partículas se generan una vez con una semilla fija: así la distribución se ve natural pero siempre es la misma.
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT = 40;
const KINDS = ['card', 'leaf', 'leaf', 'card', 'dot', 'leaf', 'card']; // más hojas y tarjetas que puntos
const TINTS = ['teal', 'sand', 'coral', 'navy'];
const DEPTH = [
  { name: 'far', size: [7, 11], duration: [36, 52], o: 0.28, sway: [10, 22] },
  { name: 'mid', size: [10, 16], duration: [26, 38], o: 0.45, sway: [18, 34] },
  { name: 'near', size: [15, 24], duration: [20, 30], o: 0.6, sway: [28, 48] },
];

const rand = rng(20261031);
const between = ([a, b]) => a + rand() * (b - a);

const PARTICLES = Array.from({ length: COUNT }, (_, i) => {
  const depth = DEPTH[i % 3 === 2 ? 2 : i % 3 === 1 ? 1 : 0];
  const kind = KINDS[Math.floor(rand() * KINDS.length)];
  const size = between(depth.size);
  const duration = between(depth.duration);
  return {
    kind,
    depth: depth.name,
    tint: kind === 'card' ? 'sand' : TINTS[Math.floor(rand() * TINTS.length)],
    // reparto parejo a lo ancho, con un poco de desorden
    left: `${(((i * 37) % COUNT) / COUNT) * 100 + rand() * 2.2}%`,
    w: kind === 'card' ? size * 1.35 : size,
    h: size,
    delay: rand() * duration,
    duration,
    o: depth.o,
    sway: `${(rand() < 0.5 ? -1 : 1) * between(depth.sway)}px`,
    spin: `${(rand() < 0.5 ? -1 : 1) * (80 + rand() * 120)}deg`,
    extra: i >= COUNT / 2, // en pantallas pequeñas se muestran solo la mitad
  };
});

export default function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`particle ${p.kind} ${p.tint} ${p.depth} ${p.extra ? 'extra' : ''}`}
          style={{
            left: p.left,
            width: p.w,
            height: p.h,
            animationDelay: `-${p.delay.toFixed(1)}s`,
            animationDuration: `${p.duration.toFixed(1)}s`,
            '--o': p.o,
            '--sway': p.sway,
            '--spin': p.spin,
          }}
        />
      ))}
    </div>
  );
}
