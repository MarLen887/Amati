// Recorrido guiado de Amati: 2 globos por vista (Inicio, Materias, Biblioteca, Apuntes, Herramientas y Progreso)
// y una tarjeta final. Cada globo señala una parte real de la pantalla.
//   route:   pantalla donde ocurre el paso (el recorrido navega solo)
//   targets: selectores [data-tour="…"] a probar; se usa el primero que esté visible. Sin objetivo visible, el paso
//            se muestra al centro (por ejemplo, cuando una lista está vacía).
//   kind:    'final' = tarjeta central con botones propios.
export const TOUR_STEPS = [
  // ---- Inicio ----
  {
    id: 'nav', route: '/', targets: ['[data-tour="nav"]'],
    title: 'Tu menú',
    text: 'Desde aquí llegas a todo: Inicio, Estudiar, Mis materias, Biblioteca, Apuntes, Herramientas, Progreso y tu Perfil. En el celular se abre con el botón ☰.',
  },
  {
    id: 'home-main', route: '/', targets: ['[data-tour="home-main"]'],
    title: 'Inicio: tu siguiente paso',
    text: 'Aquí continúas con la última técnica que usaste. Si todavía no usas ninguna, empiezas creando tu primera materia.',
  },
  // ---- Materias ----
  {
    id: 'subjects-add', route: '/materias', targets: ['[data-tour="subjects-add"]'],
    title: 'Mis materias',
    text: 'Una materia reúne tus apuntes, recursos, herramientas y tarjetas. Solo necesitas el nombre; el color y la fecha de examen son opcionales.',
  },
  {
    id: 'subjects-main', route: '/materias', targets: ['[data-tour="subjects-main"]'],
    title: 'Entra a una materia',
    text: 'Toca una materia para ver su contenido y continuar con la técnica que usaste en ella. Con el menú ⋯ puedes editarla o eliminarla.',
  },
  // ---- Biblioteca ----
  {
    id: 'library-search', route: '/biblioteca', targets: ['[data-tour="library-search"]'],
    title: 'Biblioteca',
    text: 'Busca libros, artículos y temas para aprender. Los resultados son académicos, científicos, educativos y literarios.',
  },
  {
    id: 'library-cats', route: '/biblioteca', targets: ['[data-tour="library-cats"]'],
    title: 'Elige qué buscar',
    text: 'Cambia entre libros, artículos, trivia, tus apuntes y temas. Lo que guardes se ordena por materia.',
  },
  // ---- Apuntes ----
  {
    id: 'notes-create', route: '/apuntes', targets: ['[data-tour="notes-create"]'],
    title: 'Apuntes',
    text: 'Empieza con el Apunte libre o usa una técnica guiada (Cornell, Feynman, Esquema…). Pasa el puntero sobre una técnica para ver de qué trata.',
  },
  {
    id: 'notes-upload', route: '/apuntes', targets: ['[data-tour="notes-upload"]'],
    title: 'Sube tus apuntes',
    text: 'Sube la foto de tu libreta o un PDF y Amati extrae el texto. Desde cualquier apunte puedes crear tarjetas, resúmenes y un quiz con IA.',
  },
  // ---- Herramientas ----
  {
    id: 'tools-area', route: '/herramientas', targets: ['[data-tour="tools-area"]'],
    title: 'Herramientas',
    text: 'Elige tu área de carrera para ver las herramientas que más te sirven: calculadora, diagramas, mapas mentales, programación, traductor y más.',
  },
  {
    id: 'tools-views', route: '/herramientas', targets: ['[data-tour="tools-views"]'],
    title: 'Organízalas a tu gusto',
    text: 'Verlas por área, por lo que quieres hacer o en una lista. Marca tus favoritas con la estrella y agrégalas a tus materias.',
  },
  // ---- Progreso ----
  {
    id: 'progress-streak', route: '/progreso', targets: ['[data-tour="progress-metrics"] .metric.streak', '[data-tour="progress-metrics"]'],
    title: 'Progreso',
    text: 'Tu racha de días estudiando y el tiempo de esta semana. Sin rankings ni comparaciones: solo tu avance.',
  },
  {
    id: 'progress-cards', route: '/progreso', targets: ['[data-tour="progress-metrics"] .metric.ok', '[data-tour="progress-metrics"]'],
    title: 'Lo dominado y lo pendiente',
    text: 'Aquí ves las tarjetas que ya dominas y las que tienes pendientes hoy. Si necesitas ayuda, en Perfil → Centro de ayuda repites este recorrido.',
  },
  // ---- Final ----
  {
    id: 'final', route: '/', kind: 'final',
    title: '¡Listo para empezar!',
    text: 'Ya conoces Amati. Estudia un poco cada día, a tu ritmo y sin estrés.',
  },
];
