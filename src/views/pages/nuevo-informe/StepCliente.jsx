/**
 * views/pages/nuevo-informe/StepCliente.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Step 0 (shared by both modes): pick the cliente and período for this
 * informe. Shows the remembered Drive folder for that cliente, if any.
 */
import { getCliFolder } from '../../../models/Cliente';

export default function StepCliente({ clientes, cliId, setCliId, periodo, setPeriodo, ejecutivo }) {
  return (
    <div className="card">
      <div className="ct">👤 Selecciona el cliente y período</div>
      <div className="fg3">
        <div>
          <label className="flabel">Cliente *</label>
          <select className="finput" value={cliId} onChange={e => setCliId(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.marca ? ' · ' + c.marca : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="flabel">Período *</label>
          <input className="finput" type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </div>
        <div>
          <label className="flabel">Ejecutivo</label>
          <input className="finput" value={ejecutivo?.nom || ''} readOnly style={{ background: 'var(--gr)' }} />
        </div>
      </div>
      {cliId && getCliFolder(cliId) && (
        <div className="alrt avd" style={{ marginTop: 12 }}>📁 Ruta recordada: <strong>{getCliFolder(cliId)}</strong></div>
      )}
    </div>
  );
}
