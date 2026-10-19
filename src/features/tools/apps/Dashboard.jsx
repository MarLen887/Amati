import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Sparkles, Upload } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
import ChartBox from '../ChartBox.jsx';
import { compact, PALETTE, themeColors } from '../lib/charts.js';
import { ACCEPT, parseText, readWorkbook } from '../lib/sheets.js';

// Gráficas y dashboards con Apache ECharts: pega una tabla, sube un Excel/CSV o usa el ejemplo.
const SAMPLE = [
  ['Mes', 'Ventas', 'Gastos', 'Región'],
  ['Ene', 42000, 31000, 'Norte'], ['Feb', 38500, 29500, 'Norte'], ['Mar', 51000, 33000, 'Sur'], ['Abr', 47500, 34500, 'Sur'],
  ['May', 56000, 36000, 'Norte'], ['Jun', 61500, 38500, 'Sur'], ['Jul', 58000, 37000, 'Norte'], ['Ago', 64500, 40000, 'Sur'],
  ['Sep', 70000, 42500, 'Norte'], ['Oct', 68500, 41000, 'Sur'], ['Nov', 77000, 45000, 'Norte'], ['Dic', 91000, 52000, 'Sur'],
];
const KINDS = [['bar', 'Barras'], ['barh', 'Barras horizontales'], ['line', 'Líneas'], ['area', 'Área'], ['pie', 'Pastel'], ['scatter', 'Dispersión']];
const AGGS = [['sum', 'Sumar'], ['avg', 'Promediar'], ['count', 'Contar'], ['max', 'Máximo'], ['min', 'Mínimo']];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const nf = (n) => (n === null || n === undefined ? '—' : Math.abs(n) >= 1e5 ? compact(n) : Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }));

