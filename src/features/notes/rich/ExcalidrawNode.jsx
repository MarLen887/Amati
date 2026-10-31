import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { PencilRuler, X } from 'lucide-react';
import Loader from '../../../core/components/Loader.jsx';

// Excalidraw pesa bastante: solo se descarga cuando alguien abre o ve un dibujo.
const DrawingBoard = lazy(() => import('./DrawingBoard.jsx'));

const parse = (s) => {
  try {
    return s ? JSON.parse(s) : { elements: [] };
  } catch {
    return { elements: [] };
  }
};

function Preview({ scene }) {
  const host = useRef(null);
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    let alive = true;
    const { elements } = parse(scene);
    if (!elements?.length) { setEmpty(true); host.current?.replaceChildren(); return; }
    setEmpty(false);
    import('@excalidraw/excalidraw').then(async ({ exportToSvg }) => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark'
        || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      const svg = await exportToSvg({
        elements, files: {}, appState: { exportBackground: false, exportWithDarkMode: dark }, exportPadding: 12,
      });
      if (!alive || !host.current) return;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      host.current.replaceChildren(svg);
    });
    return () => { alive = false; };
  }, [scene]);
  return empty
    ? <p className="muted small drawing-empty"><PencilRuler size={18} aria-hidden="true" /> Dibujo vacío · pulsa «Editar dibujo»</p>
    : <div ref={host} className="drawing-svg" aria-label="Dibujo" role="img" />;
}

function DrawingView({ node, updateAttributes, editor, selected, extension }) {
  const [open, setOpen] = useState(() => extension.storage.autoOpen === node.attrs.id);
  useEffect(() => { extension.storage.autoOpen = null; }, [extension]);
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper className={`drawing-block ${selected ? 'selected' : ''}`} data-drag-handle>
      <div className="drawing-bar" contentEditable={false}>
        <span className="small muted"><PencilRuler size={14} aria-hidden="true" /> Dibujo / diagrama</span>
        {editable && <button type="button" className="btn small ghost" onClick={() => setOpen(true)}>Editar dibujo</button>}
      </div>
      <div contentEditable={false}><Preview scene={node.attrs.scene} /></div>
      {open && (
        <div className="drawing-modal" role="dialog" aria-modal="true" aria-label="Editor de dibujo">
          <div className="drawing-modal-head">
            <strong>Dibujo</strong>
            <span className="small muted grow">Se guarda al pulsar «Listo».</span>
            <button type="button" className="btn small ghost" onClick={() => setOpen(false)}><X size={14} aria-hidden="true" /> Cerrar sin guardar</button>
          </div>
          <Suspense fallback={<Loader label="Cargando pizarra…" />}>
            <DrawingBoard
              scene={parse(node.attrs.scene)}
              onDone={(elements) => { updateAttributes({ scene: JSON.stringify({ elements }) }); setOpen(false); }}
            />
          </Suspense>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// Bloque de dibujo (Excalidraw). El esquema se guarda como texto JSON dentro del documento,
// así viaja por Yjs igual que el resto del apunte (la última edición del dibujo gana).
export const Drawing = Node.create({
  name: 'drawing',
  group: 'block',
  atom: true,
  draggable: true,
  addStorage() { return { autoOpen: null }; },
  addAttributes() {
    return {
      scene: { default: '', parseHTML: (el) => el.getAttribute('data-scene') || '', renderHTML: (a) => ({ 'data-scene': a.scene }) },
      id: { default: null, rendered: false },
    };
  },
  parseHTML() { return [{ tag: 'div[data-drawing]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-drawing': '' })]; },
  addNodeView() { return ReactNodeViewRenderer(DrawingView); },
  addCommands() {
    return {
      insertDrawing: () => ({ commands }) => {
        const id = Math.random().toString(36).slice(2);
        this.storage.autoOpen = id;
        return commands.insertContent({ type: this.name, attrs: { id, scene: '' } });
      },
    };
  },
});
