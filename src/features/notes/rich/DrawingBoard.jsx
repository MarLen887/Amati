import { useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { Check } from 'lucide-react';

const themeNow = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
};

// Pizarra de Excalidraw en pantalla completa. Al terminar devuelve solo los elementos vivos.
export default function DrawingBoard({ scene, onDone }) {
  const latest = useRef(scene.elements || []);
  return (
    <div className="drawing-board">
      <Excalidraw
        langCode="es-ES"
        theme={themeNow()}
        initialData={{ elements: scene.elements || [], appState: { viewBackgroundColor: 'transparent' } }}
        onChange={(elements) => { latest.current = elements; }}
        UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false } }}
      />
      <button type="button" className="btn primary drawing-done" onClick={() => onDone(latest.current.filter((e) => !e.isDeleted))}>
        <Check size={16} aria-hidden="true" /> Listo
      </button>
    </div>
  );
}
