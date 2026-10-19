// Pasos guiados de las técnicas de lectura y explicación.
// Cada paso se guarda en content.steps[key].

export const GUIDES = {
  feynman: {
    title: 'Técnica Feynman',
    sourceLabel: 'Concepto que quieres dominar',
    sourcePlaceholder: 'Ej. Fotosíntesis, Ley de la oferta y la demanda…',
    steps: [
      {
        key: 'explain',
        title: 'Explícalo con palabras simples',
        prompt: 'Escribe (o di en voz alta) cómo se lo explicarías a un niño de 10 años, sin usar términos técnicos.',
        tip: 'Si usas una palabra técnica, defínela con otras palabras más sencillas. Usa ejemplos o analogías.',
        placeholder: 'Imagina que…',
        rows: 9,
      },
      {
        key: 'gaps',
        title: 'Encuentra dónde te atoraste',
        prompt: '¿En qué partes dudaste, usaste jerga o no supiste continuar? Anótalas como lista.',
        tip: 'Aquí está lo valioso: cada atoro es algo que todavía no entiendes del todo. No te juzgues.',
        placeholder: '- No supe explicar por qué…\n- Usé la palabra «…» sin saber qué significa',
        rows: 6,
      },
      {
        key: 'review',
        title: 'Vuelve a tus fuentes',
        prompt: 'Regresa al libro, apuntes o clase solo para resolver esos atoros. Anota lo que aprendiste.',
        tip: 'Busca únicamente lo que te faltó; no releas todo.',
        placeholder: 'Lo que descubrí al revisar mis fuentes…',
        rows: 6,
      },
      {
        key: 'refine',
        title: 'Simplifica y refina',
        prompt: 'Reescribe tu explicación completa, más clara y corta, con una analogía.',
        tip: 'Si todavía se atora, repite desde el paso 1. Explicarlo simple es la prueba de que lo entiendes.',
        placeholder: 'Versión final: …',
        rows: 9,
      },
    ],
  },

  srl: {
    title: 'Autorregulación',
    sourceLabel: 'Tema o examen para el que estudias',
    sourcePlaceholder: 'Ej. Parcial de Estadística, tema 3',
    steps: [
      {
        key: 'plan',
        title: 'Planear',
        prompt: '¿Cuál es tu meta concreta? ¿Qué técnica usarás y cuánto tiempo le dedicarás? ¿Qué puede distraerte?',
        tip: 'Una meta medible: «Resolver 10 ejercicios sin ver apuntes», no «estudiar mucho».',
        placeholder: 'Mi meta es… Usaré… durante… Si me distraigo, entonces…',
        rows: 6,
      },
      {
        key: 'predict',
        title: 'Predecir',
        prompt: '¿Qué tanto crees que dominas hoy este tema (0 a 100)? ¿Qué partes te parecen más débiles?',
        tip: 'Después compararás tu predicción con lo que realmente lograste.',
        placeholder: 'Creo que domino un __% porque… Lo más débil es…',
        rows: 4,
      },
      {
        key: 'monitor',
        title: 'Monitorear',
        prompt: 'A mitad de tu sesión: ¿estás entendiendo o solo reconociendo? Intenta explicar lo visto sin mirar. ¿Dónde fallas?',
        tip: 'Si te cuesta explicarlo, no lo has aprendido aún: cambia de técnica o regresa a la fuente.',
        placeholder: 'Sin mirar, puedo explicar… No pude explicar…',
        rows: 6,
      },
      {
        key: 'evaluate',
        title: 'Evaluar y ajustar',
        prompt: '¿Lograste tu meta? ¿Qué tanto coincidió con tu predicción? ¿Qué cambiarás en tu próxima sesión?',
        tip: 'Sin culpas: es información para estudiar mejor la próxima vez.',
        placeholder: 'Logré… Mi predicción fue __% y el resultado __%. La próxima vez voy a…',
        rows: 6,
      },
    ],
  },

  pq4r: {
    title: 'Lectura PQ4R',
    sourceLabel: 'Texto o capítulo que vas a leer',
    sourcePlaceholder: 'Ej. Capítulo 3: El sistema inmune',
    steps: [
      {
        key: 'preview',
        title: 'P · Previsualizar',
        prompt: 'Hojea títulos, subtítulos, gráficas y el resumen sin leer a detalle. ¿De qué trata? ¿Cuántas partes tiene?',
        tip: 'Dedica 2 o 3 minutos. Es como ver el mapa antes del viaje.',
        placeholder: 'El texto trata de… Se divide en…',
        rows: 5,
      },
      {
        key: 'question',
        title: 'Q · Preguntar',
        prompt: 'Convierte cada título en una pregunta que quieras responder con la lectura.',
        tip: '«Sistema inmune» → ¿Qué células lo forman y cómo actúan?',
        placeholder: '1. ¿…?\n2. ¿…?\n3. ¿…?',
        rows: 6,
      },
      {
        key: 'read',
        title: 'R · Leer',
        prompt: 'Lee una sección a la vez buscando responder tus preguntas. Escribe aquí las ideas clave.',
        tip: 'No subrayes de más: anota con tus palabras.',
        placeholder: 'Ideas clave de cada sección…',
        rows: 8,
      },
      {
        key: 'reflect',
        title: 'R · Reflexionar',
        prompt: 'Relaciona lo leído con lo que ya sabes: ¿con qué se parece? ¿Puedes dar un ejemplo propio? ¿Por qué es así?',
        tip: 'Es el paso que más aporta a PQ4R. No te lo saltes.',
        placeholder: 'Esto me recuerda a… Un ejemplo mío sería…',
        rows: 7,
      },
      {
        key: 'recite',
        title: 'R · Recitar',
        prompt: 'Cierra el texto y responde tus preguntas de memoria, en voz alta o por escrito.',
        tip: 'Sin mirar. Equivocarte aquí también es aprender.',
        placeholder: 'Mis respuestas, de memoria…',
        rows: 8,
      },
      {
        key: 'review',
        title: 'R · Repasar',
        prompt: 'Compara con el texto, corrige lo que fallaste y escribe un resumen final de pocas líneas.',
        tip: 'Luego pasa lo importante a tarjetas para repasarlo en los próximos días.',
        placeholder: 'Resumen final y correcciones…',
        rows: 6,
      },
    ],
  },

  sq3r: {
    title: 'Lectura SQ3R',
    sourceLabel: 'Texto o capítulo que vas a leer',
    sourcePlaceholder: 'Ej. Capítulo 3: El sistema inmune',
    steps: [
      {
        key: 'survey',
        title: 'S · Explorar',
        prompt: 'Revisa títulos, introducción, conclusiones, gráficas y vocabulario destacado. Anota de qué trata.',
        tip: 'Unos pocos minutos bastan.',
        placeholder: 'El texto trata de…',
        rows: 5,
      },
      {
        key: 'question',
        title: 'Q · Preguntar',
        prompt: 'Escribe preguntas concretas a partir de los títulos. Evita preguntas demasiado generales.',
        tip: 'Mejor «¿Cuáles son las 3 fases de…?» que «¿De qué habla esto?».',
        placeholder: '1. ¿…?\n2. ¿…?',
        rows: 6,
      },
      {
        key: 'read',
        title: 'R · Leer',
        prompt: 'Lee buscando responder tus preguntas. Anota las respuestas y datos importantes.',
        tip: 'Hazlo por secciones cortas.',
        placeholder: 'Respuestas encontradas…',
        rows: 8,
      },
      {
        key: 'recite',
        title: 'R · Recitar',
        prompt: 'Sin mirar el texto, responde de memoria cada pregunta con tus palabras.',
        tip: 'Si no puedes, vuelve a leer solo esa parte.',
        placeholder: 'De memoria…',
        rows: 8,
      },
      {
        key: 'review',
        title: 'R · Repasar',
        prompt: 'Revisa tus preguntas y respuestas completas, y escribe un resumen de lo esencial.',
        tip: 'Vuelve a repasarlo en 1 y 7 días.',
        placeholder: 'Resumen…',
        rows: 6,
      },
    ],
  },
};

// Numeración del método del esquema: I., A., 1., a., (1), (a)
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const letters = (n, upper) => {
  let s = '';
  let i = n;
  do {
    s = String.fromCharCode((upper ? 65 : 97) + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
};
export function outlineLabel(level, n) {
  switch (level) {
    case 0: return `${ROMAN[n] || n + 1}.`;
    case 1: return `${letters(n, true)}.`;
    case 2: return `${n + 1}.`;
    case 3: return `${letters(n, false)}.`;
    case 4: return `(${n + 1})`;
    default: return `(${letters(n, false)})`;
  }
}

// Convierte el texto con sangría (2 espacios por nivel) en filas numeradas
export function parseOutline(text) {
  const counters = [];
  return (text || '')
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const spaces = line.match(/^ */)[0].length;
      const level = Math.min(5, Math.floor(spaces / 2));
      counters.length = level + 1;
      counters[level] = (counters[level] ?? -1) + 1;
      return { level, label: outlineLabel(level, counters[level]), text: line.trim() };
    });
}
