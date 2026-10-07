import { useMemo, useRef, useState } from 'react';
import { CircleAlert, FileUp, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { createCardsBulk } from '../lib/db.js';
import { MAX_ROWS, parseCards, SEPARATORS } from '../lib/importCards.js';

const EXAMPLE = 'Mitosis\tDivisión celular que produce dos células idénticas\tCélula\nMeiosis\tDivisión que produce gametos\tCélula';

// Importar varias tarjetas a la vez: pegar texto o subir un archivo CSV/TXT, revisar y confirmar.
export default function ImportCards({ subjectId, onDone, onCancel }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sep, setSep] = useState('auto');
  const [defaultTopic, setDefaultTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const parsed = useMemo(() => parseCards(text, sep), [text, sep]);
  const sepLabel = SEPARATORS.find((s) => s.id === parsed.sep)?.label;

  async function readFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return setError('El archivo es muy grande (máx. 2 MB).');
    setError('');
    setText(await f.text());
  }

  async function doImport() {
    if (!parsed.rows.length) return;
    setBusy(true);
    setError('');
    try {
      const rows = parsed.rows.map((r) => ({ ...r, topic: r.topic || defaultTopic.trim() }));
      const n = await createCardsBulk(user.uid, subjectId, rows);
      onDone(n);
    } catch (err) {
      setError('No se pudieron importar las tarjetas. ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack import-cards">
      <p className="small muted">
        Una tarjeta por línea: <strong>pregunta</strong>, separador, <strong>respuesta</strong> y, si quieres, el{' '}
        <strong>tema</strong>. Puedes copiar dos o tres columnas directo de Excel o Google Sheets.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={EXAMPLE}
        aria-label="Tarjetas a importar"
        className="mono-ish"
      />
      <div className="grid-2">
        <label>
          Separador
          <select value={sep} onChange={(e) => setSep(e.target.value)}>
            {SEPARATORS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label>
          Tema para las que no lo indiquen
          <input value={defaultTopic} onChange={(e) => setDefaultTopic(e.target.value)} maxLength={80}
            placeholder="Opcional" />
        </label>
      </div>
      <div className="row gap wrap">
        <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()}>
          <FileUp size={16} aria-hidden="true" /> Subir archivo CSV o TXT
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={readFile} />
        {sep === 'auto' && parsed.sep && <span className="small muted">Detectado: {sepLabel}</span>}
      </div>

      {text.trim() && (
        <div className="import-preview">
          <p className="small">
            <strong>{parsed.rows.length}</strong> {parsed.rows.length === 1 ? 'tarjeta lista' : 'tarjetas listas'} para importar
            {parsed.errors.length > 0 && <> · <span className="error-inline">{parsed.errors.length} con problemas</span></>}
            {parsed.truncated && <> · solo se importan las primeras {MAX_ROWS}</>}
          </p>
          {parsed.rows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pregunta</th><th>Respuesta</th><th>Tema</th></tr></thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}><td>{r.front}</td><td>{r.back}</td><td>{r.topic || defaultTopic || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && <p className="small muted">…y {parsed.rows.length - 5} más.</p>}
            </div>
          )}
          {parsed.errors.length > 0 && (
            <ul className="import-errors">
              {parsed.errors.slice(0, 4).map((e) => (
                <li key={e.line}><CircleAlert size={14} aria-hidden="true" /> Línea {e.line}: {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <div className="row gap end">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn primary" disabled={busy || !parsed.rows.length} onClick={doImport}>
          <Upload size={16} aria-hidden="true" />
          {busy ? 'Importando…' : `Importar ${parsed.rows.length || ''} ${parsed.rows.length === 1 ? 'tarjeta' : 'tarjetas'}`}
        </button>
      </div>
    </div>
  );
}
