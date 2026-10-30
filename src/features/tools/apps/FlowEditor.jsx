import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { download, isDark } from '../lib/theme.js';
import { useConfirm } from '../../../core/components/ConfirmDialog.jsx';

// Diagramas interactivos con React Flow: algoritmos, redes y arquitecturas. Arrastra, conecta y edita.
const KEY = 'amati-flow-diagram';

const KINDS = {
  start: { label: 'Inicio', type: 'input', style: { borderRadius: 999, borderColor: '#0d9488', background: 'color-mix(in srgb, #0d9488 14%, transparent)' } },
  process: { label: 'Proceso', type: 'default', style: {} },
  decision: { label: '¿Condición?', type: 'default', style: { borderColor: '#d99a2b', background: 'color-mix(in srgb, #d99a2b 16%, transparent)', borderRadius: 16 } },
  end: { label: 'Fin', type: 'output', style: { borderRadius: 999, borderColor: '#e5683c', background: 'color-mix(in srgb, #e5683c 14%, transparent)' } },
  node: { label: 'Nodo', type: 'default', style: { borderRadius: 999, width: 70, height: 70, display: 'grid', placeItems: 'center', textAlign: 'center' } },
};
const KIND_BUTTONS = [['start', 'Inicio'], ['process', 'Proceso'], ['decision', 'Decisión'], ['end', 'Fin'], ['node', 'Nodo de red']];

const mk = (id, kind, x, y, label) => ({ id, type: KINDS[kind].type, position: { x, y }, data: { label: label ?? KINDS[kind].label, kind }, style: KINDS[kind].style });
const link = (source, target, label) => ({ id: `${source}-${target}`, source, target, label, markerEnd: { type: MarkerType.ArrowClosed } });

const TEMPLATES = {
  algoritmo: {
    label: 'Algoritmo',
    nodes: [mk('a', 'start', 120, 0, 'Inicio'), mk('b', 'process', 90, 90, 'Leer número n'), mk('c', 'decision', 90, 190, '¿n es par?'),
      mk('d', 'process', 0, 300, 'Mostrar «par»'), mk('e', 'process', 220, 300, 'Mostrar «impar»'), mk('f', 'end', 120, 410, 'Fin')],
    edges: [link('a', 'b'), link('b', 'c'), link('c', 'd', 'Sí'), link('c', 'e', 'No'), link('d', 'f'), link('e', 'f')],
  },
  red: {
    label: 'Red',
    nodes: [mk('r', 'node', 180, 120, 'Router'), mk('s', 'node', 20, 0, 'PC 1'), mk('t', 'node', 20, 240, 'PC 2'), mk('u', 'node', 340, 0, 'Servidor'), mk('v', 'node', 340, 240, 'Impresora')],
    edges: [link('s', 'r'), link('t', 'r'), link('r', 'u'), link('r', 'v')],
  },
  arquitectura: {
    label: 'Arquitectura web',
    nodes: [mk('c', 'process', 0, 100, 'Navegador'), mk('w', 'process', 200, 100, 'Servidor web'), mk('a', 'process', 400, 20, 'API'), mk('d', 'process', 400, 180, 'Base de datos')],
    edges: [link('c', 'w', 'HTTP'), link('w', 'a'), link('a', 'd', 'SQL')],
  },
};

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.nodes && s?.edges) return s;
  } catch { /* sin datos guardados */ }
  return TEMPLATES.algoritmo;
}

function Editor() {
  const confirm = useConfirm();
  const initial = useMemo(load, []);
  const [nodes, setNodes] = useState(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [msg, setMsg] = useState('');
  const { fitView } = useReactFlow();

  const selNode = nodes.find((n) => n.selected);
  const selEdge = edges.find((e) => e.selected);

  // Se guarda solo en este dispositivo
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ nodes: nodes.map(({ selected, ...n }) => n), edges: edges.map(({ selected, ...e }) => e) })); } catch { /* sin almacenamiento */ }
  }, [nodes, edges]);

  const onNodesChange = useCallback((c) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c) => setEdges((e) => applyEdgeChanges(c, e)), []);
  const onConnect = useCallback((c) => setEdges((e) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, e)), []);

  function add(kind) {
    const id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;
    const base = nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 90 : 0;
    setNodes((n) => [...n.map((x) => ({ ...x, selected: false })), { ...mk(id, kind, 120, base), selected: true }]);
  }

  const setLabel = (value) => {
    if (selNode) setNodes((ns) => ns.map((n) => (n.id === selNode.id ? { ...n, data: { ...n.data, label: value } } : n)));
    else if (selEdge) setEdges((es) => es.map((e) => (e.id === selEdge.id ? { ...e, label: value } : e)));
  };

  function remove() {
    setNodes((ns) => ns.filter((n) => !n.selected));
    setEdges((es) => es.filter((e) => !e.selected && !nodes.some((n) => n.selected && (n.id === e.source || n.id === e.target))));
  }

  async function applyTemplate(t) {
    if ((nodes.length || edges.length) && !(await confirm({ title: '¿Reemplazar el diagrama actual?', message: 'Se perderá lo que tienes en el lienzo.', confirmLabel: 'Reemplazar', danger: true }))) return;
    setNodes(t.nodes);
    setEdges(t.edges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) throw new Error();
        setNodes(d.nodes);
        setEdges(d.edges);
        setMsg('Diagrama cargado.');
        setTimeout(() => fitView({ padding: 0.2 }), 50);
      } catch {
        setMsg('El archivo no es un diagrama válido.');
      }
    });
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <span className="field-label">Agregar</span>
          {KIND_BUTTONS.map(([k, l]) => (
            <button key={k} type="button" className="btn small ghost" onClick={() => add(k)}><Plus size={14} aria-hidden="true" /> {l}</button>
          ))}
        </div>
        <div className="row gap wrap">
          <label className="grow flow-label">
            <span className="field-label">{selNode ? 'Texto del nodo' : selEdge ? 'Texto de la flecha' : 'Selecciona un nodo o una flecha para editar su texto'}</span>
            <input value={selNode ? selNode.data.label : selEdge ? selEdge.label || '' : ''} disabled={!selNode && !selEdge}
              onChange={(e) => setLabel(e.target.value)} maxLength={80} />
          </label>
          <button type="button" className="btn small ghost danger" disabled={!selNode && !selEdge} onClick={remove}><Trash2 size={14} aria-hidden="true" /> Quitar</button>
        </div>
        <div className="row gap wrap">
          <span className="field-label">Plantillas</span>
          {Object.entries(TEMPLATES).map(([k, t]) => (
            <button key={k} type="button" className="chip" onClick={() => applyTemplate(t)}>{t.label}</button>
          ))}
          <span className="grow" />
          <button type="button" className="btn small ghost" onClick={() => download('diagrama.json', JSON.stringify({ nodes, edges }, null, 2), 'application/json')}>
            <Download size={14} aria-hidden="true" /> Guardar archivo
          </button>
          <label className="btn small ghost"><Upload size={14} aria-hidden="true" /> Abrir
            <input type="file" accept="application/json,.json" hidden onChange={importJson} />
          </label>
        </div>
        {msg && <p className="notice small" role="status">{msg}</p>}
      </section>

      <div className="flow-canvas">
        <ReactFlow
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          colorMode={isDark() ? 'dark' : 'light'} fitView fitViewOptions={{ padding: 0.2 }} deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="small muted">Arrastra los nodos para moverlos, une uno con otro desde sus puntos y usa Supr para borrar lo seleccionado. Tu diagrama se guarda en este dispositivo.</p>
    </div>
  );
}

export default function FlowTool() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
