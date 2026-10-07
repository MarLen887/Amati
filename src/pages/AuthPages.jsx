import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../context/AuthContext.jsx';
import { ALLOWED_DOMAIN } from '../firebase.js';
import Logo from '../components/Logo.jsx';
import Ambient from '../components/Ambient.jsx';
import { ThemeSwitcher } from '../context/ThemeContext.jsx';

export const PRIVACY_NOTICE =
  'Su información personal será tratada bajo estrictas medidas de seguridad y confidencialidad, ' +
  'garantizando su anonimato en la presentación de resultados globales, reportes de investigación o ' +
  'informes institucionales. Ningún dato será compartido con terceros ajenos al proyecto ni utilizado ' +
  'para fines comerciales o de prospección.';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <Ambient />
      <div className="auth-theme"><ThemeSwitcher compact /></div>
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={72} />
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email, password });
      nav('/');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Amati"
      subtitle="Estudia un poco cada día, sin estrés."
      footer={<>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></>}
    >
      <form onSubmit={submit} className="stack">
        <label>
          Correo institucional
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder={`matrícula@${ALLOWED_DOMAIN}`} autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
        <Link to="/recuperar" className="small center-text">¿Olvidaste tu contraseña?</Link>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden.');
    if (!accepted) return setError('Debes aceptar el aviso de privacidad.');
    setBusy(true);
    try {
      await register(form);
      nav('/verificar');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle={`Solo para la comunidad UVP (@${ALLOWED_DOMAIN}).`}
      footer={<>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></>}
    >
      <form onSubmit={submit} className="stack">
        <label>
          Nombre (cómo quieres que te llamemos)
          <input value={form.name} onChange={set('name')} maxLength={60} autoComplete="given-name" />
        </label>
        <label>
          Correo institucional
          <input type="email" value={form.email} onChange={set('email')} required
            placeholder={`matrícula@${ALLOWED_DOMAIN}`} autoComplete="email" />
        </label>
        <div className="grid-2">
          <label>
            Contraseña
            <input type="password" value={form.password} onChange={set('password')} required minLength={6}
              autoComplete="new-password" />
          </label>
          <label>
            Confirmar contraseña
            <input type="password" value={form.confirm} onChange={set('confirm')} required
              autoComplete="new-password" />
          </label>
        </div>
        <details className="privacy">
          <summary>Aviso de privacidad</summary>
          <p>{PRIVACY_NOTICE}</p>
          <p>
            Para la prueba piloto, Amati registra de forma anónima tu historial de repaso y el estado de
            ánimo que indiques antes y después de cada sesión. Tus tarjetas y tu correo no se incluyen en
            los datos de investigación. Puedes descargar tus datos o borrar tu cuenta en Ajustes; al borrarla
            se eliminan tus datos personales y solo se conservan esos registros anónimos.
          </p>
        </details>
        <label className="checkbox">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          He leído y acepto el aviso de privacidad.
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creando cuenta…' : 'Registrarme'}</button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmail() {
  const { user, resendVerification, refreshVerification, logout } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    try {
      const ok = await refreshVerification();
      if (ok) nav('/');
      else setMsg('Aún no vemos tu correo verificado. Revisa tu bandeja (y la carpeta de spam).');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await resendVerification();
      setMsg('Te enviamos un nuevo correo de verificación.');
    } catch (err) {
      setMsg(authErrorMessage(err));
    }
  }

  return (
    <AuthShell title="Verifica tu correo" subtitle={`Enviamos un enlace a ${user?.email}.`}>
      <div className="stack">
        <p>Abre el enlace del correo para activar tu cuenta y después presiona el botón.</p>
        {msg && <p className="notice">{msg}</p>}
        <button className="btn primary block" onClick={check} disabled={busy}>Ya verifiqué mi correo</button>
        <button className="btn ghost block" onClick={resend}>Reenviar correo</button>
        <button className="btn link" onClick={logout}>Usar otra cuenta</button>
      </div>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await resetPassword(email);
      setMsg('Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <AuthShell title="Recuperar contraseña" footer={<Link to="/login">Volver a iniciar sesión</Link>}>
      <form onSubmit={submit} className="stack">
        <label>
          Correo institucional
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {msg && <p className="notice">{msg}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Enviar enlace</button>
      </form>
    </AuthShell>
  );
}
