import { useId } from 'react';
import { Link } from 'react-router-dom';
import { NOTE_TYPES, TECHNIQUE_MAP } from './techniques.js';
import TechniqueIcon from './TechniqueIcon.jsx';

// Botón para crear un apunte con una técnica. Al pasar el puntero (o enfocarlo con el teclado) explica
// en palabras sencillas de qué trata, porque no todos conocen nombres como «Feynman» o «SQ3R».
export default function TechniqueChip({ noteType, to, primary = false }) {
  const tipId = useId();
  const type = NOTE_TYPES[noteType];
  const t = TECHNIQUE_MAP[type.technique];
  return (
    <Link to={to} className={`chip note-chip tip-host ${primary ? 'active' : ''}`} aria-describedby={tipId}>
      <TechniqueIcon name={t.icon} size={14} /> {type.label}
      <span id={tipId} role="tooltip" className="tip">
        <strong>{t.name}</strong>
        {t.intro || t.short}
      </span>
    </Link>
  );
}
