import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { playChime, unlockAudio } from '../lib/chime.js';

// Pomodoro suave: bloques cortos de estudio y descansos tranquilos.
// El tiempo se calcula con la hora real (endAt), así no se desfasa si cambias de pestaña
// o bloqueas el celular, y el estado sobrevive a cambios de pantalla dentro de la app.
export const DEFAULT_POMODORO = { focus: 15, break: 5, sound: true };
export const FOCUS_OPTIONS = [10, 15, 20, 25];
export const BREAK_OPTIONS = [3, 5, 10];

const KEY = 'amati-pomodoro';
const PomodoroContext = createContext(null);

function load() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY));
    return s?.active ? s : null;
  } catch {
    return null;
  }
}

export function PomodoroProvider({ children }) {
  const { profile } = useAuth() || {};
  const [state, setState] = useState(load); // null = sin bloque activo
  const [now, setNow] = useState(() => Date.now());
  const chimed = useRef(null);

  const config = { ...DEFAULT_POMODORO, ...(profile?.pomodoro || {}) };

  useEffect(() => {
    try {
      if (state) sessionStorage.setItem(KEY, JSON.stringify(state));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [state]);

  // Reloj: solo corre mientras hay un bloque activo
  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [!!state]);

  const remainingMs = state?.endAt ? Math.max(0, state.endAt - now) : 0;
  const timeUp = Boolean(state?.endAt) && remainingMs === 0;

  // Campanita una sola vez cuando termina cada fase
  useEffect(() => {
    if (!timeUp || !state) return;
    const mark = `${state.phase}-${state.endAt}`;
    if (chimed.current === mark) return;
    chimed.current = mark;
    if (state.config.sound) playChime();
  }, [timeUp, state?.phase, state?.endAt]);

  const start = useCallback(
    ({ sessionId, url, moodBefore }) => {
      unlockAudio();
      const t = Date.now();
      setState({
        active: true,
        sessionId,
        url,
        moodBefore,
        config,
        phase: 'focus',
        endAt: t + config.focus * 60_000,
        phaseStartedAt: t,
        blocks: 0,
        focusMs: 0,
        breaksTaken: 0,
        breaksSkipped: 0,
        ratings: { hard: 0, good: 0, easy: 0 },
      });
      setNow(t);
    },
    [config.focus, config.break, config.sound],
  );

  const update = useCallback((fn) => setState((s) => (s ? { ...s, ...fn(s) } : s)), []);

  const value = {
    state,
    config,
    remainingMs,
    timeUp,
    start,
    addRating: (rating) => update((s) => ({ ratings: { ...s.ratings, [rating]: s.ratings[rating] + 1 } })),
    // Termina el bloque de estudio y comienza el descanso
    startBreak: () =>
      update((s) => {
        const t = Date.now();
        return {
          phase: 'break',
          blocks: s.blocks + 1,
          focusMs: s.focusMs + Math.min(t - s.phaseStartedAt, s.config.focus * 60_000),
          endAt: t + s.config.break * 60_000,
          phaseStartedAt: t,
        };
      }),
    // Siguiente bloque de estudio (tomando o saltando el descanso)
    nextFocus: (skippedBreak = false) =>
      update((s) => {
        const t = Date.now();
        return {
          phase: 'focus',
          breaksTaken: s.breaksTaken + (skippedBreak ? 0 : 1),
          breaksSkipped: s.breaksSkipped + (skippedBreak ? 1 : 0),
          endAt: t + s.config.focus * 60_000,
          phaseStartedAt: t,
        };
      }),
    // Pasa a registrar el ánimo final (el bloque en curso cuenta si se estudió algo)
    end: () =>
      update((s) => {
        const t = Date.now();
        const extra = s.phase === 'focus' ? Math.min(t - s.phaseStartedAt, s.config.focus * 60_000) : 0;
        const tookBreak = s.phase === 'break' && t >= s.endAt;
        return {
          phase: 'ended',
          endAt: null,
          focusMs: s.focusMs + extra,
          blocks: s.blocks + (s.phase === 'focus' && extra >= 60_000 ? 1 : 0),
          breaksTaken: s.breaksTaken + (tookBreak ? 1 : 0),
        };
      }),
    clear: () => setState(null),
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export const usePomodoro = () => useContext(PomodoroContext);

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
