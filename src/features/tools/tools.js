// Catálogo de herramientas de Amati, organizado por áreas de la universidad y por necesidad.
// Cada herramienta: { id, name, short, areas: [ids de ÁREAS], category, icon, status }
//   areas: todas las áreas = herramienta transversal (se agrupa en «Para todas las carreras»).
//   status: 'soon' (aún sin conectar) | 'ready' (funcional; llevará `to` con su ruta cuando exista).
// Las entradas actuales son de muestra: se reemplazan al conectar cada API.

export const AREAS = [
  { id: 'salud', name: 'Ciencias de la Salud', short: 'Salud', color: '#e5683c', icon: 'Stethoscope' },
  { id: 'artes', name: 'Artes y Humanidades', short: 'Artes', color: '#c026d3', icon: 'Palette' },
  { id: 'vida', name: 'Ciencias de la vida', short: 'Vida', color: '#16a34a', icon: 'Dna' },
  { id: 'ing', name: 'Ingenierías', short: 'Ingenierías', color: '#2563eb', icon: 'Cpu' },
  { id: 'negocios', name: 'Negocios, Hospitalidad y Ciencias Sociales', short: 'Negocios y sociales', color: '#ca8a04', icon: 'Briefcase' },
];

export const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const ALL_AREAS = AREAS.map((a) => a.id);

// Categorías por necesidad: ¿qué quieres hacer?
export const CATEGORIES = [
  { id: 'calcular', name: 'Calcular y convertir', icon: 'Calculator' },
  { id: 'visualizar', name: 'Dibujar y diagramar', icon: 'Shapes' },
  { id: 'investigar', name: 'Investigar y citar', icon: 'BookSearch' },
  { id: 'practicar', name: 'Practicar y simular', icon: 'FlaskConical' },
  { id: 'escribir', name: 'Escribir y traducir', icon: 'PenLine' },
  { id: 'organizar', name: 'Organizar y planear', icon: 'ClipboardList' },
];
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const T = (id, name, short, areas, category, icon) => ({ id, name, short, areas, category, icon, status: 'soon' });
// Herramienta ya funcional: se abre en /herramientas/:id
const R = (...args) => ({ ...T(...args), status: 'ready', to: `/herramientas/${args[0]}` });

export const TOOLS = [
  // ---- Para todas las carreras ----
  R('calc', 'Calculadora científica', 'Expresiones, trigonometría, matrices y unidades (MathJS).', ALL_AREAS, 'calcular', 'Calculator'),
  R('excel', 'Excel: fórmulas y archivos', 'Aprende BUSCARV, SI, SUMAR.SI… y lee o exporta tus hojas (SheetJS + Formula.js).', ALL_AREAS, 'calcular', 'Sheet'),
  R('dashboard', 'Gráficas y dashboards', 'Convierte una tabla en gráficas e indicadores (Apache ECharts).', ALL_AREAS, 'visualizar', 'ChartPie'),
  R('mermaid', 'Diagramas con Mermaid', 'Diagramas de flujo, UML, secuencia, arquitecturas y mapas conceptuales escribiendo texto.', ALL_AREAS, 'visualizar', 'Workflow'),
  R('markmap', 'Mapas mentales con Markmap', 'Convierte un esquema de texto en un mapa mental interactivo.', ALL_AREAS, 'visualizar', 'Network'),
  R('translate', 'Traductor', 'Español ↔ inglés, francés, portugués, alemán e italiano.', ALL_AREAS, 'escribir', 'Languages'),
  R('spell', 'Corrector de ortografía y estilo', 'Ortografía, gramática y estilo con explicación (LanguageTool).', ALL_AREAS, 'escribir', 'SpellCheck'),

  // ---- Ciencias de la Salud ----
  R('timeline', 'Líneas de tiempo', 'Crea líneas de tiempo con fechas, textos e imágenes (TimelineJS).', ['salud', 'artes', 'negocios'], 'visualizar', 'History'),

  // ---- Artes y Humanidades ----
  R('dictionary', 'Diccionario de inglés', 'Definiciones, pronunciación, ejemplos y etimología.', ['artes', 'negocios'], 'investigar', 'BookOpenText'),
  R('synonyms', 'Sinónimos y palabras relacionadas', 'Sinónimos, antónimos, rimas y asociaciones (Datamuse).', ['artes', 'negocios'], 'escribir', 'Shuffle'),

  // ---- Ciencias de la vida ----
  R('molecules', 'Moléculas y compuestos', 'Busca en PubChem y gira la molécula en 3D (Kekule.js).', ['vida', 'salud', 'ing'], 'investigar', 'FlaskConical'),

  // ---- Ingenierías ----
  R('flow', 'Diagramas interactivos', 'Arma algoritmos, redes y arquitecturas arrastrando y conectando nodos (React Flow).', ['ing', 'negocios'], 'visualizar', 'Waypoints'),
  R('algebra', 'Álgebra y cálculo simbólico', 'Resuelve, deriva, integra, factoriza y simplifica (Nerdamer).', ['ing', 'vida', 'negocios', 'salud'], 'calcular', 'Sigma'),
  R('graph', 'Graficadora de funciones', 'Gráficas interactivas con Desmos.', ['ing', 'vida', 'negocios', 'salud'], 'visualizar', 'ChartLine'),
  R('physics', 'Simulador de física', 'Tiro parabólico y colisiones (PhysicsJS).', ['ing', 'vida'], 'practicar', 'Orbit'),
  R('code', 'Programar y retos', 'Ejecuta código en +10 lenguajes y valida tus soluciones (Judge0).', ['ing'], 'practicar', 'Terminal'),
  R('sql', 'Laboratorio SQL', 'Practica consultas reales en tu navegador (sql.js).', ['ing', 'negocios'], 'practicar', 'Database'),
  R('github', 'Proyectos de GitHub', 'Encuentra proyectos reales y entiéndelos con IA (GitHub API).', ['ing'], 'investigar', 'GitBranch'),
  R('stack', 'Tutor de errores', 'Busca el error en Stack Overflow y te lo explica (Stack Exchange API).', ['ing'], 'investigar', 'LifeBuoy'),

  // ---- Negocios, Hospitalidad y Ciencias Sociales ----
  R('worldbank', 'Comparador de países', 'Compara PIB, inflación, desempleo y comercio entre países (Banco Mundial).', ['negocios'], 'investigar', 'Globe'),
  R('inegi', 'Indicadores de México', 'Inflación, desempleo y más con datos oficiales (INEGI).', ['negocios'], 'investigar', 'MapPin'),
];

export const isGeneral = (t) => t.areas.length === ALL_AREAS.length;
