import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartColumn, Download, FileSpreadsheet, Play, Sparkles, Upload } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
import { colName, evaluate, show } from '../lib/excel.js';
import { ACCEPT, downloadSheet, readWorkbook } from '../lib/sheets.js';

// Excel en Amati: aprende funciones con ejemplos que se calculan en vivo (Formula.js) y trabaja con tus archivos (SheetJS).
const SAMPLE = [
  ['Producto', 'Región', 'Unidades', 'Precio'],
  ['Laptop', 'Norte', 5, 12000],
  ['Mouse', 'Sur', 20, 250],
  ['Teclado', 'Norte', 8, 600],
  ['Laptop', 'Sur', 3, 12000],
  ['Monitor', 'Norte', 6, 3500],
  ['Mouse', 'Norte', 15, 250],
];

const FUNCS = [
  { n: 'SUMA', cat: 'Matemáticas', syn: '=SUMA(rango)', what: 'Suma todos los números de un rango.', ex: '=SUMA(C2:C7)' },
  { n: 'PROMEDIO', cat: 'Estadística', syn: '=PROMEDIO(rango)', what: 'Calcula el promedio (media) de los números del rango.', ex: '=PROMEDIO(D2:D7)' },
  { n: 'MAX / MIN', cat: 'Estadística', syn: '=MAX(rango)  ·  =MIN(rango)', what: 'Devuelve el valor más grande o más pequeño.', ex: '=MAX(D2:D7)-MIN(D2:D7)' },
  { n: 'CONTAR', cat: 'Estadística', syn: '=CONTAR(rango)', what: 'Cuenta cuántas celdas del rango contienen números.', ex: '=CONTAR(C2:C7)' },
  { n: 'SI', cat: 'Lógicas', syn: '=SI(condición; si_verdadero; si_falso)', what: 'Elige un resultado u otro según se cumpla una condición.', ex: '=SI(C2>4,"Stock alto","Stock bajo")' },
  { n: 'Y / O', cat: 'Lógicas', syn: '=Y(cond1; cond2…)  ·  =O(cond1; cond2…)', what: 'Y exige que se cumplan todas las condiciones; O basta con una.', ex: '=SI(Y(C2>4,D2>10000),"Premium","Normal")' },
  { n: 'BUSCARV', cat: 'Búsqueda', syn: '=BUSCARV(valor; tabla; columna; FALSO)', what: 'Busca un valor en la primera columna de una tabla y devuelve el dato de otra columna de esa fila. Usa FALSO para coincidencia exacta.', ex: '=BUSCARV("Teclado",A2:D7,4,FALSO)' },
  { n: 'INDICE + COINCIDIR', cat: 'Búsqueda', syn: '=INDICE(rango; COINCIDIR(valor; columna; 0))', what: 'Alternativa más flexible que BUSCARV: COINCIDIR halla la posición y INDICE entrega el dato.', ex: '=INDICE(D2:D7,COINCIDIR("Monitor",A2:A7,0))' },
  { n: 'SUMAR.SI', cat: 'Matemáticas', syn: '=SUMAR.SI(rango_criterio; criterio; rango_suma)', what: 'Suma solo los valores que cumplen un criterio.', ex: '=SUMAR.SI(B2:B7,"Norte",C2:C7)' },
  { n: 'CONTAR.SI', cat: 'Estadística', syn: '=CONTAR.SI(rango; criterio)', what: 'Cuenta las celdas que cumplen un criterio.', ex: '=CONTAR.SI(A2:A7,"Mouse")' },
  { n: 'PROMEDIO.SI', cat: 'Estadística', syn: '=PROMEDIO.SI(rango_criterio; criterio; rango_promedio)', what: 'Promedia solo los valores que cumplen un criterio.', ex: '=PROMEDIO.SI(B2:B7,"Sur",D2:D7)' },
  { n: 'SUMAPRODUCTO', cat: 'Matemáticas', syn: '=SUMAPRODUCTO(rango1; rango2)', what: 'Multiplica fila por fila dos rangos y suma los resultados (ideal para ventas = unidades × precio).', ex: '=SUMAPRODUCTO(C2:C7,D2:D7)' },
  { n: 'REDONDEAR', cat: 'Matemáticas', syn: '=REDONDEAR(número; decimales)', what: 'Redondea un número a la cantidad de decimales indicada.', ex: '=REDONDEAR(PROMEDIO(D2:D7),1)' },
  { n: 'SI.ERROR', cat: 'Lógicas', syn: '=SI.ERROR(fórmula; valor_si_error)', what: 'Evita que se vea un error: muestra otro valor si la fórmula falla.', ex: '=SI.ERROR(BUSCARV("Tablet",A2:D7,4,FALSO),"No existe")' },
  { n: 'CONCATENAR / &', cat: 'Texto', syn: '=A2&" - "&B2', what: 'Une textos de varias celdas en uno solo.', ex: '=A2&" ("&B2&")"' },
  { n: 'IZQUIERDA / LARGO', cat: 'Texto', syn: '=IZQUIERDA(texto; n)  ·  =LARGO(texto)', what: 'Extrae los primeros n caracteres o cuenta cuántos tiene un texto.', ex: '=MAYUSC(IZQUIERDA(A2,3))' },
  { n: 'PAGO', cat: 'Financieras', syn: '=PAGO(tasa; periodos; valor_actual)', what: 'Calcula el pago periódico de un préstamo con tasa fija (el resultado sale negativo: es dinero que pagas).', ex: '=REDONDEAR(PAGO(0.12/12,24,50000),2)' },
  { n: 'VNA', cat: 'Financieras', syn: '=VNA(tasa; flujo1; flujo2…)', what: 'Valor presente neto: lleva flujos futuros de dinero a su valor de hoy con una tasa de descuento.', ex: '=VNA(0.1,1000,1500,2000)' },
];
const CATS = ['Todas', ...new Set(FUNCS.map((f) => f.cat))];

