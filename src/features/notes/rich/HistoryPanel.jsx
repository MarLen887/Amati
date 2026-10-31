import { useEffect, useState } from 'react';
import { History as HistoryIcon, RotateCcw } from 'lucide-react';
import { watchVersions } from '../../../core/data/db.js';
import { fmtShort } from '../../../core/lib/dates.js';
import { useConfirm } from '../../../core/components/ConfirmDialog.jsx';
import Loader from '../../../core/components/Loader.jsx';

// Historial: versiones automáticas (cada ~5 min de edición) y las que guardes a mano.
export default function HistoryPanel({ ownerUid, noteId, onSaveNow, onRestore }) {
  const confirm = useConfirm();
  const [versions, setVersions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => watchVersions(ownerUid, noteId, setVersions, () => setVersions([])), [ownerUid, noteId]);

  async function restore(v) {
    if (!(await confirm({ title: '¿Restaurar esta versión?', message: 'Tu contenido actual se guarda antes en el historial.', confirmLabel: 'Restaurar' }))) return;
    setBusy(true); setError('');
    try { await onRestore(v); } catch (e) { setError('No se pudo restaurar. ' + e.message); } finally { setBusy(false); }
  }

  return (
    <section className="panel stack" aria-label="Historial de cambios">
      <div className="row between wrap gap">
        <h2 className="row gap"><HistoryIcon size={18} aria-hidden="true" /> Historial de cambios</h2>
        <button type="button" className="btn small ghost" disabled={busy} onClick={async () => { setBusy(true); await onSaveNow(); setBusy(false); }}>Guardar versión ahora</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {versions === null ? <Loader size="sm" />
        : versions.length === 0 ? <p className="muted small">Todavía no hay versiones. Se crean solas mientras escribes.</p> : (
          <ul className="history-list">
            {versions.map((v) => (
              <li key={v.id} className="history-item">
                <div className="grow">
                  <strong className="small">{v.createdAt ? fmtShort(v.createdAt) : 'Ahora'}{v.label ? ` · ${v.label}` : ''}</strong>
                  <span className="small muted"> · {v.by}</span>
                  <p className="small snippet">{v.text?.trim() || 'Sin texto'}</p>
                </div>
                <button type="button" className="btn small ghost" disabled={busy} onClick={() => restore(v)}><RotateCcw size={14} aria-hidden="true" /> Restaurar</button>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
