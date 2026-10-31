import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, CircleCheck, CircleX, Layers, Play } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { createCardsBulk, saveTriviaGame } from '../../core/data/db.js';
import { fetchQuestions } from './api/openTrivia.js';
import { translateQuestions } from './api/translate.js';

const DIFFICULTY = { '': 'Cualquiera', easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

// Trivia de OpenTDB: obtener preguntas (traducidas al español), jugarlas como mini examen
// o convertirlas en tarjetas. Cada partida terminada cuenta como un día de estudio para tu racha.
export default function TriviaPanel({ categories, matched, subjects, query = '' }) {
  const { user } = useAuth();
  const best = matched[0]?.id ?? '';
  const [category, setCategory] = useState(best);
  const [difficulty, setDifficulty] = useState('');
  const [amount, setAmount] = useState(10);
  const [lang, setLang] = useState('es');
  const [shownLang, setShownLang] = useState('en');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [stage, setStage] = useState('setup'); // setup | list | play | done
  const [questions, setQuestions] = useState([]);
  const [picked, setPicked] = useState({}); // en juego: respuesta elegida por pregunta
  const [selected, setSelected] = useState(new Set());
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const ctrl = useRef(null);
  const recorded = useRef(false);

  const catName = categories.find((c) => c.id === Number(category))?.es || 'Cultura general';

  async function load() {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    const { signal } = ctrl.current;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      let qs = await fetchQuestions({ category, difficulty, amount, signal });
      let shown = 'en';
      if (lang !== 'en') {
        try {
          setProgress('Traduciendo…');
          qs = await translateQuestions(qs, {
            signal,
            target: lang,
            onProgress: (d, t) => setProgress(`Traduciendo… ${d}/${t}`),
          });
          shown = lang;
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          setMsg(`No se pudo traducir (${e.message}). Se muestran en inglés.`);
        }
      }
      setShownLang(shown);
      recorded.current = false;
      setQuestions(qs);
      setSelected(new Set(qs.map((q) => q.id)));
      setPicked({});
      setIndex(0);
      setStage('list');
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  async function saveCards(list) {
    if (!subjectId || list.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const rows = list.map((q) => ({
        front: q.question,
        back: q.translated ? `${q.correct}\n\nOriginal: ${q.orig.question} → ${q.orig.correct}` : q.correct,
        topic: `Trivia · ${catName}`,
      }));
      const n = await createCardsBulk(user.uid, subjectId, rows);
      setMsg(`Se crearon ${n} ${n === 1 ? 'tarjeta' : 'tarjetas'} en tu materia.`);
    } catch (e) {
      setError('No se pudieron crear las tarjetas. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function play() {
    setPicked({});
    setIndex(0);
    recorded.current = false;
    setStage('play');
  }

  // Al terminar la partida se guarda en el historial (cuenta para la racha)
  async function finishGame() {
    setStage('done');
    if (recorded.current) return;
    recorded.current = true;
    try {
      await saveTriviaGame(user.uid, {
        category: catName,
        categoryId: category,
        difficulty,
        lang: shownLang,
        total: questions.length,
        correct: questions.filter((x) => picked[x.id] === x.correct).length,
        query,
      });
    } catch {
      recorded.current = false;
      setError('La partida no se pudo guardar en tu historial.');
    }
  }

  const SubjectPicker = (
    <label>
      Guardar tarjetas en
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        {subjects.length === 0 && <option value="">(crea una materia primero)</option>}
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );

  // ---------- Jugar ----------
  if (stage === 'play') {
    const q = questions[index];
    const answered = picked[q.id] !== undefined;
    return (
      <section className="panel stack trivia">
        <div className="row between">
          <p className="eyebrow">Pregunta {index + 1} de {questions.length}</p>
          <button className="btn link" onClick={() => setStage('list')}>Salir</button>
        </div>
        <h3 className="trivia-q">{q.question}</h3>
        <div className="trivia-options">
          {q.options.map((o, i) => {
            const isRight = o === q.correct;
            const isPicked = picked[q.id] === o;
            return (
              <button key={`${o}-${i}`} type="button" disabled={answered}
                className={`trivia-option ${answered && isRight ? 'right' : ''} ${answered && isPicked && !isRight ? 'wrong' : ''}`}
                onClick={() => setPicked({ ...picked, [q.id]: o })}>
                {o}
                {answered && isRight && <CircleCheck size={16} aria-hidden="true" />}
                {answered && isPicked && !isRight && <CircleX size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {answered && q.translated && picked[q.id] !== q.correct && (
          <p className="small muted">Original: {q.orig.question} → {q.orig.correct}</p>
        )}
        {answered && (
          <button className="btn primary" onClick={() => (index + 1 >= questions.length ? finishGame() : setIndex(index + 1))}>
            {index + 1 >= questions.length ? 'Ver resultado' : 'Siguiente'}
          </button>
        )}
      </section>
    );
  }

  if (stage === 'done') {
    const right = questions.filter((q) => picked[q.id] === q.correct);
    const missed = questions.filter((q) => picked[q.id] !== q.correct);
    return (
      <section className="panel stack trivia">
        <h3>Resultado: {right.length} de {questions.length}</h3>
        <p className="small muted">
          {missed.length === 0 ? '¡Perfecto! Para consolidarlo, vuelve a intentarlo en unos días.' : 'Las que fallaste son tus mejores candidatas para repasar con tarjetas.'}
        </p>
        {!error && <p className="small"><CircleCheck size={14} aria-hidden="true" /> Partida guardada en tu <Link to="/progreso">Progreso</Link>.</p>}
        {SubjectPicker}
        {msg && <p className="notice saved-toast" role="status"><CircleCheck size={16} aria-hidden="true" /> {msg}</p>}
        {error && <p className="error">{error}</p>}
        <div className="row gap wrap">
          {missed.length > 0 && (
            <button className="btn primary" disabled={busy || !subjectId} onClick={() => saveCards(missed)}>
              <Layers size={16} aria-hidden="true" /> Guardar las {missed.length} falladas como tarjetas
            </button>
          )}
          <button className="btn ghost" disabled={busy || !subjectId} onClick={() => saveCards(questions)}>Guardar todas</button>
          <button className="btn ghost" onClick={play}>Jugar otra vez</button>
          <button className="btn ghost" onClick={() => { setMsg(''); setError(''); setStage('setup'); }}>Nuevas preguntas</button>
        </div>
        <p className="small muted">Para estudiarlas, abre <Link to="/tecnicas">Estudiar</Link> y elige la técnica que prefieras.</p>
      </section>
    );
  }

  // ---------- Lista de preguntas obtenidas ----------
  if (stage === 'list') {
    const chosen = questions.filter((q) => selected.has(q.id));
    return (
      <section className="panel stack trivia">
        <div className="row between wrap gap">
          <h3 className="row gap"><Brain size={18} aria-hidden="true" /> {questions.length} preguntas · {catName}</h3>
          <button className="btn link" onClick={() => { setMsg(''); setStage('setup'); }}>← Cambiar</button>
        </div>
        <ul className="trivia-list">
          {questions.map((q) => (
            <li key={q.id}>
              <label className="checkbox">
                <input type="checkbox" checked={selected.has(q.id)}
                  onChange={(e) => {
                    const s = new Set(selected);
                    if (e.target.checked) s.add(q.id); else s.delete(q.id);
                    setSelected(s);
                  }} />
                <span>{q.question} <span className="muted small">→ {q.correct}</span></span>
              </label>
            </li>
          ))}
        </ul>
        {SubjectPicker}
        {msg && <p className="notice saved-toast" role="status"><CircleCheck size={16} aria-hidden="true" /> {msg}</p>}
        {error && <p className="error">{error}</p>}
        <div className="row gap wrap">
          <button className="btn primary" onClick={play}>
            <Play size={16} aria-hidden="true" /> Jugar como mini examen
          </button>
          <button className="btn ghost" disabled={busy || !subjectId || chosen.length === 0} onClick={() => saveCards(chosen)}>
            <Layers size={16} aria-hidden="true" /> Crear {chosen.length} tarjetas
          </button>
        </div>
        <p className="small muted">
          {shownLang !== 'en'
            ? 'Traducción automática (MyMemory) de las preguntas originales en inglés de OpenTDB; puede tener imprecisiones. En las tarjetas se conserva el original.'
            : 'Preguntas originales de OpenTDB, en inglés.'}
        </p>
      </section>
    );
  }

  // ---------- Configuración ----------
  return (
    <section className="panel stack trivia">
      <div>
        <h3 className="row gap"><Brain size={18} aria-hidden="true" /> Trivia de repaso</h3>
        <p className="small muted">
          {matched.length > 0
            ? `Categoría sugerida para tu búsqueda: ${matched.map((m) => m.es).join(', ')}.`
            : 'No encontramos una categoría que coincida con tu tema; elige una.'}
        </p>
      </div>
      <div className="grid-2">
        <label>
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Cualquiera</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.es}</option>)}
          </select>
        </label>
        <div className="grid-2">
          <label>
            Dificultad
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>
            Preguntas
            <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </div>
      <label>
        Idioma de las preguntas
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="es">Español (traducción automática)</option>
          <option value="fr">Français (traduction automatique)</option>
          <option value="de">Deutsch (automatische Übersetzung)</option>
          <option value="en">Inglés (original)</option>
        </select>
      </label>
      {msg && <p className="notice small">{msg}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy} onClick={load}>{busy ? progress || 'Buscando preguntas…' : 'Obtener preguntas'}</button>
    </section>
  );
}
