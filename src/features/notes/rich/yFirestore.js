// Proveedor de Yjs sobre Firestore: sincroniza el documento entre dispositivos y personas sin servidor propio.
// - Cada cambio del documento se guarda como una "actualización" binaria en  notes/{id}/updates.
// - Cada cliente escucha esa colección y aplica lo que llega (Yjs combina sin conflictos).
// - La presencia (quién está, dónde tiene el cursor) viaja por  notes/{id}/presence.
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import { Awareness, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import {
  addDoc, Bytes, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../../core/firebase.js';

const MAX_UPDATE_BYTES = 800_000; // Firestore admite 1 MiB por documento
const FLUSH_MS = 400;
const COMPACT_AFTER = 120; // al pasar de N actualizaciones, se fusionan en una sola
const PRESENCE_THROTTLE_MS = 1200;
const PRESENCE_HEARTBEAT_MS = 10_000;
const PRESENCE_FRESH_MS = 40_000;

export class FirestoreProvider {
  // opts: { ownerUid, noteId, live (publicar presencia), onSync, onStatus, onError }
  constructor(ydoc, { ownerUid, noteId, live = false, onSync, onStatus, onError }) {
    this.doc = ydoc;
    this.awareness = new Awareness(ydoc);
    this.live = live;
    this.onSync = onSync;
    this.onStatus = onStatus;
    this.onError = onError;
    this.sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.base = ['users', ownerUid, 'notes', noteId];
    this.updatesRef = collection(db, ...this.base, 'updates');
    this.presenceRef = collection(db, ...this.base, 'presence');
    this.seen = new Map(); // id -> true, de las actualizaciones ya cargadas
    this.pending = [];
    this.synced = false;
    this.destroyed = false;
    this.flushTimer = null;
    this.pendingWrites = 0;

    this._onDocUpdate = (update, origin) => {
      if (origin === this) return;
      this.pending.push(update);
      this.onStatus?.('saving');
      clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_MS);
    };
    ydoc.on('update', this._onDocUpdate);

    this.unsubUpdates = onSnapshot(
      this.updatesRef,
      (snap) => {
        let applied = false;
        ydoc.transact(() => {
          for (const ch of snap.docChanges()) {
            if (ch.type !== 'added' || this.seen.has(ch.doc.id)) continue;
            this.seen.set(ch.doc.id, true);
            const d = ch.doc.data();
            if (d.s === this.sessionId) continue; // mi propio cambio, ya aplicado
            try {
              Y.applyUpdate(ydoc, d.u.toUint8Array(), this);
              applied = true;
            } catch (e) {
              console.warn('Actualización inválida', e);
            }
          }
        }, this);
        if (!this.synced && !snap.metadata.fromCache) {
          this.synced = true;
          this.onSync?.(applied);
        } else if (!this.synced && snap.metadata.fromCache && snap.size > 0) {
          // sin conexión: se trabaja con lo guardado en el dispositivo
          this.synced = true;
          this.onSync?.(applied);
        }
        if (this.seen.size > COMPACT_AFTER) this.compact(snap.docs.map((d) => d.ref));
      },
      (e) => this.onError?.(e),
    );

    if (live) this.startPresence();
  }

  async flush() {
    if (this.destroyed || this.pending.length === 0) return;
    const merged = Y.mergeUpdates(this.pending);
    this.pending = [];
    if (merged.byteLength > MAX_UPDATE_BYTES) {
      this.onError?.(new Error('El cambio es demasiado grande para guardarse (¿un dibujo o imagen enorme?).'));
      return;
    }
    this.pendingWrites += 1;
    try {
      const ref = await addDoc(this.updatesRef, { u: Bytes.fromUint8Array(merged), s: this.sessionId, t: serverTimestamp() });
      this.seen.set(ref.id, true);
      this.onStatus?.(this.pendingWrites === 1 ? 'saved' : 'saving');
    } catch (e) {
      this.onStatus?.('error');
      this.onError?.(e);
    } finally {
      this.pendingWrites -= 1;
    }
  }

  // Reemplaza las actualizaciones viejas por una sola con el estado completo.
  // Es seguro aunque otra persona escriba a la vez: Yjs ignora lo repetido.
  async compact(refs) {
    if (this.compacting || this.destroyed || !this.synced) return;
    this.compacting = true;
    try {
      const full = Y.encodeStateAsUpdate(this.doc);
      if (full.byteLength > MAX_UPDATE_BYTES) return;
      const batch = writeBatch(db);
      refs.slice(0, 400).forEach((r) => batch.delete(r));
      const merged = doc(this.updatesRef);
      batch.set(merged, { u: Bytes.fromUint8Array(full), s: this.sessionId, t: serverTimestamp() });
      await batch.commit();
      this.seen.set(merged.id, true);
    } catch (e) {
      console.warn('No se pudo compactar', e);
    } finally {
      this.compacting = false;
    }
  }

  // ---------- Presencia ----------
  startPresence() {
    const me = this.awareness.clientID;
    const myRef = doc(this.presenceRef, String(me));
    this.myPresenceRef = myRef;
    let last = 0;
    let timer = null;
    const push = () => {
      timer = null;
      last = Date.now();
      const state = this.awareness.getLocalState();
      if (!state) return;
      setDoc(myRef, { clock: Date.now(), state: JSON.stringify(state), s: this.sessionId }).catch(() => {});
    };
    this._onAwareness = ({ added, updated }, origin) => {
      if (origin === 'remote' || (!added.includes(me) && !updated.includes(me))) return;
      const wait = PRESENCE_THROTTLE_MS - (Date.now() - last);
      if (wait <= 0) push();
      else if (!timer) timer = setTimeout(push, wait);
    };
    this.awareness.on('update', this._onAwareness);
    this.heartbeat = setInterval(push, PRESENCE_HEARTBEAT_MS);

    this.unsubPresence = onSnapshot(this.presenceRef, (snap) => {
      for (const ch of snap.docChanges()) {
        const d = ch.doc.data();
        const id = Number(ch.doc.id);
        if (id === me) continue;
        if (ch.type === 'removed') {
          removeAwarenessStates(this.awareness, [id], 'remote');
        } else if (Date.now() - d.clock < PRESENCE_FRESH_MS) {
          const enc = encoding.createEncoder();
          encoding.writeVarUint(enc, 1);
          encoding.writeVarUint(enc, id);
          encoding.writeVarUint(enc, d.clock);
          encoding.writeVarString(enc, d.state);
          applyAwarenessUpdate(this.awareness, encoding.toUint8Array(enc), 'remote');
        }
      }
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.flush();
    this.destroyed = true;
    clearTimeout(this.flushTimer);
    clearInterval(this.heartbeat);
    this.doc.off('update', this._onDocUpdate);
    this.unsubUpdates?.();
    this.unsubPresence?.();
    if (this._onAwareness) this.awareness.off('update', this._onAwareness);
    this.awareness.setLocalState(null);
    if (this.myPresenceRef) deleteDoc(this.myPresenceRef).catch(() => {});
    this.awareness.destroy();
  }
}

// ¿Ya existe contenido guardado como Yjs? (para saber si hay que sembrar el texto de un apunte previo)
export async function hasYjsContent(ownerUid, noteId) {
  const snap = await getDocs(collection(db, 'users', ownerUid, 'notes', noteId, 'updates'));
  return !snap.empty;
}
