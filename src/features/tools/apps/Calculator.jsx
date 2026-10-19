import { useMemo, useRef, useState } from 'react';
import { create, all } from 'mathjs';
import { Eraser, Trash2 } from 'lucide-react';

// Calculadora científica con MathJS: expresiones, variables, trigonometría, matrices y unidades.
const math = create(all);
const evaluate = math.evaluate; // se guarda antes de bloquear las funciones peligrosas
// Seguridad: se bloquean las funciones que permiten ejecutar o redefinir cosas
const blocked = () => { throw new Error('Función no disponible en la calculadora'); };
math.import({ import: blocked, createUnit: blocked, reviver: blocked, evaluate: blocked, parse: blocked, simplify: blocked, derivative: blocked, resolve: blocked }, { override: true });

const FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'sqrt', 'abs', 'det', 'inv', 'transpose'];
const CONSTS = [['π', 'pi'], ['e', 'e'], ['ans', 'ans']];
const EXAMPLES = ['2^10 + sqrt(144)', 'sin(30 deg)', 'a = 5; b = a^2 + 1', 'det([[1,2],[3,4]])', 'inv([[2,0],[0,4]])', '[[1,2],[3,4]] * [[0,1],[1,0]]', '5 cm to inch', 'log(1000, 10)'];

const R2D = 180 / Math.PI;
// En modo grados las funciones trigonométricas trabajan con grados
function trigScope(deg) {
  if (!deg) return {};
  const wrap = (f) => (x) => (typeof x === 'number' ? f(x * Math.PI / 180) : f(x));
  const inv = (f) => (x) => (typeof x === 'number' ? f(x) * R2D : f(x));
  return { sin: wrap(math.sin), cos: wrap(math.cos), tan: wrap(math.tan), asin: inv(math.asin), acos: inv(math.acos), atan: inv(math.atan) };
}

const fmt = (v) => math.format(v, { precision: 12, lowerExp: -9, upperExp: 12 });
const isMatrix = (v) => Array.isArray(v?._data) && v._data.every(Array.isArray);

function Result({ value }) {
  if (isMatrix(value)) {
    return (
      <table className="calc-matrix"><tbody>
        {value._data.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{fmt(c)}</td>)}</tr>)}
      </tbody></table>
    );
  }
  return <strong className="calc-value">{fmt(value)}</strong>;
}

export default function Calculator() {
  const [expr, setExpr] = useState('');
  const [deg, setDeg] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const scope = useRef({});
  const input = useRef(null);

  const vars = useMemo(() => Object.keys(scope.current).filter((k) => typeof scope.current[k] !== 'function' && k !== 'ans'), [history]);

  function run(text = expr) {
    const src = text.trim();
    if (!src) return;
    setError('');
    try {
      const s = scope.current;
      Object.assign(s, trigScope(deg));
      let result = evaluate(src, s);
      if (result?.entries) result = result.entries[result.entries.length - 1]; // «a = 1; b = 2» devuelve el último
      if (typeof result === 'function' || result === undefined) throw new Error('Escribe una expresión que dé un valor.');
      s.ans = result;
      setHistory((h) => [{ id: Date.now() + Math.random(), src, result }, ...h].slice(0, 50));
      setExpr('');
    } catch (e) {
      setError(e.message.replace(/\(char \d+\)/, '').trim() || 'Expresión no válida');
    }
  }

  function insert(t, back = 0) {
    const el = input.current;
    const a = el?.selectionStart ?? expr.length;
    const b = el?.selectionEnd ?? expr.length;
    const next = expr.slice(0, a) + t + expr.slice(b);
    setExpr(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + t.length - back, a + t.length - back); });
  }

  return (
    <div className="stack-lg calc">
      <section className="panel stack">
        <div className="row gap wrap between">
          <div className="view-switch" role="group" aria-label="Modo de ángulos">
            <button type="button" className={deg ? 'active' : ''} aria-pressed={deg} onClick={() => setDeg(true)}>Grados</button>
            <button type="button" className={!deg ? 'active' : ''} aria-pressed={!deg} onClick={() => setDeg(false)}>Radianes</button>
          </div>
          {vars.length > 0 && <span className="small muted">Variables: {vars.map((v) => `${v} = ${fmt(scope.current[v])}`).join(' · ')}</span>}
        </div>
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); run(); }}>
          <input ref={input} className="grow calc-input mono-ish" value={expr} onChange={(e) => setExpr(e.target.value)} autoFocus spellCheck="false" autoComplete="off"
            placeholder="Ej. sqrt(2)*sin(45) + 3^2" aria-label="Expresión" />
          <button className="btn primary" type="submit">Calcular</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="chips" aria-label="Funciones">
          {FUNCS.map((f) => <button key={f} type="button" className="chip" onClick={() => insert(`${f}()`, 1)}>{f}</button>)}
          {CONSTS.map(([l, v]) => <button key={v} type="button" className="chip" onClick={() => insert(v)}>{l}</button>)}
          {['^', '(', ')', '[[1,2],[3,4]]'].map((t) => <button key={t} type="button" className="chip" onClick={() => insert(t)}>{t.length > 3 ? 'matriz' : t}</button>)}
        </div>
      </section>

      <section className="panel stack" aria-label="Historial">
        <div className="row between">
          <h2 className="h3">Resultados</h2>
          {history.length > 0 && <button type="button" className="btn small ghost" onClick={() => { setHistory([]); scope.current = {}; }}><Trash2 size={14} aria-hidden="true" /> Limpiar</button>}
        </div>
        {history.length === 0 ? (
          <div className="stack-sm">
            <p className="muted small">Prueba con un ejemplo:</p>
            <div className="chips">{EXAMPLES.map((e) => <button key={e} type="button" className="chip" onClick={() => run(e)}>{e}</button>)}</div>
          </div>
        ) : (
          <ul className="calc-history">
            {history.map((h) => (
              <li key={h.id}>
                <button type="button" className="calc-src mono-ish" onClick={() => setExpr(h.src)} title="Volver a usar">{h.src}</button>
                <span className="calc-eq">=</span>
                <Result value={h.result} />
              </li>
            ))}
          </ul>
        )}
        <p className="small muted"><Eraser size={12} aria-hidden="true" /> Usa <code>ans</code> para el último resultado, <code>a = 5</code> para guardar variables y unidades como <code>5 cm to inch</code>.</p>
      </section>
    </div>
  );
}
