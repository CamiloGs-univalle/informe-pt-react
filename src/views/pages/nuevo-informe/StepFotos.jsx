/**
 * views/pages/nuevo-informe/StepFotos.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Photo-upload grid shared by both modes. Each slot stores its image as a
 * data URL directly in wizard state (see `handleFoto` in NuevoInforme.jsx).
 */
import { FOTOLABELS } from '../../../models/constants';

export default function StepFotos({ fotos, onFoto, onRemoveFoto }) {
  return (
    <div className="card">
      <div className="ct">📷 Fotos de actividades</div>
      <div className="fgrid">
        {FOTOLABELS.map((label, i) => (
          <div key={i} className="fslot" onClick={() => document.getElementById('foto-' + i).click()}>
            {fotos[i] ? (
              <>
                <img src={fotos[i]} alt={label} />
                <div className="fcap">{label}</div>
                <button className="fdelbtn" onClick={e => { e.stopPropagation(); onRemoveFoto(i); }}>✕</button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 20, color: 'var(--grb)' }}>+</div>
                <div style={{ fontSize: 10, color: 'var(--grt)' }}>{label}</div>
              </>
            )}
            <input id={'foto-' + i} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFoto(i, e)} />
          </div>
        ))}
      </div>
    </div>
  );
}
