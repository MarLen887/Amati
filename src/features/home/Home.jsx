import { Link } from 'react-router-dom';
import { ArrowRight, BookPlus, CalendarClock, Flame, Library, Play, Shuffle, Timer, Upload } from 'lucide-react';
import Hummingbird from '../../core/components/Hummingbird.jsx';
import EmptyState from '../../core/components/EmptyState.jsx';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { fmtLong, fmtShort } from '../../core/lib/dates.js';
import { daysUntil } from '../techniques/cards/srs.js';
import { CARD_TECHNIQUES, readLastTechnique, TECHNIQUE_MAP, techniqueUrl } from '../techniques/techniques.js';
import TechniqueIcon from '../techniques/TechniqueIcon.jsx';
import { examLabel } from '../subjects/ExamCountdown.jsx';
import { SampleButton } from '../subjects/Subjects.jsx';
import { usePomodoro } from '../pomodoro/PomodoroContext.jsx';
import { useStudyStats } from '../progress/stats.js';
import { ThemeSwitcher } from '../../core/context/ThemeContext.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';
import DailyGoal from './DailyGoal.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Inicio: responde «¿qué debo hacer hoy?». Una acción dominante y solo lo necesario.
export default function Home() {
  const { profile, user } = useAuth();
  const { subjects, dueCards, loading, now } = useData();
  const { state: pomoState } = usePomodoro();
  const stats = useStudyStats();

  if (loading) return <Skeleton variant="cards" />;

  const name = profile?.displayName || user?.displayName || '';
  const greetingText = `${greeting()}${name ? `, ${name.split(' ')[0]}` : ''}`;
  const cut = greetingText.lastIndexOf(' ') + 1;

  const exams = subjects
    .filter((s) => s.examDate && daysUntil(s.examDate, now) >= 0)
    .sort((a, b) => a.examDate - b.examDate);
  const nextExam = exams[0];
  const examDays = nextExam ? daysUntil(nextExam.examDate, now) : null;
  const last = readLastTechnique();
  const lastTech = last ? TECHNIQUE_MAP[last] : null;
  // Repasar tarjetas pendientes solo si esa fue la última técnica; si no, se elige técnica en Estudiar
  const reviewUrl = CARD_TECHNIQUES.includes(last) ? `/estudiar?tecnica=${last}` : '/tecnicas';
  const due = dueCards.length;

  if (subjects.length === 0) {
    return (
      <div className="stack-lg">
        <header className="page-head">
          <div className="row between home-top">
          <p className="muted capitalize">{fmtLong(now)}</p>
          <div data-tour="theme"><ThemeSwitcher compact /></div>
        </div>
          <h1 className="greeting">
            {greetingText.slice(0, cut)}
            <span className="nowrap">{greetingText.slice(cut)}<Hummingbird size={64} /></span>
          </h1>
        </header>
        <section className="panel" data-tour="home-main">
          <EmptyState
            title="Empecemos"
            actions={
              <>
                <Link to="/materias?nueva=1" className="btn primary lg">Crear mi primera materia</Link>
                <SampleButton />
              </>
            }
          >
            <p>Crea una materia y elige cómo quieres estudiarla.</p>
          </EmptyState>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg stagger">
      <header className="page-head">
        <div className="row between home-top">
          <p className="muted capitalize">{fmtLong(now)}</p>
          <div data-tour="theme"><ThemeSwitcher compact /></div>
        </div>
        {/* El colibrí va unido a la última palabra para que siempre quede junto al saludo */}
        <h1 className="greeting">
          {greetingText.slice(0, cut)}
          <span className="nowrap">
            {greetingText.slice(cut)}
            <Hummingbird size={64} />
          </span>
        </h1>
        <ul className="today-line" aria-label="Hoy tienes">
          <li className={due > 0 ? 'pending' : 'ok'}><strong>{due}</strong> {due === 1 ? 'tarjeta pendiente' : 'tarjetas pendientes'}</li>
          {nextExam && <li className={examDays <= 7 ? 'exam' : ''}><strong>{exams.length}</strong> {exams.length === 1 ? 'examen próximo' : 'exámenes próximos'}</li>}
          <li className="streak"><Flame size={14} aria-hidden="true" /> <strong>{stats.streak}</strong> {stats.streak === 1 ? 'día de racha' : 'días de racha'}</li>
        </ul>
      </header>

      {/* Acción dominante */}
      {pomoState?.active ? (
        <Link to={pomoState.url} className="btn primary xl block"><Timer size={22} aria-hidden="true" /> Volver al Pomodoro en curso</Link>
      ) : (
        <div className="stack-sm" data-tour="home-main">
          {lastTech ? (
            <>
              <Link to={techniqueUrl(last, { practice: due === 0 })} className="btn primary xl block breathe-btn"><Play size={22} fill="currentColor" aria-hidden="true" /> Continuar con {lastTech.name}</Link>
              <Link to="/tecnicas" className="btn ghost lg block other-technique"><Shuffle size={18} aria-hidden="true" /> Elegir otra técnica</Link>
            </>
          ) : (
            <Link to="/tecnicas" className="btn primary xl block breathe-btn"><Play size={22} fill="currentColor" aria-hidden="true" /> Empezar sesión de estudio</Link>
          )}
        </div>
      )}

      <DailyGoal now={now} />

      {nextExam && (
        <section className={`panel next-exam ${examDays <= 7 ? 'soon' : ''}`}>
          <span className="next-exam-icon"><CalendarClock size={22} aria-hidden="true" /></span>
          <div className="grow">
            <p className="eyebrow">Próximo examen</p>
            <Link to={`/materias/${nextExam.id}`} className="next-exam-name">{nextExam.name}</Link>
            <p className="small">{examLabel(examDays)} · {fmtShort(nextExam.examDate)}</p>
          </div>
        </section>
      )}

      <section className="stack-sm">
        <h2 className="h3">Accesos rápidos</h2>
        <ul className="quick-grid">
          <li><Link to="/clases/nueva" className="quick-tile"><Upload size={20} aria-hidden="true" /><span>Subir apuntes</span></Link></li>
          <li><Link to="/materias?nueva=1" className="quick-tile"><BookPlus size={20} aria-hidden="true" /><span>Crear materia</span></Link></li>
          <li><Link to="/biblioteca" className="quick-tile"><Library size={20} aria-hidden="true" /><span>Buscar recursos</span></Link></li>
        </ul>
      </section>

      {due > 0 && (
        <section className="panel pending-panel">
          <div className="grow">
            <p className="eyebrow">Repaso pendiente</p>
            <p><strong>{due}</strong> {due === 1 ? 'tarjeta lista' : 'tarjetas listas'} para repasar</p>
          </div>
          <Link to={reviewUrl} className="btn ghost">Repasar ahora <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  );
}
