import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';

// Graficadora con la API de Desmos. Necesita una llave (https://www.desmos.com/api):
// VITE_DESMOS_API_KEY. Solo en desarrollo se usa la llave de demostración pública de Desmos.
const DEMO_KEY = 'dcb31709b452b1cf9dc26972add0fda6';
const KEY = import.meta.env.VITE_DESMOS_API_KEY || (import.meta.env.DEV ? DEMO_KEY : '');
const SAVE = 'amati-desmos-state';

let loading = null;
function loadDesmos() {
  if (window.Desmos) return Promise.resolve(window.Desmos);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(KEY)}`;
    s.async = true;
    s.onload = () => resolve(window.Desmos);
    s.onerror = () => { loading = null; s.remove(); reject(new Error('No se pudo cargar Desmos. Revisa tu conexión.')); };
    document.head.appendChild(s);
  });
  return loading;
}

const EXAMPLES = [
  ['Parábola', 'y=x^2-4x+3'],
  ['Seno', 'y=2\\sin(x)'],
  ['Círculo', 'x^2+y^2=9'],
  ['Exponencial', 'y=e^x'],
  ['Recta con pendiente', 'y=mx+b'],
  ['Derivada de x³', 'y=\\frac{d}{dx}x^3'],
];

const readSaved = () => { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && Array.isArray(s.expressions?.list) ? s : null; } catch { return null; } };
const clearSaved = () => { try { localStorage.removeItem(SAVE); } catch { /* sin almacenamiento */ } };

export default function Grapher() {
  const host = useRef(null);
  const [calc, setCalc] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Cada instancia de Desmos se crea en su propio <div> nuevo y se retira al salir: así no se mezcla con restos de
  // otra instancia (el modo estricto de React monta, desmonta y vuelve a montar los componentes en desarrollo).
  useEffect(() => {
    if (!KEY) { setError('La graficadora no está disponible por ahora.'); return undefined; }
    let cancelled = false;
    let timer;
    let c = null;
    let el = null;
    setError('');
    loadDesmos().then((Desmos) => {
      if (cancelled || !host.current) return;
      el = document.createElement('div');
      el.style.cssText = 'width:100%;height:100%';
      host.current.appendChild(el);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const make = () => Desmos.GraphingCalculator(el, { language: 'es', keypad: true, expressions: true, settingsMenu: true, border: false, invertedColors: dark });
      try {
        c = make();
      } catch (e) {
        // Un intento más con una gráfica nueva (por si lo guardado estaba dañado)
        clearSaved();
        el.replaceChildren();
        c = make();
      }
      const saved = readSaved();
      try { if (saved) c.setState(saved); else c.setExpression({ id: 'f', latex: 'y=x^2' }); } catch { clearSaved(); c.setBlank(); c.setExpression({ id: 'f', latex: 'y=x^2' }); }
      // Se guarda tu gráfica en este dispositivo para que no la pierdas
      c.observeEvent('change', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { if (!cancelled) { try { localStorage.setItem(SAVE, JSON.stringify(c.getState())); } catch { /* sin almacenamiento */ } } }, 800);
      });
      setCalc(c);
    }).catch((e) => { if (!cancelled) setError(e.message || 'No se pudo iniciar la graficadora.'); });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setCalc(null);
      try { c?.destroy(); } catch { /* ya liberada */ }
      el?.remove();
    };
  }, [attempt]);

  const add = (latex) => { try { calc?.setExpression({ id: `e${Date.now()}`, latex }); } catch { /* ignorar */ } };
  const shot = () => {
    const url = calc?.screenshot({ width: 1000, height: 700, targetPixelRatio: 2 });
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = 'grafica.png'; a.click();
  };

  return (
    <div className="stack-lg">
      {error && (
        <p className="error" role="alert">
          {error} {KEY && <button type="button" className="link-btn" onClick={() => { clearSaved(); setAttempt((n) => n + 1); }}>Reintentar</button>}
        </p>
      )}
      <div className="row gap wrap">
        <span className="small muted">Agregar:</span>
        <div className="chips">{EXAMPLES.map(([n, l]) => <button key={n} type="button" className="chip" disabled={!calc} onClick={() => add(l)}>{n}</button>)}</div>
        <span className="grow" />
        <button type="button" className="btn small ghost" disabled={!calc} onClick={shot}><Camera size={14} aria-hidden="true" /> Guardar imagen</button>
        <button type="button" className="btn small ghost" disabled={!calc} onClick={() => { calc?.setBlank(); clearSaved(); }}><RotateCcw size={14} aria-hidden="true" /> Vaciar</button>
      </div>
      <div ref={host} className="desmos-host" aria-label="Graficadora Desmos" />
      <p className="small muted">Gráficas con la API de Desmos. Tu gráfica se guarda en este dispositivo.</p>
    </div>
  );
}
