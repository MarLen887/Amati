// Capa de acceso a datos (Firestore)
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { newCardFields, schedule } from './srs.js';
import { cardImagePaths, deleteImage, uploadCardImage } from './images.js';
import { dayKey, toDate } from './dates.js';

const userRef = (uid) => doc(db, 'users', uid);
const sub = (uid, name) => collection(db, 'users', uid, name);

function withDates(snap) {
  const d = snap.data();
  const out = { id: snap.id, ...d };
  for (const k of ['dueDate', 'lastReviewed', 'createdAt', 'updatedAt', 'startedAt', 'endedAt', 'reviewedAt', 'examDate']) {
    if (k in d) out[k] = toDate(d[k]);
  }
  return out;
}

// ---------- Perfil ----------
// Evita crear el perfil dos veces (registro + listener de sesión corriendo a la vez).
const pendingProfiles = new Map();
export function ensureUserProfile(user, extra = {}) {
  if (!pendingProfiles.has(user.uid)) {
    const p = createProfileIfMissing(user, extra).catch((e) => {
      pendingProfiles.delete(user.uid);
      throw e;
    });
    pendingProfiles.set(user.uid, p);
  }
  return pendingProfiles.get(user.uid);
}

async function createProfileIfMissing(user, extra) {
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const profile = {
    email: user.email,
    displayName: extra.displayName || user.displayName || '',
    anonId: crypto.randomUUID(),
    createdAt: serverTimestamp(),
    onboarded: false,
    privacyAcceptedAt: serverTimestamp(),
    reminders: {
      inApp: true,
      emailEnabled: false,
      hour: 18,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City',
    },
  };
  await setDoc(ref, profile);
  return profile;
}

export function watchProfile(uid, cb) {
  return onSnapshot(userRef(uid), (s) => cb(s.exists() ? s.data() : null));
}

export function updateProfile(uid, data) {
  return updateDoc(userRef(uid), data);
}

export async function checkIsAdmin(email) {
  try {
    const s = await getDoc(doc(db, 'admins', email.toLowerCase()));
    return s.exists();
  } catch {
    return false;
  }
}

// ---------- Materias ----------
export function watchSubjects(uid, cb, onError) {
  return onSnapshot(
    query(sub(uid, 'subjects'), orderBy('createdAt', 'asc')),
    (s) => cb(s.docs.map(withDates)),
    onError,
  );
}

const tsOrNull = (d) => (d ? Timestamp.fromDate(d) : null);

export function createSubject(uid, { name, color, examDate = null }) {
  return addDoc(sub(uid, 'subjects'), {
    name: name.trim(),
    color,
    examDate: tsOrNull(examDate),
    createdAt: serverTimestamp(),
  });
}

export function updateSubject(uid, id, { name, color, examDate = null }) {
  return updateDoc(doc(db, 'users', uid, 'subjects', id), { name: name.trim(), color, examDate: tsOrNull(examDate) });
}

export async function deleteSubject(uid, id) {
  const cards = await getDocs(query(sub(uid, 'cards'), where('subjectId', '==', id)));
  // Imágenes de las tarjetas (mejor esfuerzo)
  await Promise.all(cards.docs.flatMap((d) => cardImagePaths(d.data()).map(deleteImage)));
  const refs = [...cards.docs.map((d) => d.ref), doc(db, 'users', uid, 'subjects', id)];
  await commitInChunks(refs, (batch, r) => batch.delete(r));
}

async function commitInChunks(items, apply, size = 400) {
  for (let i = 0; i < items.length; i += size) {
    const batch = writeBatch(db);
    items.slice(i, i + size).forEach((it) => apply(batch, it));
    await batch.commit();
  }
}

// ---------- Tarjetas (CRUD) ----------
export function watchCards(uid, cb, onError) {
  return onSnapshot(sub(uid, 'cards'), (s) => cb(s.docs.map(withDates)), onError);
}

