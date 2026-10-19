import { useMemo, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
import ChartBox from '../ChartBox.jsx';
import { PALETTE, themeColors } from '../lib/charts.js';

// Indicadores de México con la API del Banco de Indicadores (BIE) del INEGI.
// Necesita un token gratuito: https://www.inegi.org.mx/servicios/api_indicadores.html  ->  VITE_INEGI_TOKEN
const TOKEN = import.meta.env.VITE_INEGI_TOKEN || '';
const API = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR';

// Claves del BIE. Si alguna no responde, búscala en https://www.inegi.org.mx/app/indicadores/ y úsala en «Otra clave».
const PRESETS = [
  { id: '628194', label: 'Índice Nacional de Precios al Consumidor (INPC)', short: 'INPC', unit: 'índice', yoy: true, note: 'También se muestra la inflación anual calculada con este índice.' },
  { id: '444884', label: 'Tasa de desocupación (ENOE)', short: 'Desocupación', unit: '%' },
];

// Periodos del INEGI: «2024/05» (mes), «2024/02» (trimestre) o «2024» (año)
function parsePeriod(p) {
  const [y, m] = String(p).split('/');
  return { y: Number(y), m: m ? Number(m) : 1, label: m ? `${y}/${m}` : y, key: Number(y) * 100 + (m ? Number(m) : 0) };
}

async function fetchSeries(id) {
  const url = `${API}/${encodeURIComponent(id)}/es/00000/false/BIE-BISE/2.0/${TOKEN}?type=json`;
  let res;
  try { res = await fetch(url); } catch { throw new Error('No se pudo conectar con el INEGI. Revisa tu conexión.'); }
  const json = await res.json().catch(() => null);
  const s = json?.Series?.[0];
  if (!res.ok || !s) {
    const msg = Array.isArray(json) ? json.join(' ') : '';
    if (/token/i.test(msg)) throw new Error('El token del INEGI no es válido. Revisa VITE_INEGI_TOKEN.');
    throw new Error(/No se encontraron/i.test(msg) || res.status === 400 ? `El INEGI no encontró la clave ${id}. Revisa que sea un indicador válido del BIE.` : `El INEGI respondió ${res.status}.`);
  }
  const obs = (s.OBSERVATIONS || []).filter((o) => o.OBS_VALUE !== null && o.OBS_VALUE !== '' && !Number.isNaN(Number(o.OBS_VALUE)))
    .map((o) => ({ ...parsePeriod(o.TIME_PERIOD), v: Number(o.OBS_VALUE) })).sort((a, b) => a.key - b.key);
  if (!obs.length) throw new Error('Ese indicador no tiene datos disponibles.');
  return obs;
}

export default function Inegi() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [series, setSeries] = useState(null); // { title, unit, obs, yoy }
  const [years, setYears] = useState(10);
  const [view, setView] = useState('base');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ text: '', loading: false });

  async function load(p = preset, id = p.id) {
    setBusy(true); setError(''); setAi({ text: '', loading: false });
    try {
      const obs = await fetchSeries(id);
      setSeries({ id, title: p.label || `Indicador ${id}`, unit: p.unit || '', obs, yoy: Boolean(p.yoy), note: p.note });
      setView('base');
    } catch (e) { setError(e.message); setSeries(null); } finally { setBusy(false); }
  }

  // Variación porcentual anual (contra el mismo periodo del año anterior)
  const yoy = useMemo(() => {
    if (!series?.yoy) return null;
    const by = new Map(series.obs.map((o) => [o.key, o.v]));
    return series.obs.map((o) => { const prev = by.get(o.key - 100); return prev ? { ...o, v: ((o.v / prev) - 1) * 100 } : null; }).filter(Boolean);
  }, [series]);

  const shown = useMemo(() => {
    const src = view === 'yoy' && yoy ? yoy : series?.obs || [];
    const cut = src.length ? src[src.length - 1].y - years : 0;
    return src.filter((o) => o.y > cut);
  }, [series, yoy, view, years]);

  const option = useMemo(() => {
    if (!series) return null;
    const t = themeColors();
    const pct = view === 'yoy' || series.unit === '%';
    return {
      color: PALETTE, tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toLocaleString('es-MX', { maximumFractionDigits: 2 })}${pct ? ' %' : ''}` },
      grid: { left: 8, right: 16, top: 24, bottom: shown.length > 40 ? 54 : 28, containLabel: true },
      dataZoom: shown.length > 40 ? [{ type: 'slider', height: 18, bottom: 4 }, { type: 'inside' }] : [],
      xAxis: { type: 'category', data: shown.map((o) => o.label), axisLabel: { color: t.muted }, axisLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: t.muted, formatter: (v) => `${v}${pct ? ' %' : ''}` }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ type: 'line', smooth: true, showSymbol: shown.length < 40, areaStyle: { opacity: 0.12 }, data: shown.map((o) => o.v) }],
    };
  }, [series, shown, view]);

  const last = shown[shown.length - 1];
  const first = shown[0];

  async function explain() {
    setAi({ text: '', loading: true });
    const step = Math.max(1, Math.floor(shown.length / 14));
    const pts = shown.filter((_, i) => i % step === 0 || i === shown.length - 1).map((o) => `${o.label}=${o.v.toFixed(2)}`).join(', ');
    try {
      setAi({ loading: false, text: await ask(`Eres un tutor de economía para estudiantes mexicanos. Explica en español sencillo el comportamiento de este indicador del INEGI.
Indicador: ${series.title}${view === 'yoy' ? ' (variación anual, %)' : ''}
Datos (periodo=valor): ${pts}

Responde con: 1) «Qué muestran los datos», 2) «Momentos importantes» (picos o caídas, sin inventar causas que no puedas respaldar; si mencionas hechos como la pandemia, hazlo con cautela), 3) «Por qué importa» y 4) «Una pregunta para investigar».`) });
    } catch (e) { setAi({ loading: false, text: `No pude generar la explicación: ${e.message}` }); }
  }

  if (!TOKEN) {
    return (
      <section className="panel stack">
        <h2 className="h3">Falta conectar el INEGI</h2>
        <p>Esta herramienta usa la API del Banco de Indicadores (BIE) del INEGI, que pide un token gratuito.</p>
        <ol className="stack-sm" style={{ paddingLeft: '1.2rem' }}>
          <li>Solicítalo en <a href="https://www.inegi.org.mx/servicios/api_indicadores.html" target="_blank" rel="noreferrer noopener">inegi.org.mx/servicios/api_indicadores.html</a> (llegará a tu correo).</li>
          <li>Agrégalo en <code>.env.local</code>: <code>VITE_INEGI_TOKEN=tu_token</code>.</li>
          <li>Reinicia <code>npm run dev</code> (o vuelve a compilar).</li>
        </ol>
        <p className="small muted">El token viaja en el navegador: es de uso gratuito y solo de consulta de datos públicos.</p>
      </section>
    );
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="chips" role="group" aria-label="Indicador">
          {PRESETS.map((p) => <button key={p.id} type="button" className={`chip ${series?.id === p.id ? 'active' : ''}`} onClick={() => { setPreset(p); load(p); }}>{p.short}</button>)}
        </div>
        <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) load({ label: `Indicador ${custom.trim()}`, unit: '' }, custom.trim()); }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} placeholder="Otra clave del BIE (ej. 628194)" aria-label="Otra clave del BIE" inputMode="numeric" />
          <button className="btn ghost" disabled={busy || !custom.trim()}>Consultar clave</button>
          <a className="small row gap" href="https://www.inegi.org.mx/app/indicadores/" target="_blank" rel="noreferrer noopener"><ExternalLink size={12} aria-hidden="true" /> Buscar claves en el BIE</a>
        </form>
        {busy && <p className="muted small">Consultando al INEGI…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {series && (
        <section className="panel stack" aria-live="polite">
          <div className="row gap wrap between">
            <h2 className="h3">{series.title}</h2>
            <div className="row gap wrap">
              {yoy && <div className="view-switch" role="group" aria-label="Vista"><button type="button" className={view === 'base' ? 'active' : ''} onClick={() => setView('base')}>Índice</button><button type="button" className={view === 'yoy' ? 'active' : ''} onClick={() => setView('yoy')}>Inflación anual</button></div>}
              <select value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Periodo">{[3, 5, 10, 20, 100].map((n) => <option key={n} value={n}>{n === 100 ? 'Todo el historial' : `Últimos ${n} años`}</option>)}</select>
            </div>
          </div>
          <ChartBox option={option} height={360} label={`Gráfica de ${series.title}`} />
          {last && first && (
            <div className="phys-results">
              <div><dt>Último dato · {last.label}</dt><dd>{last.v.toLocaleString('es-MX', { maximumFractionDigits: 2 })}{view === 'yoy' || series.unit === '%' ? ' %' : ''}</dd></div>
              <div><dt>Primer dato del periodo · {first.label}</dt><dd>{first.v.toLocaleString('es-MX', { maximumFractionDigits: 2 })}{view === 'yoy' || series.unit === '%' ? ' %' : ''}</dd></div>
              <div><dt>Máximo del periodo</dt><dd>{Math.max(...shown.map((o) => o.v)).toLocaleString('es-MX', { maximumFractionDigits: 2 })}</dd></div>
              <div><dt>Mínimo del periodo</dt><dd>{Math.min(...shown.map((o) => o.v)).toLocaleString('es-MX', { maximumFractionDigits: 2 })}</dd></div>
            </div>
          )}
          {series.note && <p className="small muted">{series.note}</p>}
          {has.gemini && <button type="button" className="btn ghost" style={{ alignSelf: 'start' }} disabled={ai.loading} onClick={explain}><Sparkles size={15} aria-hidden="true" /> {ai.loading ? 'Analizando…' : 'Explícame este comportamiento'}</button>}
          {ai.text && <p className="pre repo-ai">{ai.text}</p>}
        </section>
      )}
      <p className="small muted">Fuente: INEGI, Banco de Indicadores (BIE).</p>
    </div>
  );
}
