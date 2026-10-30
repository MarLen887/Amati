import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../core/context/AuthContext.jsx';
import { useData } from '../../../core/context/DataContext.jsx';
import { finishSession, reviewCard, startSession } from '../../../core/data/db.js';
import { isDue } from './srs.js';
import FlashcardView from './FlashcardView.jsx';
import RecallCardView, { CONFIDENCE } from './RecallCardView.jsx';
import LeitnerBoxes from './LeitnerBoxes.jsx';
import TechniqueIcon from '../TechniqueIcon.jsx';
import { Compass, Shuffle } from 'lucide-react';
import Breathing from '../../wellbeing/Breathing.jsx';
import Celebrate from '../../../core/components/Celebrate.jsx';
import { interleave, matchesSelection, SESSION_SIZE, studyUrl } from './studyFilter.js';
import { CARD_TECHNIQUES, saveLastTechnique, TECHNIQUE_MAP } from '../techniques.js';
import Skeleton from '../../../core/components/Skeleton.jsx';
import { useConfirm } from '../../../core/components/ConfirmDialog.jsx';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const changeUrl = (subjectId, topic) => {
  const p = new URLSearchParams();
  if (subjectId) p.set('materia', subjectId);
  if (subjectId && topic) p.set('tema', topic);
  const q = p.toString();
  return q ? `/tecnicas?${q}` : '/tecnicas';
};

