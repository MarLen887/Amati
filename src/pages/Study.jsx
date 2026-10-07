import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { finishSession, reviewCard, startSession } from '../lib/db.js';
import { isDue } from '../lib/srs.js';
import FlashcardView from '../components/FlashcardView.jsx';
import { Shuffle } from 'lucide-react';
import Breathing from '../components/Breathing.jsx';
import MoodPicker from '../components/MoodPicker.jsx';
import Celebrate from '../components/Celebrate.jsx';
import { matchesSelection, SESSION_SIZE, studyUrl } from '../lib/studyFilter.js';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Flujo: respiración (opcional) -> ánimo antes -> tarjetas -> ánimo después -> resumen
export default function Study() {
  const { user, profile } = useAuth();
  const { cards, dueCards, subjectMap, loading } = useData();
  const [params] = useSearchParams();
  const subjectId = params.get('materia');
  const topic = subjectId ? params.get('tema') : null;
  const practice = params.get('modo') === 'libre'; // práctica libre: estudiar aunque no haya pendientes
  const nav = useNavigate();

  const [step, setStep] = useState('breathing');
  const [breathing, setBreathing] = useState(null);
  const [moodBefore, setMoodBefore] = useState(null);
  const [moodAfter, setMoodAfter] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState({ hard: 0, good: 0, easy: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const available = useMemo(
    () =>
      (practice ? cards : dueCards)
        .filter((c) => matchesSelection(c, subjectId, topic))
        .sort((a, b) => a.dueDate - b.dueDate),
    [practice, cards, dueCards, subjectId, topic],
  );

  if (loading || !profile) return <p className="muted">Cargando…</p>;

  if (step !== 'summary' && step !== 'moodAfter' && queue.length === 0 && available.length === 0) {
    return (
      <div className="panel calm narrow">
        <h1>{practice ? 'Sin tarjetas' : 'Nada pendiente'}</h1>
        <p>
          {practice
            ? 'Esta selección todavía no tiene tarjetas.'
            : `No tienes tarjetas por repasar ${topic ? 'en este tema ' : subjectId ? 'en esta materia ' : ''}hoy.`}
        </p>
        <div className="row gap wrap">
          <Link to="/" className="btn primary">Volver al inicio</Link>
          {!practice && (
            <Link to={studyUrl(subjectId, topic, true)} className="btn ghost">
              <Shuffle size={16} /> Estudiar de todos modos
            </Link>
          )}
        </div>
      </div>
    );
  }

  async function begin() {
    setBusy(true);
    setError('');
    try {
      const id = await startSession(user.uid, profile.anonId, { moodBefore, breathing, subjectId, topic, practice });
      setSessionId(id);
      // copia fija: la sesión no cambia mientras estudias (en práctica libre, en orden aleatorio)
      const pool = practice ? shuffle(available) : available;
      setQueue(pool.slice(0, SESSION_SIZE));
      setStep('cards');
    } catch (e) {
      setError('No se pudo iniciar la sesión. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function rate(rating) {
    if (busy) return;
    const card = queue[index];
    setBusy(true);
    setError('');
    try {
      // Una tarjeta que ya estaba pendiente se programa normal, aunque sea práctica libre
      const subj = subjectMap[card.subjectId];
      await reviewCard(user.uid, profile.anonId, sessionId, card, rating, {
        practice: practice && !isDue(card),
        examDate: subj?.examDate,
        sample: !!subj?.sample,
      });
      setRatings((r) => ({ ...r, [rating]: r[rating] + 1 }));
      setFlipped(false);
      if (index + 1 >= queue.length) setStep('moodAfter');
      else setIndex(index + 1);
    } catch (e) {
      setError('No se pudo guardar tu respuesta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const reviewed = ratings.hard + ratings.good + ratings.easy;
      await finishSession(user.uid, sessionId, { moodAfter, cardsReviewed: reviewed, ratings });
      setStep('summary');
    } catch (e) {
      setError('No se pudo guardar tu estado de ánimo. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function endEarly() {
    if (index === 0 && !flipped) {
      nav('/');
      return;
    }
    if (confirm('¿Terminar la sesión ahora? Tu avance ya está guardado.')) setStep('moodAfter');
  }

  if (step === 'breathing') {
    return (
      <div className="narrow">
        <Breathing
          onDone={() => { setBreathing('completed'); setStep('moodBefore'); }}
          onSkip={() => { setBreathing('skipped'); setStep('moodBefore'); }}
        />
      </div>
    );
  }

  if (step === 'moodBefore') {
    return (
      <div className="narrow stack-lg">
        <div>
          <h1>¿Cómo te sientes ahora?</h1>
          <p className="muted">Antes de comenzar a repasar.</p>
        </div>
        <MoodPicker value={moodBefore} onChange={setMoodBefore} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary lg" disabled={!moodBefore || busy} onClick={begin}>
          Empezar ({Math.min(available.length, SESSION_SIZE)} tarjetas)
        </button>
      </div>
    );
  }

  if (step === 'cards') {
    const card = queue[index];
    const subject = subjectMap[card.subjectId];
    const cardIsPractice = practice && !isDue(card);
    return (
      <div className="study narrow">
        <div className="study-top">
          <button className="btn link" onClick={endEarly}>Terminar</button>
          {practice && (
            <span className="practice-pill" title="Solo «Difícil» adelanta la tarjeta; «Bien» y «Fácil» mantienen su fecha.">
              <Shuffle size={14} aria-hidden="true" /> Práctica libre
            </span>
          )}
          <span className="muted small">{index + 1} / {queue.length}</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>

        {error && <p className="error">{error}</p>}
        <FlashcardView
          card={card}
          subject={subject}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          onRate={rate}
          busy={busy}
          practiceCard={cardIsPractice}
        />
      </div>
    );
  }

  if (step === 'moodAfter') {
    return (
      <div className="narrow stack-lg">
        <div>
          <h1>¿Y ahora cómo te sientes?</h1>
          <p className="muted">Después de tu repaso.</p>
        </div>
        <MoodPicker value={moodAfter} onChange={setMoodAfter} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary lg" disabled={!moodAfter || busy} onClick={finish}>
          Terminar sesión
        </button>
      </div>
    );
  }

  // Resumen
  const reviewed = ratings.hard + ratings.good + ratings.easy;
  const diff = moodAfter - moodBefore;
  const remaining = available.length;
  return (
    <div className="narrow stack-lg">
      <Celebrate />
      <div className="panel calm pop-in">
        <h1>Sesión completada</h1>
        <p>
          Repasaste <strong>{reviewed}</strong> {reviewed === 1 ? 'tarjeta' : 'tarjetas'}.
          {diff > 0 && ' Terminaste más tranquilo de lo que empezaste.'}
          {diff === 0 && ' Tu estado de ánimo se mantuvo estable.'}
          {diff < 0 && ' Parece que fue una sesión pesada; está bien tomar un descanso.'}
        </p>
        <div className="summary-grid">
          <div><span className="summary-num">{ratings.hard}</span><span className="muted small">Difícil</span></div>
          <div><span className="summary-num">{ratings.good}</span><span className="muted small">Bien</span></div>
          <div><span className="summary-num">{ratings.easy}</span><span className="muted small">Fácil</span></div>
        </div>
        <p className="small muted">
          {practice
            ? 'Práctica registrada. Las tarjetas que marcaste como Difícil volverán antes.'
            : 'Amati ya programó cuándo volverás a ver cada tarjeta.'}
        </p>
      </div>
      <div className="row gap wrap">
        <Link to="/" className="btn primary">Volver al inicio</Link>
        {remaining > 0 && (
          <button className="btn ghost" onClick={() => window.location.reload()}>
            {practice ? 'Practicar otra ronda' : `Otra ronda (${remaining} pendientes)`}
          </button>
        )}
      </div>
    </div>
  );
}
