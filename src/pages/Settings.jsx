import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { updateProfile } from '../lib/db.js';
import { PRIVACY_NOTICE } from './AuthPages.jsx';
import { ThemeSwitcher } from '../context/ThemeContext.jsx';
import ChangePassword from '../components/ChangePassword.jsx';
import PomodoroSettings from '../components/PomodoroSettings.jsx';
import MyData from '../components/MyData.jsx';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 a 22:00

export default function Settings() {
  const { user, profile, logout } = useAuth();
  const [name, setName] = useState('');
  const [reminders, setReminders] = useState(null);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setReminders(profile.reminders);
    }
  }, [profile?.displayName, profile?.reminders?.emailEnabled, profile?.reminders?.hour, profile?.reminders?.inApp]);

  if (!profile || !reminders) return <p className="muted">Cargando…</p>;

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await updateProfile(user.uid, {
        displayName: name.trim(),
        'reminders.inApp': reminders.inApp,
        'reminders.emailEnabled': reminders.emailEnabled,
        'reminders.hour': Number(reminders.hour),
        'reminders.timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
      });
      setSaved('Cambios guardados.');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack-lg narrow">
      <h1>Ajustes</h1>

      <form className="panel stack" onSubmit={save}>
        <h2 className="h3">Perfil</h2>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <p className="small muted">Correo: {user.email}</p>

        <h2 className="h3">Recordatorios</h2>
        <p className="small muted">Simples y sin insistir: solo te avisamos si tienes tarjetas pendientes.</p>
        <label className="checkbox">
          <input type="checkbox" checked={reminders.inApp}
            onChange={(e) => setReminders({ ...reminders, inApp: e.target.checked })} />
          Mostrar aviso de pendientes dentro de la app
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={reminders.emailEnabled}
            onChange={(e) => setReminders({ ...reminders, emailEnabled: e.target.checked })} />
          Recibir un correo diario cuando tenga tarjetas pendientes
        </label>
        {reminders.emailEnabled && (
          <label>
            Hora del recordatorio
            <select value={reminders.hour} onChange={(e) => setReminders({ ...reminders, hour: e.target.value })}>
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        {saved && <p className="notice">{saved}</p>}
        <button className="btn primary">Guardar cambios</button>
      </form>

      <PomodoroSettings />

      <ChangePassword />

      <section className="panel stack">
        <h2 className="h3">Apariencia</h2>
        <p className="small muted">Elige cómo se ve Amati en este dispositivo.</p>
        <ThemeSwitcher />
      </section>

      <section className="panel stack">
        <h2 className="h3">Ayuda</h2>
        <Link to="/como-funciona">¿Cómo funciona Amati?</Link>
        <details className="privacy">
          <summary>Aviso de privacidad</summary>
          <p>{PRIVACY_NOTICE}</p>
        </details>
      </section>

      <MyData />

      <button className="btn ghost danger" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
