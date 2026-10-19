import { useEffect, useRef, useState } from 'react';
import { Kekule } from 'kekule';
import 'kekule/theme/default';
import * as THREE from 'three';
import { ExternalLink, Search } from 'lucide-react';

// El visor 3D de Kekule necesita Three.js: se le entrega aquí
Kekule.externalResourceManager.register('three.js', THREE);

// Moléculas: datos de PubChem (PUG REST, gratuita y sin llave) + visor 2D/3D de Kekule.js.
const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PROPS = [
  ['MolecularFormula', 'Fórmula'], ['MolecularWeight', 'Masa molecular (g/mol)'], ['IUPACName', 'Nombre IUPAC'], ['CanonicalSMILES', 'SMILES'],
  ['XLogP', 'XLogP (polaridad)'], ['TPSA', 'Área polar (Å²)'], ['HBondDonorCount', 'Donadores de H'], ['HBondAcceptorCount', 'Aceptores de H'],
  ['Complexity', 'Complejidad'], ['Charge', 'Carga'],
];
// PubChem entiende nombres en inglés, fórmulas e identificadores: algunos alias comunes en español
const ALIAS = { agua: 'water', cafeina: 'caffeine', cafeína: 'caffeine', glucosa: 'glucose', etanol: 'ethanol', aspirina: 'aspirin', metano: 'methane', 'sal': 'sodium chloride', azucar: 'sucrose', azúcar: 'sucrose', paracetamol: 'acetaminophen', ibuprofeno: 'ibuprofen', adrenalina: 'epinephrine', colesterol: 'cholesterol', amoniaco: 'ammonia', acetona: 'acetone', benceno: 'benzene', oxigeno: 'oxygen', oxígeno: 'oxygen', 'dioxido de carbono': 'carbon dioxide', 'dióxido de carbono': 'carbon dioxide', vitamina: 'ascorbic acid', nicotina: 'nicotine', penicilina: 'penicillin G' };
const EXAMPLES = ['agua', 'cafeína', 'aspirina', 'glucosa', 'benceno', 'colesterol'];

async function getJson(url) {
  const r = await fetch(url);
  if (r.status === 404) throw new Error('not-found');
  if (!r.ok) throw new Error(`PubChem respondió ${r.status}.`);
  return r.json();
}

async function lookup(raw) {
  const term = ALIAS[raw.trim().toLowerCase()] || raw.trim();
  const ids = await getJson(`${PUG}/compound/name/${encodeURIComponent(term)}/cids/JSON`);
  const cid = ids.IdentifierList.CID[0];
  const props = (await getJson(`${PUG}/compound/cid/${cid}/property/${PROPS.map((p) => p[0]).join(',')}/JSON`)).PropertyTable.Properties[0];
  const syn = await getJson(`${PUG}/compound/cid/${cid}/synonyms/JSON`).then((j) => j.InformationList.Information[0].Synonym.slice(0, 5)).catch(() => []);
  const sdf2d = await fetch(`${PUG}/compound/cid/${cid}/SDF`).then((r) => (r.ok ? r.text() : ''));
  const sdf3d = await fetch(`${PUG}/compound/cid/${cid}/SDF?record_type=3d`).then((r) => (r.ok ? r.text() : ''));
  return { cid, term, props, syn, sdf2d, sdf3d };
}

