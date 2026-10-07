import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Brain, CalendarDays, Clock, Flame, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { fetchReviews, fetchSessions } from '../lib/db.js';
import { cardStatus } from '../lib/srs.js';
import { addDays, dayKey, endOfDay, fmtShort, fmtWeekday, startOfDay } from '../lib/dates.js';
import { MoodFace, moodLabel } from '../components/MoodPicker.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Link } from 'react-router-dom';

const RANGE_DAYS = 84; // 12 semanas (calendario de actividad)

// ---------- Utilidades de animación ----------
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out cúbico
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// Devuelve true un instante después de montar: permite que las barras crezcan desde 0
function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setM(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return m;
}

// ---------- Cálculos ----------
function weakTopics(reviews, subjectMap) {
  const groups = {};
  for (const r of reviews) {
    const key = `${r.subjectId}::${r.topic || ''}`;
    groups[key] ??= { subjectId: r.subjectId, topic: r.topic || 'Sin tema', total: 0, hard: 0 };
    groups[key].total += 1;
    if (r.rating === 'hard') groups[key].hard += 1;
  }
  return Object.values(groups)
    .filter((g) => g.total >= 3 && subjectMap[g.subjectId])
    .map((g) => ({ ...g, rate: g.hard / g.total }))
    .filter((g) => g.rate >= 0.25)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);
}

function studyStats(sessions, now) {
  const days = new Set(sessions.map((s) => s.dayKey));
  let streak = 0;
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  while (days.has(dayKey(d))) {
    streak += 1;
    d = addDays(d, -1);
  }
  const last30 = [...days].filter((k) => k >= dayKey(addDays(now, -29))).length;
  return { streak, last30 };
}

