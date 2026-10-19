import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { authErrorMessage, useAuth } from '../../core/context/AuthContext.jsx';

function PasswordInput({ label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} required />
        <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (next.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
    if (next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    if (next === current) return setError('La nueva contraseña debe ser distinta de la actual.');
    setBusy(true);
    try {
      await changePassword(current, next);
      reset();
      setOpen(false);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack">
      <h2 className="h3 row gap"><KeyRound size={18} aria-hidden="true" /> Contraseña</h2>
      {done && <p className="notice" role="status">Tu contraseña se actualizó correctamente.</p>}
      {!open ? (
        <button type="button" className="btn ghost" onClick={() => { setOpen(true); setDone(false); }}>
          Cambiar contraseña
        </button>
      ) : (
        <form className="stack unfold" onSubmit={submit}>
          <PasswordInput label="Contraseña actual" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordInput label="Nueva contraseña" value={next} onChange={setNext} autoComplete="new-password" />
          <PasswordInput label="Confirmar nueva contraseña" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && <p className="error">{error}</p>}
          <div className="row gap end">
            <button type="button" className="btn ghost" onClick={() => { reset(); setOpen(false); }}>Cancelar</button>
            <button className="btn primary" disabled={busy}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
