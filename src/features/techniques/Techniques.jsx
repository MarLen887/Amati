import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { useData } from '../../core/context/DataContext.jsx';
import { GOALS, GROUPS, readLastTechnique, saveLastTechnique, TECHNIQUE_MAP, TECHNIQUES, techniqueUrl } from './techniques.js';
import { matchesSelection, topicsOf } from './cards/studyFilter.js';
import { daysUntil } from './cards/srs.js';
import TechniqueIcon from './TechniqueIcon.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';

// Estudiar: ¿qué quieres lograr? -> hasta 3 técnicas recomendadas -> «Empezar sesión».
export default function Techniques() {
  const { cards, subjects, dueCards, now, loading } = useData();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get('materia') || '';
  const topic = subjectId ? params.get('tema') || '' : '';
  const goalId = params.get('meta') || '';
  const goal = GOALS.find((g) => g.id === goalId) || null;
  const last = readLastTechnique();
  const [pick, setPick] = useState('');

  const dueIds = useMemo(() => new Set(dueCards.map((c) => c.id)), [dueCards]);
  const topics = useMemo(() => (subjectId ? topicsOf(cards, subjectId, dueIds) : []), [cards, subjectId, dueIds]);
  // Para preparar un examen se sugiere la materia con el examen más cercano
  const nearestExam = useMemo(
    () => subjects.filter((s) => s.examDate && daysUntil(s.examDate, now) >= 0).sort((a, b) => a.examDate - b.examDate)[0],
    [subjects, now],
  );

  if (loading) return <Skeleton variant="cards" />;

  function update(next) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k));
    if (!p.get('materia')) p.delete('tema');
    setParams(p, { replace: true });
    setPick('');
  }

  const selTotal = cards.filter((c) => matchesSelection(c, subjectId, topic)).length;
  const selDue = dueCards.filter((c) => matchesSelection(c, subjectId, topic)).length;
  const blocked = (t) => t.needs === 'cards' && selTotal === 0;
  const recs = goal ? goal.picks.map((id) => TECHNIQUE_MAP[id]) : [];
  const chosen = TECHNIQUE_MAP[pick] && recs.includes(TECHNIQUE_MAP[pick]) ? TECHNIQUE_MAP[pick] : recs.find((t) => !blocked(t)) || recs[0];
  const startUrl = chosen
    ? techniqueUrl(chosen.id, { subjectId, topic, practice: chosen.kind === 'cards' && selDue === 0 })
    : '';

  function chooseGoal(g) {
    const patch = { meta: g.id };
    if (g.id === 'exam' && !subjectId && nearestExam) patch.materia = nearestExam.id;
    update(patch);
  }

  return (
    <div className="stack-lg">
      <header className="page-head" data-tour="techniques">
        <h1>Estudiar</h1>
        <p className="muted">Cuéntanos qué quieres lograr y te sugerimos cómo hacerlo.</p>
      </header>

      {/* Paso 1 */}
      {!goal ? (
        <section className="stack">
          <h2 className="h2">¿Qué quieres lograr?</h2>
          <ul className="goal-grid">
            {GOALS.map((g) => (
              <li key={g.id}>
                <button type="button" className="goal-tile" onClick={() => chooseGoal(g)}>
                  <span className="technique-icon"><TechniqueIcon name={g.icon} /></span>
                  <strong>{g.label}</strong>
                </button>
              </li>
            ))}
          </ul>
          {last && TECHNIQUE_MAP[last] && (
            <p className="small muted">
              ¿Prefieres seguir con lo último? <Link to={techniqueUrl(last, { subjectId, topic, practice: selDue === 0 })}>{TECHNIQUE_MAP[last].name}</Link>
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="goal-chosen">
            <span className="technique-icon"><TechniqueIcon name={goal.icon} /></span>
            <div className="grow">
              <span className="small muted">Tu meta</span>
              <strong>{goal.label}</strong>
            </div>
            <button type="button" className="btn small ghost" onClick={() => update({ meta: '' })}>Cambiar</button>
          </div>

          {/* Paso 2 */}
          <section className="stack">
            <h2 className="h2">{recs.length > 1 ? `Te recomendamos${recs.length === 3 ? ' estas 3' : ' estas 2'}` : 'Te recomendamos'}</h2>
            <ul className="rec-list" role="radiogroup" aria-label="Técnica recomendada">
              {recs.map((t, i) => {
                const off = blocked(t);
                const on = chosen?.id === t.id;
                return (
                  <li key={t.id}>
                    <button type="button" role="radio" aria-checked={on} disabled={off}
                      className={`rec-card ${on ? 'selected' : ''}`} onClick={() => setPick(t.id)}>
                      <span className="technique-icon"><TechniqueIcon name={t.icon} /></span>
                      <span className="grow rec-text">
                        <strong>{i + 1}. {t.name} {i === 0 && <span className="tag pick-tag">Recomendada</span>}</strong>
                        <span className="small muted">{off ? 'Necesitas tarjetas para usar esta técnica.' : t.short}</span>
                        <span className="small muted"><Clock size={12} aria-hidden="true" /> {t.minutes}</span>
                      </span>
                      <span className="rec-check" aria-hidden="true">{on && <Check size={16} />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {subjects.length > 0 && (
              <div className="grid-2 scope-row">
                <label>
                  Materia <span className="muted">(opcional)</span>
                  <select value={subjectId} onChange={(e) => update({ materia: e.target.value, tema: '' })}>
                    <option value="">Todas</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                {topics.length > 0 && (
                  <label>
                    Tema
                    <select value={topic} onChange={(e) => update({ tema: e.target.value })}>
                      <option value="">Todos</option>
                      {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}

            {/* Paso 3 */}
            {chosen && (blocked(chosen) ? (
              <button className="btn primary lg block" disabled>Empezar sesión</button>
            ) : (
              <Link to={startUrl} className="btn primary lg block" onClick={() => saveLastTechnique(chosen.id)}>
                Empezar sesión <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
            {chosen && blocked(chosen) && (
              <p className="small muted center-text">
                Primero <Link to={subjectId ? `/materias/${subjectId}?agregar=1` : '/materias'}>crea algunas tarjetas</Link> o elige otra técnica.
              </p>
            )}
          </section>
        </>
      )}

      {/* Todas las técnicas, ordenadas por objetivo (nada se elimina) */}
      <details className="tips all-techniques">
        <summary>Ver las {TECHNIQUES.length} técnicas por objetivo</summary>
        <div className="stack">
          {GROUPS.map((g) => (
            <div key={g.id} className="stack-sm">
              <h3 className="h3">{g.label}</h3>
              <ul className="tech-rows">
                {TECHNIQUES.filter((t) => t.group === g.id).map((t) => {
                  const off = blocked(t);
                  return (
                    <li key={t.id}>
                      <span className="technique-icon sm"><TechniqueIcon name={t.icon} size={18} /></span>
                      <span className="grow rec-text">
                        <strong>{t.name}</strong>
                        <span className="small muted">{t.short}</span>
                      </span>
                      {off ? <span className="small muted">Sin tarjetas</span> : (
                        <Link className="btn small ghost" to={techniqueUrl(t.id, { subjectId, topic, practice: t.kind === 'cards' && selDue === 0 })}
                          onClick={() => saveLastTechnique(t.id)}>Usar</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <details className="tips">
            <summary>¿Y subrayar o releer? Estrategias de baja utilidad</summary>
            <p className="small">
              Releer pasivamente, subrayar, hacer resúmenes sin estructura y las mnemotecnias de palabras clave son cómodas, pero no fortalecen la memoria
              a largo plazo. Por eso Amati no las ofrece como técnica.
            </p>
          </details>
        </div>
      </details>

      {subjects.length > 0 && (
        <p className="small muted center-text">
          ¿Buscas una materia? <Link to="/materias">Ver mis materias</Link>
        </p>
      )}
    </div>
  );
}
