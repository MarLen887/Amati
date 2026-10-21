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
  const [auto, setAuto] = useState(false); // el video se abrió solo (no desde el Centro de ayuda)
  const [notice, setNotice] = useState('');
  const [forced, setForced] = useState(null); // lo que la persona eligió en esta sesión (true = oculto, false = visible)
  const autoStarted = useRef(false);

  const storageKey = user ? `amati-tutorial-${user.uid}` : '';
  const seenLocally = () => { try { return localStorage.getItem(storageKey) === '1'; } catch { return false; } };

  const hiddenKey = user ? `amati-video-hidden-${user.uid}` : '';
  const sessionKey = user ? `amati-video-session-${user.uid}` : '';
  const videoHidden = () => { try { return localStorage.getItem(hiddenKey) === '1'; } catch { return false; } };

  // Video + recorrido con globos: la primera vez y después en cada inicio de sesión (una vez por sesión),
  // hasta que la persona pulse «No volver a mostrar».
  useEffect(() => {
    if (!profile || autoStarted.current) return;
    autoStarted.current = true;
    const firstTime = profile.tutorialSeen !== true && !seenLocally();
    if (!firstTime) {
      if (profile.welcomeVideoHidden === true || videoHidden()) return;
      try { if (sessionStorage.getItem(sessionKey) === '1') return; } catch { /* */ }
    }
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* */ }
    setThenTour(true);
    setIndex(0);
    setAuto(true);
    setPhase(hasVideo ? 'video' : 'tour');
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Recuerda que ya lo viste (en este navegador y en tu perfil, para otros dispositivos)
  const markSeen = useCallback(async () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* sin almacenamiento */ }
    try { await updateProfile(user.uid, { tutorialSeen: true, onboarded: true }); } catch { /* se reintenta en otra sesión */ }
  }, [storageKey, user?.uid]);

  // «No volver a mostrar» (en el video o en los globos): se guarda en este navegador y en el perfil, y se avisa dónde volver a verlo
  const hideVideo = useCallback(async () => {
    setPhase('idle');
    setForced(true);
    markSeen();
    setNotice('Podrás verlo de nuevo en tu perfil.');
    try { localStorage.setItem(hiddenKey, '1'); } catch { /* */ }
    try { await updateProfile(user.uid, { welcomeVideoHidden: true }); } catch { /* queda al menos en este navegador */ }
  }, [hiddenKey, user?.uid, markSeen]);

  // Volver a activar el video y el recorrido al iniciar sesión (Perfil → Centro de ayuda)
  const showAgain = useCallback(async () => {
    setForced(false);
    try { localStorage.removeItem(hiddenKey); sessionStorage.removeItem(sessionKey); } catch { /* */ }
    try { await updateProfile(user.uid, { welcomeVideoHidden: false }); } catch { /* */ }
    setNotice('Listo: el tutorial volverá a aparecer cuando inicies sesión.');
  }, [hiddenKey, sessionKey, user?.uid]);

  const step = TOUR_STEPS[index];

  // Cada paso lleva a su pantalla
  useEffect(() => {
    if (phase === 'tour' && step?.route && pathname !== step.route) nav(step.route);
  }, [phase, step, pathname, nav]);

  const finish = useCallback(() => { setPhase('idle'); markSeen(); }, [markSeen]);

  const value = {
    hasVideo,
    autoHidden: forced ?? (profile?.welcomeVideoHidden === true || videoHidden()),
    showAgain,
    active: phase !== 'idle',
    openVideo: () => { setThenTour(false); setAuto(false); setPhase('video'); },
    startTour: () => { setIndex(0); setAuto(false); setPhase('tour'); },
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {phase === 'video' && (
        <WelcomeVideo
          thenTour={thenTour}
          onHide={auto ? hideVideo : undefined}
          onSkip={() => { if (thenTour) { setIndex(0); setPhase('tour'); } else setPhase('idle'); }}
          onEnded={() => { if (thenTour) { setIndex(0); setPhase('tour'); } else setPhase('idle'); }}
        />
      )}
      {notice && <div className="video-toast" role="status">{notice}</div>}
      {phase === 'tour' && step && (
        <TourOverlay
          key={step.id}
          step={step}
          index={index}
          total={TOUR_STEPS.length}
          onNext={() => (index + 1 < TOUR_STEPS.length ? setIndex(index + 1) : finish())}
          onBack={() => setIndex(Math.max(0, index - 1))}
          onSkip={finish}
          onHide={auto ? hideVideo : undefined}
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
