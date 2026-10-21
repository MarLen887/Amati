import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';

// Red de seguridad: si una pantalla o herramienta falla, se muestra un mensaje amable en vez de una pantalla en blanco.
// `resetKey` (p. ej. la ruta) limpia el error al cambiar de pantalla.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Amati: error en pantalla', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-box panel stack" role="alert">
        <TriangleAlert size={32} aria-hidden="true" />
        <h2 className="h3">Algo no salió como esperábamos</h2>
        <p className="muted">No pasa nada: tu material está a salvo. Puedes intentarlo de nuevo o volver al inicio.</p>
        <div className="row gap wrap center">
          <button type="button" className="btn primary" onClick={() => this.setState({ error: null })}>Intentar de nuevo</button>
          <a className="btn ghost" href="/">Ir al inicio</a>
        </div>
      </div>
    );
  }
}
