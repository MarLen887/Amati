import { useMemo, useState } from 'react';
import { Briefcase, GraduationCap, Search, Sparkles, Store, UserX, Users, Wallet } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';
import ChartBox from '../ChartBox.jsx';
import { PALETTE, themeColors } from '../lib/charts.js';

// Indicadores de México con las APIs del INEGI. Necesita un token gratuito:
// https://www.inegi.org.mx/servicios/api_indicadores.html  ->  VITE_INEGI_TOKEN
// - Datos de cada indicador: API de Indicadores (documentada).
// - Búsqueda por nombre: el buscador público del Banco de Indicadores del INEGI. Si no responde, quedan los
//   indicadores sugeridos y el resto de la herramienta sigue funcionando.
const TOKEN = import.meta.env.VITE_INEGI_TOKEN || '';
const API = 'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR';
const SEARCH_API = 'https://www.inegi.org.mx/app/api/buscadorcore/v1/busquedaBancoIndicadores/';

// Indicadores sugeridos. «words»: palabras (sin acentos) con las que el alumno puede encontrarlos.
const PRESETS = [
  {
    id: '628194', label: 'Índice Nacional de Precios al Consumidor (INPC)', short: 'Inflación (INPC)', unit: 'índice', freq: 'Mensual', yoy: 'Inflación anual',
    note: 'También se muestra la inflación anual calculada con este índice.',
    words: ['inpc', 'ipc', 'inflacion', 'precios', 'precio', 'consumidor', 'costo de la vida', 'indice nacional'],
  },
  {
    id: '444884', label: 'Tasa de desocupación (ENOE)', short: 'Desocupación', unit: '%', freq: 'Trimestral',
    words: ['desempleo', 'desocupacion', 'desocupada', 'paro', 'empleo', 'trabajo', 'enoe'],
  },
  {
    id: '510104', label: 'Producto interno bruto (total nacional)', short: 'PIB', unit: 'Millones de pesos a precios corrientes', freq: 'Trimestral', yoy: 'Variación anual',
    words: ['pib', 'producto interno bruto', 'economia', 'crecimiento', 'cuentas nacionales'],
  },
  {
    id: '1002000001', label: 'Población total', short: 'Población', unit: 'Personas', freq: 'Quinquenal', yoy: 'Variación',
    words: ['poblacion', 'habitantes', 'censo', 'demografia'],
  },
  {
    id: '6200205280', label: 'Población con limitación en la actividad para ver', short: 'Limitación para ver', unit: 'Personas', freq: 'Decenal',
    note: 'Incluye a las personas ciegas y con baja visión que declararon tener limitación para ver.',
    words: ['ciego', 'ciegos', 'ciega', 'ciegas', 'ceguera', 'invidente', 'vista', 'visual', 'discapacidad visual'],
  },
];

// Los 10 indicadores más consultados del Banco de Indicadores del INEGI, según el número de visitas que registra su
// buscador (consultado en octubre de 2026).
const TOP10 = [
  { id: '539260', short: 'UMA diaria', label: 'Unidad de Medida y Actualización (UMA), valor diario', unit: 'Pesos', freq: 'Anual', group: 'Economía', Icon: Wallet },
  { id: '1002000001', short: 'Población total', label: 'Población total', unit: 'Personas', freq: 'Quinquenal', group: 'Población', Icon: Users },
  { id: '1002000002', short: 'Población hombres', label: 'Población total hombres', unit: 'Personas', freq: 'Quinquenal', group: 'Población', Icon: Users },
  { id: '1002000003', short: 'Población mujeres', label: 'Población total mujeres', unit: 'Personas', freq: 'Quinquenal', group: 'Población', Icon: Users },
  { id: '6200093954', short: 'Población ocupada', label: 'Población ocupada, 15 años y más', unit: 'Personas', freq: 'Trimestral', group: 'Empleo', Icon: Briefcase },
  { id: '6207019030', short: '% económicamente activa', label: 'Porcentaje de población de 12 años y más económicamente activa', unit: 'Porcentaje', freq: 'Quinquenal', group: 'Empleo', Icon: Briefcase },
  { id: '1002000041', short: '% alfabetas', label: 'Porcentaje de personas de 15 años y más alfabetas', unit: 'Porcentaje', freq: 'Decenal', group: 'Educación', Icon: GraduationCap },
  { id: '6200093960', short: 'Población económicamente activa', label: 'Población económicamente activa, 15 años y más', unit: 'Personas', freq: 'Trimestral', group: 'Empleo', Icon: Briefcase },
  { id: '6200093973', short: 'Población desocupada', label: 'Población desocupada, 15 años y más', unit: 'Personas', freq: 'Trimestral', group: 'Empleo', Icon: UserX },
  { id: '6200093709', short: 'Ocupados en el sector informal', label: 'Población ocupada en el sector informal, 15 años y más', unit: 'Personas', freq: 'Trimestral', group: 'Empleo', Icon: Store },
];

