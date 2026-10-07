import { Link } from 'react-router-dom';
import Hummingbird from '../components/Hummingbird.jsx';
import { quoteOfTheDay } from '../lib/quotes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { addDays, endOfDay, fmtLong } from '../lib/dates.js';
import StudyLauncher from '../components/StudyLauncher.jsx';
import WeeklySummary from '../components/WeeklySummary.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ExamCountdown from '../components/ExamCountdown.jsx';
import { SampleButton } from './Subjects.jsx';
import { daysUntil } from '../lib/srs.js';
import HowItWorks from './HowItWorks.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Home() {
  const { profile, user } = useAuth();
  const { cards, subjects, dueCards, loading, now } = useData();

  if (profile && profile.onboarded === false) return <HowItWorks firstTime />;
  if (loading) return <p className="muted">Cargando…</p>;

  const name = profile?.displayName || user?.displayName || '';
  const greetingText = `${greeting()}${name ? `, ${name.split(' ')[0]}` : ''}`;
  const cut = greetingText.lastIndexOf(' ') + 1;
  const greetingStart = greetingText.slice(0, cut);
  const greetingLast = greetingText.slice(cut);
  const upcomingExams = subjects
    .filter((s) => s.examDate && daysUntil(s.examDate, now) >= 0)
    .sort((a, b) => a.examDate - b.examDate)
    .slice(0, 3);
  const tomorrow = cards.filter((c) => c.dueDate > now && c.dueDate <= endOfDay(addDays(now, 1))).length;

  return (
    <div className="stack-lg stagger">
      <section>
        <p className="muted capitalize">{fmtLong(now)}</p>
        {/* El colibrí va unido a la última palabra para que siempre quede junto al saludo */}
        <h1 className="greeting">
          {greetingStart}
          <span className="nowrap">
            {greetingLast}
            <Hummingbird size={64} />
          </span>
        </h1>
        <p className="daily-quote">{quoteOfTheDay(now)}</p>
      </section>

      {subjects.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="Empecemos"
            actions={
              <>
                <Link to="/materias" className="btn primary">Crear mi primera materia</Link>
                <SampleButton />
              </>
            }
          >
            <p>Crea una materia con tus propias tarjetas, o prueba Amati con 5 tarjetas de ejemplo.</p>
          </EmptyState>
        </section>
      ) : (
        <>
          <StudyLauncher />
          {upcomingExams.length > 0 && (
            <section className="stack">
              <h2 className="h3">Próximos exámenes</h2>
              {upcomingExams.map((s) => (
                <ExamCountdown key={s.id} subject={s} cards={cards.filter((c) => c.subjectId === s.id)} now={now} />
              ))}
            </section>
          )}
          <WeeklySummary now={now} />
          {dueCards.length === 0 && (
            <section className="row gap wrap">
              {tomorrow > 0 && (
                <p className="muted grow">
                  Mañana tendrás <strong>{tomorrow}</strong> {tomorrow === 1 ? 'tarjeta' : 'tarjetas'}.
                </p>
              )}
              <Link to="/materias" className="btn ghost">Agregar tarjetas</Link>
              <Link to="/progreso" className="btn ghost">Ver mi progreso</Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
