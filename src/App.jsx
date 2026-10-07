import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { isConfigured } from './firebase.js';
import Layout from './components/Layout.jsx';
import { ForgotPassword, Login, Register, VerifyEmail } from './pages/AuthPages.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Subjects from './pages/Subjects.jsx';
import SubjectDetail from './pages/SubjectDetail.jsx';
import Study from './pages/Study.jsx';
import PomodoroStudy from './pages/PomodoroStudy.jsx';
import { PomodoroProvider } from './context/PomodoroContext.jsx';
const Progress = lazy(() => import('./pages/Progress.jsx'));
import Settings from './pages/Settings.jsx';
const Admin = lazy(() => import('./pages/Admin.jsx'));

function Loading() {
  return <div className="center-screen muted">Cargando…</div>;
}

// Solo usuarios con sesión y correo verificado
function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verificar" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={user.emailVerified ? '/' : '/verificar'} replace />;
  return children;
}

function NeedsUnverified({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/" replace />;
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
        <h1>Falta configurar Firebase</h1>
        <p>
          Copia <code>.env.example</code> como <code>.env.local</code>, llena los datos de tu proyecto de
          Firebase y reinicia el servidor de desarrollo.
        </p>
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
          <Route path="/registro" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/recuperar" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/verificar" element={<NeedsUnverified><VerifyEmail /></NeedsUnverified>} />
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
            <Route path="estudiar" element={<Study />} />
            <Route path="pomodoro" element={<PomodoroStudy />} />
            <Route path="progreso" element={<Progress />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="como-funciona" element={<HowItWorks />} />
            <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