// Sinónimos: palabras cotidianas -> cómo las nombra el INEGI (su buscador solo entiende el texto exacto de cada indicador)
const ALIASES = [
  { test: /cieg|ceguera|invidente|visual|vista/, queries: ['limitación ver', 'discapacidad ver'] },
  { test: /sord|auditiv|oir|escuchar/, queries: ['limitación escuchar', 'discapacidad oír'] },
  { test: /motriz|caminar|silla de ruedas|movilidad/, queries: ['limitación caminar', 'discapacidad caminar'] },
  { test: /analfabet|alfabetiz|leer y escribir/, queries: ['tasa de alfabetización', 'condición de alfabetismo'] },
  { test: /desempleo|desocupa/, queries: ['desocupada'] },
  { test: /homicidio|asesinato/, queries: ['tasa de homicidios'] },
  { test: /salario|sueldo/, queries: ['salarios mínimos'] },
];
const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'por', 'para', 'con', 'que', 'un', 'una', 'personas', 'persona', 'total', 'cuantos', 'cuantas']);
const EXAMPLES = ['PIB', 'inflación', 'personas ciegas', 'población', 'desempleo', 'pobreza'];

const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Busca por nombre en el Banco de Indicadores del INEGI (indicadores con cobertura nacional)
async function searchBank(text, size = 20) {
  const res = await fetch(SEARCH_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      busqueda: text, busquedaCiencia: '', paginaInicio: 0, paginaFin: size, areageo: '0', filtrotema: 'null', tematica: '6',
      filtrobusqueda: 'CBUSQUEDA', orderby: 'RANKING', orderbyAscDesc: 'Desc', metodoBusqueda: 1, IndPrincipales: 'null', idioma: 'es', herramienta: 6,
    }),
  });
  if (!res.ok) throw new Error(`El buscador del INEGI respondió ${res.status}.`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('El buscador del INEGI devolvió un formato inesperado.');
  return rows.map((r) => {
    const path = String(r.TEMATICA || '').split(/>\s*/).map((x) => x.trim()).filter(Boolean);
    return {
      id: String(r.INDICADOR),
      label: String(r.TITULO || '').trim(),
      unit: r.UNIDAD_MEDIDA || '',
      freq: r.FRECUENCIA_DESCRIPCION || '',
      theme: path.slice(1, -1).slice(-2).join(' › '),
    };
  }).filter((r) => r.id && r.label);
}

// { local, live, shownFor, failed }: sugeridos que coinciden + resultados del INEGI (con alternativas si no hay ninguno)
async function findIndicators(text) {
  const q = norm(text);
  const words = q.split(' ').filter(Boolean);
  const local = PRESETS.filter((p) => p.words.some((w) => (w.includes(' ') ? q.includes(w) : words.includes(w))) || norm(p.label).includes(q));

  const queries = [text.trim(), ...ALIASES.filter((a) => a.test.test(q)).flatMap((a) => a.queries)];
  const seen = new Set(local.map((p) => p.id));
  const merge = (lists) => lists.flat().filter((r) => !seen.has(r.id) && seen.add(r.id));

  let live = [];
  let shownFor = '';
  let failed = false;
  try {
    live = merge(await Promise.all(queries.map((x) => searchBank(x))));
    // Sin resultados: se prueba quitando palabras vacías y, al final, con cada palabra importante
    if (!live.length) {
      const key = words.filter((w) => !STOPWORDS.has(w));
      for (const alt of [key.join(' '), ...[...key].sort((a, b) => b.length - a.length).slice(0, 2)]) {
        if (!alt || alt === q) continue;
        live = merge([await searchBank(alt)]);
        if (live.length) { shownFor = alt; break; }
      }
    }
  } catch {
    failed = true;
  }
  // Con sinónimos, primero los resultados que mencionan la palabra clave (p. ej. «ver» para «ciegas»)
  const focus = ALIASES.filter((x) => x.test.test(q)).map((x) => norm(x.queries[0]).split(' ').pop());
  if (focus.length) {
    const hit = (r) => focus.some((f) => new RegExp(`\\b${f}\\b`).test(norm(r.label)));
    live.sort((x, y) => Number(hit(y)) - Number(hit(x)));
  }
  return { local, live, shownFor, failed };
}

