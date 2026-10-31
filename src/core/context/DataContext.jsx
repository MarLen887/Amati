import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { markSharedSeen, sharedKey, watchCards, watchClassNotes, watchNotes, watchLibros, watchSharedNotes, watchSubjects } from '../data/db.js';
import { isDue } from '../../features/techniques/cards/srs.js';

const DataContext = createContext(null);

// Mantiene sincronizadas en tiempo real las materias, tarjetas y apuntes del usuario.
export function DataProvider({ children }) {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [cards, setCards] = useState(null);
  const [notes, setNotes] = useState(null); // los apuntes no bloquean la carga general
  const [libros, setLibros] = useState([]);
  const [classNotes, setClassNotes] = useState([]);
  const [shared, setShared] = useState([]); // apuntes que otras personas compartieron conmigo
  const [sharedError, setSharedError] = useState('');
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!user?.emailVerified) return;
    const onErr = (e) => setError(e);
    const u1 = watchSubjects(user.uid, setSubjects, onErr);
    const u2 = watchCards(user.uid, setCards, onErr);
    const u3 = watchNotes(user.uid, setNotes, () => setNotes([]));
    const u4 = watchLibros(user.uid, setLibros, () => setLibros([]));
    const u5 = watchClassNotes(user.uid, setClassNotes, () => setClassNotes([]));
    // «Compartidos conmigo» se escucha en toda la app (no solo en Apuntes) para avisar apenas llegue uno
    const u6 = watchSharedNotes(user.email, (list) => { setShared(list.filter((n) => n.ownerUid !== user.uid)); setSharedError(''); }, (e) => {
      console.error('Apuntes compartidos:', e);
      setShared([]);
      setSharedError(e?.code === 'permission-denied' ? 'permisos' : e?.code === 'failed-precondition' ? 'índice' : 'conexión');
    });
    return () => {
      u6();
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, [user?.uid, user?.emailVerified]);

  // Refresca "ahora" cada minuto para que las tarjetas pendientes se actualicen solas.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Nuevo = compartido con fecha (los anteriores a esta función no la tienen: no se avisan) y que aún no vi
  const seen = useMemo(() => new Set(profile?.seenShared || []), [profile?.seenShared]);
  const sharedNew = useMemo(() => (profile ? shared.filter((n) => n.sharedAt && !seen.has(sharedKey(n))) : []), [profile, shared, seen]);
  const pendingSeen = useRef(new Set());
  const markShared = useCallback((notes) => {
    if (!user) return;
    const keys = notes.map(sharedKey).filter((k) => !seen.has(k) && !pendingSeen.current.has(k));
    if (!keys.length) return;
    keys.forEach((k) => pendingSeen.current.add(k));
    markSharedSeen(user.uid, keys).catch((e) => { console.error('Marcar compartidos como vistos:', e); keys.forEach((k) => pendingSeen.current.delete(k)); });
  }, [user, seen]);

  const value = useMemo(() => {
    const subjectMap = Object.fromEntries((subjects || []).map((s) => [s.id, s]));
    const dueCards = (cards || []).filter((c) => isDue(c, now));
    return {
      subjects: subjects || [],
      cards: cards || [],
      notes: notes || [],
      notesLoaded: notes !== null,
      libros,
      classNotes,
      shared,
      sharedError,
      sharedNew,
      markSharedSeen: markShared,
      subjectMap,
      dueCards,
      loading: subjects === null || cards === null,
      error,
      now,
    };
  }, [subjects, cards, notes, libros, classNotes, shared, sharedError, sharedNew, markShared, error, now]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
