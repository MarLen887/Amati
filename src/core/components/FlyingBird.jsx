import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Hummingbird from './Hummingbird.jsx';
import { useBirdEnabled } from '../lib/birdPref.js';
import { usePomodoro } from '../../features/pomodoro/PomodoroContext.jsx';
import { useTutorial } from '../../features/tutorial/TutorialContext.jsx';

// Colibrí compañero: cada ~20 s cruza la pantalla de un lado al otro y, en cada cruce, sube (o baja) solo un poco,
// así va escalando de a poco hasta arriba y luego baja igual. Al posarse mira hacia adentro.
// No recibe clics, se oculta mientras estudias o editas, y respeta «reducir movimiento».
const FOCUS = ['/estudiar', '/pomodoro', '/apuntes/', '/clases/', '/herramientas/', '/biblioteca/pdf/']; // pantallas de concentración
const EVERY = 20_000; // entre saltos
const JITTER = 2_000; // ±, para que no parezca un reloj (cada 18–22 s)
const MARGIN = 14; // distancia al borde
const SIZE = 56;
const TOPBAR = 70; // no sube por encima de la barra superior

const isFocusRoute = (p) => FOCUS.some((f) => p.startsWith(f));
const rand = (a, b) => a + Math.random() * (b - a);

// Zona por la que pasea: x desde la izquierda, y desde abajo (en el celular solo hasta la mitad, para no tapar el texto)
function area() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const yMax = w < 640 ? Math.min(h - TOPBAR - SIZE - MARGIN, h * 0.5) : h - TOPBAR - SIZE - MARGIN;
  return { xMin: MARGIN, xMax: w - SIZE - MARGIN, yMin: MARGIN, yMax: Math.max(MARGIN + 60, yMax) };
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function FlyingBird() {
  const enabled = useBirdEnabled();
  const { pathname } = useLocation();
  const { state: pomo } = usePomodoro() || {};
  const tutorial = useTutorial();
  const [face, setFace] = useState('left'); // hacia dónde mira (hacia donde seguirá su paseo)
  const [flying, setFlying] = useState(false);
  const box = useRef(null);
  const pos = useRef(null); // { x, y, dirX, dirY }: x desde la izquierda, y desde abajo, en píxeles
  const flyingRef = useRef(false);

  const pillShown = Boolean(pomo?.active && pomo.phase !== 'ended' && pathname !== '/pomodoro');
  const hidden = !enabled || isFocusRoute(pathname) || pillShown || Boolean(tutorial?.active);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  useEffect(() => {
    if (hidden) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined; // sin movimiento: se queda posado
    let timer;
    let anim;

    function schedule() {
      timer = setTimeout(hop, EVERY + (Math.random() * 2 - 1) * JITTER);
    }

    function hop() {
      const el = box.current;
      if (!el || document.hidden || hiddenRef.current || flyingRef.current) return schedule();
      const a = area();
      if (!pos.current) {
        // Primera vez: parte de donde está (abajo a la derecha), rumbo a la izquierda y hacia arriba
        const r = el.getBoundingClientRect();
        pos.current = { x: r.left, y: window.innerHeight - r.bottom, dirX: -1, dirY: 1 };
      }
      const p = pos.current;
      p.x = clamp(p.x, a.xMin, a.xMax);
      p.y = clamp(p.y, a.yMin, a.yMax);

      // Cruza de un lado al otro (de extremo a extremo) y en cada cruce sube o baja solo un poco
      const nx = p.dirX > 0 ? a.xMax : a.xMin;
      let ny = p.y + p.dirY * (a.yMax - a.yMin) * rand(0.08, 0.14);
      const dirX = -p.dirX; // al llegar, la siguiente vez va hacia el lado contrario
      let { dirY } = p;
      if (ny <= a.yMin) { ny = a.yMin; dirY = 1; } else if (ny >= a.yMax) { ny = a.yMax; dirY = -1; }

      const dx = nx - p.x;
      const dy = p.y - ny; // positivo = baja
      const arc = rand(14, 26); // pequeña curva hacia arriba en el camino
      const frame = (t) => ({ transform: `translate(${(dx * t).toFixed(1)}px, ${(dy * t - arc * Math.sin(Math.PI * t)).toFixed(1)}px)`, offset: t });

      // Se pasa a posición por píxeles (sin cambiar lo que se ve) para poder moverlo a cualquier punto
      el.style.right = 'auto';
      el.style.left = `${p.x}px`;
      el.style.bottom = `${p.y}px`;
      flyingRef.current = true;
      setFlying(true);
      setFace(dx >= 0 ? 'right' : 'left'); // mira hacia donde va
      anim = el.animate([0, 0.25, 0.5, 0.75, 1].map(frame), { duration: rand(3800, 5000), easing: 'ease-in-out', fill: 'forwards' });
      anim.onfinish = () => {
        // Se fija la posición nueva antes de quitar la animación, para que no dé un salto
        el.style.left = `${nx}px`;
        el.style.bottom = `${ny}px`;
        anim.cancel();
        anim = null;
        pos.current = { x: nx, y: ny, dirX, dirY };
        setFace(dirX > 0 ? 'right' : 'left'); // posado, mira hacia donde seguirá (en un borde, da la vuelta)
        flyingRef.current = false;
        setFlying(false);
        schedule();
      };
    }

    schedule();
    return () => {
      clearTimeout(timer);
      if (anim) { anim.onfinish = null; anim.cancel(); }
      flyingRef.current = false;
      setFlying(false);
    };
  }, [hidden]);

  return (
    <div ref={box} className={`flying-bird at-right ${flying ? 'is-flying' : 'is-perched'} ${hidden ? 'is-hidden' : ''}`} aria-hidden="true">
      <div className={`flying-bird-face face-${face}`}>
        <Hummingbird size={SIZE} />
      </div>
    </div>
  );
}
