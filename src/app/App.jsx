import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../core/context/AuthContext.jsx';
import { DataProvider } from '../core/context/DataContext.jsx';
import { isConfigured } from '../core/firebase.js';
import Layout from '../core/components/Layout.jsx';
import { Login } from '../features/auth/AuthPages.jsx';
import Home from '../features/home/Home.jsx';
import HowItWorks from '../features/home/HowItWorks.jsx';
import Subjects from '../features/subjects/Subjects.jsx';
import SubjectDetail from '../features/subjects/SubjectDetail.jsx';
import Study from '../features/techniques/cards/Study.jsx';
import Techniques from '../features/techniques/Techniques.jsx';
import Library from '../features/library/Library.jsx';
import Tools from '../features/tools/Tools.jsx';
import ToolHost from '../features/tools/ToolHost.jsx';
import PdfBook from '../features/pdf/PdfBook.jsx';
import ClassNoteUpload from '../features/classnotes/ClassNoteUpload.jsx';
import ClassNoteDetail from '../features/classnotes/ClassNoteDetail.jsx';
import Apuntes from '../features/notes/Apuntes.jsx';
import NoteEditor, { SharedNote } from '../features/notes/NoteEditor.jsx';
import PomodoroStudy from '../features/pomodoro/PomodoroStudy.jsx';
import { PomodoroProvider } from '../features/pomodoro/PomodoroContext.jsx';
const Progress = lazy(() => import('../features/progress/Progress.jsx'));
import Settings from '../features/settings/Settings.jsx';
import Loader from '../core/components/Loader.jsx';
const Admin = lazy(() => import('../features/admin/Admin.jsx'));

// Redirige conservando los parámetros de la dirección (p. ej. /buscar?q=… -> /biblioteca?q=…)
function Redirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function Loading() {
  return <Loader size="lg" label="Algo está creciendo…" />;
}

// Solo usuarios con sesión (Google ya verifica el correo institucional)
function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (isAdmin === null) return <Loading />;
  return isAdmin ? children : <Navigate to="/" replace />;
}

function NotConfigured() {
  return (
    <div className="center-screen">
      <div className="panel narrow">
        <h1>Amati no está disponible por ahora</h1>
        {import.meta.env.DEV ? (
          <p>
            Falta configurar Firebase: copia <code>.env.example</code> como <code>.env.local</code>, llena los datos de tu
            proyecto y reinicia el servidor de desarrollo.
          </p>
        ) : (
          <p>Estamos resolviendo un problema. Inténtalo de nuevo en unos minutos.</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          {/* Antes había registro con contraseña: esas direcciones ahora llevan al acceso con Google */}
          <Route path="/registro" element={<Navigate to="/login" replace />} />
          <Route path="/recuperar" element={<Navigate to="/login" replace />} />
          <Route path="/verificar" element={<Navigate to="/login" replace />} />
          <Route
            element={
              <Private>
                <DataProvider>
                  <PomodoroProvider>
                    <Suspense fallback={<Loading />}>
                      <Layout />
                    </Suspense>
                  </PomodoroProvider>
                </DataProvider>
              </Private>
            }
          >
            <Route index element={<Home />} />
            <Route path="materias" element={<Subjects />} />
            <Route path="materias/:id" element={<SubjectDetail />} />
            <Route path="tecnicas" element={<Techniques />} />
            <Route path="buscar" element={<Redirect to="/biblioteca" />} />
            <Route path="biblioteca" element={<Library />} />
            <Route path="biblioteca/pdf/:id" element={<PdfBook />} />
            <Route path="clases" element={<Navigate to="/apuntes" replace />} />
            <Route path="clases/nueva" element={<ClassNoteUpload />} />
            <Route path="clases/:id" element={<ClassNoteDetail />} />
            <Route path="estudiar" element={<Study />} />
            <Route path="apuntes" element={<Apuntes />} />
            <Route path="apuntes/nuevo" element={<NoteEditor />} />
            <Route path="apuntes/compartido/:owner/:id" element={<SharedNote />} />
            <Route path="apuntes/:id" element={<NoteEditor />} />
            <Route path="pomodoro" element={<PomodoroStudy />} />
            <Route path="herramientas" element={<Tools />} />
            <Route path="herramientas/:id" element={<ToolHost />} />
            <Route path="progreso" element={<Progress />} />
            <Route path="perfil" element={<Settings />} />
            <Route path="ajustes" element={<Navigate to="/perfil" replace />} />
            <Route path="como-funciona" element={<HowItWorks />} />
            <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
