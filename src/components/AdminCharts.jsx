import { useMemo } from 'react';
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
import { addDays, dayKey, fmtShort, startOfDay } from '../lib/dates.js';

function Tip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tt-title">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tt-row">
          {payload.length > 1 && <span className={`legend-line ${p.dataKey === 'Antes' ? 'before' : 'after'}`} />}
          {payload.length > 1 && `${p.dataKey}: `}
          <strong>{typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(2)) : p.value}</strong>
          {unit}
        </p>
      ))}
    </div>
  );
}

// Lista de barras horizontales con etiqueta y porcentaje (una sola serie)
function BarList({ items }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.label}>
          <div className="row between">
            <span>{i.label}</span>
            <span className="small"><strong>{i.value}</strong> <span className="muted">· {Math.round((i.value / total) * 100)}%</span></span>
          </div>
          <div className="progress-track thin">
            <div className="progress-fill grow-bar" style={{ width: `${(i.value / total) * 100}%`, background: 'var(--chart-bar-strong)' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Lunes de la semana de una fecha
const weekStart = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export default function AdminCharts({ sessions, reviews }) {
  const charts = useMemo(() => {
    const complete = sessions.filter((s) => s.moodBefore && s.moodAfter && s.startedAt);

    // 1) Ánimo promedio antes/después por semana
    const weeks = {};
    for (const s of complete) {
      const k = dayKey(weekStart(s.startedAt));
      const w = (weeks[k] ??= { start: weekStart(s.startedAt), before: 0, after: 0, n: 0 });
      w.before += s.moodBefore;
      w.after += s.moodAfter;
      w.n += 1;
    }
    const moodWeekly = Object.values(weeks)
      .sort((a, b) => a.start - b.start)
      .map((w) => ({ semana: `Sem. ${fmtShort(w.start)}`, Antes: +(w.before / w.n).toFixed(2), Después: +(w.after / w.n).toFixed(2) }));

    // 2) Distribución del cambio de ánimo (después − antes)
    const diffs = Array.from({ length: 9 }, (_, i) => ({ cambio: i - 4, sesiones: 0 }));
    complete.forEach((s) => (diffs[s.moodAfter - s.moodBefore + 4].sesiones += 1));
    const diffData = diffs.filter((d) => Math.abs(d.cambio) <= 3 || d.sesiones > 0)
      .map((d) => ({ ...d, label: d.cambio > 0 ? `+${d.cambio}` : String(d.cambio) }));

    // 3) Sesiones por día (últimos 30 días)
    const today = startOfDay(new Date());
    const perDay = {};
    sessions.forEach((s) => (perDay[s.dayKey] = (perDay[s.dayKey] || 0) + 1));
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i - 29);
      return { dia: fmtShort(d), sesiones: perDay[dayKey(d)] || 0 };
    });

    // 4) Tipos de sesión y respuestas (sin la materia de ejemplo)
    const modes = { review: 0, practice: 0, pomodoro: 0 };
    sessions.forEach((s) => (modes[s.mode || 'review'] = (modes[s.mode || 'review'] || 0) + 1));
    const real = reviews.filter((r) => !r.sample);
    const ratings = { hard: 0, good: 0, easy: 0 };
    real.forEach((r) => (ratings[r.rating] = (ratings[r.rating] || 0) + 1));

    const pomos = sessions.filter((s) => s.pomodoro);
    return {
      moodWeekly,
      diffData,
      daily,
      modes: [
        { label: 'Repaso normal', value: modes.review },
        { label: 'Práctica libre', value: modes.practice },
        { label: 'Pomodoro suave', value: modes.pomodoro },
      ],
      ratings: [
        { label: 'Difícil', value: ratings.hard },
        { label: 'Bien', value: ratings.good },
        { label: 'Fácil', value: ratings.easy },
      ],
      breathing: sessions.length ? Math.round((sessions.filter((s) => s.breathing === 'completed').length / sessions.length) * 100) : 0,
      pomoBlocks: pomos.reduce((a, s) => a + (s.pomodoro.blocks || 0), 0),
      pomoMinutes: pomos.reduce((a, s) => a + (s.pomodoro.focusMinutes || 0), 0),
      sampleExcluded: reviews.length - real.length,
      completeCount: complete.length,
    };
  }, [sessions, reviews]);

  const axis = { tickLine: false, axisLine: false, tick: { fontSize: 12 } };

  return (
    <>
      <section className="stat-grid">
        <div className="stat"><span className="stat-num">{charts.breathing}%</span><span className="stat-label">Respiración completada</span></div>
        <div className="stat"><span className="stat-num">{charts.pomoBlocks}</span><span className="stat-label">Bloques Pomodoro</span></div>
        <div className="stat"><span className="stat-num">{charts.pomoMinutes}</span><span className="stat-label">Min de estudio en Pomodoro</span></div>
      </section>

      <section className="panel chart-panel">
        <div className="chart-head">
          <div>
            <h2 className="h3">Ánimo promedio antes y después</h2>
            <p className="small muted">Por semana · escala 1 (muy estresado) a 5 (muy tranquilo)</p>
          </div>
        </div>
        {charts.moodWeekly.length === 0 ? (
          <p className="muted">Sin sesiones completas todavía.</p>
        ) : (
          <>
            <ul className="legend">
              <li><span className="legend-line before" /> Antes de la sesión</li>
              <li><span className="legend-line after" /> Después de la sesión</li>
            </ul>
            <div className="chart">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts.moodWeekly} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="semana" {...axis} dy={6} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
                  <Tooltip content={<Tip />} cursor={{ stroke: 'var(--line)' }} />
                  <Line type="monotone" dataKey="Antes" stroke="var(--chart-before)" strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--chart-before)' }} animationDuration={1000} />
                  <Line type="monotone" dataKey="Después" stroke="var(--chart-after)" strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--chart-after)' }} animationBegin={200} animationDuration={1000} />
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
              <h2 className="h3">Cambio de ánimo por sesión</h2>
              <p className="small muted">Después − antes · {charts.completeCount} sesiones completas</p>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.diffData} margin={{ top: 18, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" {...axis} dy={6} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip content={<Tip unit=" sesiones" />} cursor={{ fill: 'var(--hover-band)' }} />
                <Bar dataKey="sesiones" radius={[4, 4, 0, 0]} animationDuration={900}>
                  {/* Divergente: empeoró (coral) · sin cambio (gris) · mejoró (turquesa) */}
                  {charts.diffData.map((d) => (
                    <Cell key={d.cambio} fill={d.cambio < 0 ? 'var(--chart-before)' : d.cambio > 0 ? 'var(--chart-after)' : 'var(--muted)'} />
                  ))}
                  <LabelList dataKey="sesiones" position="top" className="bar-label" formatter={(v) => (v ? v : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small muted">Coral: empeoró · gris: igual · turquesa: mejoró</p>
        </section>

        <section className="panel chart-panel">
          <div className="chart-head">
            <div>
              <h2 className="h3">Sesiones por día</h2>
              <p className="small muted">Últimos 30 días · todos los participantes</p>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.daily} margin={{ top: 10, right: 4, left: -24, bottom: 0 }} barCategoryGap="15%">
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="dia" {...axis} interval={6} dy={6} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip content={<Tip unit=" sesiones" />} cursor={{ fill: 'var(--hover-band)' }} />
                <Bar dataKey="sesiones" fill="var(--chart-bar-strong)" radius={[3, 3, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid-2 progress-grid">
        <section className="panel chart-panel">
          <h2 className="h3">Tipo de sesión</h2>
          <BarList items={charts.modes} />
        </section>
        <section className="panel chart-panel">
          <h2 className="h3">Respuestas de dificultad</h2>
          <BarList items={charts.ratings} />
          {charts.sampleExcluded > 0 && (
            <p className="small muted">Se excluyen {charts.sampleExcluded} repasos de la materia de ejemplo.</p>
          )}
        </section>
      </div>
    </>
  );
}
