// Recorrido guiado de Amati: globos por vista (Inicio, Estudiar, Materias, Biblioteca, Apuntes, Herramientas, Agenda y Perfil)
// y una tarjeta final. Cada globo señala una parte real de la pantalla: si cambias una pantalla, revisa que su
// [data-tour="…"] siga existiendo (sin objetivo visible, el globo sale al centro).
//   route:   pantalla donde ocurre el paso (el recorrido navega solo)
//   targets: selectores [data-tour="…"] a probar; se usa el primero que esté visible. Sin objetivo visible, el paso
//            se muestra al centro (por ejemplo, cuando una lista está vacía).
//   kind:    'final' = tarjeta central con botones propios.
export const TOUR_STEPS = [
  // ---- Inicio ----
  {
    id: 'nav', route: '/', targets: ['[data-tour="nav"]'],
    title: 'Tu menú',
    text: 'Desde aquí llegas a todo: Inicio, Estudiar, Mis materias, Biblioteca, Apuntes, Herramientas, Agenda y tu Perfil. En el celular se abre con el botón ☰.',
  },
  {
    id: 'home-main', route: '/', targets: ['[data-tour="home-main"]'],
    title: 'Inicio: tu siguiente paso',
    text: 'Aquí continúas con la última técnica que usaste y, justo debajo, puedes elegir otra. Si todavía no usas ninguna, empieza creando tu primera materia.',
  },
  {
    id: 'home-goal', route: '/', targets: ['[data-tour="daily-goal"]'],
    title: 'Tu meta de hoy',
    text: 'Elige cuántos minutos quieres estudiar al día, con el método que prefieras. El colibrí avanza por la barra conforme estudias, y abajo ves tu semana.',
  },
  // ---- Estudiar ----
  {
    id: 'techniques', route: '/tecnicas', targets: ['[data-tour="techniques"]'],
    title: 'Estudiar',
    text: 'Cuéntanos qué quieres lograr (entender un tema, memorizar, preparar un examen…) y te sugerimos hasta 3 técnicas. Tú decides con cuál empezar.',
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
    text: 'Toca una materia para ver sus pendientes, apuntes, clases, herramientas y biblioteca, y continuar con la técnica que usaste en ella.',
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
  // ---- Agenda ----
  {
    id: 'agenda-week', route: '/agenda', targets: ['[data-tour="agenda-week"]'],
    title: 'Tu agenda',
    text: 'Aquí ves tu semana. Toca un día para ver su horario y usa «Agregar» para sumar tus clases y actividades, cada semana o solo un día.',
  },
  {
    id: 'agenda-day', route: '/agenda', targets: ['[data-tour="agenda-day"]'],
    title: 'El horario del día',
    text: 'Toca cualquier hora de la línea de tiempo para agregar algo ahí. Las clases, las actividades y tus tiempos de estudio tienen colores distintos.',
  },
  {
    id: 'agenda-ai', route: '/agenda', targets: ['[data-tour="agenda-ai"]'],
    title: 'Tiempo de estudio con ayuda de la IA',
    text: 'Amati busca huecos de 30 minutos entre semana, con dos opciones por día y sin empalmarse con tus clases. Las propuestas aparecen aquí y tú apruebas las que te sirvan: nada se agenda sin tu permiso.',
  },
  {
    id: 'agenda-notify', route: '/agenda', targets: ['[data-tour="agenda-notify"]'],
    title: 'Avisos cuando empiece tu estudio',
    text: 'Cuando empiece un tiempo de estudio aprobado, Amati te avisa en pantalla (y con una notificación del navegador si la activas aquí). Funciona con Amati abierta en el navegador.',
  },
  // ---- Perfil ----
  {
    id: 'profile-install', route: '/perfil', targets: ['[data-tour="install-app"]'],
    title: 'Instala Amati como app',
    text: 'Desde aquí la instalas en tu celular o computadora, con su ícono y a pantalla completa. En iPhone se hace desde «Compartir» → «Añadir a pantalla de inicio».',
  },
  {
    id: 'profile-help', route: '/perfil', targets: ['[data-tour="help-center"]'],
    title: 'Centro de ayuda',
    text: 'Aquí repites este recorrido, ves el video de bienvenida y encuentras las preguntas frecuentes.',
  },
  // ---- Final ----
  {
    id: 'final', route: '/', kind: 'final',
    title: '¡Listo para empezar!',
    text: 'Ya conoces Amati. Estudia un poco cada día, a tu ritmo y sin estrés.',
  },
];