// Flujo: respiración (opcional) -> tarjetas -> resumen
export default function Study() {
  const { user, profile } = useAuth();
  const confirm = useConfirm();
  const { cards, dueCards, subjectMap, loading } = useData();
  const [params] = useSearchParams();
  const subjectId = params.get('materia');
  const topic = subjectId ? params.get('tema') : null;
  const practice = params.get('modo') === 'libre'; // práctica libre: estudiar aunque no haya pendientes
  const rawTech = params.get('tecnica');
  const technique = CARD_TECHNIQUES.includes(rawTech) ? rawTech : 'srs';
  const tech = TECHNIQUE_MAP[technique];
  const typed = technique === 'recall' || technique === 'elaborative'; // se escribe antes de ver la respuesta
  const nav = useNavigate();

  const [step, setStep] = useState('breathing');
  const [breathing, setBreathing] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [calib, setCalib] = useState({ 1: { n: 0, ok: 0 }, 2: { n: 0, ok: 0 }, 3: { n: 0, ok: 0 } });
  const [ratings, setRatings] = useState({ hard: 0, good: 0, easy: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closing = useRef(false);

  const available = useMemo(
    () =>
      (practice ? cards : dueCards)
        .filter((c) => matchesSelection(c, subjectId, topic))
        .sort((a, b) => a.dueDate - b.dueDate),
    [practice, cards, dueCards, subjectId, topic],
  );

  // Al terminar las tarjetas se cierra la sesión sola (una vez); si falla, se puede reintentar
  useEffect(() => {
    if (step === 'closing' && !closing.current) {
      closing.current = true;
      finish();
    }
  });

  if (loading || !profile) return <Skeleton variant="detail" />;

  if (step !== 'summary' && step !== 'closing' && queue.length === 0 && available.length === 0) {
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
            <Link to={studyUrl(subjectId, topic, true, technique)} className="btn ghost">
              <Shuffle size={16} /> Estudiar de todos modos
            </Link>
          )}
          <Link to={changeUrl(subjectId, topic)} className="btn ghost">
            <Compass size={16} /> Probar otra técnica
          </Link>
        </div>
      </div>
    );
  }

  async function begin() {
    setBusy(true);
    setError('');
    try {
      const id = await startSession(user.uid, profile.anonId, { breathing, subjectId, topic, practice, technique });
      setSessionId(id);
      saveLastTechnique(technique);
      // copia fija: la sesión no cambia mientras estudias
      let pool = available;
      if (technique === 'interleaved') pool = interleave(available.slice(0, SESSION_SIZE * 3), shuffle);
      else if (practice) pool = shuffle(available);
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
        technique,
        confidence,
      });
      setRatings((r) => ({ ...r, [rating]: r[rating] + 1 }));
      if (confidence) {
        setCalib((c) => ({
          ...c,
          [confidence]: { n: c[confidence].n + 1, ok: c[confidence].ok + (rating === 'hard' ? 0 : 1) },
        }));
      }
      setFlipped(false);
      setConfidence(null);
      if (index + 1 >= queue.length) setStep('closing');
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
      const answered = calib[1].n + calib[2].n + calib[3].n;
      await finishSession(user.uid, sessionId, {
        cardsReviewed: reviewed,
        ratings,
        ...(answered ? { calibration: calib } : {}),
      });
      setStep('summary');
    } catch (e) {
      closing.current = false;
      setError('No se pudo cerrar la sesión. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function endEarly() {
    if (index === 0 && !flipped) {
      nav('/');
      return;
    }
    confirm({ title: '¿Terminar la sesión ahora?', message: 'Tu avance ya está guardado.', confirmLabel: 'Terminar' }).then((ok) => ok && setStep('closing'));
  }

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
          <h1>Todo listo para repasar</h1>
          <p className="muted">Tu sesión está por comenzar.</p>
        </div>
        <div className="technique-banner">
          <span className="technique-icon"><TechniqueIcon name={tech.icon} /></span>
          <div className="grow">
            <strong>Hoy usarás: {tech.name}</strong>
            <p className="small muted">{tech.about}</p>
          </div>
          <Link to={changeUrl(subjectId, topic)} className="btn small ghost">Cambiar</Link>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary lg" disabled={busy} onClick={begin}>
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
          <span className="practice-pill" title={tech.short}>
            <TechniqueIcon name={tech.icon} size={14} /> {tech.name}
          </span>
          <span className="muted small">{index + 1} / {queue.length}</span>
        </div>
        {practice && (
          <p className="small muted center-text" title="Solo «Difícil» adelanta la tarjeta; «Bien» y «Fácil» mantienen su fecha.">
            <Shuffle size={12} aria-hidden="true" /> Práctica libre: solo «{technique === 'leitner' ? 'No la sabía' : 'Difícil'}» cambia la fecha de la tarjeta.
          </p>
        )}
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>

        {technique === 'leitner' && <LeitnerBoxes card={card} cards={cards.filter((c) => matchesSelection(c, subjectId, topic))} />}

        {error && <p className="error">{error}</p>}
        {typed ? (
          <RecallCardView
            card={card}
            subject={subject}
            mode={technique}
            technique={technique}
            revealed={flipped}
            onReveal={(c) => { setConfidence(c); setFlipped(true); }}
            onRate={rate}
            busy={busy}
            practiceCard={cardIsPractice}
          />
        ) : (
          <FlashcardView
            card={card}
            subject={subject}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            onRate={rate}
            busy={busy}
            practiceCard={cardIsPractice}
            technique={technique}
          />
        )}
      </div>
    );
  }

  if (step === 'closing') {
    return (
      <div className="narrow stack-lg">
        <h1>Guardando tu sesión…</h1>
        {error && (
          <>
            <p className="error">{error}</p>
            <button className="btn primary lg" disabled={busy} onClick={() => { closing.current = true; finish(); }}>
              Reintentar
            </button>
          </>
        )}
      </div>
    );
  }

  // Resumen
  const reviewed = ratings.hard + ratings.good + ratings.easy;
  const remaining = available.length;
  const answered = calib[1].n + calib[2].n + calib[3].n;
  const pct = (c) => (c.n ? Math.round((c.ok / c.n) * 100) : null);
  return (
    <div className="narrow stack-lg">
      <Celebrate />
      <div className="panel calm pop-in">
        <h1>Sesión completada</h1>
        <p>
          Repasaste <strong>{reviewed}</strong> {reviewed === 1 ? 'tarjeta' : 'tarjetas'} con <strong>{tech.name}</strong>.
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

      {answered > 0 && (
        <div className="panel calibration">
          <h2 className="h3">¿Qué tan bien te conoces?</h2>
          <p className="small muted">Comparamos qué tan seguro estabas con lo que realmente recordaste. Es la base de estudiar con criterio propio.</p>
          <ul className="calib-list">
            {CONFIDENCE.filter((c) => calib[c.id].n > 0).map((c) => (
              <li key={c.id}>
                <span>{c.label}</span>
                <span className="calib-bar"><i className={c.cls} style={{ width: `${pct(calib[c.id])}%` }} /></span>
                <strong>{pct(calib[c.id])}% acertado</strong>
                <span className="small muted">({calib[c.id].n})</span>
              </li>
            ))}
          </ul>
          {pct(calib[3]) !== null && pct(calib[3]) < 70 && (
            <p className="notice small">Cuando dijiste «Estoy seguro» fallaste bastante: cuidado con la ilusión de competencia. Repasa esos temas con más calma.</p>
          )}
          {pct(calib[1]) !== null && pct(calib[1]) >= 60 && (
            <p className="notice small">Recordaste más de lo que creías en las tarjetas que no te sabías. ¡Tienes más confianza por ganar!</p>
          )}
        </div>
      )}

      <div className="row gap wrap">
        <Link to="/" className="btn primary">Volver al inicio</Link>
        {remaining > 0 && (
          <button className="btn ghost" onClick={() => window.location.reload()}>
            {practice ? 'Practicar otra ronda' : `Otra ronda (${remaining} pendientes)`}
          </button>
        )}
        <Link to={changeUrl(subjectId, topic)} className="btn ghost"><Compass size={16} /> Probar otra técnica</Link>
      </div>
    </div>
  );
}
