# Guion del video de bienvenida de Amati

**Duración objetivo:** 60 a 70 segundos · **Voz:** IA, español de México, cálida y tranquila · **Subtítulos:** sí (muchos lo verán sin sonido)
**Texto de la voz:** unas 165 palabras. Si la voz de IA sale más lenta, acorta la escena 5 o la 6.

| Tiempo | Qué se ve en pantalla | Lo que dice la voz |
|---|---|---|
| 0:00 – 0:08 | Logo del colibrí y luego la pantalla de Inicio | «Hola, bienvenido a Amati, tu espacio para estudiar un poco cada día, a tu ritmo y sin estrés.» |
| 0:08 – 0:20 | Mis materias: se escribe un nombre y se pulsa **Guardar**; se abre la materia con sus pestañas | «Empieza creando una materia. Solo necesitas el nombre. Ahí reunirás tus apuntes, tus libros, tus herramientas y tus tarjetas.» |
| 0:20 – 0:34 | Biblioteca (una búsqueda) → Apuntes (chips con el **Apunte libre** primero) → **Subir apuntes** con la foto de una libreta | «En la Biblioteca encuentras libros y artículos académicos. En Apuntes escribes con el apunte libre, o con técnicas como Cornell o Feynman. También puedes subir la foto de tu libreta, y Amati extrae el texto.» |
| 0:34 – 0:45 | Dentro de un apunte: panel de IA → **Crear tarjetas** → aparecen preguntas y respuestas → **Crear quiz** | «Desde cualquier apunte, la inteligencia artificial puede resumirlo, crear tarjetas o armar un quiz para que practiques.» |
| 0:45 – 0:54 | Inicio con **Continuar con…**; luego la pantalla Estudiar con varias técnicas | «Cuando quieras estudiar, tú eliges la técnica: repetición espaciada, Pomodoro y más. Amati recuerda la última que usaste, para que continúes justo donde te quedaste.» |
| 0:54 – 1:03 | Herramientas (calculadora, diagramas, mapas mentales) → Progreso (racha y tarjetas dominadas) | «Tienes herramientas para tu carrera, como calculadora, diagramas y mapas mentales. Y en Progreso ves tu avance, sin rankings ni comparaciones.» |
| 1:03 – 1:08 | Inicio, con el colibrí | «Ahora te mostramos dónde está cada cosa. ¡Vamos a empezar!» |

## Texto corrido (para pegar en el generador de voz)

Hola, bienvenido a Amati, tu espacio para estudiar un poco cada día, a tu ritmo y sin estrés. Empieza creando una materia. Solo necesitas el nombre. Ahí reunirás tus apuntes, tus libros, tus herramientas y tus tarjetas. En la Biblioteca encuentras libros y artículos académicos. En Apuntes escribes con el apunte libre, o con técnicas como Cornell o Feynman. También puedes subir la foto de tu libreta, y Amati extrae el texto. Desde cualquier apunte, la inteligencia artificial puede resumirlo, crear tarjetas o armar un quiz para que practiques. Cuando quieras estudiar, tú eliges la técnica: repetición espaciada, Pomodoro y más. Amati recuerda la última que usaste, para que continúes justo donde te quedaste. Tienes herramientas para tu carrera, como calculadora, diagramas y mapas mentales. Y en Progreso ves tu avance, sin rankings ni comparaciones. Ahora te mostramos dónde está cada cosa. ¡Vamos a empezar!

## Consejos de producción (CapCut)
- Graba la pantalla a 1080p y **corta cada escena** al ritmo de la voz; usa un zoom suave sobre el botón que se menciona.
- Usa los subtítulos automáticos de CapCut y revísalos (corrige «Amati», «Cornell» y «Feynman»).
- Música instrumental muy baja (que no tape la voz) y sin saturar con efectos.
- Evita mostrar datos personales o correos reales en la grabación; usa una cuenta de prueba.
- **No muestres detalles que cambian seguido** (colores, textos exactos): el video debe explicar la idea, y los globos de la app explican dónde está cada cosa.

## Cómo conectarlo a la app
1. Exporta el video (MP4) y súbelo a YouTube como **«No listado»**. Activa los subtítulos en español.
2. Copia el enlace (por ejemplo `https://youtu.be/XXXXXXXXXXX`).
3. En `.env.local` agrega `VITE_WELCOME_VIDEO=https://youtu.be/XXXXXXXXXXX` y reinicia `npm run dev` (para publicar, vuelve a compilar y desplegar).
