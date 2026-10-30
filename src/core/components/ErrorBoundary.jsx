import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';
import { hardReset, isChunkError, reloadOnce } from '../lib/chunkReload.js';

// Red de seguridad: si una pantalla o herramienta falla, se muestra un mensaje amable en vez de una pantalla en blanco.
// `resetKey` (p. ej. la ruta) limpia el error al cambiar de pantalla.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Amati: error en pantalla', error, info?.componentStack);
    // Tras publicar una versión nueva, una pestaña abierta con la anterior no encuentra sus archivos: se recarga sola una vez.
    if (isChunkError(error)) reloadOnce();
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const updated = isChunkError(error);
    return (
      <div className="error-box panel stack" role="alert">
        <TriangleAlert size={32} aria-hidden="true" />
        <h2 className="h3">{updated ? 'Amati se actualizó' : 'Algo no salió como esperábamos'}</h2>
        <p className="muted">
          {updated
            ? 'Hay una versión nueva. Recarga para seguir donde estabas.'
            : 'No pasa nada: tu material está a salvo. Puedes intentarlo de nuevo o volver al inicio.'}
        </p>
        <div className="row gap wrap center">
          {updated
            ? <button type="button" className="btn primary" onClick={hardReset}>Recargar</button>
            : <button type="button" className="btn primary" onClick={() => this.setState({ error: null })}>Intentar de nuevo</button>}
          <a className="btn ghost" href="/">Ir al inicio</a>
        </div>
        <details className="small muted">
          <summary>Detalles técnicos</summary>
          <code>{String(error?.message || error).slice(0, 300)}</code>
        </details>
      </div>
    );
  }
}
