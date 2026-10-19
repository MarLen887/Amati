// Lectura y exportación de hojas de cálculo con SheetJS (se descarga solo cuando se usa).
export const ACCEPT = '.xlsx,.xls,.xlsm,.ods,.csv,.tsv';
export const MAX_BYTES = 8 * 1024 * 1024;

export async function readWorkbook(file) {
  if (file.size > MAX_BYTES) throw new Error('El archivo pesa más de 8 MB.');
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  if (!wb.SheetNames.length) throw new Error('El archivo no tiene hojas.');
  const sheets = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    // header:1 -> matriz de filas; los valores de fórmula salen con su último resultado guardado
    sheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }).map((r) => r.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)));
  }
  return { names: wb.SheetNames, sheets };
}

export async function downloadSheet(grid, name, format = 'xlsx') {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(grid);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 30) || 'Hoja1');
  XLSX.writeFile(wb, `${(name || 'hoja').replace(/[^\w\-áéíóúñ ]+/gi, '').trim() || 'hoja'}.${format}`, { bookType: format });
}

// Texto pegado (Excel/CSV/TSV) -> matriz
export function parseText(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  return lines.map((l) => l.split(sep).map((c) => { const t = c.trim().replace(/^"|"$/g, ''); const n = Number(t.replace(/[$,\s]/g, '')); return t !== '' && !Number.isNaN(n) && /^[\s$-]*[\d.,]+%?$/.test(t) ? n : t; }));
}
