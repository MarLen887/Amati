import { useState } from 'react';
import { Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BREAK_OPTIONS, DEFAULT_POMODORO, FOCUS_OPTIONS } from '../context/PomodoroContext.jsx';
import { playChime } from '../lib/chime.js';
import { updateProfile } from '../lib/db.js';

function Choice({ options, value, onChange, suffix, label }) {
  return (
    <div className="mode-switch compact" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o}
          className={value === o ? 'active' : ''} onClick={() => onChange(o)}>
          {o} {suffix}
        </button>
      ))}
    </div>
  );
}

export default function PomodoroSettings() {
  const { user, profile } = useAuth();
  const current = { ...DEFAULT_POMODORO, ...(profile?.pomodoro || {}) };
  const [cfg, setCfg] = useState(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save(next) {
    setCfg(next);
    setError('');
    try {
      await updateProfile(user.uid, { pomodoro: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel stack">
      <h2 className="h3 row gap"><Timer size={18} aria-hidden="true" /> Pomodoro suave</h2>
      <p className="small muted">
        Bloques cortos de estudio con descansos tranquilos. Recomendado: 15 min de estudio y 5 de descanso.
      </p>
      <div className="stack-sm">
        <span className="field-label">Tiempo de estudio</span>
        <Choice label="Tiempo de estudio" options={FOCUS_OPTIONS} value={cfg.focus} suffix="min"
          onChange={(v) => save({ ...cfg, focus: v })} />
      </div>
      <div className="stack-sm">
        <span className="field-label">Tiempo de descanso</span>
        <Choice label="Tiempo de descanso" options={BREAK_OPTIONS} value={cfg.break} suffix="min"
          onChange={(v) => save({ ...cfg, break: v })} />
      </div>
      <div className="row gap wrap">
        <label className="checkbox grow">
          <input type="checkbox" checked={cfg.sound} onChange={(e) => save({ ...cfg, sound: e.target.checked })} />
          Campanita suave al terminar cada fase
        </label>
        <button type="button" className="btn small ghost" onClick={playChime}>Probar sonido</button>
      </div>
      {error && <p className="error">{error}</p>}
      {saved && <p className="notice" role="status">Preferencias guardadas.</p>}
    </section>
  );
}
