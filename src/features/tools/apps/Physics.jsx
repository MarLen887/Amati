import { useEffect, useMemo, useRef, useState } from 'react';
import Physics from 'physicsjs/dist/physicsjs-full.js';
import { Pause, Play, RotateCcw } from 'lucide-react';

// Simulador de física con PhysicsJS: tiro parabólico (cinemática) y colisiones entre dos cuerpos.
// Escala: 1 m = PX píxeles. PhysicsJS trabaja en px y ms, por eso se convierten las unidades.
const PX = 8;
const W = 760;
const H = 360;
const GROUND = 24; // píxeles de suelo

const num = (v, d) => (Number.isFinite(+v) && v !== '' ? +v : d);

function Field({ label, value, onChange, step = 1, min, max, unit }) {
  return (
    <label className="phys-field">
      <span className="small">{label}{unit ? ` (${unit})` : ''}</span>
      <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// ---------- Tiro parabólico ----------
function Projectile() {
  const [v0, setV0] = useState(30);
  const [ang, setAng] = useState(45);
  const [h0, setH0] = useState(0);
  const [g, setG] = useState(9.81);
  const [run, setRun] = useState(0); // cada cambio reinicia la simulación
  const [paused, setPaused] = useState(false);
  const canvas = useRef(null);
  const world = useRef(null);
  const [live, setLive] = useState({ t: 0, x: 0, y: 0 });

  const th = (num(ang, 45) * Math.PI) / 180;
  const calc = useMemo(() => {
    const v = num(v0, 0), gg = Math.max(0.1, num(g, 9.81)), h = Math.max(0, num(h0, 0));
    const vx = v * Math.cos(th), vy = v * Math.sin(th);
    const tFlight = (vy + Math.sqrt(vy * vy + 2 * gg * h)) / gg;
    return { vx, vy, tFlight, range: vx * tFlight, hMax: h + (vy > 0 ? (vy * vy) / (2 * gg) : 0), tTop: vy > 0 ? vy / gg : 0, vImpact: Math.hypot(vx, vy - gg * tFlight) };
  }, [v0, g, h0, th]);

  useEffect(() => {
    const cv = canvas.current;
    const v = num(v0, 0), gg = Math.max(0.1, num(g, 9.81)), h = Math.max(0, num(h0, 0));
    let stop = false;
    // La escala se ajusta para que toda la trayectoria quepa en el recuadro
    const sy = v * Math.sin(th), est = (sy + Math.sqrt(sy * sy + 2 * gg * h)) / gg;
    const PX = Math.max(0.25, Math.min(8, (W - 80) / Math.max(v * Math.cos(th) * est, 20), (H - GROUND - 30) / Math.max(h + (sy > 0 ? (sy * sy) / (2 * gg) : 0), 10)));
    const stepM = [10, 20, 50, 100, 200, 500].find((m) => m * PX >= 45) || 1000;
    Physics({ timestep: 1000 / 60 }, (w) => {
      world.current = w;
      const renderer = Physics.renderer('canvas', { el: cv, width: W, height: H, meta: false, styles: { circle: { strokeStyle: '#e5683c', lineWidth: 1, fillStyle: '#e5683c', angleIndicator: '#fff' } } });
      w.add(renderer);
      renderer.resize(W, H); // si no, toma el tamaño del contenedor
      const x0 = 40, y0 = H - GROUND - h * PX - 8;
      const ball = Physics.body('circle', { x: x0, y: y0, vx: (v * Math.cos(th) * PX) / 1000, vy: (-v * Math.sin(th) * PX) / 1000, radius: 8, restitution: 0 });
      w.add(ball);
      w.add(Physics.behavior('constant-acceleration', { acc: { x: 0, y: (gg * PX) / 1e6 } }));
      const trail = [];
      let landed = false, t = 0;
      w.on('step', () => {
        if (landed) return;
        t += 1000 / 60 / 1000;
        const p = ball.state.pos;
        if (p.y >= H - GROUND - 8 && t > 0.05) {
          landed = true;
          ball.state.pos.set(p.x, H - GROUND - 8); ball.state.vel.set(0, 0); ball.state.acc.set(0, 0);
        }
        trail.push([ball.state.pos.x, ball.state.pos.y]);
        setLive({ t, x: (ball.state.pos.x - x0) / PX, y: (H - GROUND - 8 - ball.state.pos.y) / PX });
      });
      // Suelo, regla y trayectoria teórica se dibujan encima de lo que pinta PhysicsJS
      w.on('render', () => {
        const ctx = renderer.ctx;
        const dark = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#222';
        ctx.save();
        ctx.fillStyle = '#16a34a'; ctx.fillRect(0, H - GROUND, W, GROUND);
        ctx.strokeStyle = '#8e93b0'; ctx.fillStyle = dark; ctx.font = '11px sans-serif'; ctx.lineWidth = 1;
        for (let m = 0; m * PX + x0 < W; m += stepM) { const x = x0 + m * PX; ctx.beginPath(); ctx.moveTo(x, H - GROUND); ctx.lineTo(x, H - GROUND + 6); ctx.stroke(); ctx.fillText(`${m} m`, x - 8, H - 6); }
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#4f5bd5'; ctx.beginPath();
        const T = (v * Math.sin(th) + Math.sqrt((v * Math.sin(th)) ** 2 + 2 * gg * h)) / gg;
        for (let s = 0; s <= T + 1e-6; s += T / 80) {
          const x = x0 + v * Math.cos(th) * s * PX, y = H - GROUND - 8 - (h + v * Math.sin(th) * s - 0.5 * gg * s * s) * PX;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(229,104,60,.35)'; trail.forEach(([x, y], i) => i % 4 === 0 && ctx.fillRect(x - 1, y - 1, 3, 3));
        ctx.restore();
      });
      w.on('step', () => !stop && w.render());
      const tick = (time) => { if (stop) return; if (!paused) w.step(time); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    return () => { stop = true; world.current?.destroy?.(); cv?.replaceChildren?.(); };
  }, [v0, ang, h0, g, run, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="phys-grid">
          <Field label="Velocidad inicial" unit="m/s" value={v0} onChange={setV0} min={0} max={80} />
          <Field label="Ángulo" unit="°" value={ang} onChange={setAng} min={0} max={90} />
          <Field label="Altura inicial" unit="m" value={h0} onChange={setH0} min={0} max={40} />
          <Field label="Gravedad" unit="m/s²" value={g} onChange={setG} step={0.01} min={0.5} max={30} />
        </div>
        <div className="chips">
          {[['Tierra', 9.81], ['Luna', 1.62], ['Marte', 3.71], ['Júpiter', 24.79]].map(([n, val]) => <button key={n} type="button" className={`chip ${+g === val ? 'active' : ''}`} onClick={() => setG(val)}>{n}</button>)}
        </div>
      </section>
      <section className="panel stack">
        <div ref={canvas} className="phys-canvas" role="img" aria-label="Simulación del tiro parabólico" />
        <div className="row gap">
          <button type="button" className="btn ghost" onClick={() => { setPaused(false); setRun((r) => r + 1); }}><RotateCcw size={14} aria-hidden="true" /> Repetir</button>
          <button type="button" className="btn ghost" onClick={() => setPaused((p) => !p)}>{paused ? <><Play size={14} aria-hidden="true" /> Seguir</> : <><Pause size={14} aria-hidden="true" /> Pausar</>}</button>
          <span className="small muted mono-ish">t = {live.t.toFixed(2)} s · x = {live.x.toFixed(1)} m · y = {Math.max(0, live.y).toFixed(1)} m</span>
        </div>
      </section>
      <section className="panel stack">
        <h2 className="h3">Resultados</h2>
        <dl className="phys-results">
          <div><dt>Alcance</dt><dd>{calc.range.toFixed(2)} m</dd></div>
          <div><dt>Altura máxima</dt><dd>{calc.hMax.toFixed(2)} m</dd></div>
          <div><dt>Tiempo de vuelo</dt><dd>{calc.tFlight.toFixed(2)} s</dd></div>
          <div><dt>Tiempo a la altura máx.</dt><dd>{calc.tTop.toFixed(2)} s</dd></div>
          <div><dt>vₓ (constante)</dt><dd>{calc.vx.toFixed(2)} m/s</dd></div>
          <div><dt>v al impactar</dt><dd>{calc.vImpact.toFixed(2)} m/s</dd></div>
        </dl>
        <p className="small muted">x(t) = v₀·cosθ·t · y(t) = h₀ + v₀·senθ·t − ½·g·t². La línea punteada es la trayectoria teórica; la bola la calcula PhysicsJS.</p>
      </section>
    </div>
  );
}

// ---------- Colisiones ----------
function Collisions() {
  const [m1, setM1] = useState(2);
  const [v1, setV1] = useState(6);
  const [m2, setM2] = useState(1);
  const [v2, setV2] = useState(-3);
  const [e, setE] = useState(1);
  const [run, setRun] = useState(0);
  const canvas = useRef(null);
  const [vel, setVel] = useState(null);

  const M1 = Math.max(0.1, num(m1, 1)), M2 = Math.max(0.1, num(m2, 1)), V1 = num(v1, 0), V2 = num(v2, 0), E = Math.min(1, Math.max(0, num(e, 1)));
  const after = useMemo(() => ({
    u1: (M1 * V1 + M2 * V2 + M2 * E * (V2 - V1)) / (M1 + M2),
    u2: (M1 * V1 + M2 * V2 + M1 * E * (V1 - V2)) / (M1 + M2),
    p: M1 * V1 + M2 * V2,
    k0: 0.5 * M1 * V1 ** 2 + 0.5 * M2 * V2 ** 2,
  }), [M1, M2, V1, V2, E]);
  const k1 = 0.5 * M1 * after.u1 ** 2 + 0.5 * M2 * after.u2 ** 2;

  useEffect(() => {
    const cv = canvas.current;
    let stop = false;
    setVel(null);
    Physics({ timestep: 1000 / 60 }, (w) => {
      const renderer = Physics.renderer('canvas', { el: cv, width: W, height: 200, meta: false, styles: { circle: { strokeStyle: '#222', lineWidth: 1, fillStyle: '#4f5bd5' } } });
      w.add(renderer);
      renderer.resize(W, 200);
      const r = (m) => 12 + 6 * Math.sqrt(m);
      const a = Physics.body('circle', { x: 110, y: 100, vx: (V1 * PX) / 1000 * 1.2, vy: 0, radius: r(M1), mass: M1, restitution: E, cof: 0, styles: { fillStyle: '#e5683c', strokeStyle: '#222' } });
      const b = Physics.body('circle', { x: W - 110, y: 100, vx: (V2 * PX) / 1000 * 1.2, vy: 0, radius: r(M2), mass: M2, restitution: E, cof: 0, styles: { fillStyle: '#4f5bd5', strokeStyle: '#222' } });
      w.add([a, b]);
      w.add(Physics.behavior('body-collision-detection'));
      w.add(Physics.behavior('sweep-prune'));
      w.add(Physics.behavior('body-impulse-response'));
      let hit = false;
      w.on('collisions:detected', () => { if (!hit) { hit = true; setTimeout(() => setVel([a.state.vel.x * 1000 / PX / 1.2, b.state.vel.x * 1000 / PX / 1.2]), 60); } });
      w.on('step', () => {
        for (const o of [a, b]) {
          if (o.state.pos.x < -200 || o.state.pos.x > W + 200) { o.state.pos.set(o.state.pos.x < 0 ? W + 150 : -150, 100); }
        }
        w.render();
      });
      w.on('render', () => { const ctx = renderer.ctx; ctx.save(); ctx.strokeStyle = '#8e93b0'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(0, 100 + 6); ctx.lineTo(W, 106); ctx.stroke(); ctx.restore(); });
      const tick = (t) => { if (stop) return; w.step(t); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    return () => { stop = true; cv?.replaceChildren?.(); };
  }, [M1, M2, V1, V2, E, run]);

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="phys-grid">
          <Field label="Masa 1 (naranja)" unit="kg" value={m1} onChange={setM1} min={0.1} step={0.5} />
          <Field label="Velocidad 1" unit="m/s" value={v1} onChange={setV1} />
          <Field label="Masa 2 (azul)" unit="kg" value={m2} onChange={setM2} min={0.1} step={0.5} />
          <Field label="Velocidad 2" unit="m/s" value={v2} onChange={setV2} />
        </div>
        <label className="phys-field">
          <span className="small">Elasticidad: {E === 1 ? 'elástico' : E === 0 ? 'perfectamente inelástico' : `e = ${E.toFixed(2)}`}</span>
          <input type="range" min={0} max={1} step={0.05} value={E} onChange={(ev) => setE(ev.target.value)} />
        </label>
      </section>
      <section className="panel stack">
        <div ref={canvas} className="phys-canvas" role="img" aria-label="Simulación de colisión" />
        <div className="row gap">
          <button type="button" className="btn ghost" onClick={() => setRun((r) => r + 1)}><RotateCcw size={14} aria-hidden="true" /> Repetir</button>
          {vel && <span className="small muted mono-ish">Simulado: v₁′ = {vel[0].toFixed(2)} m/s · v₂′ = {vel[1].toFixed(2)} m/s</span>}
        </div>
      </section>
      <section className="panel stack">
        <h2 className="h3">Antes y después</h2>
        <dl className="phys-results">
          <div><dt>Momento total</dt><dd>{after.p.toFixed(2)} kg·m/s</dd></div>
          <div><dt>v₁ después</dt><dd>{after.u1.toFixed(2)} m/s</dd></div>
          <div><dt>v₂ después</dt><dd>{after.u2.toFixed(2)} m/s</dd></div>
          <div><dt>Energía cinética antes</dt><dd>{after.k0.toFixed(2)} J</dd></div>
          <div><dt>Energía cinética después</dt><dd>{k1.toFixed(2)} J</dd></div>
          <div><dt>Energía perdida</dt><dd>{(after.k0 - k1).toFixed(2)} J</dd></div>
        </dl>
        <p className="small muted">Se conserva el momento (m₁v₁ + m₂v₂). La energía solo se conserva si el choque es elástico.</p>
      </section>
    </div>
  );
}

export default function PhysicsTool() {
  const [mode, setMode] = useState('proj');
  return (
    <div className="stack-lg">
      <div className="view-switch" role="group" aria-label="Simulación" style={{ alignSelf: 'start' }}>
        <button type="button" className={mode === 'proj' ? 'active' : ''} aria-pressed={mode === 'proj'} onClick={() => setMode('proj')}>Tiro parabólico</button>
        <button type="button" className={mode === 'col' ? 'active' : ''} aria-pressed={mode === 'col'} onClick={() => setMode('col')}>Colisiones</button>
      </div>
      {mode === 'proj' ? <Projectile /> : <Collisions />}
    </div>
  );
}
