import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { watchCards, watchClassNotes, watchNotes, watchLibros, watchSubjects } from '../data/db.js';
import { isDue } from '../../features/techniques/cards/srs.js';

const DataContext = createContext(null);

// Mantiene sincronizadas en tiempo real las materias, tarjetas y apuntes del usuario.
export function DataProvider({ children }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [cards, setCards] = useState(null);
  const [notes, setNotes] = useState(null); // los apuntes no bloquean la carga general
  const [libros, setLibros] = useState([]);
  const [classNotes, setClassNotes] = useState([]);
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
    return () => {
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
      subjectMap,
      dueCards,
      loading: subjects === null || cards === null,
      error,
      now,
    };
  }, [subjects, cards, notes, libros, classNotes, error, now]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
