import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { fetchSessions, fetchStudyLog } from '../../core/data/db.js';
import { addDays, dayKey, startOfDay } from '../../core/lib/dates.js';
import { minutesOf } from './stats.js';

// Meta diaria en MINUTOS de estudio, sea cual sea el método: repasos y Pomodoros dentro de Amati, más lo que
// registras como estudiado por tu cuenta (bloques de la Agenda). Las tarjetas son solo un dato aparte.
// El resultado se guarda en el dispositivo para mostrarlo al instante y cuando no haya conexión.
export const GOAL_OPTIONS = [15, 30, 45, 60, 90];
export const DEFAULT_GOAL = 30;

const cacheKey = (uid) => `amati-daily-min-${uid}`;
function readCache(uid) {
  try { return JSON.parse(localStorage.getItem(cacheKey(uid))) || {}; } catch { return {}; }
}

export function useDailyProgress(now) {
  const { user, profile } = useAuth();
  const goalMin = GOAL_OPTIONS.includes(profile?.dailyGoalMin) ? profile.dailyGoalMin : DEFAULT_GOAL;
  const todayKey = dayKey(now);
  const [data, setData] = useState(() => readCache(user.uid)); // { 'AAAA-MM-DD': { min, cards } }
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const since = addDays(startOfDay(new Date()), -6);
    Promise.all([fetchSessions(user.uid, since), fetchStudyLog(user.uid, since).catch(() => [])])
      .then(([sessions, log]) => {
        if (cancelled) return;
        const next = {};
        const slot = (k) => (next[k] ||= { min: 0, cards: 0 });
        for (const s of sessions) {
          const k = s.dayKey || dayKey(s.startedAt);
          slot(k).min += minutesOf(s);
          slot(k).cards += s.cardsReviewed || 0;
        }
        for (const l of log) slot(l.dayKey).min += l.minutes || 0;
        setData(next);
        setLoaded(true);
        try { localStorage.setItem(cacheKey(user.uid), JSON.stringify(next)); } catch { /* sin almacenamiento */ }
      })
      .catch(() => !cancelled && setLoaded(true)); // sin conexión: se queda lo último guardado
    return () => { cancelled = true; };
  }, [user.uid, todayKey]);

  return useMemo(() => {
    const today = startOfDay(now);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const key = dayKey(date);
      return { key, date, minutes: Math.round(data[key]?.min || 0), cards: data[key]?.cards || 0, isToday: i === 6 };
    });
    const todayMin = days[6].minutes;
    return {
      goalMin,
      days,
      todayMin,
      todayCards: days[6].cards,
      weekMin: days.reduce((a, d) => a + d.minutes, 0),
      weekCards: days.reduce((a, d) => a + d.cards, 0),
      daysMet: days.filter((d) => d.minutes >= goalMin).length,
      done: todayMin >= goalMin,
      loaded,
    };
  }, [data, goalMin, loaded, now]);
}
