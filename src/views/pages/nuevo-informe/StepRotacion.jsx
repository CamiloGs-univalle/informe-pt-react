/**
 * views/pages/nuevo-informe/StepRotacion.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manual-mode step 3: one editable card per causal de retiro.
 */
import { MOTIVOS_PRE } from '../../../models/constants';

export default function StepRotacion({ rotacion, addMotivo, removeMotivo, updateMotivo }) {
  return (
    <div className="card">
      <div className="ct">↻ Rotación del personal</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--grt)' }}>Causales de retiro</span>
        <button className="btn bvd bsm" onClick={addMotivo}>+ Agregar motivo</button>
      </div>
      {rotacion.map((m, i) => (
        <div key={i} className="item-box">
          <div className="item-hd"><span>Motivo #{i + 1}</span><button className="btn bro bsm" onClick={() => removeMotivo(i)}>✕</button></div>
          <div className="fg2">
            <div>
              <label className="flabel">Motivo</label>
              <select className="finput" value={m.motivo} onChange={e => updateMotivo(i, 'motivo', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {MOTIVOS_PRE.map(mp => <option key={mp} value={mp}>{mp}</option>)}
              </select>
            </div>
            <div><label className="flabel">Cantidad</label><input className="finput" type="number" value={m.cantidad} onChange={e => updateMotivo(i, 'cantidad', +e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
