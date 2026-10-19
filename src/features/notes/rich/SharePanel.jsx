import { useState } from 'react';
import { Users, X } from 'lucide-react';
import { ALLOWED_DOMAIN, isAllowedEmail } from '../../../core/firebase.js';
import { setCollaborators } from '../../../core/data/db.js';
import { useAuth } from '../../../core/context/AuthContext.jsx';
import { emailJsReady, sendShareEmail } from '../../../core/lib/emailjs.js';

const MAX = 30;

// Compartir con compañeros o profesores: pueden abrir el apunte desde «Compartidos conmigo» y editarlo a la vez.
export default function SharePanel({ ownerUid, noteId, emails, title = '' }) {
  const { user, profile } = useAuth();
  const [info, setInfo] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(next) {
    setBusy(true); setError('');
    try { await setCollaborators(ownerUid, noteId, next); } catch (e) { setError('No se pudo actualizar. ' + e.message); } finally { setBusy(false); }
  }

  async function add(e) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!isAllowedEmail(v)) { setError(`Solo puedes compartir con cuentas @${ALLOWED_DOMAIN}.`); return; }
    if (emails.includes(v)) { setError('Ya lo compartiste con esa persona.'); return; }
    if (emails.length >= MAX) { setError(`Máximo ${MAX} personas por apunte.`); return; }
    setEmail('');
    setInfo('');
    await save([...emails, v]);
    // Aviso por correo a la persona invitada; si falla, la invitación igual queda hecha
    if (emailJsReady) {
      try {
        await sendShareEmail({
          to: v,
          fromName: profile?.displayName || user?.email || 'Un compañero',
          noteTitle: title || 'Apunte sin título',
          link: `${window.location.origin}/apuntes/compartido/${ownerUid}/${noteId}`,
        });
        setInfo(`Le avisamos por correo a ${v}.`);
      } catch {
        setInfo(`Invitaste a ${v}, pero no se pudo enviar el aviso por correo. Podrá verlo en «Compartidos conmigo».`);
      }
    } else {
      setInfo(`Invitaste a ${v}. Lo verá en «Compartidos conmigo».`);
    }
  }

  return (
    <section className="panel stack" aria-label="Compartir apunte">
      <h2 className="row gap"><Users size={18} aria-hidden="true" /> Compartir y editar juntos</h2>
      <p className="small muted">Las personas que agregues podrán ver y editar este apunte en tiempo real. Quitarlas les retira el acceso.</p>
      <form className="row gap wrap" onSubmit={add}>
        <input type="email" className="grow" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`correo@${ALLOWED_DOMAIN}`} aria-label="Correo de la persona" required />
        <button className="btn primary" disabled={busy}>Invitar</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="notice small" role="status">{info}</p>}
      {emails.length === 0 ? <p className="small muted">Aún no está compartido.</p> : (
        <ul className="chips share-list">
          {emails.map((m) => (
            <li key={m} className="chip">
              {m}
              <button type="button" className="chip-x" aria-label={`Quitar a ${m}`} disabled={busy} onClick={() => save(emails.filter((x) => x !== m))}><X size={12} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
