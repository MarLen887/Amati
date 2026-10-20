# Amati — Aplicación de estudio inteligente libre de estrés

Aplicación web de tarjetas de estudio (flashcards) con **repetición espaciada**, apuntes, biblioteca y herramientas
de estudio, para la comunidad estudiantil de la Universidad del Valle de Puebla (UVP).

Proyecto Integrador · Problemática Social Contemporánea · Equipo C · Grupo 7C

---

## Índice

1. [Qué necesitas instalar](#1-qué-necesitas-instalar)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Instalar las dependencias](#3-instalar-las-dependencias)
4. [Configurar las variables (`.env.local`)](#4-configurar-las-variables-envlocal)
5. [Ejecutar la aplicación](#5-ejecutar-la-aplicación)
6. [Cuenta de administrador (panel de investigación)](#6-cuenta-de-administrador-panel-de-investigación)
7. [Comandos útiles](#7-comandos-útiles)
8. [Problemas frecuentes](#8-problemas-frecuentes)
9. [Publicar en Firebase](#9-publicar-en-firebase)
10. [Correos: recordatorios y apuntes compartidos (gratis)](#10-correos-recordatorios-y-apuntes-compartidos-gratis)
11. [Servicios opcionales y cómo configurarlos](#11-servicios-opcionales-y-cómo-configurarlos)
12. [Funcionalidades](#12-funcionalidades)
13. [Herramientas de estudio](#13-herramientas-de-estudio)
14. [Estructura del proyecto y datos](#14-estructura-del-proyecto-y-datos)
15. [Tutorial y Centro de ayuda](#15-tutorial-y-centro-de-ayuda)

---

## 1. Qué necesitas instalar

| Programa | Versión | Para qué | Descarga |
|----------|---------|----------|----------|
| **Git** | cualquiera reciente | Clonar el repositorio | https://git-scm.com/downloads |
| **Node.js** | **20.19 o superior** (recomendado 22 LTS o 24) | Ejecutar la app | https://nodejs.org |
| Un navegador | Chrome, Edge o Firefox actualizados | Usar la app | — |
| *(Opcional)* **Firebase CLI** | 13 o superior | Solo para publicar reglas o la app (paso 9) | se instala con npm |

Comprueba que quedaron instalados abriendo una terminal (PowerShell, CMD, Git Bash o la terminal de Laragon):

```bash
git --version
node --version
npm --version
```

Si alguno marca "no se reconoce como un comando", reinstálalo y **cierra y vuelve a abrir la terminal**.

> **Laragon:** ya incluye Git y Node.js. Usa su terminal (botón *Terminal*) para que estén disponibles.

---

## 2. Clonar el repositorio

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

Tarda de 1 a 2 minutos la primera vez y crea la carpeta `node_modules`. **No necesita ninguna opción extra.**

> Al terminar verás avisos amarillos (`npm warn deprecated…`) y un resumen de «vulnerabilidades». Son normales en
> proyectos de React y **no son errores**: la instalación terminó bien si no aparece la palabra `error` en rojo.
> No ejecutes `npm audit fix --force`: puede romper dependencias.

Solo se repite cuando cambie `package.json` (por ejemplo después de un `git pull`).

---

## 4. Configurar las variables (`.env.local`)

Los datos del proyecto no se suben al repositorio por seguridad: cada persona crea su archivo local.

**Paso 1.** Copia el archivo de ejemplo:

```bash
# PowerShell / CMD
copy .env.example .env.local

# Git Bash / macOS / Linux
cp .env.example .env.local
```

**Paso 2.** Abre `.env.local` y llena **al menos** los datos de Firebase, **sin espacios después del `=`**:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=amati-8382f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=amati-8382f
VITE_FIREBASE_STORAGE_BUCKET=amati-8382f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ALLOWED_DOMAIN=uvp.edu.mx
```

**¿De dónde salen?** Pídeselos a la desarrolladora backend del equipo o, si tienes acceso:
[Consola de Firebase](https://console.firebase.google.com) → proyecto **Amati** → ⚙️ *Configuración del proyecto* →
*Tus apps* → app web → *Configuración del SDK* (objeto `firebaseConfig`).

**Paso 3 (opcional).** Todo lo demás es opcional: si una variable queda vacía, esa función simplemente no aparece o
usa un respaldo. Con solo Firebase la app ya funciona.

| Variable | Qué activa | Dónde se explica |
|----------|-----------|------------------|
| `VITE_GOOGLE_BOOKS_API_KEY` | Biblioteca: resultados de Google Books sin límite bajo | [Paso 11](#11-servicios-opcionales-y-cómo-configurarlos) |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | Subir imágenes y PDFs (tarjetas, notas de clase, PDFs propios) | Paso 11 |
| `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL` | IA: leer texto de fotos/PDF, resumir, crear tarjetas y quizzes | Paso 11 |
| `VITE_GOOGLE_CLIENT_ID` | Guardar PDFs en el Google Drive del alumno | Paso 11 |
| `VITE_WELCOME_VIDEO` | Video de bienvenida del tutorial (enlace de YouTube «No listado») | [Paso 15](#15-tutorial-y-centro-de-ayuda) |
| `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` | Correo de aviso al compartir un apunte | [Paso 10](#10-correos-recordatorios-y-apuntes-compartidos-gratis) |
| `VITE_DESMOS_API_KEY` | Graficadora ([llave gratis](https://www.desmos.com/api)); en desarrollo usa una de demostración | [Paso 13](#13-herramientas-de-estudio) |
| `VITE_WORDNIK_API_KEY` | Diccionario avanzado ([llave gratis](https://developer.wordnik.com)) | Paso 13 |
| `VITE_INEGI_TOKEN` | Indicadores de México ([token gratis](https://www.inegi.org.mx/servicios/api_indicadores.html)) | Paso 13 |
| `VITE_STACKEXCHANGE_KEY`, `VITE_JUDGE0_URL`, `VITE_JUDGE0_KEY` | Límites más altos en el Tutor de errores y en Programar | Paso 13 |
| `VITE_LIBRETRANSLATE_URL`, `VITE_LIBRETRANSLATE_KEY`, `VITE_MYMEMORY_EMAIL`, `VITE_LANGUAGETOOL_URL` | Traductor y corrector con tus propios servidores o más cuota | Paso 13 |

> Estas llaves viajan en el navegador, así que **restríngelas a tu dominio** en la consola de cada servicio cuando lo permita.
> Aun así, **no subas `.env.local` a GitHub** (ya está en `.gitignore`).

### 4.1 Activar «Continuar con Google» en Firebase (una sola vez)

Amati **no usa contraseñas**: se entra con la cuenta de Google institucional (`@uvp.edu.mx`). Quien administra el proyecto debe
activarlo una vez en la [Consola de Firebase](https://console.firebase.google.com):

1. **Authentication → Método de acceso** (*Sign-in method*) → **Google** → **Habilitar**. Elige un correo de asistencia del proyecto y guarda.
2. **Authentication → Configuración → Dominios autorizados:** deben estar `localhost` y el dominio donde publiques Amati
   (`amati-8382f.web.app` y `amati-8382f.firebaseapp.com` ya vienen). Si usas otro dominio, agrégalo aquí.
3. *(Recomendado)* En el mismo *Método de acceso*, **deshabilita «Correo electrónico/contraseña»**, para que ya no exista esa vía.
4. *(Si ya había cuentas)* En **Authentication → Configuración → Vinculación de cuentas de usuario**, deja activa
   «Vincular cuentas que usan el mismo correo electrónico». Así quienes ya se habían registrado con contraseña entran con Google
   y **conservan sus tarjetas y apuntes** (es la misma cuenta).

Cómo funciona por dentro: al pulsar el botón se abre la ventana de Google; si la cuenta no es `@uvp.edu.mx`, Amati la rechaza y borra
la cuenta recién creada. Las reglas de Firestore también exigen un correo `@uvp.edu.mx` verificado (Google ya lo verifica), así
que **no hay que cambiar la base de datos**: los datos siguen guardados por usuario como antes.

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

1. Pulsa **«Continuar con Google»** y elige tu cuenta **@uvp.edu.mx** (otros dominios no se permiten).
2. Listo: no hay contraseña ni correo de verificación. Si es tu primera vez, Amati crea tu perfil y te muestra una guía corta.

> Si el botón marca un error de Firebase, falta activar Google (paso 4.1).

> ⚠️ Es una app de React: **no** se abre con `http://localhost/Amati` de Apache/Laragon. Siempre usa `npm run dev`.

**En celular y tableta** el menú es de hamburguesa (☰, arriba a la derecha) y junto a él hay un botón de casa para volver
al Inicio. En computadora el menú está en la barra superior.

**Modo de color:** en el **Inicio** (arriba a la derecha) hay tres íconos para elegir *claro*, *oscuro* o *predeterminado* (el del dispositivo); también están en la pantalla de acceso.

---

## 6. Cuenta de administrador (panel de investigación)

**No existe una cuenta de administrador con usuario y contraseña propios.** El administrador es una cuenta
normal de estudiante (que entra con Google) cuyo correo está autorizado. Así no hay contraseñas compartidas ni guardadas en el código.

Para dar acceso a un integrante del equipo:

1. La persona entra una vez con **«Continuar con Google»** (paso 5) para que exista su cuenta.
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
| `npm run deploy` | Compila y publica **solo la app** (Hosting) en Firebase |
| `git pull` | Descarga los últimos cambios del repositorio |

Después de un `git pull`, si cambió `package.json`, vuelve a ejecutar `npm install`.

---

## 8. Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Aparece **"Falta configurar Firebase"** | Falta `.env.local` o tiene errores. Revisa el paso 4 y **reinicia** `npm run dev` (Vite solo lee el archivo al iniciar). |
| Cambié `.env.local` y no pasa nada | Detén `npm run dev` con `Ctrl + C` y vuelve a ejecutarlo. |
| `npm` / `node` / `git` **no se reconoce** | Instálalo (paso 1) y abre una terminal nueva. En Laragon usa su terminal. |
| `firebase` **no se reconoce** | Instálalo con `npm install -g firebase-tools` y abre una terminal nueva. Con Laragon puede quedar en `C:\laragon\bin\nodejs\<versión>\firebase.cmd`. |
| **"Port 5173 is in use"** | Ya hay otro `npm run dev` abierto. Ciérralo o usa `npm run dev -- --port 5174`. |
| **«Continuar con Google»** muestra *«no está activado…»* | Falta el paso 4.1: activar Google en *Authentication → Método de acceso*. |
| Error de *«sitio no autorizado»* al entrar con Google | Agrega el dominio en *Authentication → Configuración → Dominios autorizados* (paso 4.1). |
| La ventana de Google no se abre | Tu navegador la bloqueó: permite las ventanas emergentes para el sitio y vuelve a intentar. |
| Dice *«Solo se permiten cuentas @uvp.edu.mx»* | Elegiste otra cuenta de Google. Usa la institucional (puedes cambiar de cuenta en la ventana de Google). |
| Errores de permisos (`permission-denied`) | Entra con tu cuenta `@uvp.edu.mx` y verifica que las reglas estén publicadas (paso 9). |
| «Compartidos conmigo» no muestra nada | Faltan publicar los índices: `firebase deploy --only firestore:indexes` (paso 9). |
| No veo la pestaña **Investigación** | Tu correo no está en la colección `admins` (paso 6), o falta cerrar y abrir sesión. |
| No llegan los **recordatorios de estudio** | Revisa el paso 10: los secretos de GitHub, que el archivo `.github/workflows/reminders.yml` esté subido y que hayas activado el recordatorio en *Perfil → Recordatorios*. Solo se envía si tienes tarjetas pendientes. |
| No llega el correo al **compartir un apunte** | Revisa spam (sobre todo en correos institucionales) y el paso 10. Aun sin correo, la persona ve el apunte en *Apuntes → Compartidos conmigo*. |
| La Biblioteca muestra «Google Books» en rojo | Google limitó las consultas. Agrega `VITE_GOOGLE_BOOKS_API_KEY` (paso 11); mientras tanto las otras fuentes siguen funcionando. |
| La IA dice que la llave de Gemini no es válida | Revisa `VITE_GEMINI_API_KEY` y que no esté restringida a otro dominio. |

---

## 9. Publicar en Firebase

Solo para quien administra el proyecto de Firebase.

```bash
npm install -g firebase-tools
firebase login
firebase use amati-8382f
```

| Qué publicar | Comando | Cuándo |
|--------------|---------|--------|
| Reglas de Firestore | `firebase deploy --only firestore:rules` | Siempre que cambie `firestore.rules` |
| Índices de Firestore | `firebase deploy --only firestore:indexes` | Necesario para **apuntes compartidos** (búsqueda en todos los apuntes por correo) |
| La app (Hosting) | `npm run deploy` (o `npm run build` y `firebase deploy --only hosting`) | Cuando quieras publicar una versión nueva |
| Reglas de Storage | `firebase deploy --only storage` | Solo si algún día usas el plan Blaze (hoy las imágenes van a Cloudinary) |

> ⚠️ **Escribe siempre `--only ...`.** Un `firebase deploy` sin eso intenta publicar también las Cloud Functions,
> que requieren el plan de pago (Blaze) y fallará. Los recordatorios de este proyecto **no** usan Cloud Functions (paso 10).

Las variables `VITE_...` se **incluyen al compilar**: si cambias `.env.local`, vuelve a compilar y publicar para que
el sitio publicado las use.

---

## 10. Correos: recordatorios y apuntes compartidos (gratis)

Ninguno de los dos necesita el plan Blaze de Firebase. Cada uno usa un servicio gratuito distinto.

### 10.1 Recordatorios de estudio (GitHub Actions + Gmail)

Cada hora, una tarea automática de GitHub revisa a quienes activaron el recordatorio y, si tienen tarjetas pendientes
a su hora elegida, les envía **un** correo breve (máximo uno al día). El código está en
`.github/workflows/reminders.yml` y `scripts/send-reminders.mjs`.

**Requisitos:** que el repositorio esté en GitHub y que esos dos archivos estén **subidos** (`git push`).

1. **Contraseña de aplicación de Gmail.** En la cuenta de Gmail que enviará los correos: *Cuenta de Google → Seguridad →
   Verificación en dos pasos* (actívala) → *Contraseñas de aplicaciones* → crea una y copia las 16 letras.
2. **Clave de servicio de Firebase.** [Consola de Firebase](https://console.firebase.google.com) → ⚙️ *Configuración del
   proyecto* → pestaña *Cuentas de servicio* → **Generar nueva clave privada**. Se descarga un archivo `.json`.
   Guárdalo fuera del proyecto y **nunca lo subas a GitHub**.
3. **Secretos en GitHub.** En el repositorio: *Settings → Secrets and variables → Actions → New repository secret*.
   Crea estos cuatro:

   | Nombre | Valor |
   |--------|-------|
   | `FIREBASE_SERVICE_ACCOUNT` | Todo el contenido del archivo `.json` del paso 2 |
   | `SMTP_USER` | El correo Gmail que envía (ej. `amati.uvp@gmail.com`) |
   | `SMTP_PASS` | La contraseña de aplicación de 16 letras (sin espacios) |
   | `MAIL_FROM` | Cómo se verá el remitente, ej. `Amati <amati.uvp@gmail.com>` |

   *(Opcional)* en la pestaña **Variables** del mismo lugar, crea `APP_URL` con la dirección publicada de la app.
4. **Probar.** Pestaña **Actions** → *Recordatorios por correo* → **Run workflow** → escribe tu correo en `test_email` →
   *Run workflow*. En un minuto debe llegarte un correo de prueba. Si falla, abre la ejecución y lee el mensaje en rojo.
5. **Usarlo.** En Amati: *Perfil → Recordatorios* → activa «Recordatorio por correo» y elige una hora. El correo llega a esa
   hora o poco después (GitHub puede tardar unos minutos).

> **Límites de GitHub:** en repositorios públicos GitHub pausa las tareas programadas tras 60 días sin actividad en el
> repositorio (se reactivan desde la pestaña *Actions*). Cada ejecución dura cerca de un minuto, muy por debajo de la
> cuota gratuita.

### 10.2 Aviso al compartir un apunte (EmailJS)

Al invitar a alguien en *Compartir*, Amati le manda un correo con el enlace al apunte, usando
[EmailJS](https://www.emailjs.com) (gratis hasta 200 correos al mes). Se puede compartir **solo con cuentas @uvp.edu.mx**.

1. Crea una cuenta en EmailJS.
2. **Email Services → Add New Service →** Gmail (u otro) y conéctalo. Copia el **Service ID**.
3. **Email Templates → Create New Template.** Configúrala así:
   - **To Email:** `{{to_email}}`
   - **Subject:** `{{from_name}} compartió contigo un apunte en Amati`
   - **Content:** por ejemplo
     ```
     Hola,

     {{from_name}} compartió contigo el apunte «{{note_title}}» en Amati.

     Ábrelo aquí: {{link}}
     ```
   Guarda y copia el **Template ID**. Los nombres entre llaves deben escribirse **exactamente** así.
4. **Account → API keys:** copia la **Public Key**.
5. Pega los tres valores en `.env.local` y **reinicia** `npm run dev`:

   ```env
   VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
   VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxx
   ```
6. **Probar:** abre un apunte libre → *Compartir* → invita a otra cuenta @uvp.edu.mx tuya. Debe aparecer
   «Le avisamos por correo a…». Si el correo no llega, mira la carpeta de spam; los correos institucionales a veces
   filtran mensajes enviados desde Gmail. En la herramienta *Email History* de EmailJS puedes ver si el envío salió bien.

Si no configuras EmailJS, compartir sigue funcionando: la persona ve el apunte en *Apuntes → Compartidos conmigo*.

### 10.3 Alternativa con Cloud Functions (requiere plan Blaze)

El proyecto también incluye `functions/index.js`, que envía los recordatorios desde Firebase. **Usa solo una opción**
(GitHub Actions *o* Cloud Functions); con las dos activas llegarían correos duplicados.

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set SMTP_PASS     # pega la contraseña de aplicación (16 caracteres)
firebase deploy --only functions             # pide SMTP_USER y MAIL_FROM; el resto tiene valores por defecto
```

---

## 11. Servicios opcionales y cómo configurarlos

Todo corre en el navegador (sin servidor propio). Si falta alguno, la app usa el otro como respaldo o simplemente oculta esa función.

| Servicio | Para qué | Cómo configurarlo |
|----------|----------|-------------------|
| **Google Books** | Más resultados y sinopsis en la Biblioteca | [Google Cloud Console](https://console.cloud.google.com) → *APIs y servicios → Biblioteca* → busca **Books API** → *Habilitar*. Luego *Credenciales → Crear credenciales → Clave de API*. Cópiala a `VITE_GOOGLE_BOOKS_API_KEY`. Edita la clave y limítala: *Restricciones de API* → solo Books API, y *Restricciones de aplicaciones* → sitios web (agrega `http://localhost:5173/*` y tu dominio). No necesitas el ID del proyecto. |
| **Cloudinary** | **Todas** las imágenes y PDFs: tarjetas, fotos de libreta, notas de clase y PDFs propios (reemplaza a Firebase Storage, que exige plan Blaze) | Crea una cuenta gratuita → *Settings → Upload → Upload presets → Add*: modo **Unsigned**, carpeta `amati/clases`. Copia el *cloud name* y el nombre del preset a `VITE_CLOUDINARY_CLOUD_NAME` y `VITE_CLOUDINARY_UPLOAD_PRESET`. Para PDF activa *Settings → Security → PDF and ZIP files delivery*. |
| **Gemini** | Leer texto de fotos y PDFs, resumir, crear tarjetas y quizzes, y las explicaciones de varias herramientas | Crea una llave en [Google AI Studio](https://aistudio.google.com/apikey) y ponla en `VITE_GEMINI_API_KEY`. Restríngela a tu dominio (referrers HTTP). `VITE_GEMINI_MODEL` permite cambiar de modelo. En el plan gratuito Google puede usar los textos enviados para mejorar sus modelos: por eso la app avisa antes de generar. |
| **Google Drive** | PDFs en el Drive de cada alumno | En Google Cloud Console habilita **Google Drive API** → *Credenciales → ID de cliente OAuth → Aplicación web*. En *Orígenes autorizados de JavaScript* agrega `http://localhost:5173` y tu dominio. Copia el ID a `VITE_GOOGLE_CLIENT_ID`. En la pantalla de consentimiento agrega el permiso `drive.file` y, mientras esté en modo *Pruebas*, los correos de prueba. |

**Cómo se unen:** fotos y PDFs → Cloudinary (Drive solo si se configura) · Gemini lee el archivo en paralelo a la subida ·
en Firestore solo se guarda el enlace y el texto (`classNotes`). Los archivos de más de 12 MB se guardan, pero no se
transcriben. Los archivos de Cloudinary no se pueden borrar desde el navegador (subida sin firma): al eliminar una nota
quedan sin enlace en Amati y deben limpiarse desde el panel de Cloudinary.

---

## 12. Funcionalidades

**Inicio:** el botón principal es **«Continuar con» la última técnica que usaste** (o «Empezar sesión de estudio» si todavía no usas ninguna).

**Navegación:** Inicio · Estudiar (técnicas y metas) · **Mis materias** · Biblioteca · Apuntes · Herramientas · Progreso ·
Perfil. En celular, el menú se abre con ☰ y «Inicio» queda siempre a la vista.

| Módulo | Qué incluye | Carpeta |
|--------|-------------|---------|
| Autenticación | **«Continuar con Google»** con cuenta `@uvp.edu.mx` (sin contraseñas), aviso de privacidad, descargar o borrar la cuenta (se confirma con Google) | `src/features/auth/`, `src/core/context/AuthContext.jsx` |
| **Materias** | Crear, **editar (nombre y color)** y **eliminar** materias en ventanas modales (**no se permiten dos materias con el mismo nombre**, sin importar mayúsculas ni acentos); el selector de materia de los apuntes permite «＋ Agregar materia…». Al eliminar se avisa qué se pierde y se pide confirmar | `src/features/subjects/` |
| Página de cada materia | Arriba, la **técnica de estudio que usaste más recientemente en esa materia** (con «Continuar» y «Usar otra técnica»; el enlace «Administrar mis tarjetas» abre sus tarjetas para crear, importar, buscar y editar) y las pestañas **Apuntes**, **Clases**, **Herramientas** (las que el alumno agrega a la materia) y **Biblioteca**. Temas, imágenes, importación en bloque (Excel/CSV) y materia de ejemplo | `src/features/subjects/` |
| Repetición espaciada | SM-2 simplificado (Difícil / Bien / Fácil) con **fecha de examen** por materia | `src/features/techniques/cards/srs.js` |
| **Técnicas de estudio** | Repetición espaciada, **Leitner**, **FSRS**, **recuperación** (con calibración de confianza), **intercalada**, **interrogación elaborativa** y **Pomodoro suave** | `src/features/techniques/`, `src/features/pomodoro/` |
| **Apuntes** | **Apunte libre** (siempre primero) y técnicas guiadas, cada una con una explicación sencilla al pasar el puntero: **Cornell** (con autoexamen y conversión a tarjetas), **esquema**, **Feynman**, **PQ4R**, **SQ3R** y **apuntes libres** (editor con fórmulas, dibujo y edición en tiempo real) que se pueden **compartir** con cuentas @uvp.edu.mx | `src/features/notes/` |
| **Generar recursos con IA** | Desde un apunte, nota de clase o PDF: **resumen**, **tarjetas** (se revisan antes de guardar) y **quiz** de opción múltiple. Requiere Gemini | `src/features/notes/GenerateResources.jsx`, `QuizPanel.jsx` |
| **Biblioteca** | Buscador de libros (**Open Library + Gutenberg + Google Books**) limitado a textos **académicos, científicos, educativos y literarios**, con descripción de dos oraciones, filtro de idiomas (es/en/fr/de) y «solo descargables». También artículos (Crossref), temas (Wikipedia), trivia (OpenTDB) y «Mis libros» con PDFs propios | `src/features/library/`, `src/features/search/` |
| **Notas de clase** | Fotos de libreta y PDFs (Cloudinary), transcripción con Gemini, texto editable, resumen, tarjetas y lector de PDF con anotaciones | `src/features/classnotes/`, `src/features/pdf/` |
| **Herramientas** | Calculadora, diagramas, mapas mentales, líneas de tiempo, programación, idiomas, economía y más, por área de la UVP (paso 13) | `src/features/tools/` |
| Bienestar | Respiración guiada de 15 s antes de estudiar | `src/features/wellbeing/` |
| Progreso | Indicadores, estado de tarjetas, actividad, resumen semanal | `src/features/progress/` |
| Notificaciones | Aviso dentro de la app y correo diario opcional (paso 10) | `scripts/`, `.github/workflows/` |
| Investigación | Datos anónimos, gráficas y exportación CSV (solo administradores) | `src/features/admin/` |
| Mis datos | Descargar datos (JSON), exportar tarjetas (CSV), borrar cuenta | `src/features/settings/` |

**Algoritmo de repetición espaciada**

| Respuesta | Tarjeta nueva | 2.º repaso | Después |
|-----------|---------------|------------|---------|
| Difícil | 1 día | mitad del intervalo (mín. 1) | mitad del intervalo; facilidad −0.2 |
| Bien | 2 días | 3 días | intervalo × facilidad (inicia en 2.5) |
| Fácil | 4 días | 6 días | intervalo × facilidad × 1.3; facilidad +0.15 |

Una tarjeta está **dominada** con un intervalo de 21 días o más. Con fecha de examen, ningún repaso se
programa después del día previo al examen.

**Lector de PDF (React PDF Viewer + Tesseract.js).** En una nota de clase con PDF o en *Biblioteca → Mis libros → Leer y
anotar*. Selecciona texto y pulsa «Resaltar»; los comentarios se guardan en la propia nota o libro. «Extraer texto» detecta
si el PDF tiene texto o es un escaneo; en ese caso usa OCR en el navegador (español + inglés, hasta 40 páginas).
Tesseract.js descarga su motor y los idiomas desde una CDN la primera vez que se usa.

> **Nota para la documentación:** la arquitectura cambió respecto al Parcial 1 (Node/Express + MySQL)
> a Firebase (Authentication + Firestore).

---

## 13. Herramientas de estudio

Vista **Herramientas**: el bloque **«¿De qué área es tu carrera?»** siempre está a la vista (elige un área o **Ver todas**, y puedes cambiarlo cuando quieras), seguido de un buscador, las tres formas de verlas (**Por área**, **Por necesidad** y **Lista**) y el filtro «Solo favoritas». Por defecto se organizan por las **áreas de la UVP** (Ciencias de la Salud, Artes y Humanidades, Ciencias de la vida, Ingenierías, y Negocios, Hospitalidad y Ciencias Sociales).

Las herramientas útiles para todas las carreras aparecen en «Para todas las carreras». El catálogo está en
`src/features/tools/tools.js` (`R(...)` = herramienta funcional; `T(...)` marca una futura como «Próximamente»); cada
herramienta vive en `src/features/tools/apps/` y se registra en `ToolHost.jsx`. **Todas son gratuitas.**

### Diagramas, mapas y líneas de tiempo (sin llaves)

| Herramienta | Librería | Para qué |
|---|---|---|
| Diagramas con Mermaid | Mermaid.js | Diagramas de flujo, UML, secuencia, arquitecturas y mapas conceptuales escribiendo texto; descarga en SVG/PNG |
| Mapas mentales con Markmap | Markmap | Convierte un esquema de texto (con sangrías o Markdown) en un mapa mental interactivo |
| Diagramas interactivos | React Flow | Algoritmos, redes y arquitecturas arrastrando y conectando nodos; se guarda en el dispositivo |
| Líneas de tiempo | TimelineJS | Eventos con fecha, texto e imagen en una línea de tiempo navegable |

### Cálculo, ciencias y datos

| Herramienta | Librería / API | Llave |
|---|---|---|
| Calculadora científica | MathJS | no |
| Álgebra y cálculo simbólico | Nerdamer | no |
| Graficadora | Desmos API | `VITE_DESMOS_API_KEY` (gratis); sin ella, en desarrollo usa la de demostración |
| Simulador de física | PhysicsJS | no |
| Moléculas y compuestos | PubChem + Kekule.js + Three.js | no |
| Excel: fórmulas y archivos | SheetJS + Formula.js | no |
| Gráficas y dashboards | Apache ECharts | no |
| Comparador de países | Banco Mundial + ECharts | no |
| Indicadores de México | INEGI: tarjetas con los **10 indicadores más consultados** y **búsqueda por nombre** (PIB, inflación, personas ciegas…), con gráfica e historial | `VITE_INEGI_TOKEN` (gratis) |

### Programación

| Herramienta | API / librería | Llave |
|---|---|---|
| Programar y retos | Judge0 (instancia pública `ce.judge0.com`, con límite de uso; cámbiala con `VITE_JUDGE0_URL`) | no (`VITE_JUDGE0_KEY` solo si tu instancia la pide) |
| Proyectos de GitHub | GitHub REST API (búsqueda pública, ~10 búsquedas/min) | no |
| Tutor de errores | Stack Exchange API (~300 consultas/día por conexión) | opcional: `VITE_STACKEXCHANGE_KEY` |
| Laboratorio SQL | sql.js (SQLite en el navegador) | no |

Las explicaciones, los retos generados y «¿por qué falla mi código?» usan Gemini (`VITE_GEMINI_API_KEY`); sin esa llave
las herramientas funcionan igual, sin la parte de IA.

### Idiomas y escritura

| Herramienta | API | Llave |
|---|---|---|
| Corrector de ortografía y estilo | LanguageTool (API pública, ~20 revisiones/min; servidor propio con `VITE_LANGUAGETOOL_URL`) | no |
| Traductor | MyMemory (gratuita, con límite diario; `VITE_MYMEMORY_EMAIL` lo amplía). Si defines `VITE_LIBRETRANSLATE_URL`, usa tu LibreTranslate | no |
| Diccionario de inglés | Dictionary API + Wordnik (ejemplos y etimología) | `VITE_WORDNIK_API_KEY` (gratis); sin ella solo la parte básica |
| Sinónimos | Datamuse (inglés); en español usa Gemini | no |

**LibreTranslate:** las instancias públicas piden llave de pago, así que lo más simple es levantar la tuya (gratis):
`docker run -p 5000:5000 libretranslate/libretranslate --load-only es,en,fr,pt,de,it` y poner
`VITE_LIBRETRANSLATE_URL=http://localhost:5000` (para producción necesitarás alojarla con HTTPS).

---

## 14. Estructura del proyecto y datos

```
Amati/
├── .github/workflows/       reminders.yml: recordatorios por correo cada hora (GitHub Actions)
├── scripts/                 send-reminders.mjs: el programa que envía los recordatorios
├── public/                  Logo e íconos
├── src/
│   ├── app/                 App y rutas
│   ├── core/                Núcleo compartido: firebase, contextos (sesión, datos, tema), data/db.js,
│   │                        componentes comunes (Layout y menú…) y utilidades (fechas, imágenes, EmailJS…)
│   ├── features/            Un módulo por funcionalidad:
│   │   ├── home/            Inicio, cómo funciona
│   │   ├── techniques/      Catálogo y selector de técnicas
│   │   │   └── cards/       Sesiones con tarjetas: SM-2, Leitner, FSRS, recuperación, intercalada…
│   │   ├── notes/           Apuntes (Cornell, esquema, Feynman, PQ4R, SQ3R, libres), compartir, resumen/tarjetas/quiz con IA
│   │   ├── library/         Biblioteca: explorar y «Mis libros»
│   │   ├── search/          Fuentes del buscador (api/: Open Library, Gutenberg, Google Books, Crossref, Wikipedia, OpenTDB)
│   │   ├── classnotes/      Notas de clase (api/: Cloudinary, Google Drive, Gemini)
│   │   ├── pdf/             Lector de PDF y OCR
│   │   ├── subjects/        Materias, tarjetas, importación, exámenes
│   │   ├── tools/           Herramientas de estudio (apps/: una por herramienta)
│   │   ├── pomodoro/        Pomodoro suave
│   │   ├── wellbeing/       Respiración guiada
│   │   ├── progress/        Progreso
│   │   ├── settings/        Perfil, recordatorios y mis datos
│   │   ├── admin/           Panel de investigación
│   │   └── auth/            Acceso con Google
│   └── styles/              Estilos y animaciones
├── functions/               Cloud Function de recordatorios (alternativa, requiere plan Blaze)
├── firestore.rules          Reglas de seguridad de la base de datos
├── firestore.indexes.json   Índices (apuntes compartidos)
├── storage.rules            Reglas de Storage (solo plan Blaze)
├── firebase.json            Configuración de Firebase
├── .env.example             Plantilla de variables de entorno
└── package.json             Dependencias y comandos
```

### Datos en Firestore

```
users/{uid}                  perfil: email, displayName, anonId, reminders, pomodoro
users/{uid}/subjects/{id}    name, color, examDate, sample
users/{uid}/cards/{id}       subjectId, topic, front, back, frontImage, backImage, ease, interval, reps, dueDate…
users/{uid}/notes/{id}       type (cornell|outline|feynman|pq4r|sq3r|libre), title, subjectId, topic, content,
                             collaboratorEmails (apuntes compartidos); los libres guardan su contenido en
                             las subcolecciones updates, presence y history
users/{uid}/classNotes/{id}  title, subjectId, classDate, text, ocr, file {provider, id, url, thumb, kind, name}
users/{uid}/libros/{id}      title, author, coverUrl, isbn, source, subjectId, kind (book|pdf), downloads, file…
users/{uid}/reviews/{id}     historial privado de cada repaso (incluye técnica y confianza)
users/{uid}/sessions/{id}    modo, respiración, respuestas, datos de Pomodoro
research_sessions/{id}       copia anónima (anonId) de cada sesión
research_reviews/{id}        copia anónima (anonId) de cada repaso
admins/{correo}              administradores del panel de investigación
```

---

## 15. Tutorial y Centro de ayuda

**Primera vez:** al entrar por primera vez aparece el **video de bienvenida** (con «Omitir» desde el inicio) y, al terminar o al omitirlo, un **recorrido con globos** que señala la pantalla real, con **2 globos por vista** (Inicio, Materias, Biblioteca, Apuntes, Herramientas y Progreso) y los botones «Siguiente», «Atrás» y «Omitir», sin contador de pasos. Al final ofrece crear la primera materia o probar con una de ejemplo. Se recuerda que ya lo viste (en el navegador y en tu perfil, campo `tutorialSeen`), así que no se repite.

**Centro de ayuda (Perfil):** botones para **ver el video otra vez** y **repetir el recorrido**, y **preguntas frecuentes** desplegables con búsqueda.

**Cómo agregar el video:** el guion y la guía de producción están en [`docs/guion-video-bienvenida.md`](docs/guion-video-bienvenida.md). Sube el video a YouTube como «No listado» y pon el enlace en `VITE_WELCOME_VIDEO` (paso 4). Mientras esa variable esté vacía, el tutorial funciona solo con el recorrido.

**Cómo editar el contenido:**

| Qué | Dónde |
|-----|-------|
| Pasos del recorrido (textos, orden, pantalla) | `src/features/tutorial/tutorialSteps.js` |
| Qué parte de la pantalla señala cada paso | atributos `data-tour="…"` en los componentes de cada vista |
| Preguntas frecuentes | `src/features/tutorial/faq.js` |

Si cambias o mueves un botón señalado por el recorrido, conserva su atributo `data-tour`; si un objetivo no existe en pantalla, el paso se muestra al centro y el recorrido sigue funcionando.
