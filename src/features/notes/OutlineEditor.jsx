import { useRef } from 'react';
import { parseOutline } from './guides.js';

// Método del esquema. Tab / Shift+Tab cambian el nivel de sangría (2 espacios por nivel).
export default function OutlineEditor({ content, onChange }) {
  const ref = useRef(null);
  const text = content.text || '';
  const rows = parseOutline(text);

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.target;
    const { selectionStart: a, selectionEnd: b, value } = ta;
    const lineStart = value.lastIndexOf('\n', a - 1) + 1;
    const lineEnd = b + (value.slice(b).indexOf('\n') === -1 ? value.length - b : value.slice(b).indexOf('\n'));
    const block = value.slice(lineStart, lineEnd);
    const out = block
      .split('\n')
      .map((l) => (e.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l))
      .join('\n');
    const next = value.slice(0, lineStart) + out + value.slice(lineEnd);
    const delta = out.length - block.length;
    onChange({ ...content, text: next });
    requestAnimationFrame(() => {
      ta.selectionStart = Math.max(lineStart, a + (e.shiftKey ? Math.max(delta, -2) : 2));
      ta.selectionEnd = b + delta;
    });
  }

  return (
    <div className="outline-grid">
      <label className="stack-sm">
        Escribe una idea por línea
        <textarea ref={ref} className="mono-ish" value={text} onKeyDown={onKeyDown} rows={16} maxLength={20000}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder={'Idea principal\n  Subtema\n    Detalle\n    Otro detalle\n  Otro subtema'} />
        <span className="small muted">Tab = bajar un nivel · Shift+Tab = subir un nivel</span>
      </label>
      <div className="stack-sm">
        <span className="field-label">Así queda tu esquema</span>
        <div className="panel outline-preview" aria-live="polite">
          {rows.length === 0 ? (
            <p className="muted small">Aquí verás tu esquema numerado automáticamente.</p>
          ) : (
            rows.map((r, idx) => (
              <p key={idx} style={{ paddingLeft: `${r.level * 1.4}rem` }} className={r.level === 0 ? 'o-main' : ''}>
                <span className="o-label">{r.label}</span> {r.text}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
