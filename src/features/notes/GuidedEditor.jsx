import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { GUIDES } from './guides.js';

// Feynman, PQ4R y SQ3R: asistente de pasos. content = { source, steps: { [key]: texto } }
export default function GuidedEditor({ type, content, onChange }) {
  const guide = GUIDES[type];
  const steps = content.steps || {};
  const [i, setI] = useState(0);
  const step = guide.steps[i];
  const done = (k) => (steps[k] || '').trim().length > 0;

  const set = (patch) => onChange({ ...content, ...patch });

  return (
    <div className="stack">
      <label>
        {guide.sourceLabel}
        <input value={content.source || ''} onChange={(e) => set({ source: e.target.value })}
          placeholder={guide.sourcePlaceholder} maxLength={200} />
      </label>

      <ol className="stepper" aria-label="Pasos">
        {guide.steps.map((s, idx) => (
          <li key={s.key}>
            <button type="button" className={`${idx === i ? 'current' : ''} ${done(s.key) ? 'done' : ''}`}
              aria-current={idx === i ? 'step' : undefined} onClick={() => setI(idx)} title={s.title}>
              {done(s.key) && idx !== i ? <Check size={14} aria-hidden="true" /> : idx + 1}
              <span>{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="panel stack-sm guided-step unfold" key={step.key}>
        <p className="eyebrow">Paso {i + 1} de {guide.steps.length}</p>
        <h2 className="h3">{step.title}</h2>
        <p>{step.prompt}</p>
        <p className="small muted tip">💡 {step.tip}</p>
        <textarea value={steps[step.key] || ''} rows={step.rows}
          onChange={(e) => set({ steps: { ...steps, [step.key]: e.target.value } })}
          placeholder={step.placeholder} aria-label={step.title} maxLength={8000} />
        <div className="row between gap">
          <button type="button" className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ArrowLeft size={16} aria-hidden="true" /> Anterior
          </button>
          {i < guide.steps.length - 1 ? (
            <button type="button" className="btn primary" onClick={() => setI(i + 1)}>
              Siguiente <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <span className="small muted">¡Último paso! Guarda tu apunte cuando termines.</span>
          )}
        </div>
      </section>
    </div>
  );
}