// Periodos del INEGI: «2024/05» (mes), «2024/02» (trimestre) o «2024» (año)
function parsePeriod(p, freq) {
  const [y, m] = String(p).split('/');
  const label = !m ? y : freq === 'Trimestral' ? `T${Number(m)} ${y}` : `${y}/${m}`;
  return { y: Number(y), m: m ? Number(m) : 1, label, key: Number(y) * 100 + (m ? Number(m) : 0) };
}

// Los indicadores del INEGI viven en dos fuentes (BISE y BIE): se prueba una y luego la otra
async function fetchSeries(id, freq) {
  let lastMsg = '';
  for (const source of ['BISE', 'BIE-BISE']) {
    let res;
    try {
      res = await fetch(`${API}/${encodeURIComponent(id)}/es/00000/false/${source}/2.0/${TOKEN}?type=json`, { signal: AbortSignal.timeout(20000) });
    } catch {
      throw new Error('No se pudo conectar con el INEGI. Revisa tu conexión.');
    }
    const json = await res.json().catch(() => null);
    const s = json?.Series?.[0];
    if (res.ok && s) {
      const obs = (s.OBSERVATIONS || []).filter((o) => o.OBS_VALUE !== null && o.OBS_VALUE !== '' && !Number.isNaN(Number(o.OBS_VALUE)))
        .map((o) => ({ ...parsePeriod(o.TIME_PERIOD, freq), v: Number(o.OBS_VALUE) })).sort((a, b) => a.key - b.key);
      if (!obs.length) throw new Error('Ese indicador no tiene datos disponibles.');
      return obs;
    }
    lastMsg = Array.isArray(json) ? json.join(' ') : '';
    if (/token/i.test(lastMsg) && !/No se encontraron/i.test(lastMsg)) throw new Error('Los datos del INEGI no están disponibles por ahora. Inténtalo más tarde.');
  }
  throw new Error(/No se encontraron/i.test(lastMsg)
    ? 'El INEGI no tiene datos nacionales para este indicador. Prueba con otro de la lista.'
    : 'El INEGI no respondió. Inténtalo de nuevo en un momento.');
}

const isPct = (unit) => unit === '%' || /porcentaje|tasa/i.test(unit || '');
const nf = (v) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: 2 });

function TopCard({ t, active, onPick, disabled }) {
  return (
    <li>
      <button type="button" className={`inegi-card ${active ? 'active' : ''}`} disabled={disabled} onClick={() => onPick(t)} aria-pressed={active}>
        <t.Icon size={20} strokeWidth={1.8} aria-hidden="true" className="inegi-card-icon" />
        <strong className="inegi-card-name">{t.short}</strong>
        <span className="small muted">{t.group} · {t.freq.toLowerCase()}</span>
      </button>
    </li>
  );
}

function ResultItem({ r, onPick, disabled, badge }) {
  return (
    <li>
      <button type="button" className="inegi-result" disabled={disabled} onClick={() => onPick(r)}>
        <span className="inegi-result-title">{r.short || r.label} {badge && <span className="tag pick-tag">{badge}</span>}</span>
        {r.short && <span className="small">{r.label}</span>}
        {r.theme && <span className="small muted">{r.theme}</span>}
        <span className="small muted">{[r.freq, r.unit].filter(Boolean).join(' · ')}</span>
      </button>
    </li>
  );
}

