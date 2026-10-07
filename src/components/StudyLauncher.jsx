import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Play, Shuffle, Timer } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { matchesSelection, pomodoroUrl, SESSION_SIZE, studyUrl, topicsOf } from '../lib/studyFilter.js';
import { usePomodoro } from '../context/PomodoroContext.jsx';

const MODE_KEY = 'amati-study-mode';
function readMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'pomodoro' ? 'pomodoro' : 'normal';
  } catch {
    return 'normal';
  }
}

// Elegir materia y tema, y comenzar el repaso desde ahí.
export default function StudyLauncher({ initialSubjectId = '' }) {
  const { cards, subjects, dueCards } = useData();
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [topic, setTopic] = useState('');
  const [mode, setModeState] = useState(readMode);
  const { state: pomoState, config: pomoConfig } = usePomodoro();

  function setMode(m) {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* sin almacenamiento */
    }
  }

  const dueIds = useMemo(() => new Set(dueCards.map((c) => c.id)), [dueCards]);
  const dueBySubject = useMemo(() => {
    const m = {};
    for (const c of dueCards) m[c.subjectId] = (m[c.subjectId] || 0) + 1;
    return m;
  }, [dueCards]);
  const topics = useMemo(
    () => (subjectId ? topicsOf(cards, subjectId, dueIds) : []),
    [cards, subjectId, dueIds],
  );

  const selected = dueCards.filter((c) => matchesSelection(c, subjectId, topic));
  const count = selected.length;
  const selectionTotal = cards.filter((c) => matchesSelection(c, subjectId, topic)).length;
  const minutes = Math.max(1, Math.round(Math.min(count, SESSION_SIZE) * 0.5));

  return (
    <section className="panel launcher">
      <div className="launcher-head">
        <div>
          <p className="eyebrow">Comenzar repaso</p>
          <div className="row gap launcher-count">
            <span className="big-number" key={count}>{count}</span>
            <span className="muted">
              {count === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}
              {count > 0 && <><br />≈ {minutes} min{count > SESSION_SIZE && ` (sesión de ${SESSION_SIZE})`}</>}
            </span>
          </div>
        </div>
      </div>

      <div className="mode-switch" role="radiogroup" aria-label="Tipo de sesión">
        <button type="button" role="radio" aria-checked={mode === 'normal'} className={mode === 'normal' ? 'active' : ''}
          onClick={() => setMode('normal')}>
          <Layers size={16} aria-hidden="true" /> Sesión normal
        </button>
        <button type="button" role="radio" aria-checked={mode === 'pomodoro'} className={mode === 'pomodoro' ? 'active' : ''}
          onClick={() => setMode('pomodoro')}>
          <Timer size={16} aria-hidden="true" /> Pomodoro suave
        </button>
      </div>

      <div className="grid-2">
        <label>
          Materia
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopic('');
            }}
          >
            <option value="">Todas las materias ({dueCards.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({dueBySubject[s.id] || 0})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tema
          <select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!subjectId}>
            <option value="">{subjectId ? 'Todos los temas' : 'Elige una materia primero'}</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.due})
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === 'pomodoro' ? (
        <div className="launcher-empty">
          {pomoState?.active ? (
            <Link to={pomoState.url} className="btn primary lg block">
              <Timer size={18} aria-hidden="true" /> Volver al Pomodoro en curso
            </Link>
          ) : selectionTotal > 0 ? (
            <Link to={pomodoroUrl(subjectId, topic)} className="btn primary lg block breathe-btn">
              <Timer size={18} aria-hidden="true" /> Comenzar bloque de {pomoConfig.focus} min
            </Link>
          ) : (
            <button className="btn primary lg block" disabled>Comenzar Pomodoro</button>
          )}
          <p className="small muted center-text practice-note">
            {pomoConfig.focus} min de estudio y {pomoConfig.break} min de descanso. Primero tus pendientes; si se acaban,
            práctica libre. Cambia los tiempos en Ajustes.
          </p>
        </div>
      ) : count > 0 ? (
        <Link to={studyUrl(subjectId, topic)} className="btn primary lg block breathe-btn">
          <Play size={18} fill="currentColor" aria-hidden="true" /> Comenzar repaso
        </Link>
      ) : (
        <div className="launcher-empty">
          <p>
            {dueCards.length === 0
              ? 'Todo al día. No tienes tarjetas pendientes. Descansar también es parte de aprender.'
              : 'No hay tarjetas pendientes en esta selección. Prueba con otra materia o tema.'}
          </p>
          {selectionTotal > 0 ? (
            <Link to={studyUrl(subjectId, topic, true)} className="btn primary lg block">
              <Shuffle size={18} aria-hidden="true" /> Estudiar de todos modos
            </Link>
          ) : (
            <button className="btn primary lg block" disabled>Comenzar repaso</button>
          )}
          {selectionTotal > 0 && (
            <p className="small muted center-text practice-note">
              Práctica libre con {selectionTotal} {selectionTotal === 1 ? 'tarjeta' : 'tarjetas'}: solo
              «Difícil» adelanta una tarjeta; tu calendario no se altera.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
