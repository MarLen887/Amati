import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Shuffle } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { fetchLastSubjectSession } from '../../core/data/db.js';
import { fmtShort } from '../../core/lib/dates.js';
import { NOTE_TYPES, TECHNIQUE_MAP, techniqueUrl } from '../techniques/techniques.js';
import TechniqueIcon from '../techniques/TechniqueIcon.jsx';
import Loader from '../../core/components/Loader.jsx';

// Técnica de estudio que el alumno usó más recientemente en ESTA materia: la última sesión de estudio
// (tarjetas, Pomodoro…) o el último apunte con una técnica, lo que haya ocurrido después.
export default function SubjectRecentTechnique({ subjectId, cardCount, cardsOpen, onToggleCards }) {
  const { user } = useAuth();
  const { notes } = useData();
  const [session, setSession] = useState(undefined); // undefined = cargando

  useEffect(() => {
    let alive = true;
    fetchLastSubjectSession(user.uid, subjectId).then((s) => alive && setSession(s)).catch(() => alive && setSession(null));
    return () => { alive = false; };
  }, [user.uid, subjectId]);

  const lastNote = notes
    .filter((n) => n.subjectId === subjectId && NOTE_TYPES[n.type])
    .map((n) => ({ technique: NOTE_TYPES[n.type].technique, at: n.updatedAt || n.createdAt }))
    .filter((n) => n.at)
    .sort((a, b) => b.at - a.at)[0];

  const candidates = [session, lastNote].filter((c) => c?.at && TECHNIQUE_MAP[c.technique]);
  const recent = candidates.sort((a, b) => b.at - a.at)[0];
  const tech = recent ? TECHNIQUE_MAP[recent.technique] : null;

  return (
    <section className="recent-card" aria-label="Técnica usada recientemente en esta materia">
      {session === undefined && !lastNote ? (
        <Loader size="sm" />
      ) : tech ? (
        <div className="rc-main">
          <span className="rc-icon"><TechniqueIcon name={tech.icon} size={26} /></span>
          <div className="rc-body">
            <p className="eyebrow">Retoma donde lo dejaste</p>
            <strong className="rc-name">{tech.name}</strong>
            <p className="small muted">{tech.short} · {fmtShort(recent.at)}</p>
          </div>
          <Link to={techniqueUrl(tech.id, { subjectId })} className="btn primary lg">Continuar <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      ) : (
        <div className="rc-main">
          <span className="rc-icon"><Shuffle size={26} aria-hidden="true" /></span>
          <div className="rc-body">
            <p className="eyebrow">Técnicas de estudio</p>
            <strong className="rc-name">Elige cómo quieres estudiar</strong>
            <p className="small muted">Aún no usas ninguna técnica en esta materia.</p>
          </div>
          <Link to={`/tecnicas?materia=${subjectId}`} className="btn primary lg">Elegir una técnica</Link>
        </div>
      )}
      <div className="rc-links small">
        {tech && <Link to={`/tecnicas?materia=${subjectId}`} className="link-btn"><Shuffle size={12} aria-hidden="true" /> Usar otra técnica</Link>}
        <button type="button" className="link-btn" aria-expanded={cardsOpen} onClick={onToggleCards}>
          <Layers size={12} aria-hidden="true" /> {cardsOpen ? 'Ocultar mis tarjetas' : `Administrar mis tarjetas (${cardCount})`}
        </button>
      </div>
    </section>
  );
}
