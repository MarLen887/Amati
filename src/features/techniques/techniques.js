// Catálogo de técnicas de estudio y aprendizaje (basado en "Estrategias de estudio y aprendizaje").
// kind: 'cards' = sesión con tarjetas (/estudiar?tecnica=…) · 'notes' = herramienta de apuntes/lectura (/apuntes/nuevo?tipo=…)
//       'pomodoro' = cronómetro suave sobre tarjetas
// group: para ordenar el selector

export const GROUPS = [
  { id: 'understand', label: 'Comprender', hint: 'Entender de verdad un tema y detectar lo que aún no sabes.' },
  { id: 'remember', label: 'Memorizar', hint: 'Que la información se quede a largo plazo.' },
  { id: 'read', label: 'Leer', hint: 'Capítulos, artículos y libros completos.' },
  { id: 'notes', label: 'Apuntes', hint: 'Para clases, conferencias y reuniones.' },
  { id: 'focus', label: 'Concentración', hint: 'Sostener la atención sin agotarte.' },
];

// ¿Qué quieres lograr? -> hasta 3 técnicas recomendadas (la primera es la sugerida)
export const GOALS = [
  { id: 'understand', label: 'Entender un tema', icon: 'Lightbulb', picks: ['feynman', 'elaborative', 'srl'] },
  { id: 'memorize', label: 'Memorizar información', icon: 'Boxes', picks: ['recall', 'leitner', 'srs'] },
  { id: 'exam', label: 'Preparar un examen', icon: 'CalendarClock', picks: ['recall', 'interleaved', 'fsrs'] },
  { id: 'read', label: 'Leer un libro', icon: 'BookOpenText', picks: ['pq4r', 'sq3r'] },
  { id: 'notes', label: 'Tomar apuntes', icon: 'PanelLeft', picks: ['libre', 'cornell', 'outline'] },
  { id: 'focus', label: 'Concentrarme mejor', icon: 'Timer', picks: ['pomodoro', 'srl'] },
];

