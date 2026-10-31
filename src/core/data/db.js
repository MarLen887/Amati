// Capa de acceso a datos (Firestore)
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
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
import { newCardFields } from '../../features/techniques/cards/srs.js';
import { getScheduler } from '../../features/techniques/cards/schedulers.js';
import { cardImagePaths, deleteImage, uploadCardImage } from '../lib/images.js';
import { dayKey, toDate } from '../lib/dates.js';

const userRef = (uid) => doc(db, 'users', uid);
const sub = (uid, name) => collection(db, 'users', uid, name);

function withDates(snap) {
  const d = snap.data();
  const out = { id: snap.id, ...d };
  for (const k of ['dueDate', 'lastReviewed', 'createdAt', 'updatedAt', 'startedAt', 'endedAt', 'reviewedAt', 'examDate', 'classDate', 'sharedAt']) {
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

// Herramientas que el alumno agregó a una materia (ids del catálogo de Herramientas)
export function setSubjectTools(uid, id, toolIds) {
  return updateDoc(doc(db, 'users', uid, 'subjects', id), { toolIds: [...new Set(toolIds)].slice(0, 40) });
}

// Última sesión de estudio de una materia: { technique, at } (null si aún no hay)
export async function fetchLastSubjectSession(uid, subjectId) {
  const snap = await getDocs(query(sub(uid, 'sessions'), where('subjectId', '==', subjectId)));
  let best = null;
  snap.docs.forEach((d) => {
    const x = withDates(d);
    if (x.technique && x.startedAt && (!best || x.startedAt > best.at)) best = { technique: x.technique, at: x.startedAt };
  });
  return best;
}

export async function deleteSubject(uid, id) {
  const cards = await getDocs(query(sub(uid, 'cards'), where('subjectId', '==', id)));
  // Imágenes de las tarjetas (mejor esfuerzo)
  await Promise.all(cards.docs.flatMap((d) => cardImagePaths(d.data()).map(deleteImage)));
  const notes = await getDocs(query(sub(uid, 'notes'), where('subjectId', '==', id)));
  const libros = await getDocs(query(sub(uid, 'libros'), where('subjectId', '==', id)));
  const classNotes = await getDocs(query(sub(uid, 'classNotes'), where('subjectId', '==', id)));
  // Los apuntes libres guardan su contenido en subcolecciones, que no se borran solas
  for (const n of notes.docs) {
    for (const name of NOTE_SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, 'users', uid, 'notes', n.id, name));
      await commitInChunks(snap.docs.map((d) => d.ref), (batch, r) => batch.delete(r));
    }
  }
  const refs = [...cards.docs.map((d) => d.ref), ...notes.docs.map((d) => d.ref), ...libros.docs.map((d) => d.ref), ...classNotes.docs.map((d) => d.ref), doc(db, 'users', uid, 'subjects', id)];
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

// ---------- Apuntes (Cornell, esquema, Feynman, PQ4R, SQ3R) ----------
export function watchNotes(uid, cb, onError) {
  return onSnapshot(sub(uid, 'notes'), (s) => cb(s.docs.map(withDates)), onError);
}

// data: { type, title, subjectId, topic, content }
export async function saveNote(uid, id, { type, title, subjectId, topic, content }) {
  const body = {
    type,
    title: (title || '').trim() || 'Sin título',
    subjectId: subjectId || '',
    topic: (topic || '').trim(),
    content,
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, 'users', uid, 'notes', id), body);
    return id;
  }
  const ref = doc(sub(uid, 'notes'));
  await setDoc(ref, { ...body, createdAt: serverTimestamp() });
  return ref.id;
}

const NOTE_SUBCOLLECTIONS = ['updates', 'presence', 'history'];

