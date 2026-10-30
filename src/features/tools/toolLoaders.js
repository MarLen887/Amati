// Cargadores de cada herramienta (las librerías pesan bastante, así que se descargan solo al usarlas).
// `preloadTool` permite empezar la descarga antes del clic, p. ej. al pasar el cursor por la tarjeta.
export const LOADERS = {
  calc: () => import('./apps/Calculator.jsx'),
  algebra: () => import('./apps/Algebra.jsx'),
  graph: () => import('./apps/Grapher.jsx'),
  physics: () => import('./apps/Physics.jsx'),
  molecules: () => import('./apps/Molecules.jsx'),
  code: () => import('./apps/Code.jsx'),
  sql: () => import('./apps/SqlLab.jsx'),
  github: () => import('./apps/Github.jsx'),
  stack: () => import('./apps/StackHelp.jsx'),
  spell: () => import('./apps/Spell.jsx'),
  translate: () => import('./apps/Translator.jsx'),
  dictionary: () => import('./apps/Dictionary.jsx'),
  synonyms: () => import('./apps/Synonyms.jsx'),
  worldbank: () => import('./apps/WorldBank.jsx'),
  inegi: () => import('./apps/Inegi.jsx'),
  excel: () => import('./apps/Excel.jsx'),
  dashboard: () => import('./apps/Dashboard.jsx'),
  mermaid: () => import('./apps/Mermaid.jsx'),
  markmap: () => import('./apps/Markmap.jsx'),
  flow: () => import('./apps/FlowEditor.jsx'),
  timeline: () => import('./apps/TimelineTool.jsx'),
};

const started = new Set();
export function preloadTool(id) {
  if (!LOADERS[id] || started.has(id)) return;
  // Con «ahorro de datos» o conexión muy lenta no se descarga nada por adelantado
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
  started.add(id);
  LOADERS[id]().catch(() => started.delete(id)); // si falla, se reintenta en la siguiente ocasión
}
