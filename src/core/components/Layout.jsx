import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Logo from './Logo.jsx';
import { ChartLine, GraduationCap, House, Library, NotebookPen, User, Wrench } from 'lucide-react';
import Ambient from './Ambient.jsx';
import PomodoroPill from '../../features/pomodoro/PomodoroPill.jsx';

// Navegación centrada en lo que el estudiante quiere hacer.
// `match`: rutas que mantienen activa la pestaña (p. ej. una sesión de estudio sigue siendo «Estudiar»).
const NAV = [
  { to: '/', label: 'Inicio', Icon: House, match: [] },
  { to: '/tecnicas', label: 'Estudiar', Icon: GraduationCap, match: ['/tecnicas', '/estudiar', '/pomodoro', '/materias'] },
  { to: '/biblioteca', label: 'Biblioteca', Icon: Library, match: ['/biblioteca'] },
  { to: '/apuntes', label: 'Apuntes', Icon: NotebookPen, match: ['/apuntes', '/clases'] },
  { to: '/herramientas', label: 'Herramientas', Icon: Wrench, match: ['/herramientas'] },
  { to: '/progreso', label: 'Progreso', Icon: ChartLine, match: ['/progreso'] },
  { to: '/perfil', label: 'Perfil', Icon: User, match: ['/perfil', '/admin'] },
];

const isActive = (n, pathname) =>
  n.to === '/' ? pathname === '/' : n.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

export default function Layout() {
  const { profile } = useAuth();
  const { dueCards } = useData();
  const inApp = profile?.reminders?.inApp !== false;
  const due = dueCards.length;
  const { pathname } = useLocation();

  // Notificación dentro de la app: contador discreto en la pestaña del navegador.
  useEffect(() => {
    document.title = inApp && due > 0 ? `(${due}) Amati` : 'Amati';
  }, [due, inApp]);

  return (
    <div className="app-shell">
      <Ambient />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Amati, ir al inicio">
          <Logo size={34} withText />
        </Link>
        <nav className="top-nav" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`nav-link ${isActive(n, pathname) ? 'active' : ''}`}
              aria-current={isActive(n, pathname) ? 'page' : undefined}>
              {n.label}
              {n.to === '/' && inApp && due > 0 && <span className="badge">{due}</span>}
            </Link>
          ))}
        </nav>
      </header>

      {/* key: cada cambio de pantalla vuelve a reproducir la animación de entrada */}
      <main className="content page-enter" key={pathname}>
        <Outlet />
      </main>

      <PomodoroPill />

      <nav className="bottom-nav" aria-label="Principal móvil">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`bottom-link ${isActive(n, pathname) ? 'active' : ''}`}
            aria-current={isActive(n, pathname) ? 'page' : undefined}>
            <n.Icon className="bottom-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
            <span>{n.label}</span>
            {n.to === '/' && inApp && due > 0 && <span className="badge dot">{due}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