function Grid({ data, onCell, max = 200 }) {
  const rows = data.slice(0, max);
  const cols = Math.min(Math.max(...rows.map((r) => r.length), 1), 30);
  return (
    <div className="sql-table-wrap xl-grid">
      <table className="sql-table">
        <thead><tr><th className="xl-corner" />{Array.from({ length: cols }, (_, c) => <th key={c} className="xl-colhead">{colName(c)}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><th className="xl-rowhead">{i + 1}</th>
              {Array.from({ length: cols }, (_, c) => <td key={c} className={onCell ? 'xl-click' : ''} onClick={() => onCell?.(`${colName(c)}${i + 1}`)}>{r[c] === undefined || r[c] === '' ? '' : typeof r[c] === 'number' ? r[c].toLocaleString('es-MX', { maximumFractionDigits: 6 }) : String(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {(data.length > max || cols === 30) && <p className="small muted" style={{ padding: '0.4rem 0.7rem' }}>Se muestran las primeras {Math.min(data.length, max)} filas y {cols} columnas.</p>}
    </div>
  );
}

// Inserta texto en la posición del cursor de la barra de fórmulas (como Excel al tocar una celda)
function insertAt(inputRef, formula, setFormula, text) {
  const el = inputRef.current;
  const a = el?.selectionStart ?? formula.length;
  const b = el?.selectionEnd ?? formula.length;
  setFormula(formula.slice(0, a) + text + formula.slice(b));
  requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + text.length, a + text.length); });
}

function Runner({ grid, formula, setFormula, hint, inputRef }) {
  const [res, setRes] = useState(null); // { text, error }
  const [ai, setAi] = useState({ text: '', loading: false });

  function run(f = formula) {
    setAi({ text: '', loading: false });
    try { const v = evaluate(f, grid); setRes({ text: show(v), error: v instanceof Error }); } catch (e) { setRes({ text: show(e), error: true }); }
  }
  async function explain() {
    setAi({ text: '', loading: true });
    try {
      setAi({ loading: false, text: await ask(`Eres un tutor de Excel. Explica en español sencillo, paso a paso, esta fórmula aplicada a una tabla de ejemplo (A1:D7 con Producto, Región, Unidades, Precio) y por qué da ese resultado.
Fórmula: ${formula}
Resultado obtenido: ${res?.text}
Termina con un consejo breve para no equivocarse al usarla.`) });
    } catch (e) { setAi({ loading: false, text: `No pude generar la explicación: ${e.message}` }); }
  }

  return (
    <div className="stack">
      <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input ref={inputRef} className="grow mono-ish calc-input" value={formula} onChange={(e) => setFormula(e.target.value)} placeholder={hint || '=SUMA(C2:C7)'} aria-label="Fórmula" spellCheck="false" autoComplete="off" />
        <button className="btn primary" type="submit"><Play size={15} aria-hidden="true" /> Calcular</button>
      </form>
      {res && (
        <div className={`xl-result ${res.error ? 'bad' : ''}`} aria-live="polite">
          <span className="small muted">Resultado</span>
          <pre>{res.text || '(vacío)'}</pre>
        </div>
      )}
      {res && has.gemini && <button type="button" className="btn small ghost" style={{ alignSelf: 'start' }} disabled={ai.loading} onClick={explain}><Sparkles size={13} aria-hidden="true" /> {ai.loading ? 'Explicando…' : 'Explícame cómo funciona'}</button>}
      {ai.text && <p className="pre repo-ai">{ai.text}</p>}
    </div>
  );
}

function Learn() {
  const [cat, setCat] = useState('Todas');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(FUNCS[0]);
  const [formula, setFormula] = useState(FUNCS[0].ex);
  const inputRef = useRef(null);
  const list = FUNCS.filter((f) => (cat === 'Todas' || f.cat === cat) && (!q || `${f.n} ${f.what}`.toLowerCase().includes(q.toLowerCase())));
  const pick = (f) => { setSel(f); setFormula(f.ex); };

  return (
    <div className="xl-learn">
      <aside className="panel stack">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar función…" aria-label="Buscar función" />
        <div className="chips">{CATS.map((c) => <button key={c} type="button" className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
        <ul className="xl-flist">{list.map((f) => <li key={f.n}><button type="button" className={sel.n === f.n ? 'on' : ''} onClick={() => pick(f)}>{f.n}</button></li>)}</ul>
      </aside>
      <div className="stack">
        <section className="panel stack">
          <div className="row gap wrap"><h2 className="h3">{sel.n}</h2><span className="tag">{sel.cat}</span></div>
          <p>{sel.what}</p>
          <p className="small"><strong>Sintaxis:</strong> <code>{sel.syn}</code></p>
          <Runner grid={SAMPLE} formula={formula} setFormula={setFormula} inputRef={inputRef} />
        </section>
        <section className="panel stack">
          <div className="row between wrap gap"><h2 className="h3">Tabla de ejemplo</h2><button type="button" className="btn small ghost" onClick={() => downloadSheet(SAMPLE, 'Ejemplo-ventas')}><Download size={13} aria-hidden="true" /> Descargar .xlsx</button></div>
          <Grid data={SAMPLE} onCell={(ref) => insertAt(inputRef, formula, setFormula, ref)} />
          <p className="small muted">Toca una celda para añadir su referencia a la fórmula. Puedes escribir las funciones en español o en inglés y separar con coma o punto y coma.</p>
        </section>
      </div>
    </div>
  );
}

function MyFile() {
  const nav = useNavigate();
  const [book, setBook] = useState(null); // { name, names, sheets }
  const [sheet, setSheet] = useState('');
  const [formula, setFormula] = useState('');
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const grid = book ? book.sheets[sheet] : [];

  async function open(file) {
    if (!file) return;
    setBusy(true); setError('');
    try { const b = await readWorkbook(file); setBook({ name: file.name.replace(/\.[^.]+$/, ''), ...b }); setSheet(b.names[0]); setFormula(''); } catch (e) { setError(e.message); setBook(null); } finally { setBusy(false); }
  }
  function toDashboard() {
    try { sessionStorage.setItem('amati-dash-import', JSON.stringify({ name: `${book.name} · ${sheet}`, grid: grid.slice(0, 2000) })); } catch { /* sin almacenamiento */ }
    nav('/herramientas/dashboard');
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <label className="btn ghost file-pick" style={{ alignSelf: 'start' }}>
          <Upload size={16} aria-hidden="true" /> {busy ? 'Leyendo…' : book ? 'Abrir otro archivo' : 'Elegir archivo de Excel o CSV'}
          <input type="file" accept={ACCEPT} hidden disabled={busy} onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <p className="small muted">Formatos: .xlsx, .xls, .ods, .csv, .tsv (máx. 8 MB). El archivo se lee en tu navegador: no se sube a ningún servidor.</p>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {book && (
        <section className="panel stack">
          <div className="row gap wrap between">
            <div className="row gap wrap"><FileSpreadsheet size={18} aria-hidden="true" /><strong>{book.name}</strong>
              {book.names.length > 1 && <div className="chips" role="group" aria-label="Hojas">{book.names.map((n) => <button key={n} type="button" className={`chip ${sheet === n ? 'active' : ''}`} onClick={() => setSheet(n)}>{n}</button>)}</div>}</div>
            <div className="row gap wrap">
              <button type="button" className="btn small ghost" onClick={toDashboard}><ChartColumn size={13} aria-hidden="true" /> Graficar esta hoja</button>
              <button type="button" className="btn small ghost" onClick={() => downloadSheet(grid, `${book.name}-${sheet}`, 'xlsx')}><Download size={13} aria-hidden="true" /> .xlsx</button>
              <button type="button" className="btn small ghost" onClick={() => downloadSheet(grid, `${book.name}-${sheet}`, 'csv')}><Download size={13} aria-hidden="true" /> .csv</button>
            </div>
          </div>
          {grid.length === 0 ? <p className="muted">Esta hoja está vacía.</p> : <Grid data={grid} onCell={(ref) => insertAt(inputRef, formula, setFormula, ref)} />}
          <Runner grid={grid} formula={formula} setFormula={setFormula} inputRef={inputRef} hint="=SUMA(B2:B20)  ·  toca celdas para añadir su referencia" />
          <p className="small muted">Las fórmulas del archivo se muestran con su último resultado guardado. Aquí puedes probar fórmulas nuevas sobre sus datos.</p>
        </section>
      )}
    </div>
  );
}

export default function Excel() {
  const [tab, setTab] = useState('learn');
  const tabs = useMemo(() => [['learn', 'Aprender funciones'], ['file', 'Mi archivo']], []);
  return (
    <div className="stack-lg">
      <div className="view-switch" role="tablist" aria-label="Secciones" style={{ alignSelf: 'start' }}>
        {tabs.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {tab === 'learn' ? <Learn /> : <MyFile />}
      <p className="small muted">Fórmulas calculadas con Formula.js y archivos leídos con SheetJS, todo en tu navegador.</p>
    </div>
  );
}
