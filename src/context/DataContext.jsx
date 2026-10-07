import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { watchCards, watchSubjects } from '../lib/db.js';
import { isDue } from '../lib/srs.js';

const DataContext = createContext(null);

// Mantiene sincronizadas en tiempo real las materias y tarjetas del usuario.
export function DataProvider({ children }) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [cards, setCards] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!user?.emailVerified) return;
    const onErr = (e) => setError(e);
    const u1 = watchSubjects(user.uid, setSubjects, onErr);
    const u2 = watchCards(user.uid, setCards, onErr);
    return () => {
      u1();
      u2();
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
      subjectMap,
      dueCards,
      loading: subjects === null || cards === null,
      error,
      now,
    };
  }, [subjects, cards, error, now]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
