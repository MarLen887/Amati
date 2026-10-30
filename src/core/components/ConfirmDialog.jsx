import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

const ConfirmContext = createContext(null);

// Reemplazo de window.confirm: `const confirm = useConfirm(); if (!(await confirm({ title, message, danger }))) return;`
export function useConfirm() {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ask;
}

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);

  const ask = useCallback((opts) => new Promise((resolve) => setReq({ ...opts, resolve })), []);
  const close = useCallback((value) => {
    setReq((r) => { r?.resolve(value); return null; });
  }, []);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {req && <ConfirmModal req={req} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({ req, onClose }) {
  const { title = '¿Continuar?', message, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false } = req;
  const cancelRef = useRef(null);
  const cardRef = useRef(null);

  // El foco empieza en «Cancelar» (la opción segura) y vuelve a donde estaba al cerrar
  useEffect(() => {
    const prev = document.activeElement;
    cancelRef.current?.focus();
    return () => prev?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(false); return; }
      if (e.key !== 'Tab') return;
      const items = cardRef.current?.querySelectorAll('button:not(:disabled)');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="modal-backdrop confirm-backdrop" role="alertdialog" aria-modal="true"
      aria-labelledby="confirm-title" aria-describedby="confirm-msg"
      onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div ref={cardRef} className="panel stack confirm-card">
        <div className="row gap">
          {danger && <span className="confirm-icon" aria-hidden="true"><TriangleAlert size={20} /></span>}
          <h2 id="confirm-title" className="h3">{title}</h2>
        </div>
        {message && <p id="confirm-msg" className="muted">{message}</p>}
        <div className="row gap confirm-actions">
          <button type="button" ref={cancelRef} className="btn ghost" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button type="button" className={`btn ${danger ? 'danger-solid' : 'primary'}`} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
