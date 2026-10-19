// Imágenes de tarjetas, guardadas en Cloudinary (el plan gratuito de Firebase no incluye Storage).
// Se comprimen en el dispositivo antes de subirlas (máx. 1280 px, WebP/JPEG ~150 KB).
// Las imágenes antiguas que estén en Firebase Storage (path "users/…") se siguen mostrando y se limpian al borrarlas.
import { deleteObject, listAll, ref } from 'firebase/storage';
import { storage } from '../firebase.js';
import { uploadToCloudinary } from './cloudinary.js';

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

// Sube la imagen de un lado de la tarjeta y devuelve { url, path } (path = identificador en Cloudinary)
export async function uploadCardImage(uid, cardId, side, file) {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const named = new File([blob], `${cardId}-${side}.${ext}`, { type: blob.type });
  const r = await uploadToCloudinary(named, { folder: 'amati/tarjetas' });
  return { url: r.url, path: r.id };
}

// Cloudinary no permite borrar desde el navegador con subida sin firma: solo se borran las
// imágenes heredadas de Firebase Storage. Las de Cloudinary quedan sin enlace (se limpian desde su panel).
export async function deleteImage(path) {
  if (!path || !path.startsWith('users/')) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    if (e?.code !== 'storage/object-not-found') console.warn('No se pudo borrar la imagen', e);
  }
}

export function cardImagePaths(card) {
  return [card.frontImage?.path, card.backImage?.path].filter(Boolean);
}

// Al eliminar la cuenta: limpia lo que haya en Firebase Storage (si existe). Falla en silencio.
export async function deleteAllUserImages(uid) {
  async function walk(r) {
    const res = await listAll(r);
    await Promise.all(res.items.map((i) => deleteObject(i).catch(() => {})));
    await Promise.all(res.prefixes.map(walk));
  }
  try {
    await walk(ref(storage, `users/${uid}`));
  } catch {
    /* sin Storage o sin imágenes */
  }
}
