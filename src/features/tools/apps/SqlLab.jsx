import { useEffect, useRef, useState } from 'react';
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { CircleCheck, CircleX, Database, Play, RotateCcw } from 'lucide-react';

// Laboratorio SQL: una base de datos SQLite real que corre en tu navegador (sql.js). Nada sale de tu equipo.
const SEED = `
CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre TEXT, carrera TEXT, semestre INTEGER, promedio REAL);
CREATE TABLE materias (id INTEGER PRIMARY KEY, nombre TEXT, creditos INTEGER);
CREATE TABLE inscripciones (estudiante_id INTEGER, materia_id INTEGER, calificacion REAL,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id), FOREIGN KEY (materia_id) REFERENCES materias(id));
INSERT INTO estudiantes VALUES
 (1,'Ana Torres','Sistemas',3,9.4),(2,'Luis Pérez','Sistemas',5,8.1),(3,'María Gómez','Industrial',3,9.7),
 (4,'Carlos Ruiz','Civil',7,7.6),(5,'Sofía Díaz','Sistemas',1,9.0),(6,'Diego Vega','Industrial',5,8.8),
 (7,'Valeria Cruz','Civil',3,9.2),(8,'Jorge Salas','Sistemas',7,6.9),(9,'Paula Mora','Industrial',1,9.9),
 (10,'Andrés León','Civil',5,8.4);
INSERT INTO materias VALUES (1,'Bases de datos',8),(2,'Cálculo',10),(3,'Programación',8),(4,'Física',8),(5,'Estadística',6);
INSERT INTO inscripciones VALUES
 (1,1,9.5),(1,3,9.8),(1,2,8.9),(2,1,7.9),(2,3,8.5),(3,2,9.9),(3,5,9.6),(3,4,9.5),(4,2,7.0),(4,4,8.2),
 (5,3,9.1),(5,2,8.8),(6,5,8.7),(6,4,9.0),(7,2,9.3),(7,4,9.1),(8,1,6.5),(8,3,7.4),(9,3,10),(9,2,9.8),
 (10,5,8.1),(10,1,8.6),(2,5,8.0),(4,5,7.5);
`;

const EXERCISES = [
  { title: 'Todos los estudiantes', q: 'Muestra todas las columnas de todos los estudiantes.', hint: 'SELECT * FROM …', sol: 'SELECT * FROM estudiantes' },
  { title: 'Promedio mayor a 9', q: 'Muestra el nombre y el promedio de los estudiantes con promedio mayor a 9.', hint: 'Usa WHERE promedio > 9', sol: 'SELECT nombre, promedio FROM estudiantes WHERE promedio > 9' },
  { title: 'Mejores primero', q: 'Lista nombre y promedio de los estudiantes de Sistemas, del promedio más alto al más bajo.', hint: 'WHERE carrera = \'Sistemas\' y ORDER BY promedio DESC', sol: "SELECT nombre, promedio FROM estudiantes WHERE carrera = 'Sistemas' ORDER BY promedio DESC" },
  { title: 'Contar por carrera', q: 'Cuenta cuántos estudiantes hay en cada carrera (columnas: carrera, total).', hint: 'GROUP BY carrera y COUNT(*)', sol: 'SELECT carrera, COUNT(*) AS total FROM estudiantes GROUP BY carrera' },
  { title: 'Promedio por carrera', q: 'Calcula el promedio de los promedios por carrera, redondeado a 2 decimales (columnas: carrera, prom).', hint: 'AVG(promedio) y ROUND(…, 2)', sol: 'SELECT carrera, ROUND(AVG(promedio), 2) AS prom FROM estudiantes GROUP BY carrera' },
  { title: 'Unir tablas', q: 'Muestra el nombre del estudiante y el nombre de la materia de cada inscripción de la materia «Bases de datos».', hint: 'Une inscripciones con estudiantes y con materias usando JOIN … ON', sol: "SELECT e.nombre, m.nombre FROM inscripciones i JOIN estudiantes e ON e.id = i.estudiante_id JOIN materias m ON m.id = i.materia_id WHERE m.nombre = 'Bases de datos'" },
  { title: 'Quiénes reprueban algo', q: 'Muestra los nombres (sin repetir) de estudiantes con alguna calificación menor a 7.5.', hint: 'DISTINCT y un JOIN con inscripciones', sol: 'SELECT DISTINCT e.nombre FROM estudiantes e JOIN inscripciones i ON i.estudiante_id = e.id WHERE i.calificacion < 7.5' },
];

const START = 'SELECT * FROM estudiantes\nWHERE promedio > 9;';
let sqlPromise;
const loadSql = () => (sqlPromise ??= initSqlJs({ locateFile: () => wasmUrl }));

function exec(db, sql) {
  const out = db.exec(sql);
  return out.length ? out[out.length - 1] : { columns: [], values: [] };
}