// Kekule adopta el elemento donde se crea y lo deja inservible al liberarse. React (modo estricto) monta,
// desmonta y vuelve a montar: por eso cada instancia se crea en su propio <div> nuevo y se retira al salir.
function Viewer({ sdf, mode }) {
  const host = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const el = document.createElement('div');
    el.style.cssText = 'width:100%;height:100%';
    host.current.appendChild(el);
    let v = null;
    try {
      v = new Kekule.ChemWidget.Viewer(el);
      v.setEnableToolbar(true).setEnableDirectInteraction(true);
      setViewer(v);
    } catch {
      setErr('No se pudo iniciar el visor de moléculas.');
    }
    return () => {
      setViewer(null);
      try { v?.finalize(); } catch { /* ya liberado */ }
      el.remove();
    };
  }, []);

  useEffect(() => {
    if (!viewer) return;
    setErr('');
    try {
      const mol = Kekule.IO.loadFormatData(sdf, 'mol');
      if (mode !== '3d') {
        // En 2D se ocultan los hidrógenos explícitos (los cuenta Kekule): el dibujo queda limpio
        for (let i = mol.getNodeCount() - 1; i >= 0; i--) if (mol.getNodeAt(i).isHydrogenAtom?.()) mol.removeNodeAt(i);
      }
      viewer.setRenderType(mode === '3d' ? Kekule.Render.RendererType.R3D : Kekule.Render.RendererType.R2D);
      viewer.setChemObj(mol);
    } catch {
      setErr('No se pudo dibujar la molécula en este modo.');
    }
  }, [viewer, sdf, mode]);

  return (
    <div className="mol-view-wrap">
      <div ref={host} className="mol-view" style={{ width: '100%', height: '100%' }} />
      {err && <p className="error small" role="alert" style={{ position: 'absolute', inset: 'auto 0.5rem 0.5rem' }}>{err}</p>}
    </div>
  );
}

export default function Molecules() {
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('2d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function search(term = q) {
    if (!term.trim()) return;
    setBusy(true); setError('');
    try {
      const d = await lookup(term);
      setData(d);
      setMode(d.sdf2d ? '2d' : '3d');
    } catch (e) {
      setData(null);
      setError(e.message === 'not-found' ? 'No encontré ese compuesto. Prueba con su nombre en inglés, su fórmula (C6H12O6) o un nombre común.' : e.message === 'Failed to fetch' ? 'No se pudo conectar con PubChem. Revisa tu conexión.' : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <section className="panel stack">
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="search-inline grow">
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, fórmula o nombre común (ej. cafeína, C6H12O6)…" aria-label="Buscar compuesto" autoComplete="off" />
          </label>
          <button className="btn primary" disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button>
        </form>
        {!data && <div className="chips">{EXAMPLES.map((x) => <button key={x} type="button" className="chip" onClick={() => { setQ(x); search(x); }}>{x}</button>)}</div>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {data && (
        <div className="mol-layout">
          <section className="panel stack">
            <div className="row between wrap gap">
              <h2 className="h3">{data.syn[0] || data.term}</h2>
              <div className="view-switch" role="group" aria-label="Vista de la molécula">
                <button type="button" className={mode === '2d' ? 'active' : ''} disabled={!data.sdf2d} aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D</button>
                <button type="button" className={mode === '3d' ? 'active' : ''} disabled={!data.sdf3d} aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D</button>
              </div>
            </div>
            <Viewer sdf={mode === '3d' ? data.sdf3d : data.sdf2d} mode={mode} />
            <p className="small muted">{mode === '3d' ? 'Arrastra para girar la molécula.' : 'Estructura en 2D.'} Visor: Kekule.js.</p>
          </section>
          <section className="panel stack">
            <h2 className="h3">Propiedades</h2>
            <dl className="mol-props">
              {PROPS.filter(([k]) => data.props[k] !== undefined && data.props[k] !== '').map(([k, label]) => (
                <div key={k}><dt>{label}</dt><dd className={k === 'CanonicalSMILES' || k === 'IUPACName' ? 'mono-ish wrap-any' : ''}>{String(data.props[k])}</dd></div>
              ))}
            </dl>
            {data.syn.length > 1 && <p className="small muted">También: {data.syn.slice(1).join(' · ')}</p>}
            <a className="btn small ghost" href={`https://pubchem.ncbi.nlm.nih.gov/compound/${data.cid}`} target="_blank" rel="noreferrer noopener" style={{ alignSelf: 'start' }}>
              <ExternalLink size={14} aria-hidden="true" /> Ver en PubChem (CID {data.cid})
            </a>
          </section>
        </div>
      )}
      <p className="small muted">Datos: PubChem (NCBI), de uso libre. Las moléculas se buscan mejor en inglés, por fórmula o con los nombres comunes de los ejemplos.</p>
    </div>
  );
}
