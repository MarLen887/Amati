import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext.jsx';
import { useData } from '../../core/context/DataContext.jsx';
import { createSampleSubject, updateProfile } from '../../core/data/db.js';
import { TOUR_STEPS } from './tutorialSteps.js';
import WelcomeVideo, { hasVideo } from './WelcomeVideo.jsx';
import TourOverlay from './TourOverlay.jsx';

export const TutorialContext = createContext(null);
export const useTutorial = () => useContext(TutorialContext);

// Tutorial de Amati: video de bienvenida (opcional) + recorrido con globos.
// La primera vez se muestra solo; después se puede repetir desde Perfil → Centro de ayuda.
export function TutorialProvider({ children }) {
  const { user, profile } = useAuth();
  const { subjects } = useData();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [phase, setPhase] = useState('idle'); // idle | video | tour
  const [thenTour, setThenTour] = useState(true);
  const [index, setIndex] = useState(0);
  const autoStarted = useRef(false);

  const storageKey = user ? `amati-tutorial-${user.uid}` : '';
  const seenLocally = () => { try { return localStorage.getItem(storageKey) === '1'; } catch { return false; } };

  // Primera vez: arranca solo (con video si ya hay uno configurado)
  useEffect(() => {
    if (!profile || autoStarted.current) return;
    autoStarted.current = true;
    if (profile.tutorialSeen === true || seenLocally()) return;
    setThenTour(true);
    setIndex(0);
    setPhase(hasVideo ? 'video' : 'tour');
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recuerda que ya lo viste (en este navegador y en tu perfil, para otros dispositivos)
  const markSeen = useCallback(async () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* sin almacenamiento */ }
    try { await updateProfile(user.uid, { tutorialSeen: true, onboarded: true }); } catch { /* se reintenta en otra sesión */ }
  }, [storageKey, user?.uid]);

  const step = TOUR_STEPS[index];

  // Cada paso lleva a su pantalla
  useEffect(() => {
    if (phase === 'tour' && step?.route && pathname !== step.route) nav(step.route);
  }, [phase, step, pathname, nav]);

  const finish = useCallback(() => { setPhase('idle'); markSeen(); }, [markSeen]);

  const value = {
    hasVideo,
    active: phase !== 'idle',
    openVideo: () => { setThenTour(false); setPhase('video'); },
    startTour: () => { setIndex(0); setPhase('tour'); },
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {phase === 'video' && (
        <WelcomeVideo
          thenTour={thenTour}
          onSkip={() => { if (thenTour) { setIndex(0); setPhase('tour'); } else setPhase('idle'); }}
          onEnded={() => { if (thenTour) { setIndex(0); setPhase('tour'); } else setPhase('idle'); }}
        />
      )}
      {phase === 'tour' && step && (
        <TourOverlay
          key={step.id}
          step={step}
          index={index}
          total={TOUR_STEPS.length}
          onNext={() => (index + 1 < TOUR_STEPS.length ? setIndex(index + 1) : finish())}
          onBack={() => setIndex(Math.max(0, index - 1))}
          onSkip={finish}
          actions={{
            hasSubjects: subjects.length > 0,
            finish,
            createSubject: () => { finish(); nav('/materias?nueva=1'); },
            createSample: async () => { try { await createSampleSubject(user.uid); } finally { finish(); nav('/'); } },
          }}
        />
      )}
    </TutorialContext.Provider>
  );
}
