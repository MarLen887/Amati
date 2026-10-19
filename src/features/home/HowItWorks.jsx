import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BookOpen, Compass, Brain, CalendarClock, Sparkles, Wind } from 'lucide-react';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { createSampleSubject, updateProfile } from '../../core/data/db.js';

const STEPS = [
  {
    Icon: BookOpen,
    title: 'Crea una materia y su contenido',
    text: 'Primero la materia (solo el nombre). Luego agrega tarjetas, importa varias de golpe o toma apuntes. El botón «Crear» de arriba siempre está a la mano.',
  },
  {
    Icon: Compass,
    title: 'Elige tu técnica de estudio',
    text: 'No hay una única forma de aprender. Cada vez que estudies elegirás: repetición espaciada, Leitner, recuperación, Feynman, Cornell, PQ4R y más. Usa la que te acomode.',
  },
  {
    Icon: Wind,
    title: 'Respira antes de empezar',
    text: 'Antes de repasar tendrás 15 segundos de respiración guiada (opcional).',
  },
  {
    Icon: Brain,
    title: 'Intenta recordar y califica',
    text: 'Piensa la respuesta, dale la vuelta a la tarjeta e indica si te resultó Difícil, Bien o Fácil.',
  },
  {
    Icon: CalendarClock,
    title: 'Amati decide cuándo repasar',
    text: 'Lo difícil vuelve pronto; lo fácil, en más días. Así estudias poco cada día y evitas la desvelada antes del examen.',
  },
];

export default function HowItWorks({ firstTime = false }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  async function finish(withSample = false) {
    setBusy(true);
    try {
      if (withSample) await createSampleSubject(user.uid);
      if (firstTime) await updateProfile(user.uid, { onboarded: true });
      nav(withSample ? '/' : firstTime ? '/materias' : '/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg narrow">
      <section>
        <h1>{firstTime ? 'Bienvenido a Amati' : '¿Cómo funciona Amati?'}</h1>
        <p className="muted">
          Amati reúne técnicas de estudio con respaldo científico, como la <strong>repetición espaciada</strong>:
          repasar en intervalos cada vez más largos ayuda a recordar a largo plazo con menos esfuerzo. Sin puntos, sin rankings, sin presión.
        </p>
      </section>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={i} className="step">
            <span className="step-icon" aria-hidden="true"><s.Icon size={22} strokeWidth={1.8} /></span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="stack">
        <button className="btn primary lg" disabled={busy} onClick={() => finish(false)}>
          {firstTime ? 'Crear mi primera materia' : 'Entendido'}
        </button>
        {firstTime && (
          <button className="btn ghost lg" disabled={busy} onClick={() => finish(true)}>
            <Sparkles size={18} aria-hidden="true" /> Probar primero con 5 tarjetas de ejemplo
          </button>
        )}
      </div>
    </div>
  );
}
