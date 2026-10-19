# Amati — Aplicación de estudio inteligente libre de estrés

Aplicación web de tarjetas de estudio (flashcards) con **repetición espaciada** y herramientas de
**bienestar**, para la comunidad estudiantil de la Universidad del Valle de Puebla (UVP).

Proyecto Integrador · Problemática Social Contemporánea · Equipo C · Grupo 7C

---

## Índice

1. [Qué necesitas instalar](#1-qué-necesitas-instalar)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Instalar las dependencias](#3-instalar-las-dependencias)
4. [Configurar Firebase (`.env.local`)](#4-configurar-firebase-envlocal)
5. [Ejecutar la aplicación](#5-ejecutar-la-aplicación)
6. [Cuenta de administrador (panel de investigación)](#6-cuenta-de-administrador-panel-de-investigación)
7. [Comandos útiles](#7-comandos-útiles)
8. [Problemas frecuentes](#8-problemas-frecuentes)
9. [Despliegue (Firebase)](#9-despliegue-firebase)
10. [Funcionalidades](#10-funcionalidades)
11. [Estructura del proyecto](#11-estructura-del-proyecto)

---

## 1. Qué necesitas instalar

| Programa | Versión | Para qué | Descarga |
|----------|---------|----------|----------|
| **Git** | cualquiera reciente | Clonar el repositorio | https://git-scm.com/downloads |
| **Node.js** | **20.19 o superior** (recomendado 22 LTS o 24) | Ejecutar la app | https://nodejs.org |
| Un navegador | Chrome, Edge o Firefox actualizados | Usar la app | — |
| *(Opcional)* **Firebase CLI** | 13 o superior | Solo para publicar reglas, funciones o la app | se instala con npm (paso 9) |

Comprueba que quedaron instalados abriendo una terminal (PowerShell, CMD, Git Bash o la terminal de Laragon):

```bash
git --version
node --version
npm --version
```

Si alguno marca "no se reconoce como un comando", reinstálalo y **cierra y vuelve a abrir la terminal**.

> **Laragon:** Laragon ya incluye Git y Node.js. Usa su terminal (botón *Terminal*) para que estén disponibles.

---

## 2. Clonar el repositorio

Ubícate en la carpeta donde quieras guardar el proyecto y clónalo:

```bash
cd C:\laragon\www
git clone https://github.com/MarLen887/Amati.git
cd Amati
```

> Puedes usar cualquier carpeta (por ejemplo `Documentos`). Con Laragon se acostumbra `C:\laragon\www`.

---

## 3. Instalar las dependencias

Dentro de la carpeta del proyecto:

```bash
npm install
```

Esto crea la carpeta `node_modules` (puede tardar 1–2 minutos la primera vez). Solo se hace una vez,
o cuando cambie `package.json`.

---

## 4. Configurar Firebase (`.env.local`)

La app necesita los datos del proyecto de Firebase. Por seguridad **no se suben al repositorio**:
cada quien crea su archivo local.

1. Copia el archivo de ejemplo:

   ```bash
   # PowerShell / CMD
   copy .env.example .env.local

   # Git Bash / macOS / Linux
   cp .env.example .env.local
   ```

2. Abre `.env.local` y llena los valores **sin espacios después del `=`**:

   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=amati-8382f.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=amati-8382f
   VITE_FIREBASE_STORAGE_BUCKET=amati-8382f.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_ALLOWED_DOMAIN=uvp.edu.mx
   ```

   > El buscador de libros no necesita llaves: Open Library, Gutendex y OpenTDB son abiertas, y Google Books usa tu `VITE_GOOGLE_BOOKS_API_KEY` si la defines (de mejor esfuerzo). Solo se muestran textos académicos, científicos, educativos y literarios.

   **¿De dónde salen?** Pídeselos a la desarrolladora backend del equipo, o si tienes acceso:
   [Consola de Firebase](https://console.firebase.google.com) → proyecto **Amati** → ⚙️ *Configuración del proyecto*
   → *Tus apps* → app web → *Configuración del SDK* (objeto `firebaseConfig`).

> Estos valores identifican al proyecto; la seguridad real la dan las reglas de Firestore y Storage.
> Aun así, **no subas `.env.local` a GitHub** (ya está en `.gitignore`).

---

## 5. Ejecutar la aplicación

```bash
npm run dev
```

Verás algo como:

```
VITE v8.x  ready in 600 ms
➜  Local:   http://localhost:5173/
```

Abre **http://localhost:5173** en el navegador. Para detener el servidor presiona `Ctrl + C` en la terminal.

**Primer uso:**

1. Entra a **Regístrate** con tu correo **@uvp.edu.mx** (otros dominios no se permiten).
2. Abre el enlace de verificación que llega a tu correo (revisa *spam*; lo envía `noreply@amati-8382f.firebaseapp.com`).
3. Vuelve a la app y presiona **"Ya verifiqué mi correo"**.

> ⚠️ Es una app de React: **no** se abre con `http://localhost/Amati` de Apache/Laragon. Siempre usa `npm run dev`.

---

## 6. Cuenta de administrador (panel de investigación)

**No existe una cuenta de administrador con usuario y contraseña propios.** El administrador es una cuenta
normal de estudiante cuyo correo está autorizado. Así no hay contraseñas compartidas ni guardadas en el código.

Para dar acceso a un integrante del equipo:

1. La persona se **registra y verifica** su correo @uvp.edu.mx en la app (paso 5).
2. En la [Consola de Firebase](https://console.firebase.google.com) → **Firestore Database** → *Iniciar colección*:
   - ID de la colección: `admins`
   - ID del documento: el **correo en minúsculas**, por ejemplo `nombre.apellido@uvp.edu.mx`
   - Campo: `rol` (string) = `investigador`
3. La persona cierra sesión y vuelve a entrar. Verá la pestaña **Investigación** con las gráficas y los CSV.

Para quitar el acceso, borra su documento en `admins`.

---

## 7. Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Inicia la app en modo desarrollo (http://localhost:5173) |
| `npm run build` | Genera la versión optimizada en la carpeta `dist/` |
| `npm run preview` | Prueba localmente la versión de `dist/` |
| `git pull` | Descarga los últimos cambios del repositorio |

Después de un `git pull`, si cambió `package.json`, vuelve a ejecutar `npm install`.

---

## 8. Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Aparece **"Falta configurar Firebase"** | Falta `.env.local` o tiene errores. Revisa el paso 4 y **reinicia** `npm run dev` (Vite solo lee el archivo al iniciar). |
| `npm` / `node` / `git` **no se reconoce** | Instálalo (paso 1) y abre una terminal nueva. En Laragon usa su terminal. |
| `firebase` **no se reconoce** | Instálalo con `npm install -g firebase-tools` y abre una terminal nueva. Si usas Laragon, puede quedar en `C:\laragon\bin\nodejs\<versión>\firebase.cmd`. |
| **"Port 5173 is in use"** | Ya hay otro `npm run dev` abierto. Ciérralo o usa `npm run dev -- --port 5174`. |
| **"Solo se permiten correos @uvp.edu.mx"** | Es intencional: la app es para la comunidad UVP. |
| No llega el correo de verificación | Revisa *spam* y usa "Reenviar correo" en la pantalla de verificación. |
| Errores de permisos (`permission-denied`) | Verifica tu correo y que las reglas estén publicadas (paso 9). |
| No veo la pestaña **Investigación** | Tu correo no está en la colección `admins` (paso 6), o falta cerrar y abrir sesión. |

---

## 9. Despliegue (Firebase)

Solo para quien administra el proyecto de Firebase.

```bash
npm install -g firebase-tools
firebase login
firebase use amati-8382f
```

| Qué publicar | Comando |
|--------------|---------|
| Reglas de Firestore (**obligatorio** tras agregar los apuntes: nueva colección `notes`) | `firebase deploy --only firestore:rules` |
| Reglas de Storage (solo si algún día usas el plan Blaze; hoy las imágenes van a Cloudinary) | `firebase deploy --only storage` |
| La app (Hosting) — *después de la aprobación del prototipo* | `npm run build` y luego `firebase deploy --only hosting` |

### Correos sin plan Blaze (gratis): recordatorios y apuntes compartidos

**Recordatorios de estudio** — los envía GitHub Actions cada hora (`.github/workflows/reminders.yml` + `scripts/send-reminders.mjs`):

1. Firebase Console → Configuración del proyecto → *Cuentas de servicio* → **Generar nueva clave privada**. No la subas al repositorio.
2. En GitHub: repositorio → *Settings → Secrets and variables → Actions → New repository secret*. Crea `FIREBASE_SERVICE_ACCOUNT` (pega todo el JSON), `SMTP_USER` (tu Gmail), `SMTP_PASS` (contraseña de aplicación de 16 caracteres) y `MAIL_FROM` (ej. `Amati <tu@gmail.com>`). Opcional: variable `APP_URL`.
3. Pestaña *Actions → Recordatorios por correo → Run workflow*, escribe tu correo en «test_email» para probar que el envío funciona.
4. Activa «recordatorio por correo» en Ajustes de Amati y elige una hora. El correo llega a esa hora o poco después, solo si tienes tarjetas pendientes.

**Apuntes compartidos** — al invitar a alguien, Amati le avisa por correo con [EmailJS](https://www.emailjs.com) (gratis, 200 correos/mes): crea una cuenta, conecta un servicio de correo (Gmail), crea una plantilla con `{{to_email}}` como destinatario y las variables `{{from_name}}`, `{{note_title}}` y `{{link}}`, y copia los IDs a `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_SHARE` y `VITE_EMAILJS_PUBLIC_KEY`. Sin esto, la persona igual ve el apunte en «Compartidos conmigo».

### Recordatorios por correo con Cloud Functions (alternativa; requiere plan Blaze)

Se envían con una cuenta de Gmail del proyecto mediante una **contraseña de aplicación**
(Cuenta de Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones).

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set SMTP_PASS     # pega la contraseña de aplicación (16 caracteres)
firebase deploy --only functions             # pide SMTP_USER y MAIL_FROM; el resto tiene valores por defecto
```

La contraseña se guarda como secreto en Google Cloud: **nunca** la escribas en el código ni en el repositorio.

---

## 10. Funcionalidades

**Navegación (centrada en el estudiante):** Inicio (qué hacer hoy) · Estudiar (elige tu meta y una técnica recomendada) · Biblioteca (libros, artículos, trivia, apuntes y temas) · Apuntes (subidos y escritos) · Progreso (4 métricas) · Perfil. Las materias se abren desde Estudiar.


| Módulo | Qué incluye | Archivos principales |
|--------|-------------|----------------------|
| Autenticación | Solo `@uvp.edu.mx`, verificación de correo, recuperación y cambio de contraseña, aviso de privacidad | `src/context/AuthContext.jsx`, `src/pages/AuthPages.jsx` |
| Gestión de tarjetas | Materias > temas, CRUD, imágenes, importación en bloque (Excel/CSV), materia de ejemplo | `src/pages/Subjects.jsx`, `src/pages/SubjectDetail.jsx`, `src/components/ImportCards.jsx` |
| Repetición espaciada | SM-2 simplificado (Difícil / Bien / Fácil) con **fecha de examen** por materia | `src/lib/srs.js` |
| **Selector de técnicas** | Al estudiar, el usuario elige la técnica (con descripción, ventajas y desventajas y ayuda «¿no sabes cuál elegir?») | `src/pages/Techniques.jsx`, `src/lib/techniques.js` |
| Técnicas con tarjetas | Repetición espaciada, **Leitner** (5 cajas), **FSRS**, **recuperación** (escribir antes de ver + calibración de confianza), **intercalada**, **interrogación elaborativa** y Pomodoro | `src/lib/schedulers.js`, `src/pages/Study.jsx`, `src/components/RecallCardView.jsx` |
| Apuntes y lectura | **Cornell** (con autoexamen y conversión a tarjetas), **esquema**, **Feynman**, **PQ4R** y **SQ3R** | `src/pages/NoteEditor.jsx`, `src/components/notes/`, `src/lib/guides.js` |
| **Buscador unificado** | Libros de **Open Library + Gutendex + Google Books** fusionados en un solo resultado: portada de Open Library, sinopsis de Google/Gutenberg, ediciones y temas, y **descargas** (dominio público y material abierto). Filtro de idiomas (español, inglés, francés y alemán; no se muestran libros en otros idiomas) y «solo descargables». Trivia traducible a español, francés o alemán. El material protegido muestra el aviso de Derechos de Autor. Trivia de **OpenTDB** (traducida) | `src/features/search/` |
| **Biblioteca** | Colección `libros`: libros guardados desde el buscador y **PDFs propios** (se suben a Cloudinary), por materia; lectura guiada con PQ4R/SQ3R/Feynman | `src/features/library/` |
| **Notas de clase** | Subida unificada: fotos de libreta y PDFs a **Cloudinary** (compresión; Google Drive del alumno queda como opción si se configura `VITE_GOOGLE_CLIENT_ID`) y **Gemini** transcribe ambos. Texto editable y buscable, resumen, tarjetas automáticas y paso a Feynman/Cornell/esquema | `src/features/classnotes/` |
| Creación rápida | Botón «Crear» global, guía de inicio por materia, captura rápida de tarjetas (Ctrl+Enter) | `src/components/CreateMenu.jsx`, `src/components/CardForm.jsx` |
| Sesión de estudio | Pendientes del día, práctica libre, **Pomodoro suave** | `src/pages/Study.jsx`, `src/pages/PomodoroStudy.jsx` |
| Bienestar | Respiración guiada de 15 s, frase del día | `src/components/Breathing.jsx` |
| Progreso | Indicadores, estado de tarjetas, actividad, resumen semanal | `src/pages/Progress.jsx`, `src/components/WeeklySummary.jsx` |
| Notificaciones | Aviso dentro de la app + correo diario opcional | `functions/index.js` |
| Investigación | Datos anónimos, gráficas y exportación CSV (solo administradores) | `src/pages/Admin.jsx`, `src/components/AdminCharts.jsx` |
| Mis datos | Descargar datos (JSON), exportar tarjetas (CSV), borrar cuenta | `src/components/MyData.jsx` |

**Algoritmo de repetición espaciada**

| Respuesta | Tarjeta nueva | 2.º repaso | Después |
|-----------|---------------|------------|---------|
| Difícil | 1 día | mitad del intervalo (mín. 1) | mitad del intervalo; facilidad −0.2 |
| Bien | 2 días | 3 días | intervalo × facilidad (inicia en 2.5) |
| Fácil | 4 días | 6 días | intervalo × facilidad × 1.3; facilidad +0.15 |

Una tarjeta está **dominada** con un intervalo de 21 días o más. Con fecha de examen, ningún repaso se
programa después del día previo al examen.

> **Nota para la documentación:** la arquitectura cambió respecto al Parcial 1 (Node/Express + MySQL)
> a Firebase (Authentication + Firestore + Storage + Cloud Functions).

---

### Configurar los servicios de las notas de clase

Todo corre en el navegador (sin servidor propio). Cada servicio es opcional: la pantalla **Notas de clase → Servicios conectados**
muestra cuáles están activos y, si falta alguno, usa otro como respaldo.

| Servicio | Para qué | Cómo configurarlo |
|----------|----------|-------------------|
| **Cloudinary** | **Todas** las imágenes y PDFs: tarjetas, fotos de libreta y notas de clase (compresión y miniaturas). Reemplaza a Firebase Storage, que exige el plan Blaze | Crea una cuenta gratuita → *Settings → Upload → Upload presets → Add*: modo **Unsigned**, carpeta `amati/clases`. Copia el *cloud name* y el nombre del preset a `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`. (Para PDF en Cloudinary, activa *Settings → Security → PDF and ZIP files delivery*.) |
| **Google Drive** | PDFs en el Drive de cada alumno | En [Google Cloud Console](https://console.cloud.google.com): habilita **Google Drive API** → *Credenciales → ID de cliente OAuth → Aplicación web*. En *Orígenes autorizados de JavaScript* agrega `http://localhost:5173` y tu dominio. Copia el ID a `VITE_GOOGLE_CLIENT_ID`. En la pantalla de consentimiento agrega el permiso `drive.file` (el más limitado: Amati solo ve lo que él crea) y, mientras esté en modo *Pruebas*, a los correos de prueba. |
| **Gemini** | Extraer texto de fotos y PDFs, resumir y crear tarjetas | Crea una llave en [Google AI Studio](https://aistudio.google.com/apikey) y ponla en `VITE_GEMINI_API_KEY`. **Restríngela a tu dominio** (referrers HTTP) en la consola: al correr en el navegador, la llave es visible en el código. `VITE_GEMINI_MODEL` permite cambiar de modelo. |

**Cómo se unen:** fotos y PDFs → Cloudinary (Drive solo si se configura) · el archivo se lee con Gemini en paralelo a la subida · en Firestore solo se guarda
el enlace y el texto (`classNotes`). Archivos de más de 12 MB se guardan, pero no se transcriben. Al eliminar una nota se borra también
el PDF de Drive (si se usó). Los archivos de Cloudinary (tarjetas y notas) no se pueden borrar desde el navegador con subida sin firma:
quedan sin enlace en Amati y deben limpiarse desde su panel.

---

## 11. Estructura del proyecto

```
Amati/
├── public/                  Logo e íconos
├── src/
│   ├── app/                 App y rutas
│   ├── core/                Núcleo compartido: firebase, contextos (sesión, datos, tema), data/db.js,
│   │                        componentes comunes (Layout, CreateMenu…) y utilidades (fechas, imágenes…)
│   ├── features/            Un módulo por funcionalidad:
│   │   ├── home/            Inicio (técnicas + buscador), cómo funciona, resumen semanal
│   │   ├── techniques/      Catálogo y selector de técnicas
│   │   │   └── cards/       Sesiones con tarjetas: SM-2, Leitner, FSRS, recuperación, intercalada…
│   │   ├── notes/           Cornell, esquema, Feynman, PQ4R, SQ3R y autorregulación
│   │   ├── search/          Buscador unificado (api/: Open Library, Gutendex, Google Books, OpenTDB)
│   │   ├── library/         Mi biblioteca: libros guardados y PDFs propios
│   │   ├── classnotes/      Notas de clase (api/: Cloudinary, Google Drive, Gemini y pipeline.js que las une)
│   │   ├── subjects/        Materias, tarjetas, importación, exámenes
│   │   ├── pomodoro/        Pomodoro suave
│   │   ├── wellbeing/       Respiración guiada
│   │   ├── progress/        Progreso
│   │   ├── settings/        Ajustes y mis datos
│   │   ├── admin/           Panel de investigación
│   │   └── auth/            Registro, inicio de sesión
│   └── styles/              Estilos y animaciones
├── functions/               Cloud Function de recordatorios por correo
├── firestore.rules          Reglas de seguridad de la base de datos
├── storage.rules            Reglas de seguridad de las imágenes
├── firebase.json            Configuración de Firebase
├── .env.example             Plantilla de variables de entorno
└── package.json             Dependencias y comandos
```

### Datos en Firestore

```
users/{uid}                  perfil: email, displayName, anonId, reminders, pomodoro
users/{uid}/subjects/{id}    name, color, examDate, sample
users/{uid}/cards/{id}       subjectId, topic, front, back, frontImage, backImage, ease, interval, reps, dueDate…
users/{uid}/notes/{id}       type (cornell|outline|feynman|pq4r|sq3r), title, subjectId, topic, content
users/{uid}/classNotes/{id}  title, subjectId, classDate, text, ocr, file {provider, id, url, thumb, kind, name}
users/{uid}/libros/{id}       biblioteca: title, author, coverUrl, isbn, source, openLibraryId, subjectId, kind (book|pdf), downloads, downloadable, file…
users/{uid}/reviews/{id}     historial privado de cada repaso (incluye technique y confianza)
users/{uid}/sessions/{id}    modo, respiración, respuestas, datos de Pomodoro
research_sessions/{id}       copia anónima (anonId) de cada sesión
research_reviews/{id}        copia anónima (anonId) de cada repaso
admins/{correo}              administradores del panel de investigación
```

## Lector de PDF (React PDF Viewer + Tesseract.js)

- **Lector y anotaciones**: en una nota de clase con PDF o en *Biblioteca → Leer y anotar* (PDFs propios). Selecciona texto y pulsa «Resaltar»; los comentarios se guardan en la propia nota/libro (`annotations`).
- **Extraer texto**: detecta si el PDF tiene texto o es un escaneo. Con texto se lee directamente; si es un escaneo se usa Tesseract.js (OCR en el navegador, español + inglés, hasta 40 páginas). Después puedes resumir y crear tarjetas con Gemini.
- Tesseract.js descarga su motor y los idiomas desde una CDN la primera vez que se usa. Todo funciona sin costo y sin servidor propio.

## Herramientas

Vista `/herramientas`, organizada por áreas de la universidad (por defecto), por necesidad o en lista. Catálogo en `src/features/tools/tools.js` (`R(...)` = herramienta funcional; `T(...)` queda disponible para marcar una futura como «Próximamente»); cada herramienta vive en `src/features/tools/apps/` y se registra en `ToolHost.jsx`.

| Herramienta | Librería / API | Llave |
|---|---|---|
| Calculadora científica | MathJS | no |
| Álgebra y cálculo simbólico | Nerdamer | no |
| Graficadora | Desmos API | sí: `VITE_DESMOS_API_KEY` ([solicítala gratis](https://www.desmos.com/api)); en desarrollo se usa la llave de demostración |
| Simulador de física | PhysicsJS | no |
| Moléculas y compuestos | PubChem (PUG REST) + Kekule.js + Three.js | no |

### Herramientas de programación

| Herramienta | API / librería | Llave |
|---|---|---|
| Programar y retos | Judge0 (instancia pública `ce.judge0.com`, con límite de uso; cámbiala con `VITE_JUDGE0_URL`) | no (`VITE_JUDGE0_KEY` solo si tu instancia o RapidAPI la piden) |
| Proyectos de GitHub | GitHub REST API (búsqueda pública, ~10 búsquedas/min) | no |
| Tutor de errores | Stack Exchange API (~300 consultas/día por conexión) | opcional: `VITE_STACKEXCHANGE_KEY` |
| Laboratorio SQL | sql.js (SQLite en el navegador) | no |

Las explicaciones, los retos generados y «¿por qué falla mi código?» usan Gemini (`VITE_GEMINI_API_KEY`); sin esa llave las herramientas funcionan igual, sin la parte de IA.

### Herramientas de idiomas y escritura

| Herramienta | API | Llave |
|---|---|---|
| Corrector de ortografía y estilo | LanguageTool (API pública, ~20 revisiones/min y 20 000 caracteres por texto; servidor propio con `VITE_LANGUAGETOOL_URL`) | no |
| Traductor | LibreTranslate si defines `VITE_LIBRETRANSLATE_URL` (+ `VITE_LIBRETRANSLATE_KEY` si la pide); si no, MyMemory (gratuita, con límite diario) | no |
| Diccionario de inglés | Dictionary API (definiciones, fonética y audio) + Wordnik (ejemplos reales, etimología, frecuencia) | Wordnik: `VITE_WORDNIK_API_KEY` ([gratuita](https://developer.wordnik.com)); sin ella solo se muestra la parte básica |
| Sinónimos y palabras relacionadas | Datamuse (inglés). En español usa Gemini, porque Datamuse no cubre relaciones de significado en ese idioma | no |

**LibreTranslate:** las instancias públicas piden llave de pago, así que lo más simple es levantar la tuya (gratis y sin tarjeta):
`docker run -p 5000:5000 libretranslate/libretranslate --load-only es,en,fr,pt,de,it` y poner `VITE_LIBRETRANSLATE_URL=http://localhost:5000` (para producción necesitarás alojarla en un servidor con HTTPS).

### Economía, datos y Excel

| Herramienta | API / librería | Llave |
|---|---|---|
| Comparador de países | Banco Mundial (World Development Indicators) + ECharts | no |
| Indicadores de México | INEGI, Banco de Indicadores (BIE) | token gratuito: `VITE_INEGI_TOKEN` ([solicítalo](https://www.inegi.org.mx/servicios/api_indicadores.html)) |
| Excel: fórmulas y archivos | SheetJS (instalado desde `cdn.sheetjs.com`, la versión de npm está desactualizada) + Formula.js | no |
| Gráficas y dashboards | Apache ECharts | no |

La clave del INEGI viaja en el navegador (es de solo lectura de datos públicos). Las claves del INEGI preconfiguradas (INPC `628194`, desocupación `444884`) deben verificarse con tu token; cualquier otra se consulta en «Otra clave».
