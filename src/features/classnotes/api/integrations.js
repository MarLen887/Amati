// Configuración de los servicios externos para las notas de clase (se lee de .env.local).
const env = import.meta.env;

export const cfg = {
  cloudinary: { cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '', preset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '' },
  gemini: { key: env.VITE_GEMINI_API_KEY || '', model: env.VITE_GEMINI_MODEL || 'gemini-flash-latest' },
  drive: { clientId: env.VITE_GOOGLE_CLIENT_ID || '' },
};

export const has = {
  cloudinary: Boolean(cfg.cloudinary.cloudName && cfg.cloudinary.preset),
  gemini: Boolean(cfg.gemini.key),
  drive: Boolean(cfg.drive.clientId),
};

export const LIMITS = {
  file: 25 * 1024 * 1024, // tamaño máximo por archivo
  gemini: 12 * 1024 * 1024, // la petición en línea a Gemini admite ~20 MB (base64 pesa 33% más)
  imageSide: 2400, // lado mayor de las fotos antes de subirlas
};

export const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
