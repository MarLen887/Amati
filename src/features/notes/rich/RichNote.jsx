import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { common, createLowlight } from 'lowlight';
import { CircleCheck, CloudOff, History, Loader2, Share2, Trash2 } from 'lucide-react';
import 'katex/dist/katex.min.css';
import '../../../styles/rich.css';
import { useAuth } from '../../../core/context/AuthContext.jsx';
import { useData } from '../../../core/context/DataContext.jsx';
import { addVersion, deleteNote, saveRichSnapshot, setNoteMeta, watchNote } from '../../../core/data/db.js';
import { FirestoreProvider } from './yFirestore.js';
import { Drawing } from './ExcalidrawNode.jsx';
import Toolbar from './Toolbar.jsx';
import MathDialog from './MathDialog.jsx';
import SharePanel from './SharePanel.jsx';
import HistoryPanel from './HistoryPanel.jsx';
import GenerateResources from '../GenerateResources.jsx';

const lowlight = createLowlight(common);
const SAVE_DELAY = 1500;
const VERSION_EVERY_MS = 5 * 60_000;
const MAX_HTML = 600_000; // la copia legible debe caber en un documento de Firestore (1 MiB)
const COLORS = ['#e5683c', '#0d9488', '#4f5bd5', '#c026d3', '#ca8a04', '#2563eb', '#db2777', '#16a34a'];
const colorFor = (s) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

// Editor de apuntes libres: TipTap (edición) + Yjs sobre Firestore (sincronía y colaboración)
// + KaTeX (fórmulas) + Excalidraw (dibujos) + historial de versiones.
export default function RichNote({ ownerUid, noteId }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const isOwner = user.uid === ownerUid;
  const [note, setNote] = useState(undefined); // undefined = cargando, null = no existe / sin permiso
  const [error, setError] = useState('');

  useEffect(() => watchNote(ownerUid, noteId, setNote, () => setNote(null)), [ownerUid, noteId]);

  const live = Boolean(note && (!isOwner || note.collaboratorEmails?.length > 0));
  const hasNote = Boolean(note);

  // Documento Yjs + proveedor. Se vuelve a crear solo si cambia el apunte o si empieza a ser compartido.
  const [collab, setCollab] = useState(null);
  const [synced, setSynced] = useState(false);
  const [sync, setSync] = useState('saved'); // saved | saving | error
  useEffect(() => {
    if (!hasNote) return undefined;
    const ydoc = new Y.Doc();
    setSynced(false);
    const provider = new FirestoreProvider(ydoc, {
      ownerUid, noteId, live,
      onSync: () => setSynced(true),
      onStatus: setSync,
      onError: (e) => { setSync('error'); setError(e.message); },
    });
    setCollab({ ydoc, provider });
    return () => { provider.destroy(); ydoc.destroy(); setCollab(null); };
  }, [hasNote, ownerUid, noteId, live]);

  if (note === undefined) return <p className="muted">Cargando…</p>;
  if (note === null) return <p>Apunte no encontrado o sin acceso. <Link to="/apuntes">Ver mis apuntes</Link></p>;

  return (
    <div className="stack-lg rich-page">
      <Link to="/apuntes" className="small">← Volver a mis apuntes</Link>
      {collab ? (
        <Shell key={collab.ydoc.guid} {...{ note, noteId, ownerUid, isOwner, collab, synced, sync, error, setError, nav, live, user }} />
      ) : <p className="muted">Abriendo apunte…</p>}
    </div>
  );
}

