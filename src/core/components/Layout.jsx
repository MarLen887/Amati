import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import Logo from './Logo.jsx';
import { BookMarked, ChartLine, GraduationCap, House, Library, Menu, NotebookPen, User, Wrench, X } from 'lucide-react';
import Ambient from './Ambient.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import PomodoroPill from '../../features/pomodoro/PomodoroPill.jsx';
import { TutorialProvider } from '../../features/tutorial/TutorialContext.jsx';

// Navegación centrada en lo que el estudiante quiere hacer.
// `match`: rutas que mantienen activa la pestaña (p. ej. una sesión de estudio sigue siendo «Estudiar»).
const NAV = [
  { to: '/', label: 'Inicio', Icon: House, match: [] },
  { to: '/tecnicas', label: 'Estudiar', Icon: GraduationCap, match: ['/tecnicas', '/estudiar', '/pomodoro'] },
  { to: '/materias', label: 'Mis materias', Icon: BookMarked, match: ['/materias'] },
  { to: '/biblioteca', label: 'Biblioteca', Icon: Library, match: ['/biblioteca'] },
  { to: '/apuntes', label: 'Apuntes', Icon: NotebookPen, match: ['/apuntes', '/clases'] },
  { to: '/herramientas', label: 'Herramientas', Icon: Wrench, match: ['/herramientas'] },
  { to: '/progreso', label: 'Progreso', Icon: ChartLine, match: ['/progreso'] },
  { to: '/perfil', label: 'Perfil', Icon: User, match: ['/perfil', '/admin'] },
];

const isActive = (n, pathname) =>
  n.to === '/' ? pathname === '/' : n.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

// Título de la pestaña por pantalla (lo leen los lectores de pantalla al cambiar de página)
const TITLES = [
  ['/materias', 'Mis materias'], ['/tecnicas', 'Estudiar'], ['/estudiar', 'Repaso de tarjetas'], ['/pomodoro', 'Pomodoro'],
  ['/biblioteca', 'Biblioteca'], ['/apuntes', 'Apuntes'], ['/clases', 'Apuntes'], ['/herramientas', 'Herramientas'],
  ['/progreso', 'Progreso'], ['/perfil', 'Perfil y ayuda'], ['/ajustes', 'Perfil y ayuda'], ['/como-funciona', '¿Cómo funciona?'], ['/admin', 'Administración'],
];
export const pageTitle = (pathname) => {
  if (pathname === '/') return 'Inicio';
  return TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] || '';
};

export default function Layout() {
  const { profile } = useAuth();
  const { dueCards } = useData();
  const inApp = profile?.reminders?.inApp !== false;
  const due = dueCards.length;
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  // El menú del celular se cierra al cambiar de pantalla o con Escape, y bloquea el scroll del fondo mientras está abierto
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [menuOpen]);

  // Notificación dentro de la app: contador discreto en la pestaña del navegador.
  useEffect(() => {
    const page = pageTitle(pathname);
    document.title = `${inApp && due > 0 ? `(${due}) ` : ''}${page ? `${page} · ` : ''}Amati`;
  }, [due, inApp, pathname]);

  // Al cambiar de pantalla el foco pasa al contenido (teclado y lector de pantalla); no al cargar la primera vez
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (document.activeElement?.closest?.('[role="dialog"]')) return; // no le quita el foco al recorrido ni a un modal
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const skipToContent = (e) => { e.preventDefault(); mainRef.current?.focus(); mainRef.current?.scrollIntoView(); };

  return (
    <TutorialProvider>
    <div className="app-shell">
      <a href="#contenido" className="skip-link" onClick={skipToContent}>Saltar al contenido</a>
      <Ambient />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Amati, ir al inicio">
          <Logo size={34} withText />
        </Link>
        <nav className="top-nav" aria-label="Principal" data-tour="nav">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`nav-link ${isActive(n, pathname) ? 'active' : ''}`}
              aria-current={isActive(n, pathname) ? 'page' : undefined}>
              {n.label}
              {n.to === '/' && inApp && due > 0 && <span className="badge">{due}</span>}
            </Link>
          ))}
        </nav>
        <div className="mobile-actions">
        <Link to="/" className={`home-link ${pathname === '/' ? 'active' : ''}`} aria-label={inApp && due > 0 ? `Inicio, ${due} tarjetas pendientes` : 'Inicio'}
          aria-current={pathname === '/' ? 'page' : undefined}>
          <House size={22} aria-hidden="true" />
          {inApp && due > 0 && <span className="badge dot" aria-hidden="true" />}
        </Link>
        <button type="button" className="menu-toggle" data-tour="nav" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}>
          <Menu size={24} aria-hidden="true" />
        </button>
        </div>
      </header>

      {/* key: cada cambio de pantalla vuelve a reproducir la animación de entrada */}
      <main id="contenido" ref={mainRef} tabIndex={-1} className="content page-enter" key={pathname}>
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <PomodoroPill />

      {menuOpen && (
        <div className="menu-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
          <nav id="mobile-menu" className="mobile-menu" aria-label="Menú principal">
            <div className="mobile-menu-head">
              <span className="logo-text">Menú</span>
              <button type="button" className="icon-btn" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={22} aria-hidden="true" /></button>
            </div>
            {NAV.filter((n) => n.to !== '/').map((n) => (
              <Link key={n.to} to={n.to} className={`mobile-link ${isActive(n, pathname) ? 'active' : ''}`}
                aria-current={isActive(n, pathname) ? 'page' : undefined}>
                <n.Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
    </TutorialProvider>
  );
}
