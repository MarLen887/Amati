// Evaluador de fórmulas tipo Excel (en español o inglés) sobre una hoja de datos, con Formula.js.
// Soporta números, textos, celdas (A1, $B$2), rangos (A1:B10), operadores + - * / ^ & % = <> < > <= >=,
// funciones anidadas y separadores «,» o «;». No ejecuta código arbitrario: solo llama funciones de Formula.js.
import * as F from '@formulajs/formulajs';

// Nombres en español -> nombre de Formula.js
export const ES = {
  SUMA: 'SUM', PROMEDIO: 'AVERAGE', MAX: 'MAX', MIN: 'MIN', CONTAR: 'COUNT', CONTARA: 'COUNTA', 'CONTAR.BLANCO': 'COUNTBLANK',
  'CONTAR.SI': 'COUNTIF', 'CONTAR.SI.CONJUNTO': 'COUNTIFS', 'SUMAR.SI': 'SUMIF', 'SUMAR.SI.CONJUNTO': 'SUMIFS',
  'PROMEDIO.SI': 'AVERAGEIF', SI: 'IF', 'SI.ERROR': 'IFERROR', Y: 'AND', O: 'OR', NO: 'NOT', BUSCARV: 'VLOOKUP', BUSCARH: 'HLOOKUP',
  BUSCAR: 'LOOKUP', INDICE: 'INDEX', COINCIDIR: 'MATCH', REDONDEAR: 'ROUND', 'REDONDEAR.MAS': 'ROUNDUP', 'REDONDEAR.MENOS': 'ROUNDDOWN',
  ENTERO: 'INT', RAIZ: 'SQRT', POTENCIA: 'POWER', RESIDUO: 'MOD', PRODUCTO: 'PRODUCT', SUMAPRODUCTO: 'SUMPRODUCT', CONCATENAR: 'CONCATENATE',
  IZQUIERDA: 'LEFT', DERECHA: 'RIGHT', EXTRAE: 'MID', LARGO: 'LEN', MAYUSC: 'UPPER', MINUSC: 'LOWER', NOMPROPIO: 'PROPER', ESPACIOS: 'TRIM',
  ENCONTRAR: 'FIND', SUSTITUIR: 'SUBSTITUTE', TEXTO: 'TEXT', REPETIR: 'REPT', HOY: 'TODAY', AHORA: 'NOW', AÑO: 'YEAR', MES: 'MONTH', DIA: 'DAY',
  PAGO: 'PMT', VA: 'PV', VF: 'FV', TASA: 'RATE', VNA: 'NPV', TIR: 'IRR', MEDIANA: 'MEDIAN', MODA: 'MODE', DESVEST: 'STDEV', 'K.ESIMO.MAYOR': 'LARGE',
  'K.ESIMO.MENOR': 'SMALL', JERARQUIA: 'RANK', ESNUMERO: 'ISNUMBER', ESBLANCO: 'ISBLANK', ESTEXTO: 'ISTEXT', SIGNO: 'SIGN',
  ALEATORIO: 'RAND', 'ALEATORIO.ENTRE': 'RANDBETWEEN', 'SI.CONJUNTO': 'IFS', 'MAX.SI.CONJUNTO': 'MAXIFS', 'MIN.SI.CONJUNTO': 'MINIFS',
};

const ERR = { '#NAME?': '#¿NOMBRE?', '#VALUE!': '#¡VALOR!', '#DIV/0!': '#¡DIV/0!', '#REF!': '#¡REF!', '#NUM!': '#¡NUM!', '#N/A': '#N/A', '#NULL!': '#¡NULO!' };
const err = (m) => new Error(m);

export const colName = (i) => { let s = ''; let n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const colIndex = (s) => s.toUpperCase().split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
const parseRef = (s) => { const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(s); return m ? { c: colIndex(m[1]), r: Number(m[2]) - 1 } : null; };

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    let m;
    if ((m = /^(\d+(\.\d+)?([eE][+-]?\d+)?|\.\d+)/.exec(src.slice(i)))) { out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    if (ch === '"') {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= src.length) throw err('#NAME?');
        if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; }
        s += src[j]; j++;
      }
      out.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if ((m = /^[A-Za-z_$ÁÉÍÓÚÑáéíóúñ][\w.$ÁÉÍÓÚÑáéíóúñ]*/.exec(src.slice(i)))) {
      const id = m[0];
      out.push(src[i + id.length] === '(' ? { t: 'fn', v: id } : { t: 'id', v: id });
      i += id.length; continue;
    }
    if ('<>='.includes(ch)) {
      const two = src.slice(i, i + 2);
      if (['<>', '<=', '>='].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    }
    if ('+-*/^&=<>%(),;:'.includes(ch)) { out.push({ t: 'op', v: ch }); i++; continue; }
    throw err('#NAME?');
  }
  return out;
}