// ---------- Componentes ----------
function StatTile({ icon: Icon, value, label, tone = 'teal', delay = 0 }) {
  const n = useCountUp(value);
  return (
    <div className="stat" style={{ animationDelay: `${delay}s` }}>
      <span className={`stat-icon ${tone}`} aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
      <span className="stat-num">{n}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">{render ? render(payload, label) : null}</div>;
}

function StatusBar({ counts }) {
  const mounted = useMounted();
  const total = counts.new + counts.learning + counts.mastered;
  const segs = [
    { id: 'new', label: 'Nuevas', value: counts.new },
    { id: 'learning', label: 'Aprendiendo', value: counts.learning },
    { id: 'mastered', label: 'Dominadas', value: counts.mastered },
  ];
  if (total === 0) return <p className="muted">Aún no tienes tarjetas.</p>;
  return (
    <div className="status-bar-wrap">
      <div className="status-bar" role="img"
        aria-label={segs.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {segs.filter((s) => s.value > 0).map((s) => (
          <div key={s.id} className={`status-seg ${s.id}`} title={`${s.label}: ${s.value}`}
            style={{ flexGrow: mounted ? s.value : 0.0001 }} />
        ))}
      </div>
      <ul className="legend">
        {segs.map((s) => (
          <li key={s.id}>
            <span className={`legend-swatch ${s.id}`} />
            {s.label} <strong>{s.value}</strong>
            <span className="muted"> · {Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityHeatmap({ reviews, now }) {
  const counts = useMemo(() => {
    const m = {};
    for (const r of reviews) {
      const k = dayKey(r.reviewedAt);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [reviews]);

  // 12 columnas (semanas) × 7 filas (lunes a domingo), terminando en la semana actual
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - 7 * 11);
  const max = Math.max(1, ...Object.values(counts));
  const weeks = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d);
      const n = counts[dayKey(date)] || 0;
      const level = date > today ? -1 : n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
      return { date, n, level };
    }),
  );
  const activeDays = Object.keys(counts).length;

  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label={`${activeDays} días con repasos en las últimas 12 semanas`}>
        <div className="heatmap-days" aria-hidden="true">
          <span>L</span><span /><span>M</span><span /><span>V</span><span /><span>D</span>
        </div>
        {weeks.map((week, w) => (
          <div className="heatmap-col" key={w}>
            {week.map((c, d) => (
              <span
                key={d}
                className={`heat-cell l${c.level}`}
                style={{ animationDelay: `${(w * 7 + d) * 6}ms` }}
                title={c.level < 0 ? '' : `${fmtShort(c.date)}: ${c.n} ${c.n === 1 ? 'repaso' : 'repasos'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend small muted" aria-hidden="true">
        Menos <span className="heat-cell l0" /><span className="heat-cell l1" /><span className="heat-cell l2" />
        <span className="heat-cell l3" /><span className="heat-cell l4" /> Más
      </div>
    </div>
  );
}

function AnimatedBar({ pct, color, warm }) {
  const mounted = useMounted(120);
  return (
    <div className="progress-track thin">
      <div className={`progress-fill grow-bar ${warm ? 'warm' : ''}`}
        style={{ width: mounted ? `${pct}%` : 0, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

// ---------- Página ----------
export default function Progress() {
  const { user } = useAuth();
  const { cards, subjects, subjectMap, dueCards, now, loading } = useData();
  const [sessions, setSessions] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const since = addDays(startOfDay(new Date()), -RANGE_DAYS);
    Promise.all([fetchSessions(user.uid, since), fetchReviews(user.uid, since)])
      .then(([s, r]) => {
        setSessions(s);
        setReviews(r);
      })
      .catch((e) => setError(e.message));
  }, [user.uid]);

  const counts = useMemo(() => {
    const c = { new: 0, learning: 0, mastered: 0 };
    cards.forEach((card) => (c[cardStatus(card)] += 1));
    return c;
  }, [cards]);

  const forecast = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(now, i);
        const n = cards.filter((c) =>
          i === 0 ? c.dueDate <= endOfDay(day) : c.dueDate > endOfDay(addDays(day, -1)) && c.dueDate <= endOfDay(day),
        ).length;
        return { day: i === 0 ? 'Hoy' : fmtWeekday(day).replace('.', ''), tarjetas: n, today: i === 0 };
      }),
    [cards, now],
  );

  const bySubject = useMemo(
    () =>
      subjects.map((s) => {
        const sc = cards.filter((c) => c.subjectId === s.id);
        const mastered = sc.filter((c) => cardStatus(c) === 'mastered').length;
        return { ...s, total: sc.length, mastered, pct: sc.length ? Math.round((mastered / sc.length) * 100) : 0 };
      }),
    [subjects, cards],
  );

  if (loading) return <p className="muted">Cargando…</p>;

  if (cards.length === 0) {
    return (
      <div className="stack-lg">
        <h1>Tu progreso</h1>
        <section className="panel">
          <EmptyState title="Aquí verás tu avance" actions={<Link to="/materias" className="btn primary">Ir a mis materias</Link>}>
            <p>Cuando tengas tarjetas y hagas tus primeras sesiones, aparecerán tus gráficas de avance y de ánimo.</p>
          </EmptyState>
        </section>
      </div>
    );
  }

  const moodData = (sessions || [])
    .filter((s) => s.moodBefore && s.moodAfter)
    .slice(-14)
    .map((s, i, arr) => ({
      fecha: fmtShort(s.startedAt),
      Antes: s.moodBefore,
      Después: s.moodAfter,
      last: i === arr.length - 1,
    }));
  const avgDiff = moodData.length
    ? moodData.reduce((a, s) => a + (s.Después - s.Antes), 0) / moodData.length
    : null;
  const stats = sessions ? studyStats(sessions, now) : { streak: 0, last30: 0 };
  const weak = reviews ? weakTopics(reviews, subjectMap) : [];
  const recentReviews = reviews || [];

  // Etiqueta directa en el último punto de cada serie
  const endLabel = (name) => (props) => {
    const { x, y, index } = props;
    if (index !== moodData.length - 1) return null;
    return (
      <text x={x + 10} y={y + 4} className="direct-label">{name}</text>
    );
  };

  return (
    <div className="stack-lg progress-page">
      <div>
        <h1>Tu progreso</h1>
        <p className="muted">Sin rankings ni comparaciones: solo tu avance, a tu ritmo.</p>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="stat-grid">
        <StatTile icon={Target} value={counts.mastered} label="Dominadas" tone="navy" delay={0} />
        <StatTile icon={Brain} value={counts.learning} label="Aprendiendo" tone="teal" delay={0.05} />
        <StatTile icon={Sparkles} value={counts.new} label="Nuevas" tone="sand" delay={0.1} />
        <StatTile icon={Clock} value={dueCards.length} label="Pendientes hoy" tone="coral" delay={0.15} />
        <StatTile icon={CalendarDays} value={stats.last30} label="Días estudiados (30 d)" tone="teal" delay={0.2} />
        <StatTile icon={Flame} value={stats.streak} label="Días seguidos" tone="sand" delay={0.25} />
      </section>

      <section className="panel chart-panel">
        <div className="chart-head">
          <h2 className="h3">Estado de tus tarjetas</h2>
        </div>
        <StatusBar counts={counts} />
      </section>

      <section className="panel chart-panel">
        <div className="chart-head">
          <div>
            <h2 className="h3">Estado de ánimo por sesión</h2>
            <p className="small muted">Escala 1 (muy estresado) a 5 (muy tranquilo) · últimas {moodData.length || 0} sesiones</p>
          </div>
          {avgDiff !== null && (
            <div className={`delta-chip ${avgDiff >= 0 ? 'up' : 'down'}`}>
              {avgDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <strong>{avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(1)}</strong>
              <span>promedio por sesión</span>
            </div>
          )}
        </div>
        {moodData.length === 0 ? (
          <div className="chart-empty">
            <MoodFace value={3} size={40} />
            <p className="muted">Aparecerá aquí cuando completes tu primera sesión.</p>
          </div>
        ) : (
          <>
            <ul className="legend">
              <li><span className="legend-line before" /> Antes de la sesión</li>
              <li><span className="legend-line after" /> Después de la sesión</li>
            </ul>
            <div className="chart">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={moodData} margin={{ top: 12, right: 72, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} dy={6} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ stroke: 'var(--line)', strokeWidth: 1 }}
                    content={
                      <ChartTooltip
                        render={(p, label) => (
                          <>
                            <p className="tt-title">{label}</p>
                            {p.map((e) => (
                              <p key={e.dataKey} className="tt-row">
                                <span className={`legend-line ${e.dataKey === 'Antes' ? 'before' : 'after'}`} />
                                {e.dataKey}: <strong>{moodLabel(e.value)}</strong>
                              </p>
                            ))}
                          </>
                        )}
                      />
                    }
                  />
                  <Line type="monotone" dataKey="Antes" stroke="var(--chart-before)" strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--chart-before)' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface)' }}
                    animationDuration={1100} animationEasing="ease-out">
                    <LabelList content={endLabel('Antes')} />
                  </Line>
                  <Line type="monotone" dataKey="Después" stroke="var(--chart-after)" strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--chart-after)' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface)' }}
                    animationBegin={250} animationDuration={1100} animationEasing="ease-out">
                    <LabelList content={endLabel('Después')} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <div className="grid-2 progress-grid">
        <section className="panel chart-panel">
          <div className="chart-head">
            <div>
              <h2 className="h3">Próximos 7 días</h2>
              <p className="small muted">Tarjetas programadas por día</p>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={forecast} margin={{ top: 18, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} dy={6} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'var(--hover-band)' }}
                  content={
                    <ChartTooltip
                      render={(p, label) => (
                        <>
                          <p className="tt-title">{label}</p>
                          <p className="tt-row"><strong>{p[0].value}</strong> {p[0].value === 1 ? 'tarjeta' : 'tarjetas'}</p>
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey="tarjetas" radius={[4, 4, 0, 0]} animationDuration={900} animationEasing="ease-out">
                  {forecast.map((d) => (
                    <Cell key={d.day} fill={d.today ? 'var(--chart-bar-strong)' : 'var(--chart-bar)'} />
                  ))}
                  <LabelList dataKey="tarjetas" position="top" className="bar-label"
                    formatter={(v) => (v > 0 ? v : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="chart-head">
            <div>
              <h2 className="h3">Actividad</h2>
              <p className="small muted">Repasos por día · últimas 12 semanas</p>
            </div>
          </div>
          <ActivityHeatmap reviews={recentReviews} now={now} />
        </section>
      </div>

      <section className="panel chart-panel">
        <div className="chart-head">
          <div>
            <h2 className="h3">Temas que requieren más esfuerzo</h2>
            <p className="small muted">Porcentaje de respuestas «Difícil» (mínimo 3 repasos)</p>
          </div>
        </div>
        {weak.length === 0 ? (
          <p className="muted">
            {reviews?.length ? 'Ningún tema destaca por ahora. ¡Vas bien!' : 'Se mostrarán cuando tengas algunos repasos.'}
          </p>
        ) : (
          <ul className="bar-list">
            {weak.map((w) => (
              <li key={w.subjectId + w.topic}>
                <div className="row between">
                  <span>
                    <span className="dot-color" style={{ background: subjectMap[w.subjectId]?.color }} />{' '}
                    <strong>{w.topic}</strong> <span className="muted small">· {subjectMap[w.subjectId]?.name}</span>
                  </span>
                  <span className="small">{Math.round(w.rate * 100)}%</span>
                </div>
                <AnimatedBar pct={w.rate * 100} warm />
              </li>
            ))}
          </ul>
        )}
      </section>

      {bySubject.length > 0 && (
        <section className="panel chart-panel">
          <div className="chart-head">
            <div>
              <h2 className="h3">Dominio por materia</h2>
              <p className="small muted">Tarjetas con intervalo de 21 días o más</p>
            </div>
          </div>
          <ul className="bar-list">
            {bySubject.map((s) => (
              <li key={s.id}>
                <div className="row between">
                  <span><span className="dot-color" style={{ background: s.color }} /> {s.name}</span>
                  <span className="small">{s.mastered}/{s.total} <span className="muted">· {s.pct}%</span></span>
                </div>
                <AnimatedBar pct={s.pct} color={s.color} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
