import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Logo from './Logo.jsx';
import { BookOpen, ChartLine, House, Settings as SettingsIcon } from 'lucide-react';
import Ambient from './Ambient.jsx';
import { ThemeSwitcher } from '../context/ThemeContext.jsx';
import PomodoroPill from './PomodoroPill.jsx';

const NAV = [
  { to: '/', label: 'Hoy', Icon: House, end: true },
  { to: '/materias', label: 'Materias', Icon: BookOpen },
  { to: '/progreso', label: 'Progreso', Icon: ChartLine },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon },
];

export default function Layout() {
  const { isAdmin, profile } = useAuth();
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
        <NavLink to="/" className="brand">
          <Logo size={34} withText />
        </NavLink>
        <nav className="top-nav" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
              {n.to === '/' && inApp && due > 0 && <span className="badge">{due}</span>}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className="nav-link">
              Investigación
            </NavLink>
          )}
        </nav>
        <ThemeSwitcher compact />
      </header>

      {/* key: cada cambio de pantalla vuelve a reproducir la animación de entrada */}
      <main className="content page-enter" key={pathname}>
        <Outlet />
      </main>

      <PomodoroPill />

      <nav className="bottom-nav" aria-label="Principal móvil">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="bottom-link">
            <n.Icon className="bottom-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
            <span>{n.label}</span>
            {n.to === '/' && inApp && due > 0 && <span className="badge dot">{due}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
