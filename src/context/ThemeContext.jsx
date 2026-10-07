import { createContext, useContext, useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

// Modo de color: 'system' (predeterminado del dispositivo), 'light' o 'dark'.
// Se guarda por dispositivo; index.html lo aplica antes de pintar para evitar parpadeos.
const KEY = 'amati-theme';
const ThemeContext = createContext(null);

function readTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* almacenamiento no disponible: el modo dura solo esta visita */
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const THEME_OPTIONS = [
  { id: 'light', label: 'Claro', Icon: Sun },
  { id: 'dark', label: 'Oscuro', Icon: Moon },
  { id: 'system', label: 'Predeterminado', Icon: Monitor },
];

export function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`theme-switch ${compact ? 'compact' : ''}`} role="radiogroup" aria-label="Modo de color">
      {THEME_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={theme === o.id}
          className={theme === o.id ? 'active' : ''}
          onClick={() => setTheme(o.id)}
          title={o.label}
        >
          <o.Icon size={16} strokeWidth={2} aria-hidden="true" className="theme-icon" />
          {!compact && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
