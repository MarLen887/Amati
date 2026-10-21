import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import '../../styles/tutorial.css';

const PAD = 8; // aire alrededor del elemento resaltado

// Primer elemento visible de los selectores del paso (en celular el menú de escritorio está oculto, etc.)
function findTarget(step) {
  for (const sel of step.targets || []) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (el.getClientRects().length > 0 && r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

// Recorrido con globos: oscurece la pantalla, resalta la parte real y explica con «Siguiente» u «Omitir».
export default function TourOverlay({ step, index, total, onNext, onBack, onSkip, onHide, actions }) {
  const [rect, setRect] = useState(null); // null = sin objetivo (tarjeta central)
  const [ready, setReady] = useState(false);
  const pop = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const central = step.kind === 'welcome' || step.kind === 'final' || !rect;

  // Busca el objetivo (la pantalla puede tardar en cargar), lo trae a la vista y ESPERA a que su posición se
  // estabilice (animación de entrada, fuentes, datos que llegan…) antes de dibujar el recuadro: así nunca queda
  // un recuadro vacío en un lugar equivocado.
  useEffect(() => {
    setReady(false);
    setRect(null);
    if (step.kind) { setReady(true); return undefined; }
    let tries = 0;
    let stable = 0;
    let last = null;
    let scrolled = false;
    let timer;
    const same = (x, y) => Math.abs(x.top - y.top) < 1 && Math.abs(x.left - y.left) < 1 && Math.abs(x.width - y.width) < 1 && Math.abs(x.height - y.height) < 1;
    const look = () => {
      tries += 1;
      const el = findTarget(step);
      if (!el) {
        if (tries > 40) { setReady(true); return; } // no apareció: se muestra al centro
        timer = setTimeout(look, 100);
        return;
      }
      let r = el.getBoundingClientRect();
      // La barra superior es fija: lo que quede debajo de ella también cuenta como «fuera de la vista»
      const hiddenTop = document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0;
      if (!scrolled && (r.top < hiddenTop + 8 || r.bottom > window.innerHeight - 8)) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' }); // salto directo: el resaltado no «vuela» mientras la pantalla se mueve
        scrolled = true;
        r = el.getBoundingClientRect();
      }
      stable = last && same(last, r) ? stable + 1 : 0;
      last = r;
      if (stable >= 2 || tries > 40) { setRect(r); setReady(true); return; } // misma posición en 3 mediciones seguidas
      timer = setTimeout(look, 100);
    };
    look();
    return () => clearTimeout(timer);
  }, [step]);

  // Mantiene el resaltado pegado al elemento si se mueve la pantalla
  const refresh = useCallback(() => {
    if (step.kind || !ready) return; // antes de estar listo, la medida inicial manda
    const el = findTarget(step);
    const r = el ? el.getBoundingClientRect() : null;
    setRect((prev) => (prev && r && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5 ? prev : r));
  }, [step, ready]);
  useEffect(() => {
    if (!ready || step.kind) return undefined;
    let raf;
    const until = performance.now() + 2000;
    const tick = () => { refresh(); if (performance.now() < until) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, step, refresh]);
  useEffect(() => {
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    const timer = setInterval(refresh, 300); // por si la pantalla cambia de tamaño al terminar de cargar
    return () => { clearInterval(timer); window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true); };
  }, [refresh]);

  // Posición del globo: debajo del elemento si cabe; si no, arriba; siempre dentro de la pantalla
  useLayoutEffect(() => {
    if (!ready || central || !pop.current) return;
    const w = pop.current.offsetWidth;
    const h = pop.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = rect.bottom + PAD + 12;
    const top = below + h <= vh - 12 ? below : Math.max(12, rect.top - PAD - 12 - h);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), vw - w - 12);
    setPos({ top, left });
  }, [ready, central, rect, step]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onSkip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  useEffect(() => { if (ready) pop.current?.querySelector('[data-tour-next]')?.focus({ preventScroll: true }); }, [ready, step]);

  const last = index === total - 1;

  return (
    <div className="tour-layer" role="presentation">
      {/* Con objetivo: el recorte iluminado hace de fondo oscuro; sin objetivo: fondo oscuro normal */}
      {ready && rect && !central ? (
        <div className="tour-spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : <div className="tour-dim" />}

      {ready && (
        <div
          ref={pop}
          className={`tour-pop ${central ? 'central' : ''}`}
          style={central ? undefined : { top: pos.top, left: pos.left }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-live="polite"
        >
          {step.kind === 'welcome' && <Sparkles size={22} className="tour-icon" aria-hidden="true" />}
          <h2 id="tour-title" className="h3">{step.title}</h2>
          <p>{step.text}</p>

          {step.kind === 'final' ? (
            <div className="stack-sm">
              {actions.hasSubjects ? (
                <button type="button" data-tour-next className="btn primary" onClick={actions.finish}>Empezar a estudiar</button>
              ) : (
                <>
                  <button type="button" data-tour-next className="btn primary" onClick={actions.createSubject}>Crear mi primera materia</button>
                  <button type="button" className="btn ghost" onClick={actions.createSample}><Sparkles size={16} aria-hidden="true" /> Probar con una materia de ejemplo</button>
                  <button type="button" className="btn link" onClick={actions.finish}>Ahora no</button>
                </>
              )}
              {onHide && <button type="button" className="btn link" onClick={onHide}>No volver a mostrar</button>}
            </div>
          ) : (
            <div className="tour-actions">
              {onHide && <button type="button" className="btn link" onClick={onHide}>No volver a mostrar</button>}
              <span className="grow" />
              {index > 0 && <button type="button" className="btn link" onClick={onBack}>Atrás</button>}
              <button type="button" className="btn ghost small" onClick={onSkip}>Omitir</button>
              <button type="button" data-tour-next className="btn primary small" onClick={onNext}>
                {last ? 'Terminar' : 'Siguiente'} <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