export async function deleteNote(uid, id) {
  // Los apuntes libres guardan su contenido en subcolecciones, que no se borran solas
  for (const name of NOTE_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', uid, 'notes', id, name));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  return deleteDoc(doc(db, 'users', uid, 'notes', id));
}

// Anotaciones de un PDF (resaltados y comentarios), guardadas dentro de la nota o el libro
export function saveAnnotations(uid, collectionName, id, annotations) {
  if (!['classNotes', 'libros'].includes(collectionName)) throw new Error('Colección no válida');
  return updateDoc(doc(db, 'users', uid, collectionName, id), { annotations: annotations.slice(0, 100) });
}

// ---------- Apuntes libres (TipTap + Yjs): el texto vive en Yjs; aquí va una copia legible para listas y búsqueda ----------
const noteDoc = (owner, id) => doc(db, 'users', owner, 'notes', id);

export function watchNote(owner, id, cb, onError) {
  return onSnapshot(noteDoc(owner, id), (s) => cb(s.exists() ? withDates(s) : null), onError);
}

export async function createRichNote(uid, { subjectId = '', topic = '', title = '' } = {}) {
  const ref = doc(sub(uid, 'notes'));
  await setDoc(ref, {
    type: 'libre', title: title || `Apunte · ${new Date().toLocaleDateString('es-MX')}`, subjectId, topic,
    content: { html: '', text: '' }, collaboratorEmails: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Guarda la copia legible (html + texto plano). Los colaboradores solo pueden tocar estos campos.
export function saveRichSnapshot(owner, id, { title, html, text }) {
  const body = { content: { html, text }, updatedAt: serverTimestamp() };
  if (title !== undefined) body.title = (title || '').trim().slice(0, 200) || 'Sin título';
  return updateDoc(noteDoc(owner, id), body);
}

export function setNoteMeta(owner, id, { subjectId, topic }) {
  return updateDoc(noteDoc(owner, id), { subjectId: subjectId || '', topic: (topic || '').trim().slice(0, 80) });
}

// `sharedBy` (solo al agregar a alguien) deja quién compartió y cuándo: con eso el invitado recibe el aviso dentro de Amati
export function setCollaborators(owner, id, emails, sharedBy = null) {
  const body = { collaboratorEmails: emails };
  if (sharedBy) {
    body.sharedBy = { name: String(sharedBy.name || '').slice(0, 80), email: String(sharedBy.email || '').slice(0, 120) };
    body.sharedAt = serverTimestamp();
  }
  return updateDoc(noteDoc(owner, id), body);
}

// Clave estable de un apunte compartido conmigo (el id solo es único dentro de cada dueño)
export const sharedKey = (n) => `${n.ownerUid}_${n.id}`;

// Guarda en mi perfil qué apuntes compartidos ya vi (se sincroniza entre mis dispositivos)
export function markSharedSeen(uid, keys) {
  return keys.length ? updateDoc(userRef(uid), { seenShared: arrayUnion(...keys) }) : Promise.resolve();
}

// Apuntes que otras personas compartieron conmigo
export function watchSharedNotes(email, cb, onError) {
  const q = query(collectionGroup(db, 'notes'), where('collaboratorEmails', 'array-contains', email.toLowerCase()));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ ...withDates(d), ownerUid: d.ref.parent.parent.id }))), onError);
}

// Historial de versiones
const historyCol = (owner, id) => collection(db, 'users', owner, 'notes', id, 'history');
const MAX_VERSIONS = 30;

export async function addVersion(owner, id, { html, text, by, label = '' }) {
  await addDoc(historyCol(owner, id), { html, text, by, label, createdAt: serverTimestamp() });
  const all = await getDocs(query(historyCol(owner, id), orderBy('createdAt', 'desc')));
  await Promise.all(all.docs.slice(MAX_VERSIONS).map((d) => deleteDoc(d.ref)));
}

export function watchVersions(owner, id, cb, onError) {
  return onSnapshot(
    query(historyCol(owner, id), orderBy('createdAt', 'desc'), limit(MAX_VERSIONS)),
    (s) => cb(s.docs.map(withDates)),
    onError,
  );
}

// ---------- Biblioteca: libros guardados desde el buscador y PDFs propios (colección libros) ----------
export function watchLibros(uid, cb, onError) {
  return onSnapshot(sub(uid, 'libros'), (s) => cb(s.docs.map(withDates)), onError);
}

