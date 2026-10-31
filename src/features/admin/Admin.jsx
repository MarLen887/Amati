import { useEffect, useMemo, useState } from 'react';
import { fetchResearchData } from '../../core/data/db.js';
import { downloadCsv, toCsv } from '../../core/lib/csv.js';
import { dayKey } from '../../core/lib/dates.js';
import AdminCharts from './AdminCharts.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import Loader from '../../core/components/Loader.jsx';

// Panel de investigación: datos anónimos de la prueba piloto (V de Gowin: registros y transformaciones)
export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResearchData().then(setData).catch((e) => setError(e.message));
  }, []);

  const summary = useMemo(() => {
    if (!data) return null;
    const participants = {};
    for (const s of data.sessions) {
      const p = (participants[s.anonId] ??= { anonId: s.anonId, days: new Set(), sessions: 0, breathing: 0, reviews: 0 });
      p.sessions += 1;
      p.days.add(s.dayKey);
      if (s.breathing === 'completed') p.breathing += 1;
    }
    for (const r of data.reviews) {
      const p = (participants[r.anonId] ??= { anonId: r.anonId, days: new Set(), sessions: 0, breathing: 0, reviews: 0 });
      p.reviews += 1;
    }
    const list = Object.values(participants).map((p) => ({
      ...p,
      daysStudied: p.days.size,
    }));
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const ratingCounts = { hard: 0, good: 0, easy: 0 };
    data.reviews.forEach((r) => (ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1));
    return {
      list,
      totalSessions: data.sessions.length,
      avgDays: avg(list.map((p) => p.daysStudied)),
      breathingRate: data.sessions.length
        ? data.sessions.filter((s) => s.breathing === 'completed').length / data.sessions.length
        : null,
      ratingCounts,
    };
  }, [data]);

  if (error) {
    return (
      <div className="panel">
        <h1>Investigación</h1>
        <p className="error">No tienes permiso o hubo un error: {error}</p>
      </div>
    );
  }
  if (!summary) return <Loader label="Cargando datos de la prueba piloto…" />;

  const fmt = (v, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d));
  const today = dayKey();

  function exportSessions() {
    downloadCsv(`amati_sesiones_${today}.csv`, toCsv(data.sessions, [
      { label: 'id_anonimo', get: (s) => s.anonId },
      { label: 'id_sesion', get: (s) => s.id },
      { label: 'dia', get: (s) => s.dayKey },
      { label: 'modo', get: (s) => ({ practice: 'práctica', pomodoro: 'pomodoro' })[s.mode] || 'repaso' },
      { label: 'inicio', get: (s) => s.startedAt },
      { label: 'fin', get: (s) => s.endedAt },
      { label: 'respiracion', get: (s) => s.breathing },
      { label: 'tarjetas_repasadas', get: (s) => s.cardsReviewed },
      { label: 'pomodoro_bloques', get: (s) => s.pomodoro?.blocks },
      { label: 'pomodoro_min_estudio', get: (s) => s.pomodoro?.focusMinutes },
      { label: 'pomodoro_config', get: (s) => (s.pomodoro ? `${s.pomodoro.focusMin}/${s.pomodoro.breakMin}` : '') },
      { label: 'descansos_tomados', get: (s) => s.pomodoro?.breaksTaken },
      { label: 'descansos_omitidos', get: (s) => s.pomodoro?.breaksSkipped },
      { label: 'dificil', get: (s) => s.ratings?.hard },
      { label: 'bien', get: (s) => s.ratings?.good },
      { label: 'facil', get: (s) => s.ratings?.easy },
    ]));
  }

  function exportReviews() {
    downloadCsv(`amati_repasos_${today}.csv`, toCsv(data.reviews, [
      { label: 'id_anonimo', get: (r) => r.anonId },
      { label: 'id_sesion', get: (r) => r.sessionId },
      { label: 'id_tarjeta', get: (r) => r.cardId },
      { label: 'fecha_repaso', get: (r) => r.reviewedAt },
      { label: 'modo', get: (r) => (r.mode === 'practice' ? 'práctica' : 'repaso') },
      { label: 'dificultad', get: (r) => ({ hard: 'Difícil', good: 'Bien', easy: 'Fácil' })[r.rating] },
      { label: 'intervalo_anterior_dias', get: (r) => r.prevInterval },
      { label: 'intervalo_nuevo_dias', get: (r) => r.newInterval },
      { label: 'facilidad', get: (r) => r.ease },
      { label: 'proximo_repaso', get: (r) => r.nextDue },
    ]));
  }

  function exportParticipants() {
    downloadCsv(`amati_participantes_${today}.csv`, toCsv(summary.list, [
      { label: 'id_anonimo', get: (p) => p.anonId },
      { label: 'dias_estudiados', get: (p) => p.daysStudied },
      { label: 'sesiones', get: (p) => p.sessions },
      { label: 'repasos', get: (p) => p.reviews },
      { label: 'respiraciones_completadas', get: (p) => p.breathing },
    ]));
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>Investigación · Prueba piloto</h1>
        <p className="muted">Datos anónimos: no incluyen nombres, correos ni el contenido de las tarjetas.</p>
      </div>

      <section className="stat-grid">
        <div className="stat"><span className="stat-num">{summary.list.length}</span><span className="stat-label">Participantes</span></div>
        <div className="stat"><span className="stat-num">{summary.totalSessions}</span><span className="stat-label">Sesiones</span></div>
        <div className="stat"><span className="stat-num">{data.reviews.length}</span><span className="stat-label">Repasos</span></div>
        <div className="stat"><span className="stat-num">{fmt(summary.avgDays, 1)}</span><span className="stat-label">Días estudiados (prom.)</span></div>
      </section>

      {summary.totalSessions === 0 && data.reviews.length === 0 ? (
        <section className="panel">
          <EmptyState title="Aún no hay datos de la prueba piloto">
            <p>Cuando los participantes hagan sus primeras sesiones, aquí aparecerán las gráficas y podrás exportar los CSV.</p>
          </EmptyState>
        </section>
      ) : (
        <AdminCharts sessions={data.sessions} reviews={data.reviews} />
      )}

      <section className="panel">
        <h2 className="h3">Hábitos de estudio</h2>
        <p className="small muted">
          Respiración guiada completada en {summary.breathingRate === null ? '—' : `${Math.round(summary.breathingRate * 100)}%`} de las sesiones ·
          Respuestas: Difícil {summary.ratingCounts.hard}, Bien {summary.ratingCounts.good}, Fácil {summary.ratingCounts.easy}
        </p>
      </section>

      <section className="panel stack">
        <h2 className="h3">Exportar (CSV)</h2>
        <div className="row gap wrap">
          <button className="btn primary" onClick={exportParticipants}>Resumen por participante</button>
          <button className="btn ghost" onClick={exportSessions}>Sesiones</button>
          <button className="btn ghost" onClick={exportReviews}>Historial de repasos</button>
        </div>
      </section>

      <section className="panel">
        <h2 className="h3">Participantes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID anónimo</th><th>Días</th><th>Sesiones</th><th>Repasos</th></tr>
            </thead>
            <tbody>
              {summary.list.map((p) => (
                <tr key={p.anonId}>
                  <td className="mono">{p.anonId.slice(0, 8)}</td>
                  <td>{p.daysStudied}</td>
                  <td>{p.sessions}</td>
                  <td>{p.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
