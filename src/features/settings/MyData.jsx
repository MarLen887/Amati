import { useState } from 'react';
import { Download, FileSpreadsheet, ShieldCheck, Trash2 } from 'lucide-react';
import { authErrorMessage, useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { exportUserData } from '../../core/data/db.js';
import { cardsToCsv } from '../subjects/importCards.js';
import { dayKey } from '../../core/lib/dates.js';

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Fechas de Firestore como texto legible en el JSON
function replacer(key, value) {
  const raw = this[key];
  if (raw && typeof raw.toDate === 'function') return raw.toDate().toISOString();
  return value;
}

export default function MyData() {
  const { user, deleteAccount } = useAuth();
  const { cards, subjectMap } = useData();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');

  async function downloadAll() {
    setBusy(true);
    setMsg('');
    try {
      const data = await exportUserData(user.uid);
      download(`amati_mis_datos_${dayKey()}.json`, JSON.stringify(data, replacer, 2), 'application/json');
      setMsg('Descarga lista.');
    } catch (e) {
      setMsg('No se pudo preparar la descarga. ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadCards() {
    download(`amati_tarjetas_${dayKey()}.csv`, cardsToCsv(cards, subjectMap), 'text/csv;charset=utf-8');
  }

  async function doDelete(e) {
    e.preventDefault();
    if (!agree) return setError('Confirma que entiendes que esta acción no se puede deshacer.');
    setBusy(true);
    setError('');
    try {
      await deleteAccount();
      // Al borrarse el usuario, la app regresa sola a la pantalla de inicio de sesión
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <section className="panel stack">
      <h2 className="h3 row gap"><ShieldCheck size={18} aria-hidden="true" /> Mis datos</h2>
      <p className="small muted">Tus datos son tuyos: descárgalos cuando quieras o elimina tu cuenta.</p>
      <div className="row gap wrap">
        <button type="button" className="btn ghost" disabled={busy} onClick={downloadAll}>
          <Download size={16} aria-hidden="true" /> Descargar mis datos (JSON)
        </button>
        <button type="button" className="btn ghost" disabled={!cards.length} onClick={downloadCards}>
          <FileSpreadsheet size={16} aria-hidden="true" /> Exportar mis tarjetas (CSV)
        </button>
      </div>
      <p className="small muted">El CSV de tarjetas se puede volver a importar en cualquier materia.</p>
      {msg && <p className="notice" role="status">{msg}</p>}

      <hr />

      {!confirming ? (
        <button type="button" className="btn ghost danger" onClick={() => setConfirming(true)}>
          <Trash2 size={16} aria-hidden="true" /> Borrar mi cuenta
        </button>
      ) : (
        <form className="stack danger-zone unfold" onSubmit={doDelete}>
          <p><strong>Se eliminarán para siempre</strong> tu cuenta, materias, tarjetas, apuntes, notas de clase, historial y sesiones.</p>
          <p className="small muted">
            Las imágenes y PDFs que subiste se guardan en un servicio externo de archivos: se borran sus enlaces de Amati
            y nadie podrá encontrarlos desde la app, pero los archivos en sí se retiran manualmente de ese servicio. Si
            quieres que se eliminen, avisa a quien administra el proyecto.
          </p>
          <p className="small muted">
            Los registros anónimos de la prueba piloto (historial de repaso y sesiones con un identificador anónimo, sin
            nombre ni correo) se conservan para la investigación, conforme al aviso de privacidad. Ya no podrán
            vincularse contigo.
          </p>
          <p className="small muted">Para confirmar que eres tú, se abrirá una ventana de Google antes de borrar la cuenta.</p>
          <label className="checkbox">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Entiendo que esta acción no se puede deshacer.
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row gap end">
            <button type="button" className="btn ghost" onClick={() => { setConfirming(false); setAgree(false); setError(''); }}>
              Cancelar
            </button>
            <button className="btn danger-solid" disabled={busy}>{busy ? 'Borrando…' : 'Borrar definitivamente'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