export default function Inegi() {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // { text, local, live, shownFor, failed }
  const [searching, setSearching] = useState(false);
  const [series, setSeries] = useState(null); // { id, title, unit, obs, yoy, note, pct }
  const [years, setYears] = useState(10);
  const [view, setView] = useState('base');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState({ text: '', loading: false });

  async function search(text = query) {
    const t = text.trim();
    if (t.length < 2) return;
    setQuery(t); setSearching(true); setError('');
    setFound({ text: t, ...(await findIndicators(t)) });
    setSearching(false);
  }

  async function load(item) {
    setBusy(true); setError(''); setAi({ text: '', loading: false });
    try {
      const obs = await fetchSeries(item.id, item.freq);
      const frequent = item.freq === 'Mensual' || item.freq === 'Trimestral';
      setSeries({ id: item.id, title: item.label, unit: item.unit || '', obs, yoy: item.yoy || (isPct(item.unit) ? '' : 'Variación'), note: item.note, pct: isPct(item.unit), freq: item.freq });
      setYears(frequent ? 10 : 100);
      setView('base');
    } catch (e) { setError(e.message); setSeries(null); } finally { setBusy(false); }
  }

  // Variación porcentual contra el mismo periodo del año anterior (solo para valores que no son porcentajes)
  const yoy = useMemo(() => {
    if (!series?.yoy) return null;
    const by = new Map(series.obs.map((o) => [o.key, o.v]));
    const out = series.obs.map((o) => { const prev = by.get(o.key - 100); return prev ? { ...o, v: ((o.v / prev) - 1) * 100 } : null; }).filter(Boolean);
    return out.length >= 2 ? out : null;
  }, [series]);

  const shown = useMemo(() => {
    const src = view === 'yoy' && yoy ? yoy : series?.obs || [];
    const cut = src.length ? src[src.length - 1].y - years : 0;
    return src.filter((o) => o.y > cut);
  }, [series, yoy, view, years]);

  const pct = view === 'yoy' || series?.pct;
  const option = useMemo(() => {
    if (!series) return null;
    const t = themeColors();
    return {
      color: PALETTE, tooltip: { trigger: 'axis', valueFormatter: (v) => `${nf(v)}${pct ? ' %' : ''}` },
      grid: { left: 8, right: 16, top: 24, bottom: shown.length > 40 ? 54 : 28, containLabel: true },
      dataZoom: shown.length > 40 ? [{ type: 'slider', height: 18, bottom: 4 }, { type: 'inside' }] : [],
      xAxis: { type: 'category', data: shown.map((o) => o.label), axisLabel: { color: t.muted }, axisLine: { lineStyle: { color: t.line } } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: t.muted, formatter: (v) => `${v}${pct ? ' %' : ''}` }, splitLine: { lineStyle: { color: t.line } } },
      series: [{ type: shown.length < 8 ? 'bar' : 'line', smooth: true, showSymbol: shown.length < 40, areaStyle: { opacity: 0.12 }, data: shown.map((o) => o.v) }],
    };
  }, [series, shown, pct]);

  const last = shown[shown.length - 1];
  const first = shown[0];

  async function explain() {
    setAi({ text: '', loading: true });
    const step = Math.max(1, Math.floor(shown.length / 14));
    const pts = shown.filter((_, i) => i % step === 0 || i === shown.length - 1).map((o) => `${o.label}=${o.v.toFixed(2)}`).join(', ');
    try {
      setAi({ loading: false, text: await ask(`Eres un tutor de economía y ciencias sociales para estudiantes mexicanos. Explica en español sencillo el comportamiento de este indicador del INEGI.
Indicador: ${series.title}${series.unit ? ` (${series.unit})` : ''}${view === 'yoy' ? ' (variación anual, %)' : ''}
Datos (periodo=valor): ${pts}

Responde con: 1) «Qué muestran los datos», 2) «Momentos importantes» (picos o caídas, sin inventar causas que no puedas respaldar; si mencionas hechos como la pandemia, hazlo con cautela), 3) «Por qué importa» y 4) «Una pregunta para investigar».`) });
    } catch (e) { setAi({ loading: false, text: `No pude generar la explicación: ${e.message}` }); }
  }

  if (!TOKEN) {
    return (
      <section className="panel stack">
        <h2 className="h3">Los datos del INEGI no están disponibles por ahora</h2>
        <p>Inténtalo más tarde. Mientras tanto puedes consultar los indicadores directamente en <a href="https://www.inegi.org.mx/" target="_blank" rel="noreferrer noopener">inegi.org.mx</a>.</p>
        {import.meta.env.DEV && (
          <ol className="stack-sm small" style={{ paddingLeft: '1.2rem' }}>
            <li>Solicita un token gratuito en <a href="https://www.inegi.org.mx/servicios/api_indicadores.html" target="_blank" rel="noreferrer noopener">inegi.org.mx/servicios/api_indicadores.html</a>.</li>
            <li>Agrégalo en <code>.env.local</code> como <code>VITE_INEGI_TOKEN=tu_token</code> y reinicia el servidor.</li>
          </ol>
        )}
      </section>
    );
  }

  const none = found && !found.local.length && !found.live.length;

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <form className="row gap wrap" role="search" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="grow search-inline">
            <Search size={16} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80}
              placeholder="Busca un indicador por nombre: PIB, inflación, personas ciegas…" aria-label="Buscar indicador por nombre" />
          </label>
          <button className="btn primary" disabled={searching || query.trim().length < 2}>{searching ? 'Buscando…' : 'Buscar'}</button>
        </form>
        <div className="chips" role="group" aria-label="Ejemplos de búsqueda">
          <span className="small muted">Prueba con:</span>
          {EXAMPLES.map((x) => <button key={x} type="button" className="chip" disabled={searching} onClick={() => search(x)}>{x}</button>)}
        </div>
        {busy && <p className="muted small" role="status">Consultando al INEGI…</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {found ? (
        <section className="panel stack" aria-live="polite">
          <h2 className="h3">Resultados para «{found.text}»</h2>
          {found.failed && <p className="notice small">El buscador del INEGI no respondió en este momento; solo se muestran los indicadores sugeridos. Inténtalo de nuevo en un momento.</p>}
          {found.shownFor && <p className="small muted">No hubo coincidencias exactas; se muestran resultados para «{found.shownFor}».</p>}
          {none ? (
            <p className="muted">No encontré indicadores con ese nombre. Prueba con otras palabras, más cortas o en singular (por ejemplo «discapacidad», «vivienda» o «exportaciones»).</p>
          ) : (
            <ul className="inegi-results">
              {found.local.map((p) => <ResultItem key={p.id} r={p} onPick={load} disabled={busy} badge="Sugerido" />)}
              {found.live.map((r) => <ResultItem key={r.id} r={r} onPick={load} disabled={busy} />)}
            </ul>
          )}
          <p className="small muted">Solo se muestran indicadores con datos a nivel nacional.</p>
        </section>
      ) : (
        <section className="panel stack">
          <div>
            <h2 className="h3">Los 10 indicadores más consultados</h2>
            <p className="small muted">Según las visitas del Banco de Indicadores del INEGI. Toca uno para ver su gráfica.</p>
          </div>
          <ul className="inegi-top">
            {TOP10.map((t) => <TopCard key={t.id} t={t} active={series?.id === t.id} onPick={load} disabled={busy} />)}
          </ul>
          <div className="chips" role="group" aria-label="Otros indicadores sugeridos">
            <span className="small muted">También:</span>
            {PRESETS.map((p) => <button key={p.id} type="button" className={`chip ${series?.id === p.id ? 'active' : ''}`} disabled={busy} onClick={() => load(p)}>{p.short}</button>)}
          </div>
        </section>
      )}

      {series && (
        <section className="panel stack" aria-live="polite">
          <div className="row gap wrap between">
            <h2 className="h3">{series.title}</h2>
            <div className="row gap wrap">
              {yoy && (
                <div className="view-switch" role="group" aria-label="Vista">
                  <button type="button" className={view === 'base' ? 'active' : ''} onClick={() => setView('base')}>Valores</button>
                  <button type="button" className={view === 'yoy' ? 'active' : ''} onClick={() => setView('yoy')}>{series.yoy}</button>
                </div>
              )}
              <select value={years} onChange={(e) => setYears(Number(e.target.value))} aria-label="Periodo">
                {[3, 5, 10, 20, 100].map((n) => <option key={n} value={n}>{n === 100 ? 'Todo el historial' : `Últimos ${n} años`}</option>)}
              </select>
            </div>
          </div>
          {series.unit && <p className="small muted">Unidad: {series.unit}{series.freq ? ` · Frecuencia: ${series.freq.toLowerCase()}` : ''}</p>}
          <ChartBox option={option} height={360} label={`Gráfica de ${series.title}`} />
          {last && first && (
            <div className="phys-results">
              <div><dt>Último dato · {last.label}</dt><dd>{nf(last.v)}{pct ? ' %' : ''}</dd></div>
              <div><dt>Primer dato del periodo · {first.label}</dt><dd>{nf(first.v)}{pct ? ' %' : ''}</dd></div>
              <div><dt>Máximo del periodo</dt><dd>{nf(Math.max(...shown.map((o) => o.v)))}</dd></div>
              <div><dt>Mínimo del periodo</dt><dd>{nf(Math.min(...shown.map((o) => o.v)))}</dd></div>
            </div>
          )}
          {series.note && <p className="small muted">{series.note}</p>}
          {has.gemini && <button type="button" className="btn ghost" style={{ alignSelf: 'start' }} disabled={ai.loading} onClick={explain}><Sparkles size={15} aria-hidden="true" /> {ai.loading ? 'Analizando…' : 'Explícame este comportamiento'}</button>}
          {ai.text && <p className="pre repo-ai">{ai.text}</p>}
        </section>
      )}
      <p className="small muted">Fuente: INEGI, Banco de Indicadores.</p>
    </div>
  );
}
