import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Coffee, Eye, EyeOff, Shuffle, Timer } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { formatClock, usePomodoro } from './PomodoroContext.jsx';
import { finishSession, reviewCard, startSession } from '../../core/data/db.js';
import { isDue } from '../techniques/cards/srs.js';
import { matchesSelection } from '../techniques/cards/studyFilter.js';
import Breathing from '../wellbeing/Breathing.jsx';
import Celebrate from '../../core/components/Celebrate.jsx';
import FlashcardView from '../techniques/cards/FlashcardView.jsx';
import PomodoroRing from './PomodoroRing.jsx';
import PomodoroBreak from './PomodoroBreak.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';
import { useConfirm } from '../../core/components/ConfirmDialog.jsx';

const HIDE_KEY = 'amati-pomo-hide-time';

function readHide() {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}

// Pomodoro suave: respiración -> [bloque de estudio -> descanso]* -> resumen
export default function PomodoroStudy() {
  const { user, profile } = useAuth();
  const confirm = useConfirm();
  const { cards, dueCards, subjectMap, loading } = useData();
  const pomo = usePomodoro();
  const { state, config, remainingMs, timeUp } = pomo;
  const [params] = useSearchParams();
  const location = useLocation();
  const subjectId = params.get('materia');
  const topic = subjectId ? params.get('tema') : null;

  // Si ya hay un Pomodoro en curso, se retoma donde iba
  const resuming = state?.active;
  const [step, setStep] = useState(() =>
    resuming ? (state.phase === 'ended' ? 'closing' : 'blocks') : 'breathing',
  );
  const [breathing, setBreathing] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hideTime, setHideTime] = useState(readHide);
  const [summary, setSummary] = useState(null);
  const seen = useRef(new Set());
  const closing = useRef(false);

  const selection = useMemo(
    () => cards.filter((c) => matchesSelection(c, subjectId, topic)),
    [cards, subjectId, topic],
  );

  // Siguiente tarjeta: primero las pendientes; si no hay, práctica libre sin repetir hasta agotar
  const pickNext = useCallback(
    (excludeId) => {
      const due = dueCards
        .filter((c) => matchesSelection(c, subjectId, topic) && c.id !== excludeId)
        .sort((a, b) => a.dueDate - b.dueDate);
      if (due.length) return due[0].id;
      let pool = selection.filter((c) => !seen.current.has(c.id) && c.id !== excludeId);
      if (!pool.length) {
        seen.current = new Set(excludeId ? [excludeId] : []);
        pool = selection.filter((c) => c.id !== excludeId);
      }
      if (!pool.length) return selection[0]?.id ?? null;
      return pool[Math.floor(Math.random() * pool.length)].id;
    },
    [dueCards, selection, subjectId, topic],
  );

  // Al entrar a un bloque de estudio, elegir la primera tarjeta
  useEffect(() => {
    if (step === 'blocks' && state?.phase === 'focus' && !currentId && selection.length) {
      setCurrentId(pickNext(null));
    }
  }, [step, state?.phase, currentId, selection.length, pickNext]);

  // Si el Pomodoro se terminó desde otra pantalla, pasar al cierre
  useEffect(() => {
    if (step === 'blocks' && state?.phase === 'ended') setStep('closing');
  }, [step, state?.phase]);

  // Al terminar el Pomodoro se cierra la sesión sola (una vez); si falla, se puede reintentar
  useEffect(() => {
    if (step === 'closing' && state && !closing.current) {
      closing.current = true;
      finish();
    }
  });

  if (loading || !profile) return <Skeleton variant="detail" />;

  if (!resuming && selection.length === 0 && step !== 'summary') {
    return (
      <div className="panel calm narrow">
        <h1>Sin tarjetas</h1>
        <p>Esta selección todavía no tiene tarjetas para estudiar.</p>
        <Link to="/" className="btn primary">Volver al inicio</Link>
      </div>
    );
  }

  async function begin() {
    setBusy(true);
    setError('');
    try {
      const id = await startSession(user.uid, profile.anonId, {
        breathing,
        subjectId,
        topic,
        pomodoro: { focusMin: config.focus, breakMin: config.break },
      });
      pomo.start({ sessionId: id, url: location.pathname + location.search });
      setStep('blocks');
    } catch (e) {
      setError('No se pudo iniciar el Pomodoro. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const card = cards.find((c) => c.id === currentId);

  async function rate(rating) {
    if (busy || !card) return;
    setBusy(true);
    setError('');
    try {
      const practiceCard = !isDue(card);
      const subj = subjectMap[card.subjectId];
      await reviewCard(user.uid, profile.anonId, state.sessionId, card, rating, {
        practice: practiceCard,
        examDate: subj?.examDate,
        sample: !!subj?.sample,
      });
      pomo.addRating(rating);
      seen.current.add(card.id);
      setFlipped(false);
      if (timeUp) {
        // Se acabó el tiempo: termina con esta tarjeta y pasa al descanso
        setCurrentId(null);
        pomo.startBreak();
      } else {
        setCurrentId(pickNext(card.id));
      }
    } catch {
      setError('No se pudo guardar tu respuesta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function goToBreak() {
    setFlipped(false);
    setCurrentId(null);
    pomo.startBreak();
  }

  async function endNow() {
    if (!(await confirm({ title: '¿Terminar el Pomodoro ahora?', message: 'Tu avance ya está guardado.', confirmLabel: 'Terminar' }))) return;
    setCurrentId(null);
    pomo.end();
    setStep('closing');
  }

  async function finish() {
    setBusy(true);
    try {
      const s = state;
      const reviewed = s.ratings.hard + s.ratings.good + s.ratings.easy;
      const stats = {
        focusMin: s.config.focus,
        breakMin: s.config.break,
        blocks: s.blocks,
        focusMinutes: Math.round(s.focusMs / 60_000),
        breaksTaken: s.breaksTaken,
        breaksSkipped: s.breaksSkipped,
      };
      await finishSession(user.uid, s.sessionId, { cardsReviewed: reviewed, ratings: s.ratings, pomodoro: stats });
      setSummary({ ...stats, reviewed, ratings: s.ratings });
      pomo.clear();
      setStep('summary');
    } catch (e) {
      closing.current = false;
      setError('No se pudo cerrar el Pomodoro. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleHide() {
    setHideTime((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1');
      } catch {
        /* sin almacenamiento */
      }
      return !h;
    });
  }

  // ---------- Pasos ----------
  if (step === 'breathing') {
    return (
      <div className="narrow">
        <Breathing
          onDone={() => { setBreathing('completed'); setStep('ready'); }}
          onSkip={() => { setBreathing('skipped'); setStep('ready'); }}
        />
      </div>
    );
  }

  if (step === 'ready') {
    return (
      <div className="narrow stack-lg">
        <div>
          <p className="eyebrow row gap"><Timer size={14} aria-hidden="true" /> Pomodoro suave</p>
          <h1>Todo listo para empezar</h1>
          <p className="muted">
            Bloques de {config.focus} min de estudio y {config.break} min de descanso. Puedes parar cuando quieras.
          </p>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary lg" disabled={busy} onClick={begin}>
          Comenzar bloque de {config.focus} min
        </button>
      </div>
    );
  }

  if (step === 'blocks' && state) {
    if (state.phase === 'break') {
      return (
        <PomodoroBreak
          onContinue={(skipped) => pomo.nextFocus(skipped)}
          onFinish={() => { pomo.end(); setStep('closing'); }}
        />
      );
    }

    const total = state.config.focus * 60_000;
    const progress = 1 - remainingMs / total;
    const practiceCard = card && !isDue(card);

    return (
      <div className="study narrow">
        <div className="study-top">
          <button className="btn link" onClick={endNow}>Terminar</button>
          <div className="pomo-status">
            <PomodoroRing progress={progress} size={34} stroke={3.5} />
            <span className="small">
              <strong>Bloque {state.blocks + 1}</strong>
              {!hideTime && <span className="muted"> · {formatClock(remainingMs)}</span>}
            </span>
            <button className="icon-btn" onClick={toggleHide} aria-label={hideTime ? 'Mostrar tiempo' : 'Ocultar tiempo'}
              title={hideTime ? 'Mostrar tiempo' : 'Ocultar tiempo'}>
              {hideTime ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {timeUp && (
          <div className="pomo-timeup" role="status">
            <Coffee size={18} aria-hidden="true" />
            <span className="grow">Tiempo cumplido. Termina esta tarjeta y descansa.</span>
            <button className="btn small primary" onClick={goToBreak}>Ir al descanso</button>
          </div>
        )}

        {practiceCard && (
          <span className="practice-pill align-start" title="Ya no hay pendientes: solo «Difícil» adelanta la tarjeta.">
            <Shuffle size={14} aria-hidden="true" /> Práctica libre
          </span>
        )}

        {error && <p className="error">{error}</p>}
        {card ? (
          <FlashcardView
            card={card}
            subject={subjectMap[card.subjectId]}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            onRate={rate}
            busy={busy}
            practiceCard={practiceCard}
          />
        ) : (
          <p className="muted center-text">Preparando tarjeta…</p>
        )}
      </div>
    );
  }

  if (step === 'closing') {
    return (
      <div className="narrow stack-lg">
        <h1>Guardando tu Pomodoro…</h1>
        {error && (
          <>
            <p className="error">{error}</p>
            <button className="btn primary lg" disabled={busy || !state} onClick={() => { closing.current = true; finish(); }}>
              Reintentar
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === 'summary' && summary) {
    return (
      <div className="narrow stack-lg">
        <Celebrate />
        <div className="panel calm pop-in">
          <h1>Pomodoro completado</h1>
          <div className="summary-grid">
            <div><span className="summary-num">{summary.blocks}</span><span className="muted small">Bloques</span></div>
            <div><span className="summary-num">{summary.focusMinutes}</span><span className="muted small">Min de estudio</span></div>
            <div><span className="summary-num">{summary.reviewed}</span><span className="muted small">Tarjetas</span></div>
          </div>
          <p className="small muted">
            Descansos tomados: {summary.breaksTaken} · omitidos: {summary.breaksSkipped}
          </p>
        </div>
        <Link to="/" className="btn primary">Volver al inicio</Link>
      </div>
    );
  }

  return <p className="muted">Cargando…</p>;
}
