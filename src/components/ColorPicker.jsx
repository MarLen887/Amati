import { useEffect, useState } from 'react';

export const SUBJECT_COLORS = ['#4f5bd5', '#0d9488', '#e5683c', '#d99a2b', '#8b5cf6', '#3f9a5c', '#d9467a', '#64748b'];

// ---- Conversión HSL <-> HEX ----
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return { h: 235, s: 61, l: 57 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);

// Selector de color: tonos sugeridos + espectro personalizado (tono, saturación y luz).
export default function ColorPicker({ value, onChange }) {
  const isPreset = SUBJECT_COLORS.includes(value);
  const [open, setOpen] = useState(!isPreset);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [hexText, setHexText] = useState(value);

  useEffect(() => setHexText(value), [value]);

  function updateHsl(next) {
    const merged = { ...hsl, ...next };
    setHsl(merged);
    onChange(hslToHex(merged.h, merged.s, merged.l));
  }

  function onHexInput(v) {
    const withHash = v.startsWith('#') ? v : `#${v}`;
    setHexText(withHash);
    if (isHex(withHash)) {
      setHsl(hexToHsl(withHash));
      onChange(withHash.toLowerCase());
    }
  }

  const { h, s, l } = hsl;

  return (
    <div className="color-picker">
      <div className="color-row" role="radiogroup" aria-label="Color de la materia">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={`Color ${c}`}
            className={`swatch ${value === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => {
              onChange(c);
              setHsl(hexToHsl(c));
            }}
          />
        ))}
        <button
          type="button"
          className={`swatch spectrum ${!isPreset ? 'selected' : ''}`}
          aria-expanded={open}
          aria-label="Color personalizado"
          title="Color personalizado"
          onClick={() => setOpen((o) => !o)}
        >
          {!isPreset && <span className="swatch-dot" style={{ background: value }} />}
        </button>
      </div>

      {open && (
        <div className="spectrum-panel">
          <div className="spectrum-preview" style={{ background: value }}>
            <span>{value}</span>
          </div>
          <label>
            Tono
            <input type="range" min="0" max="360" value={h} className="range hue"
              onChange={(e) => updateHsl({ h: Number(e.target.value) })} />
          </label>
          <label>
            Intensidad
            <input type="range" min="15" max="100" value={s} className="range"
              style={{ background: `linear-gradient(to right, ${hslToHex(h, 15, l)}, ${hslToHex(h, 100, l)})` }}
              onChange={(e) => updateHsl({ s: Number(e.target.value) })} />
          </label>
          <label>
            Luz
            <input type="range" min="20" max="75" value={l} className="range"
              style={{ background: `linear-gradient(to right, ${hslToHex(h, s, 20)}, ${hslToHex(h, s, 47)}, ${hslToHex(h, s, 75)})` }}
              onChange={(e) => updateHsl({ l: Number(e.target.value) })} />
          </label>
          <div className="row gap">
            <label className="grow">
              Código de color
              <input value={hexText} onChange={(e) => onHexInput(e.target.value.trim())} maxLength={7}
                className="mono" spellCheck={false} />
            </label>
            <label className="native-color">
              Avanzado
              <input type="color" value={value} onChange={(e) => onHexInput(e.target.value)} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
