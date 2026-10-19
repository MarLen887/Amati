import { useEffect, useMemo, useRef, useState } from 'react';
// Se usa la versión ya compilada de TimelineJS (trae sus propias fuentes e íconos); define la variable global TL
import timelineSource from '@knight-lab/timelinejs/dist/js/timeline.js?raw';
import '@knight-lab/timelinejs/dist/css/timeline.css';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { download } from '../lib/theme.js';

// Líneas de tiempo con TimelineJS: agrega eventos con fecha y se dibuja una línea de tiempo navegable.
const KEY = 'amati-timeline-data';

function getTimeline() {
  if (!window.TL) {
    const s = document.createElement('script');
    s.textContent = timelineSource;
    document.head.appendChild(s);
  }
  return window.TL.Timeline;
}

const SAMPLE = {
  title: 'Revolución Mexicana',
  events: [
    { id: 'e1', year: '1910', month: '11', day: '20', headline: 'Inicio de la Revolución', text: 'Francisco I. Madero convoca al levantamiento armado con el Plan de San Luis.', media: '' },
    { id: 'e2', year: '1913', month: '2', day: '', headline: 'Decena Trágica', text: 'Golpe de Estado contra Madero y ascenso de Victoriano Huerta.', media: '' },
    { id: 'e3', year: '1914', month: '8', day: '', headline: 'Convención de Aguascalientes', text: 'Las facciones revolucionarias intentan acordar un proyecto común.', media: '' },
    { id: 'e4', year: '1917', month: '2', day: '5', headline: 'Constitución de 1917', text: 'Se promulga la Constitución Política de los Estados Unidos Mexicanos.', media: '' },
  ],
};

const newEvent = () => ({ id: `e${Date.now().toString(36)}`, year: '', month: '', day: '', headline: '', text: '', media: '' });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.events) return s;
  } catch { /* sin datos guardados */ }
  return SAMPLE;
}

// Formato que entiende TimelineJS
function toTimelineData(title, events) {
  const valid = events.filter((e) => /^-?\d{1,5}$/.test(e.year.trim()) && e.headline.trim());
  return {
    title: { text: { headline: title || 'Mi línea de tiempo', text: '' } },
    events: valid.map((e) => ({
      start_date: {
        year: Number(e.year),
        ...(e.month ? { month: Number(e.month) } : {}),
        ...(e.day && e.month ? { day: Number(e.day) } : {}),
      },
      text: { headline: e.headline.trim(), text: e.text.trim() },
      ...(/^https?:\/\//i.test(e.media.trim()) ? { media: { url: e.media.trim() } } : {}),
    })),
  };
}

export default function TimelineTool() {
  const initial = useMemo(load, []);
  const [title, setTitle] = useState(initial.title || '');
  const [events, setEvents] = useState(initial.events);
  const [msg, setMsg] = useState('');
  const host = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ title, events })); } catch { /* sin almacenamiento */ }
  }, [title, events]);

  const data = useMemo(() => toTimelineData(title, events), [title, events]);

  // TimelineJS no se actualiza: se vuelve a crear cuando cambian los datos (con una pausa para no redibujar en cada letra)
  useEffect(() => {
    const el = host.current;
    if (!el || data.events.length === 0) return undefined;
    const t = setTimeout(() => {
      el.innerHTML = '';
      try {
        const Timeline = getTimeline();
        // eslint-disable-next-line no-new
        new Timeline(el, data, { language: 'es', timenav_height_percentage: 45, hash_bookmark: false, initial_zoom: 2 });
      } catch {
        setMsg('No se pudo dibujar la línea de tiempo. Revisa las fechas.');
      }
    }, 500);
    return () => { clearTimeout(t); el.innerHTML = ''; };
  }, [data]);

  const patch = (id, field, value) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  const sorted = [...events].sort((a, b) => Number(a.year || 0) - Number(b.year || 0));

  function importJson(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.events)) throw new Error();
        setTitle(d.title || '');
        setEvents(d.events.map((x) => ({ ...newEvent(), ...x, id: x.id || newEvent().id })));
        setMsg('Línea de tiempo cargada.');
      } catch {
        setMsg('El archivo no es una línea de tiempo válida.');
      }
    });
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <label>
          <span className="side-title">Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Ej. Historia de la medicina" />
        </label>
        <div className="row gap wrap">
          <button type="button" className="btn small ghost" onClick={() => setEvents((es) => [...es, newEvent()])}><Plus size={14} aria-hidden="true" /> Agregar evento</button>
          <button type="button" className="btn small ghost" onClick={() => { if (confirm('Se reemplazará lo actual con un ejemplo. ¿Continuar?')) { setTitle(SAMPLE.title); setEvents(SAMPLE.events); } }}>Ver ejemplo</button>
          <span className="grow" />
          <button type="button" className="btn small ghost" onClick={() => download('linea-de-tiempo.json', JSON.stringify({ title, events }, null, 2), 'application/json')}>
            <Download size={14} aria-hidden="true" /> Guardar archivo
          </button>
          <label className="btn small ghost"><Upload size={14} aria-hidden="true" /> Abrir
            <input type="file" accept="application/json,.json" hidden onChange={importJson} />
          </label>
        </div>
        {msg && <p className="notice small" role="status">{msg}</p>}

        <ul className="timeline-events">
          {sorted.map((e) => (
            <li key={e.id} className="timeline-event">
              <div className="timeline-date">
                <input aria-label="Año" placeholder="Año" inputMode="numeric" value={e.year} onChange={(ev) => patch(e.id, 'year', ev.target.value.replace(/[^\d-]/g, ''))} maxLength={6} />
                <input aria-label="Mes (opcional)" placeholder="Mes" inputMode="numeric" value={e.month} onChange={(ev) => patch(e.id, 'month', ev.target.value.replace(/\D/g, '').slice(0, 2).replace(/^(1[3-9]|[2-9]\d?)$/, ''))} maxLength={2} />
                <input aria-label="Día (opcional)" placeholder="Día" inputMode="numeric" value={e.day} onChange={(ev) => patch(e.id, 'day', ev.target.value.replace(/\D/g, '').slice(0, 2))} maxLength={2} />
              </div>
              <input aria-label="Título del evento" placeholder="Título del evento" value={e.headline} maxLength={120} onChange={(ev) => patch(e.id, 'headline', ev.target.value)} />
              <textarea aria-label="Descripción" placeholder="Descripción (opcional)" rows={2} value={e.text} maxLength={600} onChange={(ev) => patch(e.id, 'text', ev.target.value)} />
              <input aria-label="Enlace de imagen o video (opcional)" placeholder="Enlace de imagen o video (opcional)" value={e.media} onChange={(ev) => patch(e.id, 'media', ev.target.value)} />
              <button type="button" className="btn small ghost danger" onClick={() => setEvents((es) => es.filter((x) => x.id !== e.id))}>
                <Trash2 size={14} aria-hidden="true" /> Quitar
              </button>
            </li>
          ))}
        </ul>
        {events.length === 0 && <p className="small muted">Agrega tu primer evento. Solo necesitas el año y un título.</p>}
      </section>

      {data.events.length > 0 ? (
        <div className="timeline-host"><div ref={host} className="timeline-inner" /></div>
      ) : (
        <p className="muted small">La línea de tiempo aparece cuando un evento tiene año y título.</p>
      )}
      <p className="small muted">Tu línea de tiempo se guarda en este dispositivo. Usa «Guardar archivo» para conservar una copia.</p>
    </div>
  );
}
