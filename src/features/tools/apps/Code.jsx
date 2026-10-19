import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleX, Loader2, Play, Sparkles, Wand2 } from 'lucide-react';
import { ask } from '../../classnotes/api/gemini.js';
import { has } from '../../classnotes/api/integrations.js';

// Programar y retos con Judge0: ejecuta código en un entorno aislado y valida soluciones con casos de prueba.
// Por defecto usa la instancia pública gratuita (ce.judge0.com, con límite de uso); para más volumen
// configura VITE_JUDGE0_URL (y VITE_JUDGE0_KEY si tu instancia o RapidAPI la piden).
const BASE = (import.meta.env.VITE_JUDGE0_URL || 'https://ce.judge0.com').replace(/\/$/, '');
const KEY = import.meta.env.VITE_JUDGE0_KEY || '';

const headers = () => ({
  'Content-Type': 'application/json',
  ...(KEY ? (BASE.includes('rapidapi') ? { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': new URL(BASE).host } : { 'X-Auth-Token': KEY }) : {}),
});

const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s) => { try { return s ? decodeURIComponent(escape(atob(s))) : ''; } catch { return s || ''; } };

// Lenguajes que ofrecemos y cómo reconocerlos en la lista de Judge0 (los ids cambian con las versiones)
const LANGS = [
  { key: 'python', label: 'Python', match: /^Python \(3/ },
  { key: 'javascript', label: 'JavaScript', match: /^JavaScript \(Node/ },
  { key: 'java', label: 'Java', match: /^Java \(/ },
  { key: 'cpp', label: 'C++', match: /^C\+\+ \(GCC/ },
  { key: 'c', label: 'C', match: /^C \(GCC/ },
  { key: 'csharp', label: 'C#', match: /^C# \(Mono/ },
  { key: 'php', label: 'PHP', match: /^PHP/ },
  { key: 'go', label: 'Go', match: /^Go \(/ },
  { key: 'rust', label: 'Rust', match: /^Rust/ },
  { key: 'typescript', label: 'TypeScript', match: /^TypeScript/ },
];

const STARTERS = {
  python: '# Lee de la entrada estándar con input()\nn = int(input())\nprint(n)\n',
  javascript: "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconst n = parseInt(lines[0]);\nconsole.log(n);\n",
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        int n = in.nextInt();\n        System.out.println(n);\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    cout << n << endl;\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", n);\n    return 0;\n}\n',
  csharp: 'using System;\n\npublic class Program {\n    public static void Main() {\n        int n = int.Parse(Console.ReadLine());\n        Console.WriteLine(n);\n    }\n}\n',
  php: '<?php\n$n = intval(trim(fgets(STDIN)));\necho $n . "\\n";\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    fmt.Println(n)\n}\n',
  rust: 'use std::io;\n\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_line(&mut s).unwrap();\n    let n: i64 = s.trim().parse().unwrap();\n    println!("{}", n);\n}\n',
  typescript: "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconst n: number = parseInt(lines[0]);\nconsole.log(n);\n",
};

const CHALLENGES = [
  { id: 'primes', title: 'Números primos', level: 'Fácil', statement: 'Lee un entero n y escribe todos los números primos menores o iguales a n, separados por un espacio.', tests: [{ input: '10', output: '2 3 5 7' }, { input: '2', output: '2' }, { input: '30', output: '2 3 5 7 11 13 17 19 23 29' }] },
  { id: 'fizz', title: 'FizzBuzz', level: 'Fácil', statement: 'Lee n y escribe del 1 al n, uno por línea. Si es múltiplo de 3 escribe Fizz, de 5 Buzz y de ambos FizzBuzz.', tests: [{ input: '5', output: '1\n2\nFizz\n4\nBuzz' }, { input: '15', output: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' }] },
  { id: 'pal', title: 'Palíndromo', level: 'Fácil', statement: 'Lee una palabra y escribe «si» si es un palíndromo (se lee igual al revés) o «no» si no lo es.', tests: [{ input: 'reconocer', output: 'si' }, { input: 'amati', output: 'no' }, { input: 'a', output: 'si' }] },
  { id: 'fib', title: 'Fibonacci', level: 'Medio', statement: 'Lee n y escribe el n-ésimo número de Fibonacci (F1 = 1, F2 = 1, F3 = 2…).', tests: [{ input: '1', output: '1' }, { input: '10', output: '55' }, { input: '30', output: '832040' }] },
  { id: 'sumdig', title: 'Suma de dígitos', level: 'Fácil', statement: 'Lee un entero positivo y escribe la suma de sus dígitos.', tests: [{ input: '123', output: '6' }, { input: '9', output: '9' }, { input: '99999', output: '45' }] },
];

const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();

async function api(path, init) {
  let res;
  try { res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } }); } catch { throw new Error('No se pudo conectar con Judge0. Revisa tu conexión.'); }
  if (res.status === 429) throw new Error('Judge0 recibió demasiadas ejecuciones seguidas. Espera unos segundos e inténtalo de nuevo.');
  if (!res.ok) throw new Error(`Judge0 respondió ${res.status}. Inténtalo de nuevo en un momento.`);
  return res.json();
}

async function runCode({ langId, code, stdin }) {
  const r = await api('/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,compile_output,message,status,time,memory', {
    method: 'POST', body: JSON.stringify({ source_code: b64(code), language_id: langId, stdin: b64(stdin || ''), cpu_time_limit: 5, wall_time_limit: 10 }),
  });
  return { stdout: unb64(r.stdout), stderr: unb64(r.stderr), compile: unb64(r.compile_output), message: unb64(r.message), status: r.status, time: r.time, memory: r.memory };
}

const failText = (r) => [r.compile, r.stderr, r.message].filter(Boolean).join('\n').trim();

export default function Code() {
  const [langs, setLangs] = useState(null);
  const [lang, setLang] = useState('python');
  const [codes, setCodes] = useState(() => ({ ...STARTERS }));
  const [stdin, setStdin] = useState('');
  const [challenge, setChallenge] = useState(null); // { title, statement, tests, level, ai }
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null); // ejecución libre
  const [grade, setGrade] = useState(null); // [{ ok, input, expected, got, error }]
  const [error, setError] = useState('');
  const [aiText, setAiText] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    api('/languages').then((all) => {
      const out = {};
      for (const l of LANGS) { const hit = all.filter((x) => l.match.test(x.name)).pop(); if (hit) out[l.key] = hit; }
      setLangs(out);
    }).catch((e) => { setError(e.message); setLangs({}); });
  }, []);

  const available = useMemo(() => LANGS.filter((l) => langs?.[l.key]), [langs]);
  const code = codes[lang];
  const setCode = (v) => setCodes((c) => ({ ...c, [lang]: v }));
  const langId = langs?.[lang]?.id;

  async function execute() {
    setBusy('run'); setError(''); setResult(null); setGrade(null); setAiText('');
    try { setResult(await runCode({ langId, code, stdin })); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  async function check() {
    setBusy('grade'); setError(''); setResult(null); setGrade(null); setAiText('');
    try {
      const out = [];
      for (const t of challenge.tests) {
        const r = await runCode({ langId, code, stdin: t.input });
        const got = r.stdout;
        out.push({ input: t.input, expected: t.output, got, ok: r.status.id === 3 && norm(got) === norm(t.output), error: r.status.id === 3 || r.status.id === 4 ? '' : failText(r) || r.status.description });
      }
      setGrade(out);
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  function pick(c) { setChallenge(c); setResult(null); setGrade(null); setAiText(''); setStdin(c.tests[0].input); }

  async function generate() {
    if (!topic.trim()) return;
    setBusy('gen'); setError('');
    try {
      const raw = await ask(`Crea UN reto de programación para estudiantes universitarios sobre: "${topic.trim().slice(0, 200)}".
El programa lee de la entrada estándar y escribe en la salida estándar. Responde SOLO con JSON:
{"title":"título corto","level":"Fácil|Medio|Difícil","statement":"enunciado claro en español, con formato de entrada y de salida","tests":[{"input":"texto de entrada","output":"salida exacta esperada"}]}
Incluye entre 3 y 5 casos de prueba correctos y verificables, con una salida única y determinista.`, { json: true });
      const j = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, '').trim());
      const tests = (j.tests || []).filter((t) => typeof t.input === 'string' && typeof t.output === 'string').slice(0, 6);
      if (!j.statement || tests.length === 0) throw new Error('bad');
      pick({ id: 'ai', title: String(j.title || 'Reto con IA').slice(0, 80), level: j.level || 'Medio', statement: String(j.statement).slice(0, 1500), tests, ai: true });
    } catch (e) { setError(e.message === 'bad' || e instanceof SyntaxError ? 'La IA no devolvió un reto válido. Inténtalo de nuevo.' : e.message); } finally { setBusy(''); }
  }

  async function explain() {
    setBusy('ai'); setAiText('');
    const failing = grade?.find((g) => !g.ok);
    const info = grade
      ? `Entrada: ${failing?.input}\nSalida esperada: ${failing?.expected}\nSalida obtenida: ${failing?.got || '(vacía)'}\n${failing?.error ? `Error: ${failing.error}` : ''}`
      : `Salida/errores:\n${[result?.stdout, failText(result || {})].filter(Boolean).join('\n')}`;
    try {
      setAiText(await ask(`Eres un tutor de programación amable. El estudiante usa ${LANGS.find((l) => l.key === lang).label}${challenge ? ` y resuelve este reto: ${challenge.statement}` : ''}.
Explica en español sencillo POR QUÉ falla su código y qué debe revisar, sin escribir la solución completa (da una pista y, si ayuda, un ejemplo mínimo).

CÓDIGO:
${code.slice(0, 6000)}

${info.slice(0, 2000)}`));
    } catch (e) { setAiText(`No pude generar la explicación: ${e.message}`); } finally { setBusy(''); }
  }

  const passed = grade?.filter((g) => g.ok).length || 0;
  const hasFail = (result && (result.status.id !== 3 || result.stderr)) || (grade && passed < grade.length);

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <div className="row gap wrap">
          <strong>Retos</strong>
          <div className="chips">
            {CHALLENGES.map((c) => <button key={c.id} type="button" className={`chip ${challenge?.id === c.id ? 'active' : ''}`} onClick={() => pick(c)}>{c.title}</button>)}
            {challenge && <button type="button" className="chip ghost" onClick={() => { setChallenge(null); setGrade(null); }}>Programar libre</button>}
          </div>
        </div>
        {has.gemini && (
          <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); generate(); }}>
            <input className="grow" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="Pídele un reto a la IA: «recursividad», «ordenar una lista», «cadenas»…" aria-label="Tema del reto" />
            <button className="btn ghost" disabled={busy === 'gen' || !topic.trim()}><Wand2 size={15} aria-hidden="true" /> {busy === 'gen' ? 'Creando…' : 'Crear reto con IA'}</button>
          </form>
        )}
        {challenge && (
          <div className="stack-sm tool-challenge">
            <strong>{challenge.title} <span className="tag">{challenge.level}</span>{challenge.ai && <span className="tag pick-tag">Creado con IA</span>}</strong>
            <p className="pre">{challenge.statement}</p>
            <p className="small muted">Ejemplo — entrada: <code>{challenge.tests[0].input.replace(/\n/g, ' ⏎ ')}</code> → salida: <code>{challenge.tests[0].output.replace(/\n/g, ' ⏎ ')}</code></p>
          </div>
        )}
      </section>

      <section className="panel stack">
        <div className="row gap wrap between">
          <div className="chips" role="group" aria-label="Lenguaje">
            {langs === null ? <span className="small muted"><Loader2 size={14} className="spin" aria-hidden="true" /> Conectando con Judge0…</span>
              : available.map((l) => <button key={l.key} type="button" className={`chip ${lang === l.key ? 'active' : ''}`} aria-pressed={lang === l.key} onClick={() => setLang(l.key)}>{l.label}</button>)}
          </div>
          <div className="row gap">
            {challenge ? <button type="button" className="btn primary" disabled={!langId || !!busy} onClick={check}>{busy === 'grade' ? 'Validando…' : <><CircleCheck size={15} aria-hidden="true" /> Validar solución</>}</button> : null}
            <button type="button" className={`btn ${challenge ? 'ghost' : 'primary'}`} disabled={!langId || !!busy} onClick={execute}>{busy === 'run' ? 'Ejecutando…' : <><Play size={15} aria-hidden="true" /> Ejecutar</>}</button>
          </div>
        </div>
        <textarea className="code-editor mono-ish" value={code} onChange={(e) => setCode(e.target.value)} rows={16} spellCheck="false" aria-label="Código"
          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target; const a = t.selectionStart; setCode(code.slice(0, a) + '    ' + code.slice(t.selectionEnd)); requestAnimationFrame(() => t.setSelectionRange(a + 4, a + 4)); } }} />
        <label className="stack-sm">
          <span className="small">Entrada del programa (stdin)</span>
          <textarea className="mono-ish" rows={2} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck="false" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="small muted">Tu código se ejecuta en Judge0 ({new URL(BASE).host}), un servicio externo gratuito con límite de uso. No escribas datos personales.</p>
      </section>

      {result && (
        <section className="panel stack" aria-live="polite">
          <div className="row gap wrap">
            <h2 className="h3">Resultado</h2>
            <span className={`tag ${result.status.id === 3 ? 'ok-tag' : 'soon-tag'}`}>{result.status.description}</span>
            {result.time && <span className="small muted">{result.time} s · {Math.round((result.memory || 0) / 1024)} MB</span>}
          </div>
          {result.stdout && <pre className="code-out">{result.stdout}</pre>}
          {failText(result) && <pre className="code-out err">{failText(result)}</pre>}
          {!result.stdout && !failText(result) && <p className="muted small">El programa no escribió nada.</p>}
        </section>
      )}

      {grade && (
        <section className="panel stack" aria-live="polite">
          <div className="row gap wrap">
            <h2 className="h3">{passed === grade.length ? '¡Correcto!' : 'Casos de prueba'}</h2>
            <span className={`tag ${passed === grade.length ? 'ok-tag' : 'soon-tag'}`}>{passed} de {grade.length}</span>
          </div>
          <ul className="grade-list">
            {grade.map((g, i) => (
              <li key={i} className={g.ok ? 'ok' : 'bad'}>
                <span className="row gap">{g.ok ? <CircleCheck size={16} aria-hidden="true" /> : <CircleX size={16} aria-hidden="true" />} Caso {i + 1}</span>
                {!g.ok && (
                  <div className="small stack-sm">
                    <span>Entrada: <code>{g.input.replace(/\n/g, ' ⏎ ')}</code></span>
                    <span>Esperado: <code>{g.expected.replace(/\n/g, ' ⏎ ')}</code></span>
                    <span>Obtenido: <code>{(g.got || '(vacío)').replace(/\n/g, ' ⏎ ')}</code></span>
                    {g.error && <pre className="code-out err">{g.error}</pre>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasFail && has.gemini && (
        <section className="panel stack">
          <button type="button" className="btn ghost" style={{ alignSelf: 'start' }} disabled={busy === 'ai'} onClick={explain}><Sparkles size={15} aria-hidden="true" /> {busy === 'ai' ? 'Pensando…' : '¿Por qué falla mi código?'}</button>
          {aiText && <p className="pre">{aiText}</p>}
        </section>
      )}
    </div>
  );
}
