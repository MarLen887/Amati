// Celebración tranquila al terminar una sesión: hojas y tarjetitas que caen despacio.
const PIECES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 71) % 100}%`,
  delay: (i % 7) * 0.35,
  duration: 4.5 + (i % 5) * 0.6,
  kind: ['leaf', 'card', 'dot'][i % 3],
  drift: i % 2 ? 1 : -1,
}));

export default function Celebrate() {
  return (
    <div className="celebrate" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`fall ${p.kind}`}
          style={{
            left: p.left,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': p.drift,
          }}
        />
      ))}
    </div>
  );
}
