// Flujo unificado de subida: cada servicio hace lo que mejor sabe.
//   Fotos de libreta -> Cloudinary (compresión y miniaturas)   |  PDFs -> Google Drive del alumno
//   Texto            -> Gemini (OCR) para fotos y PDFs
// Si falta alguno, se usa el otro como respaldo o se guarda solo el texto.
import { has, LIMITS } from './integrations.js';
import { uploadToCloudinary } from './cloudinary.js';
import { downloadDriveFile, getDriveToken, uploadToDrive } from './drive.js';
import { extractText } from './gemini.js';

export const isPdf = (f) => f.type === 'application/pdf';
export const isImage = (f) => f.type.startsWith('image/');

// Reduce el lado mayor de la foto y la recomprime (menos peso, OCR más rápido).
export async function downscaleImage(file, max = LIMITS.imageSide) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('No se pudo leer la imagen. Usa JPG, PNG o WebP.');
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
    bmp.close?.();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

// Decide dónde guardar el archivo según su tipo y lo que esté configurado.
export function chooseProvider(file) {
  if (isPdf(file)) return has.drive ? 'drive' : has.cloudinary ? 'cloudinary' : 'none';
  return has.cloudinary ? 'cloudinary' : has.drive ? 'drive' : 'none';
}

export function describeProvider(file) {
  const p = chooseProvider(file);
  return {
    drive: 'Se guardará en Google Drive (tu carpeta «Amati»)',
    cloudinary: 'Se guardará en la nube de Amati',
    none: 'Se guardará solo el texto, sin el archivo',
  }[p];
}

// onStage(clave, estado): clave = 'prepare' | 'upload' | 'ocr', estado = 'doing' | 'done' | 'error' | 'skip'
// onProgress(0..1) del archivo. Devuelve { file, text, warnings }.
export async function processUpload(rawFile, { ocr = true, onStage = () => {}, onProgress } = {}) {
  if (!isPdf(rawFile) && !isImage(rawFile)) throw new Error('Formato no compatible: usa PDF, JPG, PNG o WebP.');
  if (rawFile.size > LIMITS.file) throw new Error('El archivo pesa más de 25 MB.');
  const provider = chooseProvider(rawFile);
  if (provider === 'none' && !(ocr && has.gemini)) {
    throw new Error('Por ahora no se pueden guardar ni leer archivos. Inténtalo más tarde.');
  }

  // La ventana de permiso de Google debe abrirse al instante, mientras dura el clic del usuario.
  const tokenP = provider === 'drive' ? getDriveToken() : null;
  tokenP?.catch(() => {}); // el error se informa al esperar el permiso

  onStage('prepare', 'doing');
  const file = isImage(rawFile) ? await downscaleImage(rawFile) : rawFile;
  const token = await tokenP;
  onStage('prepare', 'done');

  const warnings = [];
  const wantOcr = ocr && has.gemini && file.size <= LIMITS.gemini;
  if (ocr && has.gemini && !wantOcr) warnings.push('El archivo es muy grande para extraer su texto (máx. 12 MB).');

  onStage('upload', provider === 'none' ? 'skip' : 'doing');
  onStage('ocr', wantOcr ? 'doing' : 'skip');

  const store = provider === 'none' ? Promise.resolve(null)
    : (provider === 'drive' ? uploadToDrive(file, token, { onProgress }) : uploadToCloudinary(file, { onProgress }))
      .then((r) => { onStage('upload', 'done'); return r; })
      .catch((e) => { onStage('upload', 'error'); throw e; });
  const read = wantOcr
    ? extractText(file).then((t) => { onStage('ocr', 'done'); return t; }).catch((e) => { onStage('ocr', 'error'); throw e; })
    : Promise.resolve('');

  const [stored, text] = await Promise.allSettled([store, read]);
  if (stored.status === 'rejected') throw stored.reason; // sin archivo guardado no hay nota
  if (text.status === 'rejected') warnings.push(`No se pudo extraer el texto: ${text.reason.message} Puedes reintentarlo desde la nota.`);

  const info = stored.value && {
    ...stored.value,
    name: file.name,
    mime: file.type,
    kind: isPdf(file) ? 'pdf' : 'image',
  };
  return { file: info, text: text.status === 'fulfilled' ? text.value : '', warnings };
}

// Descarga de nuevo el archivo guardado (para volver a extraer su texto)
export async function fetchStoredBlob(file) {
  if (file.provider === 'drive') return downloadDriveFile(file.id);
  const res = await fetch(file.url);
  if (!res.ok) {
    throw new Error(
      file.kind === 'pdf' && (res.status === 401 || res.status === 403)
        ? 'No se pudo abrir el PDF desde el almacenamiento de archivos. Pulsa Reintentar y, si sigue igual, avisa a quien administra el proyecto.'
        : 'No se pudo descargar el archivo. Revisa tu conexión e inténtalo de nuevo.',
    );
  }
  return res.blob();
}
