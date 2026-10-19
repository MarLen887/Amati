// Google Drive — los PDFs se guardan en el Drive del propio alumno, en la carpeta «Amati».
// Usa Google Identity Services (OAuth en el navegador) con el permiso mínimo `drive.file`:
// Amati solo ve los archivos que él mismo crea.
import { cfg } from './integrations.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_KEY = 'amati-drive-folder';
const API = 'https://www.googleapis.com/drive/v3';

let token = null;
let tokenExp = 0;
let gsi = null;

// Conviene llamarla al abrir la pantalla: así la ventana de permiso no se bloquea al subir.
export function preloadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gsi ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsi = null;
      reject(new Error('No se pudo cargar el inicio de sesión de Google.'));
    };
    document.head.appendChild(s);
  });
  return gsi;
}

export async function getDriveToken() {
  if (token && Date.now() < tokenExp - 60_000) return token;
  await preloadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: cfg.drive.clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        token = r.access_token;
        tokenExp = Date.now() + Number(r.expires_in || 3600) * 1000;
        resolve(token);
      },
      error_callback: (e) =>
        reject(new Error(e?.type === 'popup_closed' ? 'Cerraste la ventana de Google antes de dar permiso.' : e?.message || 'No se pudo conectar con Google Drive.')),
    });
    client.requestAccessToken({});
  });
}

async function api(path, tok, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${tok}`, ...(init.headers || {}) } });
  if (!res.ok) {
    let msg = '';
    try {
      msg = (await res.json()).error?.message;
    } catch {
      /* sin cuerpo */
    }
    throw new Error(`Google Drive: ${msg || `error ${res.status}`}`);
  }
  return res;
}

async function ensureFolder(tok) {
  try {
    const saved = localStorage.getItem(FOLDER_KEY);
    if (saved) {
      const r = await fetch(`${API}/files/${saved}?fields=id,trashed`, { headers: { Authorization: `Bearer ${tok}` } });
      if (r.ok && !(await r.json()).trashed) return saved;
    }
  } catch {
    /* se busca o crea de nuevo */
  }
  const q = encodeURIComponent("name='Amati' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const found = await (await api(`/files?q=${q}&fields=files(id)&pageSize=1`, tok)).json();
  let id = found.files?.[0]?.id;
  if (!id) {
    const created = await (
      await api('/files?fields=id', tok, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Amati', mimeType: 'application/vnd.google-apps.folder' }),
      })
    ).json();
    id = created.id;
  }
  try {
    localStorage.setItem(FOLDER_KEY, id);
  } catch {
    /* sin almacenamiento */
  }
  return id;
}

export async function uploadToDrive(file, tok, { onProgress } = {}) {
  const folder = await ensureFolder(tok);
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('metadata', new Blob([JSON.stringify({ name: file.name, parents: [folder] })], { type: 'application/json' }));
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink,thumbnailLink');
    xhr.setRequestHeader('Authorization', `Bearer ${tok}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error('No se pudo conectar con Google Drive.'));
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          provider: 'drive',
          id: data.id,
          url: data.webViewLink,
          thumb: null, // la miniatura de Drive exige sesión; se muestra un ícono
          bytes: Number(data.size) || file.size,
        });
      } else {
        reject(new Error(`Google Drive: ${data.error?.message || `error ${xhr.status}`}`));
      }
    };
    xhr.send(fd);
  });
}

export async function downloadDriveFile(id) {
  const tok = await getDriveToken();
  return (await api(`/files/${id}?alt=media`, tok)).blob();
}

export async function deleteDriveFile(id) {
  const tok = await getDriveToken();
  await api(`/files/${id}`, tok, { method: 'DELETE' });
}
