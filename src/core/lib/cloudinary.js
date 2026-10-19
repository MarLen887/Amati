// Cloudinary — almacenamiento y optimización de imágenes y PDFs (subida sin firma desde el navegador).
// Lo usan las imágenes de tarjetas y las notas de clase. Requiere un "upload preset" en modo Unsigned (ver README).
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const cloudinaryConfigured = Boolean(CLOUD && PRESET);

// Inserta transformaciones en la URL de entrega (compresión y formato automáticos).
export function cloudinaryUrl(url, transform = 'f_auto,q_auto') {
  return url ? url.replace('/upload/', `/upload/${transform}/`) : url;
}

export function cloudinaryThumb(url) {
  if (!url) return null;
  return cloudinaryUrl(url, 'c_fill,w_480,h_320,f_auto,q_auto,pg_1').replace(/\.pdf$/i, '.jpg');
}

export function uploadToCloudinary(file, { onProgress, folder = 'amati/clases' } = {}) {
  return new Promise((resolve, reject) => {
    if (!cloudinaryConfigured) {
      reject(new Error('Cloudinary no está configurado (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).'));
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    fd.append('folder', folder);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error('No se pudo conectar con Cloudinary.'));
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          provider: 'cloudinary',
          id: data.public_id,
          url: data.secure_url,
          thumb: cloudinaryThumb(data.secure_url),
          bytes: data.bytes,
          width: data.width || null,
          height: data.height || null,
        });
      } else {
        reject(new Error(`Cloudinary: ${data.error?.message || `error ${xhr.status}`}`));
      }
    };
    xhr.send(fd);
  });
}