// Nombres de fuente guardados en Firestore
const SOURCE_LABEL = { OpenLibrary: 'OpenLibrary', InternetArchive: 'InternetArchive', Gutendex: 'Gutenberg', GoogleBooks: 'GoogleBooks' };

// book: resultado unificado del buscador. Esquema: { title, author, coverUrl, isbn, source, openLibraryId, … }
export async function saveLibro(uid, subjectId, book) {
  const ref = doc(sub(uid, 'libros'));
  await setDoc(ref, {
    kind: 'book',
    subjectId: subjectId || '',
    title: (book.title || '').slice(0, 300),
    author: (book.authors || []).slice(0, 3).join(', ').slice(0, 200),
    authors: (book.authors || []).slice(0, 6),
    coverUrl: book.cover || null,
    isbn: book.isbns?.[0] || '',
    source: SOURCE_LABEL[book.sources?.[0]] || book.sources?.[0] || 'OpenLibrary',
    sources: (book.sources || []).map((s) => SOURCE_LABEL[s] || s),
    openLibraryId: book.openLibraryId || '',
    archiveId: book.archiveId || '',
    gutenbergId: book.gutenbergId || '',
    year: book.year || null,
    language: book.languages?.[0] || '',
    description: (book.description || '').slice(0, 2000),
    subjects: (book.subjects || []).slice(0, 8),
    link: book.links?.openLibrary || book.links?.gutenberg || book.links?.archive || book.links?.googleInfo || '',
    // Solo se guardan enlaces de descarga de material que sí se puede descargar
    downloads: (book.downloads || []).slice(0, 8).map((d) => ({ label: d.label, url: d.url, type: d.type })),
    downloadable: Boolean(book.downloadable),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// PDF propio del usuario (ya subido a Cloudinary): file = { provider, id, url, bytes, name }
export async function saveOwnPdf(uid, { subjectId, title, author, file }) {
  const ref = doc(sub(uid, 'libros'));
  await setDoc(ref, {
    kind: 'pdf',
    subjectId: subjectId || '',
    title: (title || file.name || 'PDF').slice(0, 300),
    description: '',
    author: (author || '').slice(0, 200),
    authors: author ? [author.slice(0, 100)] : [],
    coverUrl: null,
    isbn: '',
    source: 'Usuario',
    sources: ['Usuario'],
    openLibraryId: '',
    file,
    link: file.url,
    downloads: [{ label: 'PDF', url: file.url, type: 'pdf' }],
    downloadable: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function deleteLibro(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'libros', id));
}

// ---------- Notas de clase (archivos en Drive/Cloudinary + texto extraído) ----------
export function watchClassNotes(uid, cb, onError) {
  return onSnapshot(sub(uid, 'classNotes'), (s) => cb(s.docs.map(withDates)), onError);
}

// data: { title, subjectId, classDate, text, file, ocr }
export async function saveClassNote(uid, id, data) {
  const body = {
    title: (data.title || '').trim().slice(0, 200) || 'Nota de clase',
    subjectId: data.subjectId || '',
    classDate: data.classDate ? Timestamp.fromDate(data.classDate) : null,
    text: (data.text || '').slice(0, 150000),
    file: data.file || null,
    ocr: data.ocr || 'none', // 'gemini' | 'manual' | 'none'
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, 'users', uid, 'classNotes', id), body);
    return id;
  }
  const ref = doc(sub(uid, 'classNotes'));
  await setDoc(ref, { ...body, createdAt: serverTimestamp() });
  return ref.id;
}

export function deleteClassNote(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'classNotes', id));
}

// ---------- Trivia (partidas jugadas desde el buscador) ----------
export async function saveTriviaGame(uid, { category, categoryId, difficulty, lang, total, correct, query: text }) {
  const now = new Date();
  await addDoc(sub(uid, 'trivia'), {
    startedAt: Timestamp.fromDate(now),
    dayKey: dayKey(now),
    category,
    categoryId: categoryId ? Number(categoryId) : null,
    difficulty: difficulty || 'mixed',
    lang,
    total,
    correct,
    query: (text || '').slice(0, 120),
  });
}

