// Escala de ánimo 1–5 con caritas minimalistas en SVG (trazo fino, color por nivel).
export const MOODS = [
  { value: 1, label: 'Muy estresado' },
  { value: 2, label: 'Estresado' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Tranquilo' },
  { value: 5, label: 'Muy tranquilo' },
];

export const moodLabel = (v) => MOODS.find((m) => m.value === v)?.label ?? '—';

// Boca según el nivel: de ceño fruncido a sonrisa amplia
const MOUTHS = {
  1: 'M16 33 q4 -4 8 0 q4 4 8 0',
  2: 'M17 33 q7 -6 14 0',
  3: 'M17 31 h14',
  4: 'M17 29 q7 6 14 0',
  5: 'M15 28 q9 9 18 0',
};

export function MoodFace({ value, size = 44 }) {
  return (
    <svg
      className={`mood-svg mood-${value}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" className="mood-bg" />
      {value === 1 && (
        <>
          <path d="M14 16 l6 2.5" />
          <path d="M34 16 l-6 2.5" />
        </>
      )}
      {value === 5 ? (
        <g className="mood-eyes">
          <path d="M15 21 q3 -3.5 6 0" />
          <path d="M27 21 q3 -3.5 6 0" />
        </g>
      ) : (
        <g className="mood-eyes">
          <circle cx="18" cy="21.5" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="30" cy="21.5" r="1.9" fill="currentColor" stroke="none" />
        </g>
      )}
      <path d={MOUTHS[value]} className="mood-mouth" />
      {value === 5 && (
        <>
          <circle cx="13.5" cy="28" r="2.2" className="mood-cheek" />
          <circle cx="34.5" cy="28" r="2.2" className="mood-cheek" />
        </>
      )}
    </svg>
  );
}

export default function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label="Estado de ánimo">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          className={`mood-option ${value === m.value ? 'selected' : ''}`}
          onClick={() => onChange(m.value)}
        >
          <MoodFace value={m.value} />
          <span className="mood-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
