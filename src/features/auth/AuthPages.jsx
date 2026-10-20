import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../../core/context/AuthContext.jsx';
import { ALLOWED_DOMAIN } from '../../core/firebase.js';
import Logo from '../../core/components/Logo.jsx';
import Ambient from '../../core/components/Ambient.jsx';
import { ThemeSwitcher } from '../../core/context/ThemeContext.jsx';

export const PRIVACY_NOTICE =
  'Su información personal será tratada bajo estrictas medidas de seguridad y confidencialidad, ' +
  'garantizando su anonimato en la presentación de resultados globales, reportes de investigación o ' +
  'informes institucionales. Ningún dato será compartido con terceros ajenos al proyecto ni utilizado ' +
  'para fines comerciales o de prospección.';

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// Pantalla única de acceso: «Continuar con Google» (sin contraseñas)
export function Login() {
  const { loginWithGoogle, authNotice, clearAuthNotice } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError('');
    clearAuthNotice();
    try {
      await loginWithGoogle();
      nav('/');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const message = error || authNotice;

  return (
    <div className="auth-page">
      <Ambient />
      <div className="auth-theme"><ThemeSwitcher compact /></div>
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={72} />
          <h1>Amati</h1>
          <p className="muted">Estudia un poco cada día, sin estrés.</p>
        </div>

        <div className="stack">
          <button type="button" className="btn google-btn block" onClick={start} disabled={busy}>
            <GoogleMark /> {busy ? 'Abriendo Google…' : 'Continuar con Google'}
          </button>
          <p className="small muted center-text">Usa tu cuenta institucional <strong>@{ALLOWED_DOMAIN}</strong>. No necesitas contraseña.</p>
          {message && <p className="error" role="alert">{message}</p>}
        </div>

        <details className="privacy">
          <summary>Aviso de privacidad</summary>
          <p>{PRIVACY_NOTICE}</p>
          <p>
            Para la prueba piloto, Amati registra de forma anónima tu historial de repaso y de sesiones de estudio.
            Tus tarjetas y tu correo no se incluyen en los datos de investigación. Puedes descargar tus datos o borrar
            tu cuenta en tu perfil; al borrarla se eliminan tus datos personales y solo se conservan esos registros anónimos.
          </p>
        </details>
        <p className="auth-footer">Al continuar aceptas el aviso de privacidad.</p>
      </div>
    </div>
  );
}