// ¿Dan el mismo resultado? Sin importar los nombres de columna; el orden solo cuenta si la solución ordena
function same(a, b, ordered) {
  if (a.columns.length !== b.columns.length || a.values.length !== b.values.length) return false;
  const key = (r) => JSON.stringify(r.map((v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));
  const A = a.values.map(key), B = b.values.map(key);
  return ordered ? A.every((x, i) => x === B[i]) : [...A].sort().join('|') === [...B].sort().join('|');
}

function Table({ res }) {
  if (!res.columns.length) return <p className="muted small">La consulta no devolvió columnas.</p>;
  return (
    <div className="sql-table-wrap">
      <table className="sql-table">
        <thead><tr>{res.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{res.values.slice(0, 200).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={v === null ? 'null' : ''}>{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody>
      </table>
      {res.values.length > 200 && <p className="small muted">Se muestran las primeras 200 filas.</p>}
    </div>
  );
}

export default function SqlLab() {
  const db = useRef(null);
  const [ready, setReady] = useState(false);
  const [sql, setSql] = useState(START);
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [ex, setEx] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [schema, setSchema] = useState([]);
  const [ms, setMs] = useState(null);

  function build(SQL) {
    db.current?.close();
    const d = new SQL.Database();
    d.run(SEED);
    db.current = d;
    const t = exec(d, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").values.map((r) => r[0]);
    setSchema(t.map((n) => ({ name: n, cols: exec(d, `PRAGMA table_info(${n})`).values.map((c) => ({ name: c[1], type: c[2] })), rows: exec(d, `SELECT COUNT(*) FROM ${n}`).values[0][0] })));
  }

  useEffect(() => {
    let alive = true;
    loadSql().then((SQL) => { if (alive) { build(SQL); setReady(true); } }).catch(() => setError('No se pudo iniciar el motor SQL en tu navegador.'));
    return () => { alive = false; db.current?.close(); db.current = null; };
  }, []);

  const resetDb = async () => { build(await loadSql()); setRes(null); setError(''); setVerdict(null); };

  function run() {
    setError(''); setVerdict(null); setRes(null);
    const t0 = performance.now();
    try {
      const r = exec(db.current, sql);
      setMs(Math.round(performance.now() - t0));
      setRes(r);
      if (ex !== null) {
        const sol = exec(db.current, EXERCISES[ex].sol);
        const ordered = /order by/i.test(EXERCISES[ex].sol);
        const ok = same(r, sol, ordered);
        setVerdict({ ok, msg: ok ? '¡Correcto! Tu consulta devuelve lo que se pedía.' : r.columns.length !== sol.columns.length ? `Se esperaban ${sol.columns.length} columnas y tu consulta devuelve ${r.columns.length}.` : r.values.length !== sol.values.length ? `Se esperaban ${sol.values.length} filas y tu consulta devuelve ${r.values.length}.` : 'Las filas no coinciden con lo esperado. Revisa las condiciones y el orden.' });
      }
      // por si la consulta cambió datos (INSERT/UPDATE/DELETE), se actualiza el conteo de filas
      setSchema((s) => s.map((t) => ({ ...t, rows: exec(db.current, `SELECT COUNT(*) FROM ${t.name}`).values[0][0] })));
    } catch (e) {
      setError(e.message.replace(/^Error: /, ''));
    }
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <strong>Ejercicios</strong>
          <div className="chips">
            {EXERCISES.map((e, i) => <button key={e.title} type="button" className={`chip ${ex === i ? 'active' : ''}`} onClick={() => { setEx(i); setVerdict(null); setSql(''); setRes(null); }}>{i + 1}. {e.title}</button>)}
            {ex !== null && <button type="button" className="chip ghost" onClick={() => { setEx(null); setVerdict(null); setSql(START); }}>Practicar libre</button>}
          </div>
        </div>
        {ex !== null && (
          <div className="stack-sm tool-challenge">
            <p><strong>{EXERCISES[ex].title}.</strong> {EXERCISES[ex].q}</p>
            <details><summary className="small">Pista</summary><p className="small muted">{EXERCISES[ex].hint}</p></details>
          </div>
        )}
      </section>

      <div className="sql-layout">
        <aside className="panel stack sql-schema" aria-label="Tablas de la base de datos">
          <h2 className="h3 row gap"><Database size={16} aria-hidden="true" /> Tablas</h2>
          {schema.map((t) => (
            <details key={t.name} open>
              <summary><strong>{t.name}</strong> <span className="small muted">({t.rows} filas)</span></summary>
              <ul className="sql-cols">{t.cols.map((c) => <li key={c.name}><code>{c.name}</code> <span className="small muted">{c.type}</span></li>)}</ul>
            </details>
          ))}
          <button type="button" className="btn small ghost" disabled={!ready} onClick={resetDb}><RotateCcw size={13} aria-hidden="true" /> Restablecer datos</button>
        </aside>

        <div className="stack">
          <section className="panel stack">
            <textarea className="code-editor mono-ish" rows={7} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck="false" aria-label="Consulta SQL"
              placeholder="Escribe tu consulta, por ejemplo: SELECT * FROM estudiantes;"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } }} />
            <div className="row gap wrap">
              <button type="button" className="btn primary" disabled={!ready || !sql.trim()} onClick={run}><Play size={15} aria-hidden="true" /> {ex !== null ? 'Ejecutar y revisar' : 'Ejecutar'}</button>
              <span className="small muted">Ctrl + Enter también ejecuta</span>
              {!ready && !error && <span className="small muted">Preparando el motor SQL…</span>}
            </div>
            {error && <p className="error mono-ish" role="alert">{error}</p>}
          </section>

          {verdict && (
            <p className={`notice ${verdict.ok ? 'saved-toast' : 'warn'} row gap`} role="status">
              {verdict.ok ? <CircleCheck size={16} aria-hidden="true" /> : <CircleX size={16} aria-hidden="true" />} {verdict.msg}
            </p>
          )}

          {res && (
            <section className="panel stack" aria-live="polite">
              <div className="row gap wrap"><h2 className="h3">Resultado</h2><span className="tag">{res.values.length} {res.values.length === 1 ? 'fila' : 'filas'}</span>{ms !== null && <span className="small muted">{ms} ms</span>}</div>
              <Table res={res} />
            </section>
          )}
        </div>
      </div>
      <p className="small muted">SQLite ejecutándose en tu navegador con sql.js. Puedes usar INSERT, UPDATE o DELETE: «Restablecer datos» vuelve al inicio.</p>
    </div>
  );
}
