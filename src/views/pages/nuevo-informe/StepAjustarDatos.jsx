/**
 * views/pages/nuevo-informe/StepAjustarDatos.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Step 3 of "auto" mode: editable version of the extracted data, so the
 * user can correct anything before generating the informe.
 */
import { MOTIVOS_PRE } from '../../../models/constants';

export default function StepAjustarDatos({ headcount, setHeadcount, seleccion, removeRQ, updateRQ, rotacion, updateMotivo }) {
  return (
    <div>
      <div className="card">
        <div className="ct">✏️ Ajusta los datos extraídos</div>
        <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>Puedes modificar cualquier campo antes de generar el informe.</div>
      </div>
      <div className="card">
        <div className="ct">👥 Headcount</div>
        <div className="fg4">
          <div><label className="flabel">Inicio</label><input className="finput" type="number" value={headcount.inicio} onChange={e => setHeadcount({ ...headcount, inicio: +e.target.value })} /></div>
          <div><label className="flabel">Ingresos</label><input className="finput" type="number" value={headcount.ingresos} onChange={e => setHeadcount({ ...headcount, ingresos: +e.target.value })} /></div>
          <div><label className="flabel">Retiros</label><input className="finput" type="number" value={headcount.retiros} onChange={e => setHeadcount({ ...headcount, retiros: +e.target.value })} /></div>
          <div><label className="flabel">Cierre</label><input className="finput" type="number" value={headcount.inicio + headcount.ingresos - headcount.retiros} readOnly style={{ background: 'var(--vc)', fontWeight: 700, color: 'var(--vd)' }} /></div>
        </div>
      </div>
      <div className="card">
        <div className="ct">🎯 Selección ({seleccion.length} RQs)</div>
        {seleccion.map((rq, i) => (
          <div key={i} className="item-box">
            <div className="item-hd"><span>{rq.rq || 'RQ #' + (i + 1)}</span><button className="btn bro bsm" onClick={() => removeRQ(i)}>✕</button></div>
            <div className="fg4">
              <div><label className="flabel">Cargo</label><input className="finput" value={rq.cargo} onChange={e => updateRQ(i, 'cargo', e.target.value)} /></div>
              <div><label className="flabel">Solicit.</label><input className="finput" type="number" value={rq.solicitadas} onChange={e => updateRQ(i, 'solicitadas', +e.target.value)} /></div>
              <div><label className="flabel">Contrat.</label><input className="finput" type="number" value={rq.contratadas} onChange={e => updateRQ(i, 'contratadas', +e.target.value)} /></div>
              <div><label className="flabel">Nota</label><input className="finput" value={rq.nota} onChange={e => updateRQ(i, 'nota', e.target.value)} /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="ct">↻ Rotación ({rotacion.length} motivos)</div>
        {rotacion.map((m, i) => (
          <div key={i} className="fg2" style={{ marginBottom: 8 }}>
            <select className="finput" value={m.motivo} onChange={e => updateMotivo(i, 'motivo', e.target.value)}>
              <option value="">—</option>{MOTIVOS_PRE.map(mp => <option key={mp} value={mp}>{mp}</option>)}
            </select>
            <input className="finput" type="number" value={m.cantidad} onChange={e => updateMotivo(i, 'cantidad', +e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}