function Shell({ note, noteId, ownerUid, isOwner, collab, synced, sync, error, setError, nav, live, user }) {
  const { subjects } = useData();
  const { ydoc, provider } = collab;
  const [title, setTitle] = useState(note.title);
  const [panel, setPanel] = useState(null); // 'share' | 'history'
  const [math, setMath] = useState(null); // { block, latex, pos? }
  const [snapSaved, setSnapSaved] = useState(true);
  const timer = useRef(null);
  const lastVersion = useRef({ at: Date.now(), html: null });
  const titleRef = useRef(title);
  titleRef.current = title;
  const online = useOnline();
  const snapshotRef = useRef(null);

  // Al salir, se guarda lo pendiente (declarado antes del editor para que corra antes de destruirlo)
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); snapshotRef.current?.('auto'); }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false, codeBlock: false, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: 'Escribe aquí tus apuntes… usa $E=mc^2$ para fórmulas, o el menú «Insertar».' }),
      Image.configure({ allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      InlineMath.configure({ katexOptions: { throwOnError: false }, onClick: (node, pos) => setMath({ block: false, latex: node.attrs.latex, pos }) }),
      BlockMath.configure({ katexOptions: { throwOnError: false }, onClick: (node, pos) => setMath({ block: true, latex: node.attrs.latex, pos }) }),
      Drawing,
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: { name: user.displayName || user.email?.split('@')[0] || 'Alguien', color: colorFor(user.uid) },
      }),
    ],
    editable: false,
    onUpdate: () => schedule(),
  });

  // Copia legible (para listas, búsqueda y como respaldo). El contenido real viaja por Yjs.
  const snapshot = useCallback(async (reason) => {
    if (!editor || editor.isDestroyed) return;
    let html = editor.getHTML();
    const text = editor.getText({ blockSeparator: ' ' }).slice(0, 100_000);
    if (html.length > MAX_HTML) html = '';
    try {
      await saveRichSnapshot(ownerUid, noteId, { title: titleRef.current, html, text });
      setSnapSaved(true);
      const lv = lastVersion.current;
      if ((reason === 'manual' || Date.now() - lv.at > VERSION_EVERY_MS) && html && html !== lv.html) {
        await addVersion(ownerUid, noteId, { html, text: text.slice(0, 300), by: user.email, label: reason === 'manual' ? 'Versión guardada' : '' });
        lastVersion.current = { at: Date.now(), html };
      }
    } catch (e) {
      setError('No se pudo guardar la copia del apunte. ' + e.message);
    }
  }, [editor, ownerUid, noteId, user.email, setError]);

  snapshotRef.current = snapshot;
  function schedule() {
    setSnapSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; snapshotRef.current('auto'); }, SAVE_DELAY);
  }

  // El editor solo se habilita cuando ya llegó el contenido guardado
  useEffect(() => { editor?.setEditable(synced); }, [editor, synced]);

  // Apunte creado antes de usar Yjs: siembra el contenido guardado una única vez
  useEffect(() => {
    if (!editor || !synced || !isOwner) return;
    const frag = ydoc.getXmlFragment('default');
    if (frag.length === 0 && note.content?.html) editor.commands.setContent(note.content.html);
  }, [editor, synced]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove() {
    if (!confirm('¿Eliminar este apunte para siempre? Se borrará también su historial.')) return;
    clearTimeout(timer.current); timer.current = null;
    provider.destroy();
    await deleteNote(ownerUid, noteId);
    nav('/apuntes');
  }

  const status = !online ? ['off', 'Sin conexión · se sincronizará al volver']
    : !synced ? ['wait', 'Cargando…']
    : sync === 'error' ? ['err', 'Error al guardar']
    : sync === 'saving' || !snapSaved ? ['wait', 'Guardando…']
    : ['ok', live ? 'Sincronizado' : 'Guardado'];

  return (
    <>
      <section className="panel stack rich-meta">
        <label>
          Título
          <input value={title} maxLength={200} disabled={!synced}
            onChange={(e) => { setTitle(e.target.value); schedule(); }} placeholder="Ej. Clase 4 · Cálculo integral" />
        </label>
        {isOwner && (
          <div className="grid-2">
            <label>
              Materia
              <select defaultValue={note.subjectId || ''} onChange={(e) => setNoteMeta(ownerUid, noteId, { subjectId: e.target.value, topic: note.topic || '' })}>
                <option value="">Sin materia</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              Tema (opcional)
              <input defaultValue={note.topic || ''} maxLength={80}
                onBlur={(e) => setNoteMeta(ownerUid, noteId, { subjectId: note.subjectId || '', topic: e.target.value })} />
            </label>
          </div>
        )}
        {!isOwner && <p className="small muted">Este apunte te lo compartieron. Los cambios se ven al instante para todos.</p>}
      </section>

      <section className="rich-card">
        <Toolbar editor={editor} disabled={!synced} onMath={(block) => setMath({ block, latex: '' })} />
        <EditorContent editor={editor} className="rich-content" />
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="sticky-actions">
        {isOwner && <button type="button" className="btn ghost danger" onClick={remove}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>}
        <span className={`grow small rich-status ${status[0]}`} role="status">
          {status[0] === 'ok' && <CircleCheck size={14} aria-hidden="true" />}
          {status[0] === 'wait' && <Loader2 size={14} className="spin" aria-hidden="true" />}
          {status[0] === 'off' && <CloudOff size={14} aria-hidden="true" />}
          {' '}{status[1]}
        </span>
        <button type="button" className="btn ghost" aria-pressed={panel === 'history'} onClick={() => setPanel(panel === 'history' ? null : 'history')}>
          <History size={16} aria-hidden="true" /> Historial
        </button>
        {isOwner && (
          <button type="button" className="btn primary" aria-pressed={panel === 'share'} onClick={() => setPanel(panel === 'share' ? null : 'share')}>
            <Share2 size={16} aria-hidden="true" /> Compartir
          </button>
        )}
      </div>

      {isOwner && <GenerateResources getText={() => editor?.getText({ blockSeparator: ' ' }) || ''} title={title} subjectId={note.subjectId || ''} topic={note.topic || ''} />}

      {panel === 'share' && isOwner && <SharePanel ownerUid={ownerUid} noteId={noteId} emails={note.collaboratorEmails || []} title={title} />}
      {panel === 'history' && (
        <HistoryPanel
          ownerUid={ownerUid} noteId={noteId} user={user}
          onSaveNow={() => snapshot('manual')}
          onRestore={async (v) => {
            await addVersion(ownerUid, noteId, { html: editor.getHTML(), text: editor.getText().slice(0, 300), by: user.email, label: 'Antes de restaurar' });
            editor.commands.setContent(v.html);
            schedule();
          }}
        />
      )}

      {math && (
        <MathDialog
          init={math} onClose={() => setMath(null)}
          onSubmit={(latex) => {
            const chain = editor.chain().focus();
            if (math.pos !== undefined) (math.block ? chain.updateBlockMath({ latex, pos: math.pos }) : chain.updateInlineMath({ latex, pos: math.pos })).run();
            else (math.block ? chain.insertBlockMath({ latex }) : chain.insertInlineMath({ latex })).run();
            setMath(null);
          }}
          onDelete={math.pos !== undefined ? () => {
            const chain = editor.chain().focus();
            (math.block ? chain.deleteBlockMath({ pos: math.pos }) : chain.deleteInlineMath({ pos: math.pos })).run();
            setMath(null);
          } : null}
        />
      )}
    </>
  );
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}