const first = (v) => (Array.isArray(v) ? first(v.flat(Infinity)[0] ?? '') : v);
const toNum = (v0) => {
  const v = first(v0);
  if (v instanceof Error) throw v;
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  if (Number.isNaN(n)) throw err('#VALUE!');
  return n;
};
const toStr = (v0) => { const v = first(v0); if (v instanceof Error) throw v; return v === null || v === undefined ? '' : String(v); };
const toCmp = (v0) => { const v = first(v0); if (v instanceof Error) throw v; return v; };

// grid: matriz de valores de la hoja (filas × columnas)
export function evaluate(formula, grid = []) {
  const src = formula.trim().replace(/^=/, '');
  if (!src) throw err('#VALUE!');
  const toks = tokenize(src);
  let p = 0;
  const eatOp = (...ops) => { const t = toks[p]; if (t && t.t === 'op' && ops.includes(t.v)) { p++; return t.v; } return null; };

  const cell = (ref) => { const row = grid[ref.r]; return row && ref.c < row.length ? (row[ref.c] ?? '') : ''; };
  const range = (a, b) => {
    const r0 = Math.min(a.r, b.r), r1 = Math.max(a.r, b.r), c0 = Math.min(a.c, b.c), c1 = Math.max(a.c, b.c);
    if ((r1 - r0 + 1) * (c1 - c0 + 1) > 100000) throw err('#REF!');
    const out = [];
    for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) row.push(cell({ r, c })); out.push(row); }
    return out;
  };

  function comparison() {
    let l = concat();
    for (let op = eatOp('=', '<>', '<=', '>=', '<', '>'); op; op = eatOp('=', '<>', '<=', '>=', '<', '>')) {
      let a = toCmp(l), b = toCmp(concat());
      if (typeof a === 'string') a = a.toLowerCase();
      if (typeof b === 'string') b = b.toLowerCase();
      l = op === '=' ? a === b : op === '<>' ? a !== b : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
    }
    return l;
  }
  function concat() { let l = additive(); while (eatOp('&')) l = toStr(l) + toStr(additive()); return l; }
  function additive() {
    let l = term();
    for (let op = eatOp('+', '-'); op; op = eatOp('+', '-')) { const r = term(); l = op === '+' ? toNum(l) + toNum(r) : toNum(l) - toNum(r); }
    return l;
  }
  function term() {
    let l = power();
    for (let op = eatOp('*', '/'); op; op = eatOp('*', '/')) {
      const r = power();
      if (op === '*') l = toNum(l) * toNum(r);
      else { const d = toNum(r); if (d === 0) throw err('#DIV/0!'); l = toNum(l) / d; }
    }
    return l;
  }
  function power() { let l = unary(); while (eatOp('^')) l = toNum(l) ** toNum(unary()); return l; }
  function unary() {
    if (eatOp('-')) return -toNum(unary());
    if (eatOp('+')) return toNum(unary());
    return postfix();
  }
  function postfix() { let v = primary(); while (eatOp('%')) v = toNum(v) / 100; return v; }

  function primary() {
    const t = toks[p++];
    if (!t) throw err('#VALUE!');
    if (t.t === 'num' || t.t === 'str') return t.v;
    if (t.t === 'op' && t.v === '(') { const v = comparison(); if (!eatOp(')')) throw err('#VALUE!'); return v; }
    if (t.t === 'id') {
      const up = t.v.toUpperCase();
      if (up === 'TRUE' || up === 'VERDADERO') return true;
      if (up === 'FALSE' || up === 'FALSO') return false;
      const a = parseRef(t.v);
      if (!a) throw err('#NAME?');
      if (eatOp(':')) {
        const t2 = toks[p++];
        const b = t2 && t2.t === 'id' ? parseRef(t2.v) : null;
        if (!b) throw err('#REF!');
        return range(a, b);
      }
      return cell(a);
    }
    if (t.t === 'fn') {
      if (!eatOp('(')) throw err('#VALUE!');
      const args = [];
      if (!eatOp(')')) {
        do { args.push(comparison()); } while (eatOp(',', ';'));
        if (!eatOp(')')) throw err('#VALUE!');
      }
      const key = t.v.toUpperCase();
      const fn = F[ES[key] || key];
      if (typeof fn !== 'function') throw err('#NAME?');
      return fn(...args);
    }
    throw err('#VALUE!');
  }

  const v = comparison();
  if (p < toks.length) throw err('#VALUE!');
  return v;
}

// Texto para mostrar el resultado (errores en español, fechas legibles, matrices en forma compacta)
export function show(v) {
  if (v instanceof Error) return ERR[v.message] || v.message;
  if (v instanceof Date) return v.toLocaleDateString('es-MX');
  if (Array.isArray(v)) return v.map((r) => (Array.isArray(r) ? r.map(show).join(' | ') : show(r))).join('\n');
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10);
  if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
  return String(v ?? '');
}
