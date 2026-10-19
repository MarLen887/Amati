import { useEffect, useState } from 'react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { fetchSessions, fetchTrivia } from '../../core/data/db.js';
import { addDays, dayKey, startOfDay } from '../../core/lib/dates.js';

const MAX_SESSION_MIN = 90; // una sesión abandonada no debe inflar el tiempo estudiado

// Días seguidos con actividad (si hoy aún no estudias, la racha sigue viva hasta ayer)
export function streakOf(days, now = new Date()) {
  let streak = 0;
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  while (days.has(dayKey(d))) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}

export function minutesOf(session) {
  if (session.pomodoro?.focusMinutes) return session.pomodoro.focusMinutes;
  if (!session.startedAt || !session.endedAt) return 0;
  return Math.min(MAX_SESSION_MIN, Math.max(0, (session.endedAt - session.startedAt) / 60000));
}

export function formatMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Racha y tiempo estudiado en la última semana (sesiones con cualquier técnica y trivia)
export function useStudyStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ loaded: false, streak: 0, weekMinutes: 0 });

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const since = addDays(startOfDay(now), -60);
    Promise.all([fetchSessions(user.uid, since), fetchTrivia(user.uid, since).catch(() => [])])
      .then(([sessions, trivia]) => {
        if (cancelled) return;
        const days = new Set([...sessions.map((s) => s.dayKey), ...trivia.map((t) => t.dayKey)]);
        const weekStart = addDays(startOfDay(now), -6);
        const weekMinutes = sessions.filter((s) => s.startedAt >= weekStart).reduce((a, s) => a + minutesOf(s), 0);
        setStats({ loaded: true, streak: streakOf(days, now), weekMinutes });
      })
      .catch(() => !cancelled && setStats({ loaded: true, streak: 0, weekMinutes: 0 }));
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  return stats;
}
