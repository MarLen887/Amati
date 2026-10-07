# Amati — Aplicación de estudio inteligente libre de estrés

Aplicación web de tarjetas de estudio (flashcards) con **repetición espaciada** y herramientas de
**bienestar emocional**, para la comunidad estudiantil de la Universidad del Valle de Puebla (UVP).

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
| Reglas de Firestore | `firebase deploy --only firestore:rules` |
| Reglas de Storage (imágenes; requiere plan Blaze) | `firebase deploy --only storage` |
| La app (Hosting) — *después de la aprobación del prototipo* | `npm run build` y luego `firebase deploy --only hosting` |

### Recordatorios por correo (requiere plan Blaze)

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

| Módulo | Qué incluye | Archivos principales |
|--------|-------------|----------------------|
| Autenticación | Solo `@uvp.edu.mx`, verificación de correo, recuperación y cambio de contraseña, aviso de privacidad | `src/context/AuthContext.jsx`, `src/pages/AuthPages.jsx` |
| Gestión de tarjetas | Materias > temas, CRUD, imágenes, importación en bloque (Excel/CSV), materia de ejemplo | `src/pages/Subjects.jsx`, `src/pages/SubjectDetail.jsx`, `src/components/ImportCards.jsx` |
| Repetición espaciada | SM-2 simplificado (Difícil / Bien / Fácil) con **fecha de examen** por materia | `src/lib/srs.js` |
| Sesión de estudio | Pendientes del día, práctica libre, **Pomodoro suave** | `src/pages/Study.jsx`, `src/pages/PomodoroStudy.jsx` |
| Bienestar emocional | Respiración guiada de 15 s, ánimo 1–5 antes y después, frase del día | `src/components/Breathing.jsx`, `src/components/MoodPicker.jsx` |
| Progreso | Indicadores, estado de tarjetas, gráfica de ánimo, actividad, resumen semanal | `src/pages/Progress.jsx`, `src/components/WeeklySummary.jsx` |
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

## 11. Estructura del proyecto

```
Amati/
├── public/                 Logo e íconos
├── src/
│   ├── components/         Piezas reutilizables (tarjeta, respiración, ánimo, gráficas…)
│   ├── context/            Sesión, datos, tema claro/oscuro y Pomodoro
│   ├── lib/                Lógica: algoritmo (srs.js), Firestore (db.js), imágenes, importación…
│   ├── pages/              Pantallas (Hoy, Materias, Estudiar, Progreso, Ajustes, Investigación)
│   └── *.css               Estilos y animaciones
├── functions/              Cloud Function de recordatorios por correo
├── firestore.rules         Reglas de seguridad de la base de datos
├── storage.rules           Reglas de seguridad de las imágenes
├── firebase.json           Configuración de Firebase
├── .env.example            Plantilla de variables de entorno
└── package.json            Dependencias y comandos
```

### Datos en Firestore

```
users/{uid}                  perfil: email, displayName, anonId, reminders, pomodoro
users/{uid}/subjects/{id}    name, color, examDate, sample
users/{uid}/cards/{id}       subjectId, topic, front, back, frontImage, backImage, ease, interval, reps, dueDate…
users/{uid}/reviews/{id}     historial privado de cada repaso
users/{uid}/sessions/{id}    modo, ánimo antes/después, respiración, respuestas, datos de Pomodoro
research_sessions/{id}       copia anónima (anonId) de cada sesión
research_reviews/{id}        copia anónima (anonId) de cada repaso
admins/{correo}              administradores del panel de investigación
```