export const TECHNIQUES = [
  {
    id: 'srs',
    name: 'Repetición espaciada',
    short: 'Tarjetas que vuelven justo cuando estás por olvidarlas.',
    kind: 'cards',
    group: 'remember',
    icon: 'CalendarClock',
    minutes: '10 min',
    effort: 1,
    about:
      'Repasas tarjetas y las calificas Difícil / Bien / Fácil. Amati decide cuándo volverás a verlas: lo difícil pronto, lo fácil en más días.',
    goal: 'Consolidar la memoria aplanando la curva del olvido de Ebbinghaus.',
    pros: 'Utilidad alta: mejora la retención a largo plazo y evita estudiar todo la noche anterior.',
    cons: 'Exige constancia; parece más lento al inicio.',
    needs: 'cards',
  },
  {
    id: 'recall',
    name: 'Práctica de recuperación',
    short: 'Escribe lo que recuerdas antes de ver la respuesta.',
    kind: 'cards',
    group: 'remember',
    icon: 'PenLine',
    minutes: '10-15 min',
    effort: 3,
    about:
      'Ves la pregunta, escribes tu respuesta de memoria (sin ayuda), la comparas con la correcta y te calificas. Antes de revelar indicas qué tan seguro estás; al final verás si tu confianza coincide con tus aciertos.',
    goal: 'Convertir la evaluación en aprendizaje: el esfuerzo de recordar fortalece la memoria.',
    pros: 'Utilidad alta: 61% de retención contra 40% de solo releer (Roediger y Karpicke).',
    cons: 'Es incómoda y cansa más. Aun así funciona mejor que releer.',
    needs: 'cards',
  },
  {
    id: 'leitner',
    name: 'Cajas de Leitner',
    short: 'Cinco cajas: aciertas y subes, fallas y vuelves a la caja 1.',
    kind: 'cards',
    group: 'remember',
    icon: 'Boxes',
    minutes: '10 min',
    effort: 1,
    about:
      'Cada tarjeta vive en una de 5 cajas. Si la recuerdas pasa a la siguiente (se repasa menos seguido); si fallas vuelve a la caja 1. Verás en qué caja está cada una.',
    goal: 'Espaciar el repaso de forma visual y lúdica, dedicando más tiempo a lo que más te cuesta.',
    pros: 'Muy efectiva y fácil de entender. Ahorra tiempo al dejar de lado lo que ya sabes.',
    cons: 'Con muchas tarjetas muy pequeñas puedes perder la idea general del tema.',
    needs: 'cards',
  },
  {
    id: 'fsrs',
    name: 'Repetición espaciada FSRS',
    short: 'Algoritmo moderno que calcula el momento ideal de cada repaso.',
    kind: 'cards',
    group: 'remember',
    icon: 'Cpu',
    minutes: '10 min',
    effort: 1,
    about:
      'Estima para cada tarjeta cuánto tiempo la recordarás (estabilidad) y qué tan difícil es para ti, y programa el repaso cuando tu probabilidad de recordarla baja a ~90%.',
    goal: 'Estudiar el mínimo tiempo posible manteniendo ~90% de retención.',
    pros: 'Más eficiente que los sistemas clásicos; te dice exactamente qué repasar hoy.',
    cons: 'Si acumulas muchas tarjetas sin repasar se forma una bola de nieve. Requiere constancia diaria.',
    needs: 'cards',
  },
  {
    id: 'interleaved',
    name: 'Práctica intercalada',
    short: 'Mezcla temas y materias para aprender a distinguirlos.',
    kind: 'cards',
    group: 'remember',
    icon: 'Shuffle',
    minutes: '15 min',
    effort: 3,
    about:
      'Las tarjetas de distintos temas y materias se alternan en lugar de verse por bloques. Te obliga a identificar qué tipo de problema tienes enfrente.',
    goal: 'Mejorar la transferencia y el conocimiento condicional (cuándo usar qué).',
    pros: 'Entre 20% y 40% mejor desempeño en pruebas retardadas, sobre todo en ciencias y matemáticas.',
    cons: 'Se siente más lento y cometes más errores durante la sesión. Funciona mejor con temas parecidos.',
    needs: 'cards',
  },
  {
    id: 'elaborative',
    name: 'Interrogación elaborativa',
    short: '¿Por qué es verdad? Explícalo antes de ver la respuesta.',
    kind: 'cards',
    group: 'understand',
    icon: 'CircleHelp',
    minutes: '15 min',
    effort: 4,
    about:
      'Además de recordar, escribes por qué la respuesta tiene sentido y la relacionas con algo que ya sabes. Después comparas con la respuesta de la tarjeta.',
    goal: 'Anclar datos aislados a un marco lógico en vez de memorizarlos a ciegas.',
    pros: 'Muy eficaz para material con muchos datos y hechos.',
    cons: 'Si todavía sabes poco del tema, su efecto baja bastante. Mejor después de una primera lectura.',
    needs: 'cards',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro suave',
    short: 'Bloques de enfoque con descansos, sobre tus tarjetas.',
    kind: 'pomodoro',
    group: 'focus',
    icon: 'Timer',
    minutes: '25 min',
    effort: 2,
    about:
      'Estudias tarjetas en bloques de tiempo con descansos guiados. Los tiempos se ajustan en Ajustes.',
    goal: 'Mantener el enfoque y cuidar tu energía en sesiones largas.',
    pros: 'Evita la fatiga y da estructura a la sesión.',
    cons: 'Los cortes de tiempo pueden interrumpir si estás muy concentrado.',
    needs: 'cards',
  },
  {
    id: 'feynman',
    name: 'Técnica Feynman',
    short: 'Explica un tema como si se lo contaras a un niño.',
    intro: "Explicas el tema con tus propias palabras, como si se lo enseñaras a alguien que no sabe nada. Donde te trabes, ahí tienes que estudiar más. Lleva el nombre del físico Richard Feynman.",
    kind: 'notes',
    group: 'understand',
    icon: 'Lightbulb',
    minutes: '20 min',
    effort: 4,
    about:
      'Cuatro pasos guiados: elige un concepto, explícalo con palabras simples, marca dónde te atoraste y vuelve a tus fuentes para simplificar tu explicación.',
    goal: 'Descubrir lo que realmente no entiendes y eliminar la ilusión de competencia.',
    pros: 'Detecta lagunas con precisión y mejora tu capacidad de explicar y hacer analogías.',
    cons: 'Demanda esfuerzo mental y puede frustrar al inicio. No sirve para memorizar fórmulas o listas puras.',
    needs: 'none',
    noteType: 'feynman',
  },
  {
    id: 'srl',
    name: 'Autorregulación (planear y evaluar)',
    short: 'Planea, monitorea y evalúa tu propio estudio.',
    intro: "Autorregulación: antes de estudiar defines qué quieres lograr, mientras estudias revisas cómo vas y al final evalúas qué te funcionó.",
    kind: 'notes',
    group: 'understand',
    icon: 'Gauge',
    minutes: '10 min',
    effort: 2,
    about:
      'Antes de estudiar defines tu meta y tu plan, predices cómo te irá; a mitad revisas si de verdad entiendes; al final comparas lo esperado con lo logrado y ajustas.',
    goal: 'Calibrar tu juicio para eliminar la ilusión de competencia y corregir sin depender de otros.',
    pros: 'Previene la sobreconfianza (efecto Dunning-Kruger) y mejora tus decisiones de estudio.',
    cons: 'Exige madurez y práctica; al inicio conviene hacerlo con los pasos guiados.',
    needs: 'none',
    noteType: 'srl',
  },
  {
    id: 'libre',
    name: 'Apunte libre',
    short: 'Editor completo: texto, tablas, fórmulas, dibujos y trabajo en equipo.',
    intro: "Un cuaderno en blanco: escribe lo que quieras con formato, tablas, fórmulas y dibujos. No tiene reglas ni pasos; ideal para tomar apuntes en clase.",
    kind: 'notes',
    group: 'notes',
    icon: 'PenLine',
    minutes: 'En clase',
    effort: 1,
    about:
      'Un documento como los de Notion: títulos, listas, tareas, tablas, código e imágenes. Escribe fórmulas con KaTeX ($E=mc^2$), dibuja diagramas y mapas mentales con Excalidraw y compártelo para editar con tus compañeros en tiempo real. Guarda solo y conserva un historial de versiones.',
    goal: 'Tener un solo lugar para apuntes de cualquier materia, con texto, fórmulas y dibujos.',
    pros: 'Flexible: sirve para ciencias, programación o humanidades. Se sincroniza entre dispositivos y permite estudiar en grupo.',
    cons: 'Sin estructura guiada: tú decides cómo organizar. Combínalo con Cornell o el esquema si lo necesitas.',
    needs: 'none',
    noteType: 'libre',
  },
  {
    id: 'cornell',
    name: 'Apuntes Cornell',
    short: 'Notas con columna de pistas y resumen para autoexaminarte.',
    intro: "Divides la hoja en tres partes: las notas de la clase, unas pistas o preguntas al margen y un resumen final. Después te autoexaminas con las pistas.",
    kind: 'notes',
    group: 'notes',
    icon: 'PanelLeft',
    minutes: 'En clase + 10 min',
    effort: 2,
    about:
      'Tu hoja se divide en notas (derecha), pistas o preguntas (izquierda) y un resumen (abajo). Luego puedes cubrir las notas y usar las pistas como autoexamen.',
    goal: 'Participar activamente durante la clase y practicar recuperación al estudiar.',
    pros: 'Incluye el efecto de evaluación de forma natural y mejora tus resultados a largo plazo.',
    cons: 'En clases muy rápidas es difícil llenar las pistas. Sin la fase de repaso no sirve.',
    needs: 'none',
    noteType: 'cornell',
  },
  {
    id: 'outline',
    name: 'Método del esquema',
    short: 'Apuntes jerárquicos con sangrías, de lo general a lo particular.',
    intro: "Ordenas las ideas por niveles con sangría, de lo general a lo particular, como un índice. Ayuda a ver cómo se relacionan los temas.",
    kind: 'notes',
    group: 'notes',
    icon: 'ListTree',
    minutes: 'En clase',
    effort: 1,
    about:
      'Escribes ideas principales, subtemas y detalles con sangría (I., A., 1., a.). Con Tab y Shift+Tab subes o bajas de nivel.',
    goal: 'Reflejar la estructura lógica de lo que estudias.',
    pros: 'El más intuitivo y rápido; ideal para clases bien organizadas.',
    cons: 'Oculta relaciones entre temas y puede volverte un simple transcriptor.',
    needs: 'none',
    noteType: 'outline',
  },
  {
    id: 'pq4r',
    name: 'Lectura PQ4R',
    short: 'Previsualiza, pregunta, lee, reflexiona, recita y repasa.',
    intro: "Método para leer capítulos y artículos en 6 pasos: Previsualizar, Preguntar, Leer, Reflexionar, Recitar y Repasar.",
    kind: 'notes',
    group: 'read',
    icon: 'BookOpenText',
    minutes: '30-45 min',
    effort: 4,
    about:
      'Seis fases guiadas para textos densos. Incluye la fase «Reflexionar», que dispara el procesamiento profundo. Las fases se guardan como un apunte.',
    goal: 'Comprender y retener textos académicos largos.',
    pros: 'Entre 30% y 50% más de retención en conceptos densos.',
    cons: 'Toma ~50% más tiempo que leer de corrido. Es tentador saltarse «Reflexionar» y mirar las respuestas.',
    needs: 'none',
    noteType: 'pq4r',
  },
  {
    id: 'sq3r',
    name: 'Lectura SQ3R',
    short: 'Explora, pregunta, lee, recita y repasa.',
    intro: "Método para leer en 5 pasos: Sondear (explorar), Preguntar, Leer, Recitar y Repasar. Es una versión más corta que PQ4R.",
    kind: 'notes',
    group: 'read',
    icon: 'BookMarked',
    minutes: '25-40 min',
    effort: 3,
    about:
      'La versión clásica (1946) de cinco fases: convierte la lectura en un diálogo con el texto. Más corta que PQ4R.',
    goal: 'Dar propósito a tu lectura mediante preguntas previas.',
    pros: 'Probada para textos extensos; fomenta el pensamiento crítico y reduce la distracción.',
    cons: 'No tiene fase de reflexión explícita. Preguntas genéricas vuelven la lectura mecánica.',
    needs: 'none',
    noteType: 'sq3r',
  },
];

