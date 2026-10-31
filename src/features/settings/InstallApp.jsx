import { useState } from 'react';
import { CircleCheck, Download, EllipsisVertical, Share, SquarePlus } from 'lucide-react';
import { promptInstall, useInstall } from '../../core/lib/pwa.js';

// Instalar Amati como app: ícono en la pantalla de inicio, se abre sin barra del navegador y a pantalla completa.
// Chrome, Edge y Samsung Internet permiten instalar con un botón; en iPhone y iPad se hace desde «Compartir».
export default function InstallApp() {
  const { canPrompt, installed, ios } = useInstall();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function install() {
    setBusy(true);
    setMsg('');
    const r = await promptInstall();
    setBusy(false);
    if (r === 'dismissed') setMsg('Sin problema. Puedes instalarla cuando quieras desde aquí.');
    if (r === 'unavailable') setMsg('Tu navegador no pudo abrir la instalación. Prueba con el menú del navegador.');
  }

  return (
    <section className="panel stack install-card" aria-label="Instalar Amati" data-tour="install-app">
      <div className="row gap install-head">
        <span className="install-icon" aria-hidden="true"><Download size={22} /></span>
        <div className="grow">
          <h2 className="h3">Instala Amati en tu dispositivo</h2>
          <p className="small muted">Ábrela como una app: con su ícono en la pantalla de inicio, a pantalla completa y sin barra del navegador.</p>
        </div>
      </div>

      {installed ? (
        <p className="row gap install-ok" role="status"><CircleCheck size={18} aria-hidden="true" /> Amati ya está instalada en este dispositivo.</p>
      ) : canPrompt ? (
        <div className="stack-sm">
          <button type="button" className="btn primary lg" disabled={busy} onClick={install}><Download size={18} aria-hidden="true" /> {busy ? 'Abriendo…' : 'Instalar Amati'}</button>
          {msg && <p className="small muted" role="status">{msg}</p>}
        </div>
      ) : ios ? (
        <ol className="install-steps">
          <li><span className="step-ico"><Share size={16} aria-hidden="true" /></span> Toca el botón <strong>Compartir</strong> de Safari.</li>
          <li><span className="step-ico"><SquarePlus size={16} aria-hidden="true" /></span> Elige <strong>Añadir a pantalla de inicio</strong>.</li>
          <li><span className="step-ico"><CircleCheck size={16} aria-hidden="true" /></span> Pulsa <strong>Añadir</strong>. Amati aparecerá como una app.</li>
        </ol>
      ) : (
        <div className="stack-sm">
          <p className="small">
            Si tu navegador lo permite, usa su menú <EllipsisVertical size={14} aria-hidden="true" className="inline-ico" /> y elige <strong>Instalar Amati</strong> (o «Agregar a la pantalla de inicio»).
          </p>
          <p className="small muted">Funciona en Chrome, Edge y Samsung Internet. En Firefox y Safari de escritorio aún no es posible instalar webs.</p>
        </div>
      )}

      <p className="small muted">Por ahora la app necesita internet para funcionar. El modo sin conexión llegará más adelante.</p>
    </section>
  );
}
