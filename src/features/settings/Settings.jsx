import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { updateProfile } from '../../core/data/db.js';
import { PRIVACY_NOTICE } from '../auth/AuthPages.jsx';
import PomodoroSettings from './PomodoroSettings.jsx';
import MyData from './MyData.jsx';
import HelpCenter from '../tutorial/HelpCenter.jsx';
import Skeleton from '../../core/components/Skeleton.jsx';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 a 22:00

export default function Settings() {
  const { user, profile, logout, isAdmin } = useAuth();
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

  if (!profile || !reminders) return <Skeleton variant="detail" />;

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
      <header className="page-head">
        <h1>Perfil</h1>
        <p className="muted">{profile.displayName || user.email}</p>
        {isAdmin && <p><Link to="/admin" className="btn small ghost">Panel de investigación</Link></p>}
      </header>

      <form className="panel stack" onSubmit={save}>
        <h2 className="h3">Tus datos</h2>
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

      <HelpCenter />

      <MyData />

      <button className="btn ghost danger" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