export const TECHNIQUE_MAP = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t]));

// Técnicas que corren dentro de /estudiar
export const CARD_TECHNIQUES = ['srs', 'recall', 'leitner', 'fsrs', 'interleaved', 'elaborative'];

// El apunte libre va primero; después, las técnicas guiadas
export const NOTE_TYPES = {
  libre: { label: 'Apunte libre', technique: 'libre' },
  feynman: { label: 'Feynman', technique: 'feynman' },
  srl: { label: 'Autorregulación', technique: 'srl' },
  cornell: { label: 'Cornell', technique: 'cornell' },
  outline: { label: 'Esquema', technique: 'outline' },
  pq4r: { label: 'PQ4R', technique: 'pq4r' },
  sq3r: { label: 'SQ3R', technique: 'sq3r' },
};

const LAST_KEY = 'amati-last-technique';
export function readLastTechnique() {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return TECHNIQUE_MAP[v] ? v : null;
  } catch {
    return null;
  }
}
export function saveLastTechnique(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* sin almacenamiento */
  }
}

// Dirección para iniciar una técnica con la selección actual
export function techniqueUrl(id, { subjectId = '', topic = '', practice = false } = {}) {
  const t = TECHNIQUE_MAP[id];
  const p = new URLSearchParams();
  if (subjectId) p.set('materia', subjectId);
  if (subjectId && topic) p.set('tema', topic);
  if (t.kind === 'notes') {
    p.set('tipo', t.noteType);
    return `/apuntes/nuevo?${p}`;
  }
  if (t.kind === 'pomodoro') {
    const q = p.toString();
    return q ? `/pomodoro?${q}` : '/pomodoro';
  }
  p.set('tecnica', id);
  if (practice) p.set('modo', 'libre');
  return `/estudiar?${p}`;
}