function newCardDoc({ subjectId, topic, front, back }) {
  const f = newCardFields();
  return {
    subjectId,
    topic: (topic || '').trim(),
    front: (front || '').trim(),
    back: (back || '').trim(),
    ...f,
    dueDate: Timestamp.fromDate(f.dueDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

// images: { frontFile, backFile } (opcionales)
export async function createCard(uid, data, images = {}) {
  const ref = doc(sub(uid, 'cards'));
  const extra = {};
  if (images.frontFile) extra.frontImage = await uploadCardImage(uid, ref.id, 'front', images.frontFile);
  if (images.backFile) extra.backImage = await uploadCardImage(uid, ref.id, 'back', images.backFile);
  await setDoc(ref, { ...newCardDoc(data), ...extra });
  return ref;
}

// images: { frontFile, backFile, removeFront, removeBack }
export async function updateCard(uid, card, { subjectId, topic, front, back }, images = {}) {
  const data = {
    subjectId,
    topic: (topic || '').trim(),
    front: (front || '').trim(),
    back: (back || '').trim(),
    updatedAt: serverTimestamp(),
  };
  for (const side of ['front', 'back']) {
    const key = `${side}Image`;
    const file = images[`${side}File`];
    const remove = images[`remove${side === 'front' ? 'Front' : 'Back'}`];
    if (file || remove) {
      await deleteImage(card[key]?.path);
      data[key] = file ? await uploadCardImage(uid, card.id, side, file) : null;
    }
  }
  return updateDoc(doc(db, 'users', uid, 'cards', card.id), data);
}

export async function deleteCard(uid, card) {
  await Promise.all(cardImagePaths(card).map(deleteImage));
  return deleteDoc(doc(db, 'users', uid, 'cards', card.id));
}

// Importación en bloque: rows = [{ front, back, topic }]
export async function createCardsBulk(uid, subjectId, rows) {
  const refs = rows.map((r) => ({ ref: doc(sub(uid, 'cards')), data: newCardDoc({ ...r, subjectId }) }));
  await commitInChunks(refs, (batch, it) => batch.set(it.ref, it.data));
  return refs.length;
}

// ---------- Materia de ejemplo ----------
const SAMPLE_CARDS = [
  {
    front: '¿Qué es la repetición espaciada?',
    back: 'Repasar un tema en intervalos de tiempo cada vez más largos para recordarlo a largo plazo.',
  },
  {
    front: '¿Qué describe la curva del olvido de Ebbinghaus?',
    back: 'Cómo olvidamos la información con el tiempo si no la repasamos.',
  },
  {
    front: '¿Qué significa «Mati» en náhuatl?',
    back: 'Saber, pensar, sentir o conocer. «Amati» se refiere a disfrutar algo.',
  },
  {
    front: '¿Cuándo conviene marcar una tarjeta como «Difícil»?',
    back: 'Cuando te costó recordarla: Amati te la mostrará antes para reforzarla.',
  },
  {
    front: '¿Por qué ayuda respirar antes de estudiar?',
    back: 'Unos segundos de respiración guiada reducen la ansiedad y mejoran la concentración.',
  },
];

export async function createSampleSubject(uid) {
  const subjectRef = doc(sub(uid, 'subjects'));
  const batch = writeBatch(db);
  batch.set(subjectRef, {
    name: 'Ejemplo: técnicas de estudio',
    color: '#8b5cf6',
    examDate: null,
    sample: true, // se puede eliminar; sus repasos se marcan para excluirlos del análisis
    createdAt: serverTimestamp(),
  });
  SAMPLE_CARDS.forEach((c) =>
    batch.set(doc(sub(uid, 'cards')), newCardDoc({ ...c, topic: 'Cómo funciona Amati', subjectId: subjectRef.id })),
  );
  await batch.commit();
  return subjectRef.id;
}

// ---------- Sesiones de estudio ----------
export async function startSession(uid, anonId, { moodBefore, breathing, subjectId, topic, practice = false, pomodoro = null }) {
  const now = new Date();
  const ref = doc(sub(uid, 'sessions'));
  const batch = writeBatch(db);
  const base = {
    mode: pomodoro ? 'pomodoro' : practice ? 'practice' : 'review',
    startedAt: Timestamp.fromDate(now),
    dayKey: dayKey(now),
    moodBefore,
    moodAfter: null,
    breathing, // 'completed' | 'skipped'
    cardsReviewed: 0,
    ratings: { hard: 0, good: 0, easy: 0 },
    endedAt: null,
  };
  batch.set(ref, { ...base, subjectId: subjectId || null, topic: topic || null });
  batch.set(doc(db, 'research_sessions', ref.id), { ...base, anonId });
  await batch.commit();
  return ref.id;
}

export async function finishSession(uid, sessionId, { moodAfter, cardsReviewed, ratings, pomodoro }) {
  const data = {
    moodAfter,
    cardsReviewed,
    ratings,
    // Pomodoro suave: { focusMin, breakMin, blocks, focusMinutes, breaksTaken, breaksSkipped }
    ...(pomodoro ? { pomodoro } : {}),
    endedAt: Timestamp.fromDate(new Date()),
  };
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid, 'sessions', sessionId), data);
  batch.update(doc(db, 'research_sessions', sessionId), data);
  await batch.commit();
}

// Registra una respuesta: reprograma la tarjeta y guarda el historial (privado + anónimo).
// Práctica libre (tarjetas aún no pendientes): solo "Difícil" reprograma la tarjeta
// para antes; "Bien"/"Fácil" mantienen la fecha para no alargar intervalos antes de tiempo.
export function practiceKeepsSchedule(rating) {
  return rating !== 'hard';
}

export async function reviewCard(uid, anonId, sessionId, card, rating, { practice = false, examDate = null, sample = false } = {}) {
  const now = new Date();
  const keep = practice && practiceKeepsSchedule(rating);
  const next = keep
    ? { ease: card.ease, interval: card.interval ?? 0, dueDate: card.dueDate }
    : schedule(card, rating, now, { examDate });
  const batch = writeBatch(db);
  if (!keep) {
    batch.update(doc(db, 'users', uid, 'cards', card.id), {
      ...next,
      dueDate: Timestamp.fromDate(next.dueDate),
      lastReviewed: Timestamp.fromDate(now),
      updatedAt: serverTimestamp(),
    });
  }
  const review = {
    cardId: card.id,
    sessionId,
    rating,
    mode: practice ? 'practice' : 'review',
    prevInterval: card.interval ?? 0,
    newInterval: next.interval,
    ease: next.ease,
    nextDue: Timestamp.fromDate(next.dueDate),
    reviewedAt: Timestamp.fromDate(now),
  };
  batch.set(doc(sub(uid, 'reviews')), {
    ...review,
    subjectId: card.subjectId,
    topic: card.topic || '',
  });
  // sample: repaso de la materia de ejemplo (se puede excluir del análisis)
  batch.set(doc(collection(db, 'research_reviews')), { ...review, anonId, ...(sample ? { sample: true } : {}) });
  await batch.commit();
  return next;
}

// ---------- Progreso ----------
export async function fetchSessions(uid, since) {
  const s = await getDocs(
    query(sub(uid, 'sessions'), where('startedAt', '>=', Timestamp.fromDate(since)), orderBy('startedAt', 'asc')),
  );
  return s.docs.map(withDates);
}

export async function fetchReviews(uid, since) {
  const s = await getDocs(
    query(sub(uid, 'reviews'), where('reviewedAt', '>=', Timestamp.fromDate(since)), orderBy('reviewedAt', 'asc')),
  );
  return s.docs.map(withDates);
}

// ---------- Administración (datos anónimos) ----------
export async function fetchResearchData() {
  const [sessions, reviews] = await Promise.all([
    getDocs(collection(db, 'research_sessions')),
    getDocs(collection(db, 'research_reviews')),
  ]);
  return {
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data(), startedAt: toDate(d.data().startedAt), endedAt: toDate(d.data().endedAt) })),
    reviews: reviews.docs.map((d) => ({ id: d.id, ...d.data(), reviewedAt: toDate(d.data().reviewedAt), nextDue: toDate(d.data().nextDue) })),
  };
}

// ---------- Mis datos ----------
const COLLECTIONS = ['subjects', 'cards', 'reviews', 'sessions'];

// Todo lo del usuario en un objeto (para descargar como JSON)
export async function exportUserData(uid) {
  const profile = (await getDoc(userRef(uid))).data() || {};
  const out = { exportadoEl: new Date().toISOString(), perfil: profile };
  for (const name of COLLECTIONS) {
    const snap = await getDocs(sub(uid, name));
    out[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return out;
}

// Borra todos los datos personales en Firestore (las imágenes se borran aparte).
// Los datos anónimos de investigación (research_*) se conservan: ya no se pueden vincular a nadie.
export async function deleteUserData(uid) {
  for (const name of COLLECTIONS) {
    const snap = await getDocs(sub(uid, name));
    await commitInChunks(snap.docs.map((d) => d.ref), (batch, r) => batch.delete(r));
  }
  await deleteDoc(userRef(uid));
}
