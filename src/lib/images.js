// Imágenes de tarjetas en Firebase Storage.
// Se comprimen en el dispositivo antes de subirlas (máx. 1280 px, WebP/JPEG ~150 KB).
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase.js';

const MAX_SIDE = 1280;
export const MAX_INPUT_MB = 15;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  if (file.size > MAX_INPUT_MB * 1024 * 1024) throw new Error(`La imagen pesa más de ${MAX_INPUT_MB} MB.`);
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const toBlob = (type, q) => new Promise((res) => canvas.toBlob(res, type, q));
  const blob = (await toBlob('image/webp', 0.8)) || (await toBlob('image/jpeg', 0.82));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}

// Sube la imagen de un lado de la tarjeta y devuelve { url, path }
export async function uploadCardImage(uid, cardId, side, file) {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `users/${uid}/cards/${cardId}/${side}-${Date.now()}.${ext}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: blob.type, cacheControl: 'public,max-age=31536000' });
  return { url: await getDownloadURL(r), path };
}

export async function deleteImage(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    if (e?.code !== 'storage/object-not-found') console.warn('No se pudo borrar la imagen', e);
  }
}

export function cardImagePaths(card) {
  return [card.frontImage?.path, card.backImage?.path].filter(Boolean);
}

// Borra todas las imágenes del usuario (al eliminar la cuenta)
export async function deleteAllUserImages(uid) {
  async function walk(r) {
    const res = await listAll(r);
    await Promise.all(res.items.map((i) => deleteObject(i).catch(() => {})));
    await Promise.all(res.prefixes.map(walk));
  }
  try {
    await walk(ref(storage, `users/${uid}`));
  } catch (e) {
    console.warn('No se pudieron borrar todas las imágenes', e);
  }
}
