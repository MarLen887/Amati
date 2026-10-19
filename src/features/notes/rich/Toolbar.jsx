import { useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import {
  Bold, Code, Code2, Heading1, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListChecks, ListOrdered,
  Minus, PencilRuler, Pi, Quote, Redo2, Sigma, Strikethrough, Table2, Underline as UnderlineIcon, Undo2,
} from 'lucide-react';
import { compressImage } from '../../../core/lib/images.js';
import { uploadToCloudinary } from '../../../core/lib/cloudinary.js';

function Btn({ label, active, onClick, disabled, children }) {
  return (
    <button type="button" className={`tb-btn ${active ? 'active' : ''}`} title={label} aria-label={label} aria-pressed={active}
      disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

const Sep = () => <span className="tb-sep" aria-hidden="true" />;

export default function Toolbar({ editor, disabled, onMath }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => e && ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
      code: e.isActive('code'), link: e.isActive('link'),
      h1: e.isActive('heading', { level: 1 }), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), task: e.isActive('taskList'),
      quote: e.isActive('blockquote'), codeBlock: e.isActive('codeBlock'), table: e.isActive('table'),
      canUndo: e.can().undo?.() ?? false, canRedo: e.can().redo?.() ?? false,
    }),
  });
  if (!editor || !s) return <div className="rich-toolbar" aria-hidden="true" />;
  const run = () => editor.chain().focus();
  const off = disabled;

  function setLink() {
    const prev = editor.getAttributes('link').href || 'https://';
    const url = window.prompt('Dirección del enlace (vacío para quitarlo):', prev);
    if (url === null) return;
    if (!url.trim() || url.trim() === 'https://') run().extendMarkRange('link').unsetLink().run();
    else run().extendMarkRange('link').setLink({ href: /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}` }).run();
  }

  async function addImage(file) {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const blob = await compressImage(file);
      const named = new File([blob], `apunte.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type });
      const r = await uploadToCloudinary(named, { folder: 'amati/apuntes' });
      run().setImage({ src: r.url, alt: file.name.replace(/\.[^.]+$/, '') }).run();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formato del apunte">
      <Btn label="Deshacer" disabled={off || !s.canUndo} onClick={() => editor.commands.undo()}><Undo2 size={16} /></Btn>
      <Btn label="Rehacer" disabled={off || !s.canRedo} onClick={() => editor.commands.redo()}><Redo2 size={16} /></Btn>
      <Sep />
      <Btn label="Título 1" active={s.h1} disabled={off} onClick={() => run().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></Btn>
      <Btn label="Título 2" active={s.h2} disabled={off} onClick={() => run().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Btn>
      <Btn label="Título 3" active={s.h3} disabled={off} onClick={() => run().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Btn>
      <Sep />
      <Btn label="Negrita" active={s.bold} disabled={off} onClick={() => run().toggleBold().run()}><Bold size={16} /></Btn>
      <Btn label="Cursiva" active={s.italic} disabled={off} onClick={() => run().toggleItalic().run()}><Italic size={16} /></Btn>
      <Btn label="Subrayado" active={s.underline} disabled={off} onClick={() => run().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
      <Btn label="Tachado" active={s.strike} disabled={off} onClick={() => run().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      <Btn label="Código en línea" active={s.code} disabled={off} onClick={() => run().toggleCode().run()}><Code size={16} /></Btn>
      <Btn label="Enlace" active={s.link} disabled={off} onClick={setLink}><Link2 size={16} /></Btn>
      <Sep />
      <Btn label="Lista con viñetas" active={s.bullet} disabled={off} onClick={() => run().toggleBulletList().run()}><List size={16} /></Btn>
      <Btn label="Lista numerada" active={s.ordered} disabled={off} onClick={() => run().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
      <Btn label="Lista de tareas" active={s.task} disabled={off} onClick={() => run().toggleTaskList().run()}><ListChecks size={16} /></Btn>
      <Btn label="Cita" active={s.quote} disabled={off} onClick={() => run().toggleBlockquote().run()}><Quote size={16} /></Btn>
      <Btn label="Bloque de código" active={s.codeBlock} disabled={off} onClick={() => run().toggleCodeBlock().run()}><Code2 size={16} /></Btn>
      <Btn label="Línea divisoria" disabled={off} onClick={() => run().setHorizontalRule().run()}><Minus size={16} /></Btn>
      <Sep />
      <Btn label="Fórmula en línea (KaTeX)" disabled={off} onClick={() => onMath(false)}><Pi size={16} /></Btn>
      <Btn label="Fórmula en bloque (KaTeX)" disabled={off} onClick={() => onMath(true)}><Sigma size={16} /></Btn>
      <Btn label="Insertar tabla" disabled={off} onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} /></Btn>
      <Btn label="Insertar imagen" disabled={off || busy} onClick={() => fileRef.current?.click()}><ImageIcon size={16} /></Btn>
      <Btn label="Insertar dibujo / diagrama (Excalidraw)" disabled={off} onClick={() => run().insertDrawing().run()}><PencilRuler size={16} /></Btn>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => addImage(e.target.files?.[0])} />

      {s.table && (
        <div className="tb-row" role="group" aria-label="Opciones de tabla">
          <button type="button" className="chip" onClick={() => run().addRowAfter().run()}>+ Fila</button>
          <button type="button" className="chip" onClick={() => run().addColumnAfter().run()}>+ Columna</button>
          <button type="button" className="chip" onClick={() => run().deleteRow().run()}>− Fila</button>
          <button type="button" className="chip" onClick={() => run().deleteColumn().run()}>− Columna</button>
          <button type="button" className="chip" onClick={() => run().deleteTable().run()}>Quitar tabla</button>
        </div>
      )}
      {busy && <span className="small muted tb-row">Subiendo imagen…</span>}
      {err && <span className="small error tb-row" role="alert">{err}</span>}
    </div>
  );
}
