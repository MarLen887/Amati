import { useEffect, useState } from 'react';
import { CalendarHeart } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchSessions } from '../lib/db.js';
import { addDays, dayKey, startOfDay } from '../lib/dates.js';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Resumen de la semana (lunes a domingo): días estudiados, tarjetas y cambio de ánimo.
// Sin rachas ni metas: solo un reflejo amable de lo que hiciste.
export default function WeeklySummary({ now }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);

  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));

  useEffect(() => {
    fetchSessions(user.uid, monday).then(setSessions).catch(() => setSessions([]));
  }, [user.uid, dayKey(monday)]);

  if (!sessions) return null;

  const studied = new Set(sessions.map((s) => s.dayKey));
  const cardsReviewed = sessions.reduce((a, s) => a + (s.cardsReviewed || 0), 0);
  const moods = sessions.filter((s) => s.moodBefore && s.moodAfter);
  const avgDiff = moods.length ? moods.reduce((a, s) => a + (s.moodAfter - s.moodBefore), 0) / moods.length : null;
  const pomodoroMin = sessions.reduce((a, s) => a + (s.pomodoro?.focusMinutes || 0), 0);

  let line;
  if (studied.size === 0) line = 'Esta semana aún no has estudiado. Unos minutos hoy son un gran comienzo.';
  else {
    line = `Estudiaste ${studied.size} ${studied.size === 1 ? 'día' : 'días'} y repasaste ${cardsReviewed} ${cardsReviewed === 1 ? 'tarjeta' : 'tarjetas'}`;
    if (pomodoroMin > 0) line += ` · ${pomodoroMin} min en Pomodoro`;
    line += '.';
    if (avgDiff !== null && avgDiff > 0) line += ` Tu ánimo mejoró ${avgDiff.toFixed(1)} puntos en promedio al estudiar.`;
    else if (avgDiff !== null && avgDiff === 0) line += ' Tu ánimo se mantuvo estable al estudiar.';
  }

  return (
    <section className="panel weekly">
      <div className="row between gap wrap">
        <p className="eyebrow row gap"><CalendarHeart size={14} aria-hidden="true" /> Tu semana</p>
        <div className="week-dots" role="img" aria-label={`Estudiaste ${studied.size} de 7 días esta semana`}>
          {DAY_LETTERS.map((l, i) => {
            const d = addDays(monday, i);
            const done = studied.has(dayKey(d));
            const isToday = dayKey(d) === dayKey(today);
            const future = d > today;
            return (
              <span key={i} className={`week-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}>
                {l}
              </span>
            );
          })}
        </div>
      </div>
      <p className="weekly-line">{line}</p>
    </section>
  );
}
