// Procesa un PDF: ¿tiene texto o es un escaneo?
//   con texto -> se lee directamente
//   escaneado -> Tesseract.js (OCR en el navegador)
// El resultado es texto listo para la IA (resumen, tarjetas).
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_CHARS_PER_PAGE = 30;
export const MAX_OCR_PAGES = 40;

async function readText(pdf) {
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim());
  }
  return pages;
}

async function ocrPages(pdf, { onProgress, signal }) {
  const { createWorker } = await import('tesseract.js');
  const total = Math.min(pdf.numPages, MAX_OCR_PAGES);
  let current = 0;
  const worker = await createWorker(['spa', 'eng'], 1, {
    logger: (m) => { if (m.status === 'recognizing text') onProgress?.((current + m.progress) / total); },
  });
  try {
    const texts = [];
    for (let i = 1; i <= total; i++) {
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
      current = i - 1;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const { data } = await worker.recognize(canvas);
      texts.push(data.text.trim());
      canvas.width = canvas.height = 0;
    }
    return texts;
  } finally {
    await worker.terminate();
  }
}

// onStage('detect' | 'ocr', 'doing' | 'done' | 'skip' | 'error'); onProgress(0..1) durante el OCR
export async function analyzePdf(blob, { name = 'documento.pdf', onStage = () => {}, onProgress, signal } = {}) {
  const warnings = [];
  onStage('detect', 'doing');
  const pdf = await getDocument({ data: await blob.arrayBuffer() }).promise;
  const native = await readText(pdf);
  const withText = native.filter((t) => t.length >= MIN_CHARS_PER_PAGE).length;
  const scanned = withText / pdf.numPages < 0.5;
  onStage('detect', 'done');

  let method = 'text';
  let raw = native.join('\n\n');

  if (scanned) {
    method = 'ocr';
    onStage('ocr', 'doing');
    if (pdf.numPages > MAX_OCR_PAGES) warnings.push(`Se leyeron las primeras ${MAX_OCR_PAGES} páginas de ${pdf.numPages}.`);
    const texts = await ocrPages(pdf, { onProgress, signal });
    raw = texts.map((t, i) => `${t}${i < texts.length - 1 ? '\n\n' : ''}`).join('');
    onStage('ocr', 'done');
  } else {
    onStage('ocr', 'skip');
  }

  if (!raw.trim()) throw new Error('No se encontró texto en el PDF (¿está vacío o la imagen es muy borrosa?).');

  return { text: raw, method, pages: pdf.numPages, warnings };
}