export async function fetchTrivia(uid, since) {
  const s = await getDocs(
    query(sub(uid, 'trivia'), where('startedAt', '>=', Timestamp.fromDate(since)), orderBy('startedAt', 'asc')),
  );
  return s.docs.map(withDates);
}

// ---------- Sesiones de estudio ----------
export async function startSession(uid, anonId, { breathing, subjectId, topic, practice = false, pomodoro = null, technique = 'srs' }) {
  const now = new Date();
  const ref = doc(sub(uid, 'sessions'));
  const batch = writeBatch(db);
  const base = {
    mode: pomodoro ? 'pomodoro' : practice ? 'practice' : 'review',
    technique: pomodoro ? 'pomodoro' : technique,
    startedAt: Timestamp.fromDate(now),
    dayKey: dayKey(now),
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

export async function finishSession(uid, sessionId, { cardsReviewed, ratings, pomodoro, calibration }) {
  const data = {
    cardsReviewed,
    ratings,
    // Pomodoro suave: { focusMin, breakMin, blocks, focusMinutes, breaksTaken, breaksSkipped }
    ...(pomodoro ? { pomodoro } : {}),
    // Autorregulación: { predicted, correct, total } con la confianza declarada antes de cada respuesta
    ...(calibration ? { calibration } : {}),
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

export async function reviewCard(uid, anonId, sessionId, card, rating, { practice = false, examDate = null, sample = false, technique = 'srs', confidence = null } = {}) {
  const now = new Date();
  const keep = practice && practiceKeepsSchedule(rating);
  const next = keep
    ? { ease: card.ease, interval: card.interval ?? 0, dueDate: card.dueDate }
    : getScheduler(technique).schedule(card, rating, now, { examDate });
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
    technique,
    ...(confidence ? { confidence } : {}),
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

// ---------- Agenda: horario, actividades y tiempo de estudio ----------
// events: { title, kind: 'class' | 'activity' | 'study', recur: 'weekly' | 'none', days: [0-6] (semanal), date: 'AAAA-MM-DD' (una vez),
//           startMin, endMin (minutos desde medianoche), status (solo estudio): 'proposed' | 'approved' | 'done' | 'skipped', reason }
const eventsCol = (uid) => sub(uid, 'events');

export function watchEvents(uid, cb, onError) {
  return onSnapshot(eventsCol(uid), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export async function saveEvent(uid, id, data) {
  const body = { ...data, updatedAt: serverTimestamp() };
  if (id) { await setDoc(doc(db, 'users', uid, 'events', id), body, { merge: true }); return id; }
  const ref = await addDoc(eventsCol(uid), { ...body, createdAt: serverTimestamp() });
  return ref.id;
}

export function deleteEvent(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'events', id));
}

// Tiempo estudiado por tu cuenta (con cualquier método): suma a la meta diaria y a la racha
export function addStudyLog(uid, { minutes, label = '', blockId = '', date = new Date() }) {
  return addDoc(sub(uid, 'studyLog'), {
    minutes: Math.max(1, Math.min(600, Math.round(minutes))),
    label: String(label).slice(0, 100),
    blockId,
    dayKey: dayKey(date),
    createdAt: serverTimestamp(),
  });
}

export async function fetchStudyLog(uid, since) {
  const s = await getDocs(query(sub(uid, 'studyLog'), where('dayKey', '>=', dayKey(since))));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
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
const COLLECTIONS = ['subjects', 'cards', 'reviews', 'sessions', 'notes', 'libros', 'trivia', 'classNotes'];

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
  const noteIds = (await getDocs(sub(uid, 'notes'))).docs.map((d) => d.id);
  for (const id of noteIds) {
    for (const name of NOTE_SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, 'users', uid, 'notes', id, name));
      await commitInChunks(snap.docs.map((d) => d.ref), (batch, r) => batch.delete(r));
    }
  }
  for (const name of COLLECTIONS) {
    const snap = await getDocs(sub(uid, name));
    await commitInChunks(snap.docs.map((d) => d.ref), (batch, r) => batch.delete(r));
  }
  await deleteDoc(userRef(uid));
}