function agg(values, how) {
  const nums = values.filter(isNum);
  if (how === 'count') return values.length;
  if (!nums.length) return 0;
  if (how === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (how === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
  return how === 'max' ? Math.max(...nums) : Math.min(...nums);
}

export default function Dashboard() {
  const [name, setName] = useState('Ventas por mes (ejemplo)');
  const [grid, setGrid] = useState(SAMPLE);
  const [paste, setPaste] = useState('');
  const [kind, setKind] = useState('bar');
  const [xi, setXi] = useState(0);
  const [ys, setYs] = useState([1]);
  const [how, setHow] = useState('sum');
  const [sort, setSort] = useState('orig');
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ text: '', loading: false });
  const chart = useRef(null);

  const header = grid[0] || [];
  const rows = grid.slice(1).filter((r) => r.some((c) => c !== '' && c !== null));
  const numericCols = header.map((_, c) => { const vals = rows.map((r) => r[c]).filter((v) => v !== '' && v != null); return vals.length > 0 && vals.filter(isNum).length / vals.length >= 0.7; });

  function load(g, nm) {
    if (!g || g.length < 2) { setError('Necesito al menos una fila de encabezados y una de datos.'); return; }
    const w = g.map((r) => r.map((c) => (c === undefined || c === null ? '' : c)));
    const num = w[0].map((_, c) => { const v = w.slice(1).map((r) => r[c]).filter((x) => x !== ''); return v.length > 0 && v.filter(isNum).length / v.length >= 0.7; });
    const xCol = Math.max(num.findIndex((n) => !n), 0);
    const yCol = num.findIndex((n, i) => n && i !== xCol);
    setGrid(w); setName(nm); setError(''); setAi({ text: '', loading: false });
    setXi(xCol); setYs(yCol >= 0 ? [yCol] : []);
  }

  useEffect(() => {
    try { const raw = sessionStorage.getItem('amati-dash-import'); if (raw) { sessionStorage.removeItem('amati-dash-import'); const j = JSON.parse(raw); load(j.grid, j.name); } } catch { /* sin almacenamiento */ }
  }, []);

  async function upload(file) {
    if (!file) return;
    try { const b = await readWorkbook(file); load(b.sheets[b.names[0]], file.name.replace(/\.[^.]+$/, '')); } catch (e) { setError(e.message); }
  }

  // Datos agrupados por la columna X
  const data = useMemo(() => {
    if (!rows.length || xi >= header.length) return { cats: [], series: [] };
    const groups = new Map();
    for (const r of rows) { const k = String(r[xi] ?? '(vacío)'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    let cats = [...groups.keys()];
    const series = ys.filter((y) => y < header.length).map((y) => ({ name: String(header[y]), vals: cats.map((k) => agg(groups.get(k).map((r) => r[y]), how)) }));
    if (sort !== 'orig' && series[0]) {
      const idx = cats.map((_, i) => i).sort((a, b) => (sort === 'desc' ? series[0].vals[b] - series[0].vals[a] : series[0].vals[a] - series[0].vals[b]));
      cats = idx.map((i) => cats[i]);
      series.forEach((s) => { s.vals = idx.map((i) => s.vals[i]); });
    }
    return { cats, series };
  }, [rows, xi, ys, how, sort, header]); // eslint-disable-line react-hooks/exhaustive-deps

  const option = useMemo(() => {
    const t = themeColors();
    const base = { color: PALETTE, tooltip: { trigger: kind === 'pie' ? 'item' : 'axis', valueFormatter: nf }, toolbox: { right: 0, feature: { dataView: { readOnly: true, title: 'Datos', lang: ['Datos', 'Cerrar', 'Actualizar'] } } } };
    if (!data.series.length) return base;
    if (kind === 'pie') {
      const s = data.series[0];
      return { ...base, legend: { bottom: 0, type: 'scroll' }, series: [{ name: s.name, type: 'pie', radius: ['35%', '68%'], center: ['50%', '46%'], itemStyle: { borderRadius: 6, borderColor: t.surface, borderWidth: 2 }, label: { color: t.text }, data: data.cats.slice(0, 20).map((c, i) => ({ name: c, value: s.vals[i] })) }] };
    }
    if (kind === 'scatter') {
      const xs = rows.map((r) => r[xi]);
      const xnum = xs.every((v) => isNum(v) || v === '');
      const s = ys[0];
      return { ...base, legend: { show: false }, grid: { left: 8, right: 16, top: 40, bottom: 28, containLabel: true },
        xAxis: { type: xnum ? 'value' : 'category', name: String(header[xi]), axisLabel: { color: t.muted }, splitLine: { lineStyle: { color: t.line } }, ...(xnum ? { scale: true } : { data: [...new Set(xs.map(String))] }) },
        yAxis: { type: 'value', name: String(header[s]), scale: true, axisLabel: { color: t.muted }, splitLine: { lineStyle: { color: t.line } } },
        series: [{ type: 'scatter', symbolSize: 10, data: rows.map((r) => [xnum ? r[xi] : String(r[xi]), r[s]]).filter((p) => isNum(p[1])) }] };
    }
    const horizontal = kind === 'barh';
    const cat = { type: 'category', data: data.cats, axisLabel: { color: t.muted, interval: 'auto' }, axisLine: { lineStyle: { color: t.line } }, ...(horizontal ? { inverse: true } : {}) };
    const val = { type: 'value', axisLabel: { color: t.muted, formatter: (v) => compact(v) }, splitLine: { lineStyle: { color: t.line } } };
    return { ...base, legend: { top: 0, type: 'scroll' }, grid: { left: 8, right: 20, top: 48, bottom: data.cats.length > 14 ? 54 : 28, containLabel: true },
      dataZoom: data.cats.length > 14 ? [{ type: 'slider', height: 18, bottom: 4 }, { type: 'inside' }] : [],
      xAxis: horizontal ? val : cat, yAxis: horizontal ? cat : val,
      series: data.series.map((s) => ({ name: s.name, type: kind === 'area' ? 'line' : kind === 'barh' ? 'bar' : kind, smooth: kind === 'line' || kind === 'area', areaStyle: kind === 'area' ? { opacity: 0.25 } : undefined, data: s.vals, barMaxWidth: 46 })) };
  }, [kind, data, rows, xi, ys, header]);

  const kpi = useMemo(() => {
    const s = data.series[0];
    if (!s || !s.vals.length) return null;
    const max = Math.max(...s.vals), min = Math.min(...s.vals);
    return { name: s.name, total: s.vals.reduce((a, b) => a + b, 0), avg: s.vals.reduce((a, b) => a + b, 0) / s.vals.length, max, maxC: data.cats[s.vals.indexOf(max)], min, minC: data.cats[s.vals.indexOf(min)], n: rows.length };
  }, [data, rows]);

  const toggleY = (c) => setYs((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const png = () => { const url = chart.current?.getDataURL({ pixelRatio: 2, backgroundColor: themeColors().surface }); if (!url) return; const a = document.createElement('a'); a.href = url; a.download = 'grafica.png'; a.click(); };

  async function explain() {
    setAi({ text: '', loading: true });
    const tbl = data.cats.slice(0, 30).map((c, i) => `${c}: ${data.series.map((s) => `${s.name}=${Number(s.vals[i]).toPrecision(5)}`).join(', ')}`).join('\n');
    try {
      setAi({ loading: false, text: await ask(`Eres un analista de datos que explica a estudiantes universitarios. Analiza estos datos agrupados por «${header[xi]}» (${AGGS.find((a) => a[0] === how)[1].toLowerCase()}):
${tbl}

Responde en español sencillo: 1) «Qué se observa» (tendencias, máximos y mínimos), 2) «Qué podría explicarlo» (con cautela), 3) «Qué decisión o pregunta sugiere». No inventes datos que no estén en la tabla.`) });
    } catch (e) { setAi({ loading: false, text: `No pude generar el análisis: ${e.message}` }); }
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <strong>Datos:</strong> <span className="tag">{name}</span> <span className="small muted">{rows.length} filas · {header.length} columnas</span>
          <span className="grow" />
          <button type="button" className="btn small ghost" onClick={() => load(SAMPLE, 'Ventas por mes (ejemplo)')}>Usar ejemplo</button>
          <label className="btn small ghost file-pick"><Upload size={13} aria-hidden="true" /> Subir Excel / CSV
            <input type="file" accept={ACCEPT} hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
        </div>
        <details>
          <summary className="small">Pegar una tabla (desde Excel, Google Sheets o CSV)</summary>
          <div className="stack-sm" style={{ marginTop: '0.5rem' }}>
            <textarea rows={5} className="mono-ish" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Mes\tVentas\nEne\t1200\nFeb\t1500'} aria-label="Tabla pegada" />
            <button type="button" className="btn small primary" style={{ alignSelf: 'start' }} disabled={!paste.trim()} onClick={() => load(parseText(paste), 'Tabla pegada')}>Usar esta tabla</button>
          </div>
        </details>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="panel stack">
        <div className="row gap wrap">
          <div className="chips" role="group" aria-label="Tipo de gráfica">{KINDS.map(([k, l]) => <button key={k} type="button" className={`chip ${kind === k ? 'active' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
        </div>
        <div className="row gap wrap">
          <label>Eje X (categorías)<select value={xi} onChange={(e) => setXi(Number(e.target.value))}>{header.map((h, i) => <option key={i} value={i}>{String(h) || `Columna ${i + 1}`}</option>)}</select></label>
          <label>Agrupar por<select value={how} onChange={(e) => setHow(e.target.value)}>{AGGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Orden<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="orig">Original</option><option value="desc">Mayor a menor</option><option value="asc">Menor a mayor</option></select></label>
        </div>
        <div className="stack-sm"><span className="field-label">Valores (columnas numéricas)</span>
          <div className="chips">{header.map((h, i) => numericCols[i] && i !== xi ? <button key={i} type="button" className={`chip ${ys.includes(i) ? 'active' : ''}`} aria-pressed={ys.includes(i)} onClick={() => toggleY(i)}>{String(h)}</button> : null)}
            {!numericCols.some((n, i) => n && i !== xi) && <span className="small muted">No encontré columnas numéricas.</span>}</div></div>
      </section>

      {kpi && (
        <div className="phys-results" aria-label="Indicadores">
          <div><dt>Total · {kpi.name}</dt><dd>{nf(kpi.total)}</dd></div>
          <div><dt>Promedio por categoría</dt><dd>{nf(kpi.avg)}</dd></div>
          <div><dt>Máximo · {kpi.maxC}</dt><dd>{nf(kpi.max)}</dd></div>
          <div><dt>Mínimo · {kpi.minC}</dt><dd>{nf(kpi.min)}</dd></div>
          <div><dt>Registros</dt><dd>{kpi.n}</dd></div>
        </div>
      )}

      <section className="panel stack">
        {data.series.length === 0 ? <p className="muted">Elige al menos una columna de valores para ver la gráfica.</p> : (
          <>
            <ChartBox option={option} height={400} onReady={(c) => { chart.current = c; }} label={`Gráfica de ${name}`} />
            <div className="row gap wrap">
              <button type="button" className="btn small ghost" onClick={png}><Download size={13} aria-hidden="true" /> Descargar imagen</button>
              {has.gemini && <button type="button" className="btn small ghost" disabled={ai.loading} onClick={explain}><Sparkles size={13} aria-hidden="true" /> {ai.loading ? 'Analizando…' : 'Analizar con IA'}</button>}
            </div>
            {ai.text && <p className="pre repo-ai">{ai.text}</p>}
          </>
        )}
      </section>
      <p className="small muted">Gráficas con Apache ECharts. Tus datos se procesan en tu navegador.</p>
    </div>
  );
}
