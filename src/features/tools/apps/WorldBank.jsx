import { useMemo, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
import ChartBox from '../ChartBox.jsx';
import { compact, PALETTE, themeColors } from '../lib/charts.js';

// Comparador de países con la API del Banco Mundial (gratuita, sin llave).
const API = 'https://api.worldbank.org/v2';
const COUNTRIES = [
  ['MX', 'México'], ['US', 'Estados Unidos'], ['CA', 'Canadá'], ['BR', 'Brasil'], ['AR', 'Argentina'], ['CL', 'Chile'], ['CO', 'Colombia'], ['PE', 'Perú'],
  ['UY', 'Uruguay'], ['EC', 'Ecuador'], ['CR', 'Costa Rica'], ['PA', 'Panamá'], ['ES', 'España'], ['DE', 'Alemania'], ['FR', 'Francia'], ['GB', 'Reino Unido'],
  ['CN', 'China'], ['JP', 'Japón'], ['KR', 'Corea del Sur'], ['IN', 'India'], ['AU', 'Australia'], ['ZA', 'Sudáfrica'],
];
const INDICATORS = [
  { id: 'NY.GDP.MKTP.CD', label: 'PIB (US$ corrientes)', unit: 'US$', big: true },
  { id: 'NY.GDP.PCAP.CD', label: 'PIB per cápita (US$)', unit: 'US$' },
  { id: 'NY.GDP.MKTP.KD.ZG', label: 'Crecimiento del PIB (% anual)', unit: '%' },
  { id: 'FP.CPI.TOTL.ZG', label: 'Inflación, precios al consumidor (% anual)', unit: '%' },
  { id: 'SL.UEM.TOTL.ZS', label: 'Desempleo (% de la fuerza laboral)', unit: '%' },
  { id: 'NE.TRD.GNFS.ZS', label: 'Comercio exterior (% del PIB)', unit: '%' },
  { id: 'NE.EXP.GNFS.ZS', label: 'Exportaciones (% del PIB)', unit: '%' },
  { id: 'NE.IMP.GNFS.ZS', label: 'Importaciones (% del PIB)', unit: '%' },
  { id: 'BX.KLT.DINV.WD.GD.ZS', label: 'Inversión extranjera directa (% del PIB)', unit: '%' },
  { id: 'SP.POP.TOTL', label: 'Población', unit: 'hab.', big: true },
  { id: 'SI.POV.GINI', label: 'Índice de Gini (desigualdad)', unit: '' },
  { id: 'SE.XPD.TOTL.GD.ZS', label: 'Gasto en educación (% del PIB)', unit: '%' },
  { id: 'IT.NET.USER.ZS', label: 'Usuarios de internet (% de la población)', unit: '%' },
];
const PRESETS = [['Latinoamérica', ['MX', 'BR', 'AR', 'CL']], ['México vs EE. UU.', ['MX', 'US']], ['TLCAN / T-MEC', ['MX', 'US', 'CA']], ['Grandes economías', ['US', 'CN', 'JP', 'DE']]];
const thisYear = new Date().getFullYear();

export default function WorldBank() {
  const [countries, setCountries] = useState(['MX', 'BR', 'AR', 'CL']);
  const [ind, setInd] = useState(INDICATORS[0]);
  const [from, setFrom] = useState(thisYear - 21);
  const [to, setTo] = useState(thisYear - 1);
  const [kind, setKind] = useState('line');
  const [data, setData] = useState(null); // { ind, series: {ISO2: Map(year->value)}, names }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ text: '', loading: false });
  const names = Object.fromEntries(COUNTRIES);

  const toggle = (c) => setCountries((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length >= 8 ? s : [...s, c]));

  async function load() {
    if (countries.length === 0) { setError('Elige al menos un país.'); return; }
    setBusy(true); setError(''); setAi({ text: '', loading: false });
    try {
      const url = `${API}/country/${countries.join(';')}/indicator/${ind.id}?format=json&date=${from}:${to}&per_page=2000`;
      const res = await fetch(url).catch(() => { throw new Error('No se pudo conectar con el Banco Mundial. Revisa tu conexión.'); });
      if (!res.ok) throw new Error(`El Banco Mundial respondió ${res.status}.`);
      const json = await res.json();
      if (!Array.isArray(json) || !Array.isArray(json[1])) throw new Error('El Banco Mundial no devolvió datos para esa consulta.');
      const series = {};
      for (const r of json[1]) {
        const iso = r.country.id;
        (series[iso] ??= new Map()).set(Number(r.date), r.value);
      }
      setData({ ind, series, from, to });
    } catch (e) { setError(e.message); setData(null); } finally { setBusy(false); }
  }

  const years = useMemo(() => (data ? Array.from({ length: data.to - data.from + 1 }, (_, i) => data.from + i) : []), [data]);
  const shown = useMemo(() => (data ? countries.filter((c) => data.series[c]) : []), [data, countries]);

  const option = useMemo(() => {
    if (!data) return null;
    const t = themeColors();
    const fmt = (v) => (data.ind.big ? compact(v) : v === null || v === undefined ? '—' : `${Number(v).toLocaleString('es-MX', { maximumFractionDigits: 2 })}${data.ind.unit === '%' ? ' %' : ''}`);
    return {
      color: PALETTE,
      tooltip: { trigger: 'axis', valueFormatter: fmt },
      legend: { top: 0 },
      grid: { left: 8, right: 16, top: 44, bottom: 28, containLabel: true },
      xAxis: { type: 'category', data: years, axisLabel: { color: t.muted }, axisLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'value', axisLabel: { color: t.muted, formatter: (v) => (data.ind.big ? compact(v) : v) }, splitLine: { lineStyle: { color: t.line } } },
      series: shown.map((c) => ({
        name: names[c] || c, type: kind, smooth: kind === 'line', connectNulls: true, showSymbol: kind === 'line' && years.length < 30,
        data: years.map((y) => data.series[c].get(y) ?? null),
      })),
    };
  }, [data, kind, shown, years]); // eslint-disable-line react-hooks/exhaustive-deps

  const latest = useMemo(() => shown.map((c) => {
    for (let i = years.length - 1; i >= 0; i--) { const v = data.series[c].get(years[i]); if (v !== null && v !== undefined) return { c, year: years[i], v }; }
    return { c, year: null, v: null };
  }), [shown, years, data]);

  function csv() {
    const rows = [['Año', ...shown.map((c) => names[c] || c)], ...years.map((y) => [y, ...shown.map((c) => data.series[c].get(y) ?? '')])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `banco-mundial-${data.ind.id}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function explain() {
    setAi({ text: '', loading: true });
    const table = shown.map((c) => `${names[c] || c}: ${years.filter((y) => data.series[c].get(y) != null).filter((_, i, a) => i % Math.ceil(a.length / 8) === 0 || i === a.length - 1).map((y) => `${y}=${Number(data.series[c].get(y)).toPrecision(4)}`).join(', ')}`).join('\n');
    try {
      setAi({ loading: false, text: await ask(`Eres un tutor de economía. Explica en español sencillo, para un estudiante universitario, esta comparación del Banco Mundial.
Indicador: ${data.ind.label}. Periodo: ${data.from}-${data.to}.
Datos:
${table}

Responde con: 1) «Qué muestran los datos» (2-3 frases), 2) «Diferencias entre países», 3) «Posibles causas» (con cautela, sin afirmar lo que no esté en los datos), 4) «Una pregunta para investigar».`) });
    } catch (e) { setAi({ loading: false, text: `No pude generar la explicación: ${e.message}` }); }
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="stack-sm">
          <span className="field-label">Países (hasta 8)</span>
          <div className="chips">{PRESETS.map(([n, c]) => <button key={n} type="button" className="chip ghost" onClick={() => setCountries(c)}>{n}</button>)}</div>
          <div className="chips">{COUNTRIES.map(([c, n]) => <button key={c} type="button" className={`chip ${countries.includes(c) ? 'active' : ''}`} aria-pressed={countries.includes(c)} onClick={() => toggle(c)}>{n}</button>)}</div>
        </div>
        <div className="row gap wrap">
          <label className="grow" style={{ minWidth: '14rem' }}>Indicador
            <select value={ind.id} onChange={(e) => setInd(INDICATORS.find((i) => i.id === e.target.value))}>{INDICATORS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select>
          </label>
          <label>Desde <input type="number" value={from} min={1960} max={to} onChange={(e) => setFrom(Number(e.target.value))} style={{ width: '6rem' }} /></label>
          <label>Hasta <input type="number" value={to} min={from} max={thisYear} onChange={(e) => setTo(Number(e.target.value))} style={{ width: '6rem' }} /></label>
          <button className="btn primary" disabled={busy} onClick={load} style={{ alignSelf: 'end' }}>{busy ? 'Consultando…' : 'Comparar'}</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {data && (
        <>
          <section className="panel stack" aria-live="polite">
            <div className="row gap wrap between">
              <h2 className="h3">{data.ind.label}</h2>
              <div className="row gap">
                <div className="view-switch" role="group" aria-label="Tipo de gráfica">
                  <button type="button" className={kind === 'line' ? 'active' : ''} onClick={() => setKind('line')}>Líneas</button>
                  <button type="button" className={kind === 'bar' ? 'active' : ''} onClick={() => setKind('bar')}>Barras</button>
                </div>
                <button type="button" className="btn small ghost" onClick={csv}><Download size={14} aria-hidden="true" /> CSV</button>
              </div>
            </div>
            {shown.length === 0 ? <p className="muted">El Banco Mundial no tiene datos de este indicador para esos países y años.</p> : <ChartBox option={option} height={380} label={`Gráfica de ${data.ind.label}`} />}
            <div className="phys-results">
              {latest.map((l) => (
                <div key={l.c}><dt>{names[l.c] || l.c}{l.year ? ` · ${l.year}` : ''}</dt><dd>{l.v === null ? 'Sin dato' : data.ind.big ? `${data.ind.unit === 'US$' ? 'US$ ' : ''}${compact(l.v)}` : `${Number(l.v).toLocaleString('es-MX', { maximumFractionDigits: 2 })}${data.ind.unit === '%' ? ' %' : ''}`}</dd></div>
              ))}
            </div>
            <p className="small muted">Último dato disponible de cada país. Los datos más recientes pueden tardar en publicarse.</p>
          </section>
          {has.gemini && shown.length > 0 && (
            <section className="panel stack">
              <button type="button" className="btn ghost" style={{ alignSelf: 'start' }} disabled={ai.loading} onClick={explain}><Sparkles size={15} aria-hidden="true" /> {ai.loading ? 'Analizando…' : 'Explícame esta comparación'}</button>
              {ai.text && <p className="pre repo-ai">{ai.text}</p>}
            </section>
          )}
        </>
      )}
      <p className="small muted">Datos: Banco Mundial (World Development Indicators), licencia CC BY 4.0.</p>
    </div>
  );
}
