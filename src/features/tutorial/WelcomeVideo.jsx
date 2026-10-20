import { useEffect, useRef } from 'react';
import { Film, X } from 'lucide-react';

// El video de bienvenida vive en YouTube como «no listado». Acepta el ID o el enlace completo en
// VITE_WELCOME_VIDEO (por ejemplo https://youtu.be/AbCdEfGhIjK).
export function parseVideoId(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : '';
}
export const VIDEO_ID = parseVideoId(import.meta.env.VITE_WELCOME_VIDEO);
export const hasVideo = Boolean(VIDEO_ID);

// Ventana con el video. «Omitir» siempre está a la vista; al terminar el video se avisa solo (onEnded).
export default function WelcomeVideo({ onSkip, onEnded, thenTour }) {
  const frame = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onSkip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  // Detecta el final del video con los mensajes del reproductor de YouTube (sin cargar scripts externos)
  useEffect(() => {
    if (!hasVideo) return undefined;
    const onMessage = (e) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname.replace(/^www\./, ''))) return;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const state = d?.event === 'onStateChange' ? d.info : d?.info?.playerState;
        if (state === 0) onEnded();
      } catch { /* mensaje que no es del reproductor */ }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onEnded]);

  const listen = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'amati' }), '*');

  return (
    <div className="video-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-video-title">
      <div className="video-card">
        <div className="row between gap">
          <h2 id="welcome-video-title" className="h3 row gap"><Film size={18} aria-hidden="true" /> Bienvenido a Amati</h2>
          <button type="button" className="btn small ghost" onClick={onSkip}>
            <X size={14} aria-hidden="true" /> {thenTour ? 'Omitir' : 'Cerrar'}
          </button>
        </div>

        {hasVideo ? (
          <div className="video-frame">
            <iframe
              ref={frame}
              title="Video de bienvenida de Amati"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=es&hl=es&enablejsapi=1&playsinline=1`}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={listen}
            />
          </div>
        ) : (
          <div className="video-placeholder">
            <Film size={40} aria-hidden="true" />
            <p><strong>El video de bienvenida estará disponible pronto.</strong></p>
            <p className="small muted">Mientras tanto, te mostramos Amati con un recorrido por la pantalla.</p>
          </div>
        )}

        <div className="row gap wrap end">
          {thenTour ? (
            <button type="button" className="btn primary" onClick={onEnded}>Continuar con el recorrido</button>
          ) : (
            <button type="button" className="btn primary" onClick={onSkip}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
